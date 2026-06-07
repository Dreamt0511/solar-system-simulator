import * as THREE from 'three';
import { KeplerOrbit, createOrbitLine } from './orbital.js';

// 哈雷彗星轨道参数
// 真实：a=17.86AU, e=0.968, q=0.571AU, Q=35.15AU, i=162.18°, 周期75.5年
// 由于 AU^0.4 非线性缩放，用有效视觉离心率保证近日点/远日点准确定位
// 视觉：a=63.5, e=0.677 → q=20.5 (远大于太阳半径10), Q=106.4
const COMET_DATA = {
    semimajorAxis: 63.5,
    eccentricity: 0.677,
    inclination: 162.18,
    orbitalPeriod: 97,
    initialMeanAnomaly: 192.25, // JPL历元 2026-06-07 数据
    nucleusRadius: 0.35,
    nucleusColor: 0x8899aa,
    tailParticleCount: 350,
    info: {
        radius: '11 km（彗核）',
        mass: '2.2 × 10¹⁴ kg',
        distance: '0.59 AU（近日点）~ 35.1 AU（远日点）',
        period: '75.5 年'
    }
};

/**
 * 哈雷彗星类
 * 包含彗核（SphereGeometry）和彗尾粒子系统（THREE.Points, AdditiveBlending）
 * 彗尾方向始终背对太阳，亮度随距离太阳变化
 */
export class Comet {
    /**
     * @param {THREE.Scene} scene
     */
    constructor(scene) {
        this.scene = scene;
        this.data = COMET_DATA;
        this.orbit = new KeplerOrbit(
            COMET_DATA.semimajorAxis,
            COMET_DATA.eccentricity,
            COMET_DATA.inclination
        );

        // 轨道容器（位于场景原点）
        this.orbitGroup = new THREE.Group();
        scene.add(this.orbitGroup);

        // 轨道可视化（默认隐藏）
        this.orbitLine = createOrbitLine(
            scene,
            COMET_DATA.semimajorAxis,
            COMET_DATA.eccentricity,
            COMET_DATA.inclination,
            0x66aadd,
            0.08
        );
        this.orbitLine.visible = false;

        // 彗核
        this.createNucleus();

        // 彗尾粒子系统
        this.createTail();

        // 彗星轨迹历史（用于尘埃彗尾的尾迹）
        this.trailHistory = [];
        this.maxTrailHistory = 200;

        // 每个粒子的随机偏移参数
        this.particleOffsets = [];
        for (let i = 0; i < COMET_DATA.tailParticleCount; i++) {
            this.particleOffsets.push({
                x: (Math.random() - 0.5) * 0.8,
                y: (Math.random() - 0.5) * 0.8,
                z: (Math.random() - 0.5) * 0.8
            });
        }
    }

    createNucleus() {
        const geometry = new THREE.SphereGeometry(COMET_DATA.nucleusRadius, 16, 16);
        const material = new THREE.MeshBasicMaterial({
            color: COMET_DATA.nucleusColor
        });
        this.nucleus = new THREE.Mesh(geometry, material);
        this.orbitGroup.add(this.nucleus);

        // 彗核微弱光晕
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, 'rgba(200, 220, 255, 0.6)');
        grad.addColorStop(0.5, 'rgba(150, 200, 255, 0.2)');
        grad.addColorStop(1, 'rgba(100, 150, 255, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 64, 64);
        const texture = new THREE.CanvasTexture(canvas);

        const glowMat = new THREE.SpriteMaterial({
            map: texture,
            color: 0x88ccff,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            opacity: 0.6
        });
        const glow = new THREE.Sprite(glowMat);
        glow.scale.set(2, 2, 1);
        this.nucleus.add(glow);
    }

    createTail() {
        const count = COMET_DATA.tailParticleCount;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        // 使用 AdditiveBlending 实现发光尾迹效果
        const material = new THREE.PointsMaterial({
            color: 0x88ddff,
            size: 0.4,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            sizeAttenuation: true
        });

        this.tailPoints = new THREE.Points(geometry, material);
        this.orbitGroup.add(this.tailPoints);
    }

    /**
     * @param {number} time - 当前模拟时间（秒）
     */
    update(time) {
        // 计算轨道位置（含初始平近点角）
        const initialMA = COMET_DATA.initialMeanAnomaly * Math.PI / 180;
        const theta = this.orbit.getTrueAnomaly(time, COMET_DATA.orbitalPeriod, initialMA);
        const pos = this.orbit.getPosition3D(theta);

        // 更新彗核
        this.nucleus.position.set(pos.x, pos.y, pos.z);
        this.nucleus.rotation.y += 0.01;

        // 距太阳距离决定彗尾亮度
        const sunDist = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
        const tailBrightness = Math.max(0.05, Math.min(1.0, 25 / (sunDist + 5)));

        // 计算轨道切线方向（速度方向）
        const dTheta = 0.001;
        const nextTheta = this.orbit.getTrueAnomaly(time + dTheta, COMET_DATA.orbitalPeriod, initialMA);
        const nextPos = this.orbit.getPosition3D(nextTheta);
        const velDir = new THREE.Vector3(
            nextPos.x - pos.x,
            nextPos.y - pos.y,
            nextPos.z - pos.z
        ).normalize();

        // 更新彗尾（传入亮度与速度方向）
        this.updateTail(pos, tailBrightness, velDir);

        // 更新材质透明度
        this.tailPoints.material.opacity = tailBrightness * 0.8;

        // 彗核光晕随位置变化
        if (this.nucleus.children.length > 0) {
            const glow = this.nucleus.children[this.nucleus.children.length - 1];
            if (glow.isSprite) {
                const s = 1.5 + tailBrightness * 2.5;
                glow.scale.set(s, s, 1);
                glow.material.opacity = 0.3 + tailBrightness * 0.5;
            }
        }

        // 轨道线透明度随彗星亮度变化
        if (this.orbitLine) {
            this.orbitLine.material.opacity = 0.2 + tailBrightness * 0.4;
        }

        // 记录位置到轨迹历史
        this.trailHistory.push({ x: pos.x, y: pos.y, z: pos.z });
        if (this.trailHistory.length > this.maxTrailHistory) {
            this.trailHistory.shift();
        }
    }

    /**
     * 更新彗尾粒子位置
     * 彗尾方向：混合"背向太阳"（离子尾）与"运动反方向"（尘埃尾）
     * @param {Object} cometPos - 彗核当前坐标 {x, y, z}
     * @param {number} brightness - 彗尾亮度 0~1
     * @param {THREE.Vector3} velDir - 彗星速度方向（单位向量）
     */
    updateTail(cometPos, brightness, velDir) {
        const positions = this.tailPoints.geometry.attributes.position.array;
        const count = COMET_DATA.tailParticleCount;

        // 背向太阳方向（离子彗尾）
        const toSun = new THREE.Vector3(cometPos.x, cometPos.y, cometPos.z).normalize();
        const antiSun = toSun.clone().negate();

        // 混合方向：70% 背向太阳 + 30% 运动反方向（尘埃尾滞后）
        const tailDir = new THREE.Vector3()
            .copy(antiSun)
            .multiplyScalar(0.7)
            .addScaledVector(velDir, -0.3)
            .normalize();

        // 彗尾长度随亮度变化（近日点时最长）
        const tailLength = 8 + brightness * 25;

        // 有效轨迹点数（用于尘埃尾迹分布）
        const usableTrailLen = Math.min(this.trailHistory.length, 30 + Math.floor(brightness * 80));

        for (let i = 0; i < count; i++) {
            const t = i / count; // 0=靠近彗核 1=彗尾末端
            const spread = 0.05 + t * brightness * 2.5;
            const offset = this.particleOffsets[i];

            // 混合策略：
            // - 前 30% 粒子用反太阳方向（离子尾）
            // - 后 70% 粒子叠加轨迹历史（尘埃尾）
            let bx = cometPos.x;
            let by = cometPos.y;
            let bz = cometPos.z;

            if (t > 0.3 && usableTrailLen > 0) {
                const histMix = (t - 0.3) / 0.7;
                const histIdx = Math.floor(histMix * usableTrailLen);
                const revIdx = this.trailHistory.length - 1 - histIdx;
                if (revIdx >= 0 && revIdx < this.trailHistory.length) {
                    const h = this.trailHistory[revIdx];
                    bx = h.x;
                    by = h.y;
                    bz = h.z;
                }
            }

            // 沿尾方向偏移
            const distAlongTail = t * tailLength;

            positions[i * 3]     = bx + tailDir.x * distAlongTail + offset.x * spread;
            positions[i * 3 + 1] = by + tailDir.y * distAlongTail + offset.y * spread;
            positions[i * 3 + 2] = bz + tailDir.z * distAlongTail + offset.z * spread;
        }

        this.tailPoints.geometry.attributes.position.needsUpdate = true;
    }
}

/**
 * 创建哈雷彗星
 * @param {THREE.Scene} scene
 * @returns {Comet}
 */
export function createComet(scene) {
    return new Comet(scene);
}

/**
 * 更新哈雷彗星（每帧调用）
 * @param {Comet} comet
 * @param {number} time - 当前模拟时间（秒）
 */
export function updateComet(comet, time) {
    comet.update(time);
}
