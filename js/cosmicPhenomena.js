import * as THREE from 'three';


// ============================================================
// 宇宙现象模块
// 宜居带、凌日现象
// ============================================================

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

    // 凌日角阈值：只在行星真正从太阳圆面前方经过时触发
    // 太阳角半径 + 小容差，确保只有对齐时才显示
    const sunRadius = 10;
    const transitAngle = Math.atan2(sunRadius, sunToCameraDist) * 0.6;

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
 * @returns {Object} phenomena - 包含 habitableZone, transits
 */
export function createCosmicPhenomena(scene) {
    const habitableZone = createHabitableZone();
    const transits = createTransits();

    scene.add(habitableZone);
    scene.add(transits.group);

    return { habitableZone, transits };
}

/**
 * 每帧更新宇宙现象
 * @param {Object} phenomena - createCosmicPhenomena 返回的对象
 * @param {Object} planets - 行星对象字典（来自 createAllPlanets）
 * @param {THREE.Camera} camera
 * @param {number} time - 模拟时间
 */
export function updateCosmicPhenomena(phenomena, planets, camera, time) {
    updateTransits(phenomena.transits, planets, camera, time);
}
