import * as THREE from 'three';

export class MilkyWayGalaxy {
    constructor(scene) {
        this.scene = scene;
        this.visible = true;

        const count = 18000;
        const radius = 1000;
        const armCount = 2;
        const spiralTightness = 4.5;
        const armSpread = 0.45;

        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const sizes = new Float32Array(count);

        const coreColor = new THREE.Color(0xffdd66);
        const innerArmColor = new THREE.Color(0xeeddbb);
        const outerArmColor = new THREE.Color(0x8888ff);
        const haloColor = new THREE.Color(0x445588);

        for (let i = 0; i < count; i++) {
            const isHalo = i < count * 0.15;
            const isCore = !isHalo && i < count * 0.25;

            let r, theta, yOffset;

            if (isCore) {
                // 银河核心 — 密集球状
                r = Math.random() * 120;
                theta = Math.random() * Math.PI * 2;
                yOffset = (Math.random() - 0.5) * 40;
            } else if (isHalo) {
                // 弥散晕 — 稀疏球状
                r = 300 + Math.random() * 700;
                theta = Math.random() * Math.PI * 2;
                yOffset = (Math.random() - 0.5) * 200;
            } else {
                // 旋臂粒子
                const armIndex = Math.floor(Math.random() * armCount);
                const baseTheta = (armIndex / armCount) * Math.PI * 2;
                // 对数螺线: r = a * exp(b * theta)
                const t = Math.random();
                const t2 = t * t;
                r = 80 + t2 * 900;
                const spiralAngle = t * spiralTightness * Math.PI;
                theta = baseTheta + spiralAngle + (Math.random() - 0.5) * armSpread;
                // 盘面厚度从中心到边缘增加
                const maxThickness = 30 + (r / radius) * 50;
                yOffset = (Math.random() - 0.5) * maxThickness;
            }

            const x = r * Math.cos(theta);
            const z = r * Math.sin(theta);
            const y = yOffset;

            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;

            // 颜色
            let color;
            const distNorm = Math.min(r / radius, 1);
            if (isCore) {
                color = coreColor.clone().lerp(innerArmColor, Math.random() * 0.5);
            } else if (isHalo) {
                color = haloColor.clone();
            } else if (distNorm < 0.3) {
                color = coreColor.clone().lerp(innerArmColor, distNorm / 0.3);
            } else {
                color = innerArmColor.clone().lerp(outerArmColor, (distNorm - 0.3) / 0.7);
            }
            // 随机亮度微调
            color.multiplyScalar(0.7 + Math.random() * 0.3);

            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;

            // 大小：核心大，向外递减
            if (isCore) {
                sizes[i] = 1.5 + Math.random() * 2.0;
            } else if (isHalo) {
                sizes[i] = 0.3 + Math.random() * 0.5;
            } else {
                const sizeT = 1 - distNorm;
                sizes[i] = 0.5 + sizeT * 1.5 + Math.random() * 0.5;
            }
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        // 生成圆形粒子纹理
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.3, 'rgba(255,255,255,0.8)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);
        const particleTexture = new THREE.CanvasTexture(canvas);

        const material = new THREE.PointsMaterial({
            size: 1.5,
            map: particleTexture,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            transparent: true,
            vertexColors: true,
            sizeAttenuation: true,
        });

        this.points = new THREE.Points(geometry, material);
        this.points.rotation.x = Math.PI / 2; // XZ 平面
        this.points.renderOrder = -1;
        scene.add(this.points);

        // 设置场景背景为黑色
        this.savedBackground = scene.background;
        scene.background = new THREE.Color(0x000000);
    }

    update(time) {
        // 缓慢自转，周期约 120 秒
        this.points.rotation.z = time * (Math.PI * 2 / 120);
    }

    setVisible(visible) {
        this.visible = visible;
        this.points.visible = visible;
    }

    dispose() {
        this.points.geometry.dispose();
        this.points.material.dispose();
        this.scene.remove(this.points);
    }
}
