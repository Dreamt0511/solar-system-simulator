import * as THREE from 'three';
import { PLANET_DATA } from './planets.js';

// ============================================================
// 宇宙现象模块
// 拉格朗日点 L1-L5、宜居带、凌日现象
// ============================================================

// ---------- 拉格朗日点 ----------

/**
 * 创建文字精灵（用于拉格朗日点标签）
 */
function createTextSprite(text, color = '#ffffff', fontSize = 48) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color;
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 64, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthWrite: false
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(2, 1, 1);
    return sprite;
}

/**
 * 创建单个拉格朗日点标记
 */
function createLagrangeMarker(label, position, color = 0xffffaa) {
    const group = new THREE.Group();

    // 小光点（加大）
    const dotGeo = new THREE.SphereGeometry(0.5, 8, 8);
    const dotMat = new THREE.MeshBasicMaterial({ color });
    const dot = new THREE.Mesh(dotGeo, dotMat);
    group.add(dot);

    // 光晕（加亮加大）
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = 64;
    glowCanvas.height = 64;
    const gCtx = glowCanvas.getContext('2d');
    const grad = gCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,200,0.9)');
    grad.addColorStop(0.3, 'rgba(255,255,200,0.4)');
    grad.addColorStop(1, 'rgba(255,255,200,0)');
    gCtx.fillStyle = grad;
    gCtx.fillRect(0, 0, 64, 64);
    const glowTex = new THREE.CanvasTexture(glowCanvas);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    }));
    glow.scale.set(4, 4, 1);
    group.add(glow);

    // 文字标签
    const sprite = createTextSprite(label, '#ffffaa');
    sprite.position.y = 0.8;
    group.add(sprite);

    group.position.copy(position);
    group.visible = false;
    return group;
}

/**
 * 计算并创建地月拉格朗日点 L1-L5
 *
 * 地球距离太阳 25.7 视觉单位，月球距离地球 2.5 视觉单位。
 * L1: 地月连线上、距地球约 85% 地月距离处（靠近月球侧）
 * L2: 地月连线上、月球外侧约 115% 地月距离处
 * L3: 太阳对面（与地球关于太阳对称）
 * L4/L5: 地球轨道前后 60° 位置（与太阳、地球构成等边三角形）
 */
function createLagrangePoints() {
    const EARTH_DIST = PLANET_DATA.earth.distance;   // 25.7
    const MOON_DIST = PLANET_DATA.moon.distance;      // 2.5

    const group = new THREE.Group();

    // 需要获取地球当前位置来定位 L1-L5
    // 由于 L1-L5 跟随地球运动，我们在 update 中动态设置位置
    // 这里先创建占位 marker，update 时再定位

    const markers = {
        L1: createLagrangeMarker('L1', new THREE.Vector3(), 0xffffaa),
        L2: createLagrangeMarker('L2', new THREE.Vector3(), 0xffffaa),
        L3: createLagrangeMarker('L3', new THREE.Vector3(), 0xaaffaa),
        L4: createLagrangeMarker('L4', new THREE.Vector3(), 0xaaddff),
        L5: createLagrangeMarker('L5', new THREE.Vector3(), 0xaaddff),
    };

    Object.values(markers).forEach(m => group.add(m));

    group.visible = false;

    return { group, markers, EARTH_DIST, MOON_DIST };
}

/**
 * 更新拉格朗日点位置（跟随地球运动）
 */
function updateLagrangePoints(lagrange, planets, time) {
    if (!lagrange.group.visible) return;

    const earth = planets.earth;
    if (!earth) return;

    // 获取地球在世界坐标系中的位置
    const earthWorldPos = new THREE.Vector3();
    earth.getWorldPosition(earthWorldPos);

    const earthAngle = Math.atan2(earthWorldPos.x, earthWorldPos.z);
    const EARTH_DIST = lagrange.EARTH_DIST;
    const MOON_DIST = lagrange.MOON_DIST;

    // 获取月球相对于地球的方向（在地月轨道面上）
    const moon = planets.moon;
    let moonDirXZ = { x: 0, z: 1 };
    if (moon) {
        const moonWorldPos = new THREE.Vector3();
        moon.getWorldPosition(moonWorldPos);
        const dx = moonWorldPos.x - earthWorldPos.x;
        const dz = moonWorldPos.z - earthWorldPos.z;
        const len = Math.sqrt(dx * dx + dz * dz);
        if (len > 0.001) {
            moonDirXZ = { x: dx / len, z: dz / len };
        }
    }

    // L1: 地月之间，距地球 ~85% 地月距离
    const l1Dist = MOON_DIST * 0.85;
    lagrange.markers.L1.position.set(
        earthWorldPos.x + moonDirXZ.x * l1Dist,
        earthWorldPos.y,
        earthWorldPos.z + moonDirXZ.z * l1Dist
    );

    // L2: 月球外侧，距地球 ~115% 地月距离
    const l2Dist = MOON_DIST * 1.15;
    lagrange.markers.L2.position.set(
        earthWorldPos.x + moonDirXZ.x * l2Dist,
        earthWorldPos.y,
        earthWorldPos.z + moonDirXZ.z * l2Dist
    );

    // L3: 太阳对面（与地球关于原点对称）
    lagrange.markers.L3.position.set(
        -earthWorldPos.x,
        earthWorldPos.y,
        -earthWorldPos.z
    );

    // L4: 地球轨道前方 60°（逆时针方向）
    const angle4 = earthAngle - Math.PI / 3;
    lagrange.markers.L4.position.set(
        Math.sin(angle4) * EARTH_DIST,
        earthWorldPos.y,
        Math.cos(angle4) * EARTH_DIST
    );

    // L5: 地球轨道后方 60°
    const angle5 = earthAngle + Math.PI / 3;
    lagrange.markers.L5.position.set(
        Math.sin(angle5) * EARTH_DIST,
        earthWorldPos.y,
        Math.cos(angle5) * EARTH_DIST
    );
}

// ---------- 宜居带 ----------

/**
 * 创建宜居带环（太阳周围的绿色半透明环形带）
 * 真实范围 0.95-1.37 AU → 视觉单位 24.4-35.2
 */
function createHabitableZone() {
    const INNER_RADIUS = 24.4;
    const OUTER_RADIUS = 35.2;

    const geometry = new THREE.RingGeometry(INNER_RADIUS, OUTER_RADIUS, 128);
    const material = new THREE.MeshBasicMaterial({
        color: 0x22cc44,
        transparent: true,
        opacity: 0.12,
        side: THREE.DoubleSide,
        depthWrite: false
    });

    const ring = new THREE.Mesh(geometry, material);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0, 0, 0);

    ring.visible = false;
    return ring;
}

// ---------- 凌日现象 ----------

/**
 * 创建凌日黑点（小黑圆片，放置在太阳前方）
 */
function createTransitDisc() {
    const discGeo = new THREE.CircleGeometry(0.6, 16);
    const discMat = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        depthWrite: false
    });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.visible = false;
    return disc;
}

/**
 * 创建凌日现象容器
 * 包含水星和金星各自的凌日黑点
 */
function createTransits() {
    const group = new THREE.Group();

    const mercuryDisc = createTransitDisc();
    mercuryDisc.scale.set(0.8, 0.8, 0.8);   // 水星稍小
    group.add(mercuryDisc);

    const venusDisc = createTransitDisc();
    venusDisc.scale.set(1.0, 1.0, 1.0);     // 金星稍大
    group.add(venusDisc);

    return { group, mercuryDisc, venusDisc };
}

/**
 * 更新凌日检测
 *
 * 逻辑：
 * 1. 计算行星在世界坐标系中的位置
 * 2. 计算太阳→行星 和 太阳→相机 的方向向量
 * 3. 如果两者夹角小于阈值，且行星比相机更靠近太阳（在太阳前方），则判定为凌日
 * 4. 将黑点放置在太阳表面、行星方向上
 */
function updateTransits(transits, planets, camera, time) {
    const sun = planets.sun;
    if (!sun) return;

    const sunPos = new THREE.Vector3();
    sun.getWorldPosition(sunPos);

    const camPos = camera.position.clone();
    const sunToCamera = camPos.clone().sub(sunPos);
    const sunToCameraDist = sunToCamera.length();
    sunToCamera.normalize();

    // 凌日角阈值：行星和太阳-相机方向的夹角小于此值即视为凌日
    // 阈值需要考虑太阳半径(10)对应的角大小，再加一些容差
    const sunRadius = 10;
    const transitAngle = Math.atan2(sunRadius * 1.5, sunToCameraDist);

    // 检测水星凌日
    updateSingleTransit(
        transits.mercuryDisc,
        planets.mercury,
        sunPos, sunToCamera, sunToCameraDist, transitAngle, sunRadius, camPos
    );

    // 检测金星凌日
    updateSingleTransit(
        transits.venusDisc,
        planets.venus,
        sunPos, sunToCamera, sunToCameraDist, transitAngle, sunRadius, camPos
    );
}

/**
 * 更新单个行星的凌日状态
 */
function updateSingleTransit(disc, planet, sunPos, sunToCamera, sunToCameraDist, transitAngle, sunRadius, camPos) {
    if (!planet) {
        disc.visible = false;
        return;
    }

    const planetPos = new THREE.Vector3();
    planet.getWorldPosition(planetPos);

    const sunToPlanet = planetPos.clone().sub(sunPos);
    const sunToPlanetDist = sunToPlanet.length();

    // 行星必须比相机更靠近太阳（在太阳和相机之间）
    if (sunToPlanetDist >= sunToCameraDist) {
        disc.visible = false;
        return;
    }

    sunToPlanet.normalize();

    // 计算太阳→行星 与 太阳→相机 的夹角
    const dot = sunToPlanet.dot(sunToCamera);
    const angle = Math.acos(Math.min(Math.max(dot, -1), 1));

    if (angle < transitAngle) {
        // 凌日！将黑点放在太阳表面、沿行星方向
        disc.visible = true;
        disc.position.copy(sunPos).addScaledVector(sunToPlanet, sunRadius * 1.02);

        // 让黑点面向相机
        disc.lookAt(camPos);

        // 透明度随角距离渐变（越接近中心越不透明）
        const fade = 1 - (angle / transitAngle);
        disc.material.opacity = 0.4 + 0.5 * fade;
    } else {
        disc.visible = false;
    }
}

// ============================================================
// 公开 API
// ============================================================

/**
 * 创建所有宇宙现象并添加到场景
 * @param {THREE.Scene} scene
 * @returns {Object} phenomena - 包含 lagrangePoints, habitableZone, transits
 */
export function createCosmicPhenomena(scene) {
    const lagrangePoints = createLagrangePoints();
    const habitableZone = createHabitableZone();
    const transits = createTransits();

    scene.add(lagrangePoints.group);
    scene.add(habitableZone);
    scene.add(transits.group);

    return { lagrangePoints, habitableZone, transits };
}

/**
 * 每帧更新宇宙现象
 * @param {Object} phenomena - createCosmicPhenomena 返回的对象
 * @param {Object} planets - 行星对象字典（来自 createAllPlanets）
 * @param {THREE.Camera} camera
 * @param {number} time - 模拟时间
 */
export function updateCosmicPhenomena(phenomena, planets, camera, time) {
    updateLagrangePoints(phenomena.lagrangePoints, planets, time);
    updateTransits(phenomena.transits, planets, camera, time);
}
