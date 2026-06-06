import * as THREE from 'three';

export class Starfield {
    constructor(scene, count = 200000) {
        this.scene = scene;
        this.count = count;
        this.stars = null;

        this.createStarfield();
    }

    createStarfield() {
        // 创建几何体
        const geometry = new THREE.BufferGeometry();

        // 位置数组
        const positions = new Float32Array(this.count * 3);

        // 颜色数组
        const colors = new Float32Array(this.count * 3);

        // 大小数组
        const sizes = new Float32Array(this.count);

        // 生成随机星星
        for (let i = 0; i < this.count; i++) {
            // 随机球形分布
            const radius = 5000 + Math.random() * 5000;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = radius * Math.cos(phi);

            // 随机颜色（白色到淡蓝色）
            const colorChoice = Math.random();
            if (colorChoice > 0.9) {
                // 蓝色恒星
                colors[i * 3] = 0.7;
                colors[i * 3 + 1] = 0.8;
                colors[i * 3 + 2] = 1.0;
            } else if (colorChoice > 0.8) {
                // 黄色恒星
                colors[i * 3] = 1.0;
                colors[i * 3 + 1] = 0.95;
                colors[i * 3 + 2] = 0.8;
            } else if (colorChoice > 0.7) {
                // 红色恒星
                colors[i * 3] = 1.0;
                colors[i * 3 + 1] = 0.8;
                colors[i * 3 + 2] = 0.7;
            } else {
                // 白色恒星
                colors[i * 3] = 1.0;
                colors[i * 3 + 1] = 1.0;
                colors[i * 3 + 2] = 1.0;
            }

            // 随机大小
            sizes[i] = 0.5 + Math.random() * 2.0;
        }

        // 设置属性
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        // 创建着色器材质
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                pixelRatio: { value: window.devicePixelRatio }
            },
            vertexShader: `
                attribute float size;
                attribute vec3 color;
                uniform float time;
                uniform float pixelRatio;
                varying vec3 vColor;
                varying float vOpacity;

                void main() {
                    vColor = color;

                    // 闪烁效果
                    float twinkle = sin(time * 2.0 + position.x * 0.01) * 0.3 + 0.7;
                    vOpacity = twinkle;

                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * pixelRatio * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                varying float vOpacity;

                void main() {
                    // 圆形粒子
                    vec2 center = gl_PointCoord - vec2(0.5);
                    float dist = length(center);

                    if (dist > 0.5) discard;

                    // 柔和边缘
                    float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
                    alpha *= vOpacity;

                    gl_FragColor = vec4(vColor, alpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        // 创建粒子系统
        this.stars = new THREE.Points(geometry, material);
        this.scene.add(this.stars);
    }

    update(time) {
        if (this.stars && this.stars.material.uniforms) {
            this.stars.material.uniforms.time.value = time;
        }
    }

    dispose() {
        if (this.stars) {
            this.scene.remove(this.stars);
            this.stars.geometry.dispose();
            this.stars.material.dispose();
        }
    }
}
