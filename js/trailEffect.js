import * as THREE from 'three';

const TRAIL_LENGTH = 200;
const PLANET_KEYS = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

/**
 * TrailEffect 内部类，管理单一行星的环形位置缓冲区
 */
class TrailBuffer {
    constructor(maxPoints = TRAIL_LENGTH) {
        this.maxPoints = maxPoints;
        this.points = [];
    }

    addPoint(position) {
        this.points.push(position.clone());
        if (this.points.length > this.maxPoints) {
            this.points.shift();
        }
    }

    getPoints() {
        return this.points;
    }
}

/**
 * 为所有行星创建轨道拖尾效果
 * @param {THREE.Scene} scene
 * @param {Object} planetData - PLANET_DATA
 * @returns {Object} trails 对象，索引为行星 key
 */
export function createTrails(scene, planetData) {
    const trails = {};

    PLANET_KEYS.forEach(key => {
        const data = planetData[key];
        if (!data) return;

        const buffer = new TrailBuffer(TRAIL_LENGTH);
        const baseColor = new THREE.Color(data.color);

        // ---- Points（发光粒子点） ----
        const posArray = new Float32Array(TRAIL_LENGTH * 3);
        const colorArray = new Float32Array(TRAIL_LENGTH * 3);

        const pointGeo = new THREE.BufferGeometry();
        pointGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        pointGeo.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
        pointGeo.setDrawRange(0, 0);

        const pointMat = new THREE.PointsMaterial({
            size: 0.5,
            vertexColors: true,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            sizeAttenuation: true,
            opacity: 0.85
        });
        const pointSystem = new THREE.Points(pointGeo, pointMat);
        pointSystem.frustumCulled = false;
        scene.add(pointSystem);

        // ---- Line（平滑拖尾连线） ----
        const linePosArray = new Float32Array(TRAIL_LENGTH * 3);
        const lineGeo = new THREE.BufferGeometry();
        lineGeo.setAttribute('position', new THREE.BufferAttribute(linePosArray, 3));
        lineGeo.setDrawRange(0, 0);

        const lineMat = new THREE.LineBasicMaterial({
            color: data.color,
            transparent: true,
            opacity: 0.35,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const line = new THREE.Line(lineGeo, lineMat);
        line.frustumCulled = false;
        scene.add(line);

        trails[key] = {
            buffer,
            pointSystem,
            pointGeo,
            posArray,
            colorArray,
            line,
            lineGeo,
            linePosArray,
            baseColor
        };
    });

    return trails;
}

/**
 * 每帧更新所有行星拖尾
 * @param {Object} trails - createTrails 的返回值
 * @param {number} time - 模拟时间（用于可选动画）
 * @param {Object} planets - 行星对象集合 (this.planets)
 * @param {Object} planetData - PLANET_DATA
 */
export function updateTrail(trails, time, planets, planetData) {
    PLANET_KEYS.forEach(key => {
        const t = trails[key];
        const planet = planets[key];
        if (!t || !planet) return;

        const { buffer, pointGeo, posArray, colorArray, lineGeo, linePosArray, baseColor } = t;

        // 记录当前行星位置
        buffer.addPoint(planet.position);

        const points = buffer.getPoints();
        const count = points.length;
        if (count < 2) {
            pointGeo.setDrawRange(0, 0);
            lineGeo.setDrawRange(0, 0);
            return;
        }

        // 更新拖尾点位置与颜色（逐渐淡出）
        for (let i = 0; i < count; i++) {
            const p = points[i];
            const idx = i * 3;
            posArray[idx] = p.x;
            posArray[idx + 1] = p.y;
            posArray[idx + 2] = p.z;

            // 亮度：从旧到新呈二次曲线衰减
            const t = i / count;
            const brightness = t * t * (0.85 + 0.15 * Math.sin(time * 2 + i * 0.5));

            colorArray[idx] = baseColor.r * brightness;
            colorArray[idx + 1] = baseColor.g * brightness;
            colorArray[idx + 2] = baseColor.b * brightness;

            // 线位置
            linePosArray[idx] = p.x;
            linePosArray[idx + 1] = p.y;
            linePosArray[idx + 2] = p.z;
        }

        pointGeo.attributes.position.needsUpdate = true;
        pointGeo.attributes.color.needsUpdate = true;
        pointGeo.setDrawRange(0, count);

        lineGeo.attributes.position.needsUpdate = true;
        lineGeo.setDrawRange(0, count);
    });
}
