import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// ACES色调映射着色器
const ACESFilmicToneMappingShader = {
    uniforms: {
        'tDiffuse': { value: null },
        'exposure': { value: 1.0 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float exposure;
        varying vec2 vUv;

        vec3 ACESFilm(vec3 x) {
            float a = 2.51;
            float b = 0.03;
            float c = 2.43;
            float d = 0.59;
            float e = 0.14;
            return clamp((x*(a*x+b))/(x*(c*x+d)+e), 0.0, 1.0);
        }

        void main() {
            vec4 color = texture2D(tDiffuse, vUv);
            color.rgb *= exposure;
            color.rgb = ACESFilm(color.rgb);

            // Gamma校正
            color.rgb = pow(color.rgb, vec3(1.0 / 2.2));

            gl_FragColor = color;
        }
    `
};

export class PostProcessing {
    constructor(renderer, scene, camera) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;

        this.setupComposer();
    }

    setupComposer() {
        // 创建合成器
        this.composer = new EffectComposer(this.renderer);

        // 渲染通道
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        // Bloom泛光
        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            1.5,  // 强度
            0.4,  // 半径
            0.85  // 阈值
        );
        this.composer.addPass(this.bloomPass);

        // 色调映射
        this.toneMappingPass = new ShaderPass(ACESFilmicToneMappingShader);
        this.toneMappingPass.uniforms.exposure.value = 1.0;
        this.composer.addPass(this.toneMappingPass);

        // 处理窗口大小变化
        window.addEventListener('resize', () => {
            this.onWindowResize();
        });
    }

    onWindowResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.composer.setSize(width, height);
        this.bloomPass.resolution.set(width, height);
    }

    setBloomStrength(strength) {
        this.bloomPass.strength = strength;
    }

    setBloomRadius(radius) {
        this.bloomPass.radius = radius;
    }

    setBloomThreshold(threshold) {
        this.bloomPass.threshold = threshold;
    }

    setExposure(exposure) {
        this.toneMappingPass.uniforms.exposure.value = exposure;
    }

    render() {
        this.composer.render();
    }
}
