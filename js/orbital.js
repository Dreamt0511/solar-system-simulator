import * as THREE from 'three';
import { PLANET_DATA } from './planets.js';

// 开普勒轨道计算
export class KeplerOrbit {
    constructor(semimajorAxis, eccentricity, inclination = 0) {
        this.a = semimajorAxis;      // 半长轴
        this.e = eccentricity;       // 离心率
        this.i = inclination * Math.PI / 180;  // 转换为弧度
    }

    // 计算给定真近点角的轨道半径
    getRadius(trueAnomaly) {
        const theta = trueAnomaly;
        return this.a * (1 - this.e * this.e) / (1 + this.e * Math.cos(theta));
    }

    // 计算轨道位置（2D）- XZ 平面作为“地面”
    getPosition2D(trueAnomaly) {
        const r = this.getRadius(trueAnomaly);
        return {
            x: r * Math.sin(trueAnomaly),
            z: r * Math.cos(trueAnomaly)
        };
    }

    // 计算轨道位置（3D，考虑倾角，Y 为垂直方向）
    getPosition3D(trueAnomaly) {
        const pos2D = this.getPosition2D(trueAnomaly);
        return {
            x: pos2D.x,
            y: pos2D.z * Math.sin(this.i),
            z: pos2D.z * Math.cos(this.i)
        };
    }

    // 根据时间计算真近点角（简化版本）
    getTrueAnomaly(time, orbitalPeriod) {
        // 平近点角
        const M = (2 * Math.PI * time) / orbitalPeriod;

        // 开普勒方程迭代求解偏近点角 E
        let E = M;
        for (let i = 0; i < 10; i++) {
            E = M + this.e * Math.sin(E);
        }

        // 真近点角
        const theta = 2 * Math.atan2(
            Math.sqrt(1 + this.e) * Math.sin(E / 2),
            Math.sqrt(1 - this.e) * Math.cos(E / 2)
        );

        return theta;
    }

    // 获取轨道曲线点（用于可视化）
    getCurvePoints(segments = 100) {
        const points = [];
        for (let i = 0; i <= segments; i++) {
            const theta = (i / segments) * Math.PI * 2;
            const pos = this.getPosition3D(theta);
            points.push(new THREE.Vector3(pos.x, pos.y, pos.z));
        }
        return points;
    }
}

// 创建轨道可视化线
export function createOrbitLine(scene, semimajorAxis, eccentricity, inclination, color = 0x666688) {
    const orbit = new KeplerOrbit(semimajorAxis, eccentricity, inclination);
    const points = orbit.getCurvePoints(128);

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.6,
        linewidth: 2
    });

    const line = new THREE.Line(geometry, material);
    scene.add(line);

    return line;
}

// 创建所有轨道线
export function createAllOrbits(scene, planetData) {
    const orbits = {};

    const planetKeys = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
    planetKeys.forEach(key => {
        const data = planetData[key];
        if (data) {
            orbits[key] = createOrbitLine(
                scene,
                data.distance,
                data.orbitalEccentricity,
                data.orbitalInclination
            );
        }
    });

    // 月球轨道
    const moonData = planetData.moon;
    if (moonData) {
        // 月球轨道相对于地球，需要特殊处理
        // 这里简化为在地球位置创建
    }

    return orbits;
}

// 更新行星位置
export function updatePlanetPosition(planet, time, planetData) {
    const data = planetData[planet.userData.key];
    if (!data) return;

    const orbit = new KeplerOrbit(data.distance, data.orbitalEccentricity, data.orbitalInclination);
    const theta = orbit.getTrueAnomaly(time, data.orbitalPeriod);
    const pos = orbit.getPosition3D(theta);

    if (planet.userData.orbitGroup) {
        planet.position.set(pos.x, pos.y, pos.z);
    }

    // 自转
    planet.rotation.y += data.rotationSpeed;
}

// 更新月球位置
export function updateMoonPosition(moon, earthPosition, time) {
    const moonData = PLANET_DATA.moon;
    const orbit = new KeplerOrbit(moonData.distance, moonData.orbitalEccentricity, 0);
    const theta = orbit.getTrueAnomaly(time, moonData.orbitalPeriod);
    const pos = orbit.getPosition3D(theta);

    moon.position.set(pos.x, pos.y, pos.z);
}
