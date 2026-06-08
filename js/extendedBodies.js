import * as THREE from 'three';
import { KeplerOrbit, createOrbitLine } from './orbital.js';

// 扩展天体数据：矮行星与卫星
// 矮行星轨道比例尺参照 PLANET_DATA 的指数 0.4 缩放
// 卫星轨道距离为视觉相对值（绕母星）
export const EXTENDED_DATA = {
    pluto: {
        name: '冥王星',
        radius: 0.6,
        color: 0xbfb0a0,
        distance: 110,
        orbitalPeriod: 221,    // 开普勒：P=(110/25.7)^1.5×25 ≈ 221
        rotationSpeed: -0.0006, // 6.39d 逆向自转
        orbitalEccentricity: 0.246, // JPL: 0.2461
        orbitalInclination: 17.22, // JPL: 17.22°
        initialMeanAnomaly: 55.96,
        info: {
            radius: '1,188 km',
            mass: '1.309 × 10²² kg',
            distance: '39.5 AU',
            period: '247.9 年',
            moons: '5颗已知卫星'
        }
    },
    ceres: {
        name: '谷神星',
        radius: 0.4,
        color: 0x7a8a9a,
        distance: 37,
        orbitalPeriod: 43,     // 开普勒：P=(37/25.7)^1.5×25 ≈ 43
        rotationSpeed: 0.0106, // 9.07h 自转
        orbitalEccentricity: 0.080, // JPL: 0.0797
        orbitalInclination: 10.59,
        initialMeanAnomaly: 273.99,
        info: {
            radius: '473 km',
            mass: '9.393 × 10²⁰ kg',
            distance: '2.77 AU',
            period: '4.6 年',
            moons: '无'
        }
    },
    io: {
        name: '木卫一/伊奥',
        radius: 0.22,
        color: 0xe8d060,
        distance: 5.5,
        orbitalPeriod: 1.8,
        rotationSpeed: 0.0023, // 潮汐锁定
        parent: 'jupiter',
        info: {
            radius: '1,821 km',
            mass: '8.932 × 10²² kg',
            distance: '421,800 km',
            period: '1.77 天',
            moons: '无'
        }
    },
    europa: {
        name: '木卫二/欧罗巴',
        radius: 0.20,
        color: 0x8ab8c4,
        distance: 7.0,
        orbitalPeriod: 3.6,
        rotationSpeed: 0.0011, // 潮汐锁定
        parent: 'jupiter',
        info: {
            radius: '1,561 km',
            mass: '4.799 × 10²² kg',
            distance: '671,100 km',
            period: '3.55 天',
            moons: '无'
        }
    },
    ganymede: {
        name: '木卫三/加尼美德',
        radius: 0.32,
        color: 0x9a8e7a,
        distance: 9.5,
        orbitalPeriod: 7.2,
        rotationSpeed: 0.00056, // 潮汐锁定
        parent: 'jupiter',
        info: {
            radius: '2,634 km',
            mass: '1.482 × 10²³ kg',
            distance: '1,070,400 km',
            period: '7.15 天',
            moons: '无'
        }
    },
    callisto: {
        name: '木卫四/卡利斯托',
        radius: 0.28,
        color: 0x6a5c4a,
        distance: 13.0,
        orbitalPeriod: 16.7,
        rotationSpeed: 0.00024, // 潮汐锁定
        parent: 'jupiter',
        info: {
            radius: '2,410 km',
            mass: '1.076 × 10²³ kg',
            distance: '1,882,700 km',
            period: '16.69 天',
            moons: '无'
        }
    },
    titan: {
        name: '土卫六/泰坦',
        radius: 0.32,
        color: 0xd4a04a,
        distance: 7.0,
        orbitalPeriod: 4.0,
        rotationSpeed: 0.00025, // 潮汐锁定
        parent: 'saturn',
        info: {
            radius: '2,575 km',
            mass: '1.345 × 10²³ kg',
            distance: '1,221,870 km',
            period: '15.95 天',
            moons: '无'
        }
    }
};

// 光晕纹理（与 planets.js 独立，避免耦合）
function createBodyGlowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.4)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(canvas);
}

let _glowTexture = null;
function getGlowTexture() {
    if (!_glowTexture) _glowTexture = createBodyGlowTexture();
    return _glowTexture;
}

// 创建绕太阳公转的矮行星
function createDwarfPlanet(scene, key, orbitLines) {
    const data = EXTENDED_DATA[key];
    const geometry = new THREE.SphereGeometry(data.radius, 24, 24);
    const material = new THREE.MeshBasicMaterial({ color: data.color });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData = { type: 'dwarfPlanet', key, data };

    // 光晕
    const gTex = getGlowTexture();
    const glowMat = new THREE.SpriteMaterial({
        map: gTex,
        color: new THREE.Color(data.color).multiplyScalar(1.5),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0.6
    });
    const glow = new THREE.Sprite(glowMat);
    glow.scale.set(data.radius * 5, data.radius * 5, 1);
    mesh.add(glow);
    mesh.userData.glow = glow;

    // 轨道容器
    const orbitGroup = new THREE.Group();
    orbitGroup.add(mesh);
    scene.add(orbitGroup);
    mesh.userData.orbitGroup = orbitGroup;

    // 轨道线（默认隐藏）
    const orbitLine = createOrbitLine(scene, data.distance, data.orbitalEccentricity, data.orbitalInclination, 0x8899bb, 0.3);
    orbitLine.visible = false;
    orbitLines.push(orbitLine);

    return mesh;
}

// 创建绕行星公转的卫星
function createMoon(parentPlanet, key) {
    const data = EXTENDED_DATA[key];
    const geometry = new THREE.SphereGeometry(data.radius, 16, 16);
    const material = new THREE.MeshBasicMaterial({ color: data.color });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData = { type: 'moon', key, data, parent: data.parent };

    // 光晕
    const gTex = getGlowTexture();
    const glowMat = new THREE.SpriteMaterial({
        map: gTex,
        color: new THREE.Color(data.color).multiplyScalar(1.5),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0.5
    });
    const glow = new THREE.Sprite(glowMat);
    glow.scale.set(data.radius * 4, data.radius * 4, 1);
    mesh.add(glow);
    mesh.userData.glow = glow;

    // 卫星轨道组：绕母星旋转，参照月球的实现模式
    mesh.position.set(data.distance, 0, 0);
    const orbitGroup = new THREE.Group();
    orbitGroup.add(mesh);
    parentPlanet.add(orbitGroup);
    mesh.userData.orbitGroup = orbitGroup;

    return mesh;
}

/**
 * 创建所有扩展天体
 * @param {THREE.Scene} scene
 * @param {Object} planets - createAllPlanets() 返回的行星对象
 * @returns {Object} 包含所有新天体引用和 update 方法的对象
 */
export function createExtendedBodies(scene, planets) {
    const bodies = {};
    const orbitLines = [];

    // 矮行星
    bodies.pluto = createDwarfPlanet(scene, 'pluto', orbitLines);
    bodies.ceres = createDwarfPlanet(scene, 'ceres', orbitLines);

    // 木星四大伽利略卫星
    if (planets.jupiter) {
        bodies.io = createMoon(planets.jupiter, 'io');
        bodies.europa = createMoon(planets.jupiter, 'europa');
        bodies.ganymede = createMoon(planets.jupiter, 'ganymede');
        bodies.callisto = createMoon(planets.jupiter, 'callisto');
    }

    // 土卫六泰坦
    if (planets.saturn) {
        bodies.titan = createMoon(planets.saturn, 'titan');
    }

    /**
     * 更新所有扩展天体位置（每帧调用）
     * @param {number} time - 当前模拟时间（秒）
     */
    bodies.update = function (time) {
        // 矮行星：使用开普勒轨道
        ['pluto', 'ceres'].forEach(key => {
            const body = bodies[key];
            const data = EXTENDED_DATA[key];
            if (!body || !body.userData.orbitGroup) return;

            const initialMA = (data.initialMeanAnomaly || 0) * Math.PI / 180;
            const orbit = new KeplerOrbit(
                data.distance, data.orbitalEccentricity, data.orbitalInclination
            );
            const theta = orbit.getTrueAnomaly(time, data.orbitalPeriod, initialMA);
            const pos = orbit.getPosition3D(theta);
            body.position.set(pos.x, pos.y, pos.z);
            body.rotation.y += data.rotationSpeed;
        });

        // 卫星：跟月球相同模式，时间驱动旋转
        ['io', 'europa', 'ganymede', 'callisto', 'titan'].forEach(key => {
            const body = bodies[key];
            const data = EXTENDED_DATA[key];
            if (!body || !body.userData.orbitGroup) return;

            body.userData.orbitGroup.rotation.y = (2 * Math.PI * time) / data.orbitalPeriod;
            body.rotation.y += data.rotationSpeed;
        });
    };

    bodies.orbitLines = orbitLines;

    return bodies;
}
