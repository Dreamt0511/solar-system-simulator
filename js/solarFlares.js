import * as THREE from 'three';

const SUN_RADIUS = 10;

// ────────────────────────────────────────────
// 公用工具
// ────────────────────────────────────────────

function createGlowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.2, 'rgba(255,200,120,0.8)');
    gradient.addColorStop(0.5, 'rgba(255,100,30,0.3)');
    gradient.addColorStop(1, 'rgba(255,50,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
}

// ────────────────────────────────────────────
// 1. 太阳耀斑 (Solar Flares)
// ────────────────────────────────────────────

const FLARE_COUNT = 200;
const FLARE_LIFE_MIN = 2;
const FLARE_LIFE_MAX = 5;
const FLARE_INTERVAL_MIN = 5;
const FLARE_INTERVAL_MAX = 15;

function createFlareParticleData() {
    return {
        // 球面起始位置（角度）
        theta: 0,
        phi: 0,
        // 当前生命周期
        life: 0,
        maxLife: 0,
        // 弧形参数
        arcHeight: 0,
        arcAngle: 0,
        speed: 0,
        // 粒子大小
        size: 0
    };
}

function createSolarFlaresSystem(scene, flares) {
    const count = FLARE_COUNT;
    const texture = createGlowTexture();
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);

    const states = [];
    for (let i = 0; i < count; i++) {
        states.push(createFlareParticleData());
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        map: texture,
        size: 1.2,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
        vertexColors: true
    });

    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    scene.add(points);

    flares.solarFlares = {
        points,
        geometry,
        material,
        positions,
        sizes,
        colors,
        states,
        // 下一次耀斑触发时间
        nextTrigger: FLARE_INTERVAL_MIN + Math.random() * (FLARE_INTERVAL_MAX - FLARE_INTERVAL_MIN),
        // 当前正在活跃的粒子索引范围
        activeStart: 0,
        activeCount: 0
    };
}

function triggerFlareBurst(flaresData, currentTime) {
    // 选取一批空闲粒子作为本次耀斑
    const burstSize = 30 + Math.floor(Math.random() * 50);
    const states = flaresData.states;
    let assigned = 0;

    // 耀斑起始点（太阳表面随机位置）
    const flareTheta = Math.random() * Math.PI * 2;
    const flarePhi = (Math.random() - 0.5) * Math.PI * 0.8;

    // 弧形方向（磁力线方向，随机偏转）
    const arcDirection = Math.random() * Math.PI * 2;
    const arcSpread = 0.3 + Math.random() * 0.5;

    for (let i = 0; i < states.length && assigned < burstSize; i++) {
        const s = states[i];
        // 只复用已死亡的粒子
        if (s.life > 0 && s.life < s.maxLife) continue;

        s.theta = flareTheta + (Math.random() - 0.5) * 0.3;
        s.phi = flarePhi + (Math.random() - 0.5) * 0.3;
        s.life = 0;
        s.maxLife = FLARE_LIFE_MIN + Math.random() * (FLARE_LIFE_MAX - FLARE_LIFE_MIN);
        s.arcHeight = 3 + Math.random() * 8;
        s.arcAngle = arcDirection + (Math.random() - 0.5) * arcSpread;
        s.speed = 1.5 + Math.random() * 2.0;
        s.size = 0.5 + Math.random() * 1.0;
        assigned++;
    }

    // 下一次触发时间
    flaresData.nextTrigger = currentTime + FLARE_INTERVAL_MIN + Math.random() * (FLARE_INTERVAL_MAX - FLARE_INTERVAL_MIN);
}

function updateSolarFlaresSystem(flaresData, time, delta) {
    const states = flaresData.states;
    const positions = flaresData.positions;
    const sizes = flaresData.sizes;
    const colors = flaresData.colors;

    // 检查是否需要触发新耀斑
    if (time >= flaresData.nextTrigger) {
        triggerFlareBurst(flaresData, time);
    }

    for (let i = 0; i < states.length; i++) {
        const s = states[i];

        if (s.life <= 0 && s.maxLife <= 0) {
            // 粒子未激活，隐藏到太阳中心
            positions[i * 3] = 0;
            positions[i * 3 + 1] = 0;
            positions[i * 3 + 2] = 0;
            sizes[i] = 0;
            colors[i * 3] = 0;
            colors[i * 3 + 1] = 0;
            colors[i * 3 + 2] = 0;
            continue;
        }

        s.life += delta;
        if (s.life > s.maxLife) {
            // 粒子死亡
            s.life = 0;
            s.maxLife = 0;
            positions[i * 3] = 0;
            positions[i * 3 + 1] = 0;
            positions[i * 3 + 2] = 0;
            sizes[i] = 0;
            colors[i * 3] = 0;
            colors[i * 3 + 1] = 0;
            colors[i * 3 + 2] = 0;
            continue;
        }

        const t = s.life / s.maxLife; // 0→1 生命周期进度

        // 起始位置（太阳表面）
        const baseR = SUN_RADIUS + 0.5;
        const baseX = baseR * Math.cos(s.theta) * Math.cos(s.phi);
        const baseY = baseR * Math.sin(s.phi);
        const baseZ = baseR * Math.sin(s.theta) * Math.cos(s.phi);

        // 弧形运动：沿磁力线抛物线
        // 径向距离随时间增加
        const radialDist = baseR + t * s.speed * s.maxLife;
        // 弧形高度（垂直于径向方向的偏移），抛物线形态
        const arcOffset = s.arcHeight * 4 * t * (1 - t);

        // 计算弧形方向的偏移
        const arcDirX = Math.cos(s.arcAngle) * Math.cos(s.phi);
        const arcDirY = Math.sin(s.phi) * 0.3;
        const arcDirZ = Math.sin(s.arcAngle) * Math.cos(s.phi);
        const arcDirLen = Math.sqrt(arcDirX * arcDirX + arcDirY * arcDirY + arcDirZ * arcDirZ) || 1;

        // 径向单位向量
        const radLen = Math.sqrt(baseX * baseX + baseY * baseY + baseZ * baseZ) || 1;
        const radUx = baseX / radLen;
        const radUy = baseY / radLen;
        const radUz = baseZ / radLen;

        positions[i * 3] = radUx * radialDist + (arcDirX / arcDirLen) * arcOffset;
        positions[i * 3 + 1] = radUy * radialDist + (arcDirY / arcDirLen) * arcOffset;
        positions[i * 3 + 2] = radUz * radialDist + (arcDirZ / arcDirLen) * arcOffset;

        // 大小：出现时快速增大，消亡时缩小
        const sizeFade = t < 0.1 ? t / 0.1 : (t > 0.7 ? (1 - t) / 0.3 : 1);
        sizes[i] = s.size * sizeFade;

        // 颜色：橙红 → 黄色渐变
        const r = 1.0;
        const g = 0.3 + t * 0.5;
        const b = 0.0 + t * 0.15;
        colors[i * 3] = r;
        colors[i * 3 + 1] = g;
        colors[i * 3 + 2] = b;
    }

    flaresData.geometry.attributes.position.needsUpdate = true;
    flaresData.geometry.attributes.size.needsUpdate = true;
    flaresData.geometry.attributes.color.needsUpdate = true;
}

// ────────────────────────────────────────────
// 2. 日珥 (Prominences)
// ────────────────────────────────────────────

const PROMINENCE_COUNT = 300;
const PROMINENCE_ARC_COUNT = 4; // 常驻日珥数量

function createProminencesSystem(scene, flares) {
    const count = PROMINENCE_COUNT;
    const texture = createGlowTexture();
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);

    // 日珥粒子状态
    const states = [];
    const particlesPerArc = Math.floor(count / PROMINENCE_ARC_COUNT);

    for (let a = 0; a < PROMINENCE_ARC_COUNT; a++) {
        const arcTheta = (a / PROMINENCE_ARC_COUNT) * Math.PI * 2 + Math.random() * 0.5;
        const arcPhi = (Math.random() - 0.5) * Math.PI * 0.4;
        const arcHeight = 4 + Math.random() * 6;
        const arcSpan = 0.4 + Math.random() * 0.6; // 弧形跨度（弧度）
        const phase = Math.random() * Math.PI * 2;
        const breatheSpeed = 0.2 + Math.random() * 0.3;

        for (let p = 0; p < particlesPerArc; p++) {
            const idx = a * particlesPerArc + p;
            states.push({
                arcIndex: a,
                theta: arcTheta + (p / particlesPerArc - 0.5) * arcSpan,
                phi: arcPhi,
                arcHeight: arcHeight,
                phase: phase,
                breatheSpeed: breatheSpeed,
                // 粒子沿弧的相对位置 0~1
                arcT: p / particlesPerArc,
                // 微小随机偏移
                offsetX: (Math.random() - 0.5) * 1.0,
                offsetY: (Math.random() - 0.5) * 0.5,
                offsetZ: (Math.random() - 0.5) * 1.0,
                size: 0.3 + Math.random() * 0.6
            });
        }
    }

    // 补齐剩余粒子（分配到最后一个弧）
    while (states.length < count) {
        const a = PROMINENCE_ARC_COUNT - 1;
        const arcTheta = (a / PROMINENCE_ARC_COUNT) * Math.PI * 2;
        states.push({
            arcIndex: a,
            theta: arcTheta + (Math.random() - 0.5) * 0.5,
            phi: (Math.random() - 0.5) * Math.PI * 0.4,
            arcHeight: 4 + Math.random() * 6,
            phase: Math.random() * Math.PI * 2,
            breatheSpeed: 0.2 + Math.random() * 0.3,
            arcT: Math.random(),
            offsetX: (Math.random() - 0.5) * 1.0,
            offsetY: (Math.random() - 0.5) * 0.5,
            offsetZ: (Math.random() - 0.5) * 1.0,
            size: 0.3 + Math.random() * 0.6
        });
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        map: texture,
        size: 0.9,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
        vertexColors: true
    });

    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    scene.add(points);

    flares.prominences = {
        points,
        geometry,
        material,
        positions,
        sizes,
        colors,
        states
    };
}

function updateProminencesSystem(promData, time) {
    const states = promData.states;
    const positions = promData.positions;
    const sizes = promData.sizes;
    const colors = promData.colors;

    for (let i = 0; i < states.length; i++) {
        const s = states[i];

        // 呼吸效果（缓慢变化）
        const breathe = 0.7 + 0.3 * Math.sin(time * s.breatheSpeed + s.phase);

        // 弧形轨迹：抛物线形态
        const t = s.arcT;
        const arcParam = 4 * t * (1 - t); // 0→1→0 抛物线

        // 太阳表面起始点
        const baseR = SUN_RADIUS + 0.3;
        const baseX = baseR * Math.cos(s.theta) * Math.cos(s.phi);
        const baseY = baseR * Math.sin(s.phi);
        const baseZ = baseR * Math.sin(s.theta) * Math.cos(s.phi);

        // 径向方向
        const radLen = Math.sqrt(baseX * baseX + baseY * baseY + baseZ * baseZ) || 1;
        const radUx = baseX / radLen;
        const radUy = baseY / radLen;
        const radUz = baseZ / radLen;

        // 径向延伸距离
        const radialDist = baseR + arcParam * s.arcHeight * breathe;

        // 轻微侧向偏移（模拟弧的弯曲）
        const sideAngle = s.theta + Math.PI * 0.5;
        const sideX = Math.cos(sideAngle) * Math.cos(s.phi);
        const sideZ = Math.sin(sideAngle) * Math.cos(s.phi);
        const sideOffset = arcParam * 1.5 * breathe * (t < 0.5 ? 1 : -1);

        positions[i * 3] = radUx * radialDist + sideX * sideOffset + s.offsetX * 0.3;
        positions[i * 3 + 1] = radUy * radialDist + s.offsetY * 0.3;
        positions[i * 3 + 2] = radUz * radialDist + sideZ * sideOffset + s.offsetZ * 0.3;

        // 大小随呼吸变化
        sizes[i] = s.size * breathe;

        // 颜色：红色/粉红色
        colors[i * 3] = 0.9 + Math.random() * 0.1;
        colors[i * 3 + 1] = 0.15 + Math.random() * 0.15;
        colors[i * 3 + 2] = 0.2 + Math.random() * 0.15;
    }

    promData.geometry.attributes.position.needsUpdate = true;
    promData.geometry.attributes.size.needsUpdate = true;
    promData.geometry.attributes.color.needsUpdate = true;
}

// ────────────────────────────────────────────
// 3. CME 太阳风暴
// ────────────────────────────────────────────

const CME_COUNT = 150;
const CME_INTERVAL_MIN = 30;
const CME_INTERVAL_MAX = 60;

function createCMESystem(scene, flares) {
    const count = CME_COUNT;
    const texture = createGlowTexture();
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);

    const states = [];
    for (let i = 0; i < count; i++) {
        states.push({
            life: 0,
            maxLife: 0,
            // CME 喷发方向
            dirTheta: 0,
            dirPhi: 0,
            // 粒子在云中的偏移
            cloudOffsetX: 0,
            cloudOffsetY: 0,
            cloudOffsetZ: 0,
            speed: 0,
            size: 0
        });
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        map: texture,
        size: 1.5,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
        vertexColors: true
    });

    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    scene.add(points);

    flares.cme = {
        points,
        geometry,
        material,
        positions,
        sizes,
        colors,
        states,
        nextTrigger: CME_INTERVAL_MIN + Math.random() * (CME_INTERVAL_MAX - CME_INTERVAL_MIN)
    };
}

function triggerCMEBurst(cmeData, currentTime) {
    const states = cmeData.states;

    // CME 喷发方向（随机，通常沿赤道面附近）
    const dirTheta = Math.random() * Math.PI * 2;
    const dirPhi = (Math.random() - 0.5) * Math.PI * 0.4;

    for (let i = 0; i < states.length; i++) {
        const s = states[i];

        s.life = 0;
        s.maxLife = 4 + Math.random() * 6;
        s.dirTheta = dirTheta + (Math.random() - 0.5) * 0.4;
        s.dirPhi = dirPhi + (Math.random() - 0.5) * 0.3;
        s.speed = 3 + Math.random() * 5;
        s.size = 0.8 + Math.random() * 1.5;

        // 粒子在云团中的初始偏移（形成锥形扩散）
        const spreadAngle = Math.random() * Math.PI * 2;
        const spreadRadius = Math.random() * 2.0;
        s.cloudOffsetX = Math.cos(spreadAngle) * spreadRadius;
        s.cloudOffsetY = (Math.random() - 0.5) * 3.0;
        s.cloudOffsetZ = Math.sin(spreadAngle) * spreadRadius;
    }

    cmeData.nextTrigger = currentTime + CME_INTERVAL_MIN + Math.random() * (CME_INTERVAL_MAX - CME_INTERVAL_MIN);
}

function updateCMESystem(cmeData, time, delta) {
    const states = cmeData.states;
    const positions = cmeData.positions;
    const sizes = cmeData.sizes;
    const colors = cmeData.colors;

    // 检查是否需要触发 CME
    if (time >= cmeData.nextTrigger) {
        triggerCMEBurst(cmeData, time);
    }

    for (let i = 0; i < states.length; i++) {
        const s = states[i];

        if (s.life <= 0 && s.maxLife <= 0) {
            positions[i * 3] = 0;
            positions[i * 3 + 1] = 0;
            positions[i * 3 + 2] = 0;
            sizes[i] = 0;
            colors[i * 3] = 0;
            colors[i * 3 + 1] = 0;
            colors[i * 3 + 2] = 0;
            continue;
        }

        s.life += delta;
        if (s.life > s.maxLife) {
            s.life = 0;
            s.maxLife = 0;
            positions[i * 3] = 0;
            positions[i * 3 + 1] = 0;
            positions[i * 3 + 2] = 0;
            sizes[i] = 0;
            colors[i * 3] = 0;
            colors[i * 3 + 1] = 0;
            colors[i * 3 + 2] = 0;
            continue;
        }

        const t = s.life / s.maxLife;

        // 喷发方向
        const dirX = Math.cos(s.dirTheta) * Math.cos(s.dirPhi);
        const dirY = Math.sin(s.dirPhi);
        const dirZ = Math.sin(s.dirTheta) * Math.cos(s.dirPhi);

        // 径向距离（从太阳表面向外扩散，加速）
        const dist = SUN_RADIUS + 1 + t * t * s.speed * s.maxLife;

        // 云团扩散（随时间增大）
        const cloudSpread = 1 + t * 3;

        positions[i * 3] = dirX * dist + s.cloudOffsetX * cloudSpread;
        positions[i * 3 + 1] = dirY * dist + s.cloudOffsetY * cloudSpread;
        positions[i * 3 + 2] = dirZ * dist + s.cloudOffsetZ * cloudSpread;

        // 大小：快速出现，缓慢消散
        const sizeFade = t < 0.05 ? t / 0.05 : (t > 0.6 ? Math.max(0, (1 - t) / 0.4) : 1);
        sizes[i] = s.size * sizeFade;

        // 颜色：橙黄色
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.5 + t * 0.3;
        colors[i * 3 + 2] = 0.05 + t * 0.1;
    }

    cmeData.geometry.attributes.position.needsUpdate = true;
    cmeData.geometry.attributes.size.needsUpdate = true;
    cmeData.geometry.attributes.color.needsUpdate = true;
}

// ────────────────────────────────────────────
// 导出接口
// ────────────────────────────────────────────

/**
 * 创建太阳特效系统（耀斑 + 日珥 + CME）
 * @param {THREE.Scene} scene
 * @returns {Object} flares 状态对象
 */
export function createSolarFlares(scene) {
    const flares = {
        solarFlares: null,
        prominences: null,
        cme: null,
        time: 0
    };

    createSolarFlaresSystem(scene, flares);
    createProminencesSystem(scene, flares);
    createCMESystem(scene, flares);

    return flares;
}

/**
 * 更新太阳特效（每帧调用）
 * @param {Object} flares - createSolarFlares 返回的状态对象
 * @param {number} time - 当前模拟时间（秒）
 */
export function updateSolarFlares(flares, time) {
    const delta = flares.time === 0 ? 0.016 : Math.min(time - flares.time, 0.1);
    flares.time = time;

    if (delta <= 0) return;

    if (flares.solarFlares) {
        updateSolarFlaresSystem(flares.solarFlares, time, delta);
    }
    if (flares.prominences) {
        updateProminencesSystem(flares.prominences, time);
    }
    if (flares.cme) {
        updateCMESystem(flares.cme, time, delta);
    }
}
