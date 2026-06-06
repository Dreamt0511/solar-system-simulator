import * as THREE from 'three';
import { atmosphereVertexShader, atmosphereFragmentShader } from './shaders.js';

// 行星数据（按真实比例缩放，地球半径 = 1）
// 实际半径比例：太阳109 > 木星11 > 土星9.1 > 天王星4 > 海王星3.9 > 地球1 > 金星0.95 > 火星0.53 > 水星0.38 > 月球0.27
// orbitalPeriod 单位为"秒"，数值越大运行越慢
export const PLANET_DATA = {
    sun: {
        name: '太阳',
        radius: 10,  // 最大，远超其他行星
        color: 0xff7a1f,
        rotationSpeed: 0.0005,
        info: {
            radius: '696,340 km',
            mass: '1.989 × 10³⁰ kg',
            distance: '0 AU',
            period: '-',
            moons: '无'
        }
    },
    mercury: {
        name: '水星',
        radius: 1.2,
        color: 0x8c7e6d,
        distance: 14,
        orbitalPeriod: 8,
        rotationSpeed: 0.002,
        orbitalEccentricity: 0.3,  // 增大离心率让椭圆更明显
        orbitalInclination: 7.0,
        info: {
            radius: '2,439 km',
            mass: '3.301 × 10²³ kg',
            distance: '0.39 AU',
            period: '88 天',
            moons: '无'
        }
    },
    venus: {
        name: '金星',
        radius: 1.2,  // 增大以便可见
        color: 0xe6c88a,
        distance: 20,
        orbitalPeriod: 15,
        rotationSpeed: 0.001,
        orbitalEccentricity: 0.15,
        orbitalInclination: 3.4,
        info: {
            radius: '6,051 km',
            mass: '4.867 × 10²⁴ kg',
            distance: '0.72 AU',
            period: '225 天',
            moons: '无'
        }
    },
    earth: {
        name: '地球',
        radius: 1.3,  // 增大以便可见
        color: 0x2266cc,
        distance: 28,
        orbitalPeriod: 25,
        rotationSpeed: 0.003,
        orbitalEccentricity: 0.2,  // 增大离心率
        orbitalInclination: 0.0,
        moons: ['moon'],
        info: {
            radius: '6,371 km',
            mass: '5.972 × 10²⁴ kg',
            distance: '1 AU',
            period: '365.25 天',
            moons: '月球',
            quote: '你所爱的每一个人，你认识的每一个人，你听说过的每一个人，曾经存在过的每一个人，都在它上面度过他们的一生。所有的欢乐与痛苦，千万种宗教与意识形态，所有的猎人与强盗，所有的英雄与懦夫，每一个文明的缔造者与毁灭者，每一个国王与农夫，每一对年轻的恋人，每一位母亲与父亲，每一个充满希望的孩子，都在这里——一粒悬浮在阳光中的微尘。',
            quoteSource: '卡尔·萨根《暗淡蓝点》'
        }
    },
    moon: {
        radius: 0.4,  // 增大以便可见
        color: 0x999999,
        distance: 2.5,
        orbitalPeriod: 2.7,
        rotationSpeed: 0.001,
        orbitalEccentricity: 0.15,
        parent: 'earth',
        info: {
            radius: '1,737 km',
            mass: '7.342 × 10²² kg',
            distance: '384,400 km',
            period: '27.3 天',
            moons: '无'
        }
    },
    mars: {
        name: '火星',
        radius: 1,  // 增大以便可见
        color: 0xb45a32,
        distance: 35,
        orbitalPeriod: 40,
        rotationSpeed: 0.003,
        orbitalEccentricity: 0.25,
        orbitalInclination: 1.85,
        info: {
            radius: '3,389 km',
            mass: '6.417 × 10²³ kg',
            distance: '1.52 AU',
            period: '687 天',
            moons: '火卫一、火卫二'
        }
    },
    jupiter: {
        name: '木星',
        radius: 3.5,  // 缩小以便与太阳区分
        color: 0xc8a882,
        distance: 55,
        orbitalPeriod: 80,
        rotationSpeed: 0.008,
        orbitalEccentricity: 0.2,
        orbitalInclination: 1.3,
        info: {
            radius: '69,911 km',
            mass: '1.898 × 10²⁷ kg',
            distance: '5.2 AU',
            period: '4,333 天',
            moons: '95颗已知卫星'
        }
    },
    saturn: {
        name: '土星',
        radius: 3,  // 缩小以便与太阳区分
        color: 0xead6a6,
        distance: 70,
        orbitalPeriod: 120,
        rotationSpeed: 0.007,
        orbitalEccentricity: 0.22,
        orbitalInclination: 2.49,
        hasRings: true,
        info: {
            radius: '58,232 km',
            mass: '5.683 × 10²⁶ kg',
            distance: '9.54 AU',
            period: '10,759 天',
            moons: '146颗已知卫星'
        }
    },
    uranus: {
        name: '天王星',
        radius: 2,  // 适中
        color: 0x72b5c4,
        distance: 85,
        orbitalPeriod: 180,
        rotationSpeed: 0.005,
        orbitalEccentricity: 0.18,
        orbitalInclination: 0.77,
        info: {
            radius: '25,362 km',
            mass: '8.6813 × 10²⁵ kg',
            distance: '19.2 AU',
            period: '30,687 天',
            moons: '28颗已知卫星'
        }
    },
    neptune: {
        name: '海王星',
        radius: 1.9,  // 适中
        color: 0x3f54ba,
        distance: 100,
        orbitalPeriod: 240,
        rotationSpeed: 0.004,
        orbitalEccentricity: 0.15,
        orbitalInclination: 1.77,
        info: {
            radius: '24,622 km',
            mass: '1.024 × 10²⁶ kg',
            distance: '30.1 AU',
            period: '60,190 天',
            moons: '16颗已知卫星'
        }
    }
};

// 创建太阳
export function createSun(scene) {
    const data = PLANET_DATA.sun;

    // 核心球体 - 完全自发光
    const coreGeometry = new THREE.SphereGeometry(data.radius, 64, 64);
    const coreMaterial = new THREE.MeshBasicMaterial({
        color: 0xff6a1a
    });
    const sun = new THREE.Mesh(coreGeometry, coreMaterial);
    sun.userData = { type: 'sun', data };

    // 多层光晕让效果更自然
    const glowTexture = createGlowTexture();

    // 内层光晕
    const innerGlow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTexture,
        color: 0xff8a3d,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    }));
    innerGlow.scale.set(data.radius * 4, data.radius * 4, 1);
    sun.add(innerGlow);

    // 外层光晕
    const outerGlow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTexture,
        color: 0xff3f1f,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0.5
    }));
    outerGlow.scale.set(data.radius * 8, data.radius * 8, 1);
    sun.add(outerGlow);

    sun.userData.glow = outerGlow;

    scene.add(sun);
    return sun;
}

// 创建光晕纹理
function createGlowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.1, 'rgba(255, 240, 200, 0.8)');
    gradient.addColorStop(0.4, 'rgba(255, 200, 100, 0.3)');
    gradient.addColorStop(0.7, 'rgba(255, 150, 50, 0.1)');
    gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

// 创建行星光晕纹理
function createPlanetGlowTexture() {
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

// 缓存光晕纹理
let planetGlowTexture = null;

// 创建行星
export function createPlanet(scene, planetKey) {
    const data = PLANET_DATA[planetKey];
    if (!data || planetKey === 'sun' || planetKey === 'moon') return null;

    if (!planetGlowTexture) {
        planetGlowTexture = createPlanetGlowTexture();
    }

    const geometry = new THREE.SphereGeometry(data.radius, 32, 32);

    // 使用 MeshBasicMaterial 让行星完全可见
    const material = new THREE.MeshBasicMaterial({
        color: data.color
    });

    const planet = new THREE.Mesh(geometry, material);
    planet.userData = { type: 'planet', key: planetKey, data };

    // 添加光晕 - 更亮
    const glowMaterial = new THREE.SpriteMaterial({
        map: planetGlowTexture,
        color: new THREE.Color(data.color).multiplyScalar(1.5),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0.8
    });
    const glow = new THREE.Sprite(glowMaterial);
    glow.scale.set(data.radius * 5, data.radius * 5, 1);
    planet.add(glow);
    planet.userData.glow = glow;

    // 创建轨道容器
    const orbitGroup = new THREE.Group();
    orbitGroup.add(planet);
    scene.add(orbitGroup);

    planet.userData.orbitGroup = orbitGroup;

    return planet;
}

// 创建大气层
export function createAtmosphere(scene, planet, color) {
    const geometry = new THREE.SphereGeometry(planet.geometry.parameters.radius * 1.15, 32, 32);
    const material = new THREE.ShaderMaterial({
        vertexShader: atmosphereVertexShader,
        fragmentShader: atmosphereFragmentShader,
        uniforms: {
            atmosphereColor: { value: color },
            atmosphereIntensity: { value: 1.5 }
        },
        transparent: true,
        side: THREE.BackSide,
        depthWrite: false
    });

    const atmosphere = new THREE.Mesh(geometry, material);
    atmosphere.position.copy(planet.position);
    planet.userData.atmosphere = atmosphere;

    return atmosphere;
}

// 创建土星环
export function createSaturnRings(scene, saturn) {
    const innerRadius = saturn.geometry.parameters.radius * 1.2;
    const outerRadius = saturn.geometry.parameters.radius * 2.5;

    const geometry = new THREE.RingGeometry(innerRadius, outerRadius, 64);

    // 创建渐变纹理
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 256, 0);
    gradient.addColorStop(0, 'rgba(200, 180, 140, 0)');
    gradient.addColorStop(0.2, 'rgba(200, 180, 140, 0.8)');
    gradient.addColorStop(0.5, 'rgba(220, 200, 160, 1)');
    gradient.addColorStop(0.8, 'rgba(200, 180, 140, 0.8)');
    gradient.addColorStop(1, 'rgba(200, 180, 140, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 1);

    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.MeshStandardMaterial({
        map: texture,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8
    });

    const rings = new THREE.Mesh(geometry, material);
    rings.rotation.x = Math.PI / 2;
    rings.userData.parent = saturn;
    saturn.userData.rings = rings;

    return rings;
}

// 创建所有行星
export function createAllPlanets(scene) {
    const planets = {};

    // 创建太阳
    planets.sun = createSun(scene);

    // 创建行星
    const planetKeys = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
    planetKeys.forEach(key => {
        planets[key] = createPlanet(scene, key);
    });

    // 创建月球 - 使用自发光材质
    const moonData = PLANET_DATA.moon;
    const moonGeometry = new THREE.SphereGeometry(moonData.radius, 16, 16);
    const moonMaterial = new THREE.MeshBasicMaterial({
        color: moonData.color
    });
    planets.moon = new THREE.Mesh(moonGeometry, moonMaterial);
    planets.moon.userData = { type: 'moon', data: moonData };

    // 月球光晕
    if (!planetGlowTexture) {
        planetGlowTexture = createPlanetGlowTexture();
    }
    const moonGlow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: planetGlowTexture,
        color: new THREE.Color(moonData.color).multiplyScalar(1.5),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0.6
    }));
    moonGlow.scale.set(moonData.radius * 4, moonData.radius * 4, 1);
    planets.moon.add(moonGlow);

    // 月球轨道容器 - 月球相对于地球的位置
    const moonOrbit = new THREE.Group();
    planets.moon.position.set(moonData.distance, 0, 0); // 月球在地球前方
    moonOrbit.add(planets.moon);
    planets.earth.add(moonOrbit);
    planets.moon.userData.orbitGroup = moonOrbit;

    // 不再创建大气层光晕，所有行星都是自发光的 MeshBasicMaterial

    // 创建土星环
    if (planets.saturn) {
        const rings = createSaturnRings(scene, planets.saturn);
        planets.saturn.add(rings);
    }

    return planets;
}
