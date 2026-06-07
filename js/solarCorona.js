import * as THREE from 'three';

const SUN_RADIUS = 10;

// 圆形渐变光晕纹理（所有粒子共用）
function createGlowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.1, 'rgba(255,220,180,0.9)');
    gradient.addColorStop(0.3, 'rgba(255,160,80,0.5)');
    gradient.addColorStop(0.6, 'rgba(255,80,20,0.15)');
    gradient.addColorStop(1, 'rgba(255,50,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(canvas);
}

// 创建日冕粒子环（3层，模拟内日冕 K-日冕结构）
// 真实数据：K-日冕从 1.3~3 R☉（可见光），F-日冕可至 10 R☉（极淡）
// 视觉比例（太阳半径=10）：核心层 11~18，外层光晕达 30~40
function createCoronaRings(scene, corona) {
    const ringConfigs = [
        { inner: 11, outer: 13.5, count: 180, speed: 0.4, tilt: 0.08, color: 0xff6622, opacity: 0.35 },
        { inner: 13.5, outer: 16, count: 220, speed: -0.25, tilt: 0.22, color: 0xff8833, opacity: 0.25 },
        { inner: 16, outer: 19, count: 150, speed: 0.18, tilt: -0.18, color: 0xff4411, opacity: 0.12 }
    ];
    const texture = createGlowTexture();

    ringConfigs.forEach(config => {
        const group = new THREE.Group();
        group.rotation.x = config.tilt;

        const count = config.count;
        const positions = new Float32Array(count * 3);
        const sizes = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = config.inner + Math.random() * (config.outer - config.inner);
            const yOffset = (Math.random() - 0.5) * 3;
            positions[i * 3] = radius * Math.cos(angle);
            positions[i * 3 + 1] = yOffset;
            positions[i * 3 + 2] = radius * Math.sin(angle);
            sizes[i] = 0.3 + Math.random() * 0.5;
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const mat = new THREE.PointsMaterial({
            map: texture,
            color: config.color,
            size: 1.0,
            transparent: true,
            opacity: config.opacity,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            sizeAttenuation: true
        });

        const points = new THREE.Points(geo, mat);
        points.frustumCulled = false;
        group.add(points);

        scene.add(group);

        corona.rings.push({
            group,
            points,
            speed: config.speed,
            baseOpacity: config.opacity,
            sizeBase: config.inner,
            sizeRange: config.outer - config.inner
        });
    });
}

// 创建太阳风粒子（模拟日冕物质向外的极稀薄外流）
// 真实：太阳风从日冕发出，沿磁力线加速至超音速，Alfvén 面在 ~10-20 R☉
// 视觉可见范围控制在 4 R☉（40）以内，极淡透明
function createSolarWind(scene, corona) {
    const count = 60;
    const texture = createGlowTexture();
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    // 粒子状态：每个粒子有方向和速度
    const states = [];
    for (let i = 0; i < count; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = (Math.random() - 0.5) * Math.PI * 0.6;
        const speed = 0.5 + Math.random() * 0.8;

        positions[i * 3] = (SUN_RADIUS + 2) * Math.cos(theta) * Math.cos(phi);
        positions[i * 3 + 1] = (SUN_RADIUS + 2) * Math.sin(phi);
        positions[i * 3 + 2] = (SUN_RADIUS + 2) * Math.sin(theta) * Math.cos(phi);
        sizes[i] = 0.6 + Math.random() * 1.2;

        states.push({
            theta, phi, speed,
            life: Math.random() * 20,
            maxLife: 12 + Math.random() * 18,
            size: sizes[i]
        });
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.PointsMaterial({
        map: texture,
        color: 0xff9933,
        size: 1.5,
        transparent: true,
        opacity: 0.08,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true
    });

    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    scene.add(points);

    corona.solarWind = { points, states, mat, geo, positions };
}

// 创建外层脉动光晕
function createPulsingGlow(scene, corona) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, 'rgba(255, 200, 100, 0.6)');
    gradient.addColorStop(0.15, 'rgba(255, 150, 50, 0.35)');
    gradient.addColorStop(0.4, 'rgba(255, 80, 20, 0.12)');
    gradient.addColorStop(0.7, 'rgba(200, 30, 10, 0.04)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
    const texture = new THREE.CanvasTexture(canvas);

    // 真实可见日冕延伸至 2-4 R☉（视觉 20-40），越往外越淡
    // 内层明亮（~1.5 R☉），中层柔和（~2.5 R☉），外层极淡延伸（~4 R☉）
    const glowConfigs = [
        { scale: 18, color: 0xff5500, opacity: 0.45, speed: 1.8 },
        { scale: 26, color: 0xff6600, opacity: 0.20, speed: 1.2 },
        { scale: 38, color: 0xff3300, opacity: 0.07, speed: 0.8 }
    ];

    glowConfigs.forEach(config => {
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
            map: texture,
            color: config.color,
            transparent: true,
            opacity: config.opacity,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        }));
        sprite.scale.set(config.scale, config.scale, 1);
        sprite.frustumCulled = false;
        scene.add(sprite);

        corona.glowSprites.push({
            sprite, baseScale: config.scale,
            baseOpacity: config.opacity, speed: config.speed
        });
    });
}

export function createSolarCorona(scene) {
    const corona = {
        rings: [],
        glowSprites: [],
        solarWind: null,
        time: 0
    };

    createCoronaRings(scene, corona);
    createSolarWind(scene, corona);
    createPulsingGlow(scene, corona);

    return corona;
}

export function updateSolarCorona(corona, time) {
    const delta = corona.time === 0 ? 0.016 : Math.min(time - corona.time, 0.1);
    corona.time = time;

    if (delta <= 0) return;

    // 更新日冕粒子环
    corona.rings.forEach(ring => {
        ring.group.rotation.y += ring.speed * delta;
        const breathe = 0.8 + 0.2 * Math.sin(time * 0.6 + ring.speed * 5);
        ring.points.material.opacity = ring.baseOpacity * breathe;
    });

    // 更新太阳风粒子
    if (corona.solarWind) {
        const sw = corona.solarWind;
        const positions = sw.positions;
        for (let i = 0; i < sw.states.length; i++) {
            const s = sw.states[i];
            s.life += delta;

            // 粒子向外飘散到约 4 R☉（视觉 40，接近地球轨道）后重置
            const maxDist = SUN_RADIUS + 30;
            const dist = SUN_RADIUS + 2 + s.life * s.speed;
            if (dist > maxDist || s.life > s.maxLife) {
                s.life = 0;
                s.theta = Math.random() * Math.PI * 2;
                s.phi = (Math.random() - 0.5) * Math.PI * 0.6;
                s.speed = 0.3 + Math.random() * 0.5;
                s.maxLife = 15 + Math.random() * 20;
            }

            const r = SUN_RADIUS + 2 + s.life * s.speed;
            positions[i * 3] = r * Math.cos(s.theta) * Math.cos(s.phi);
            positions[i * 3 + 1] = r * Math.sin(s.phi);
            positions[i * 3 + 2] = r * Math.sin(s.theta) * Math.cos(s.phi);
        }
        sw.geo.attributes.position.needsUpdate = true;
        sw.mat.opacity = 0.1 + 0.1 * Math.sin(time * 0.3);
    }

    // 更新脉动光晕
    corona.glowSprites.forEach(glow => {
        const pulse = 0.5 + 0.5 * Math.sin(time * glow.speed);
        const sf = 0.85 + pulse * 0.15;
        const of = 0.7 + pulse * 0.3;
        glow.sprite.scale.set(glow.baseScale * sf, glow.baseScale * sf, 1);
        glow.sprite.material.opacity = glow.baseOpacity * of;
    });
}
