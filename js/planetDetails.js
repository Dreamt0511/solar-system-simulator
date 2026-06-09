import * as THREE from 'three';
import { earthAtmosphereVertexShader, earthAtmosphereFragmentShader } from './shaders.js';

// ============================================================
// 行星细节增强模块
// 地球夜景灯光 + 地球云层 + 地球大气散射
// ============================================================

// ---------- Canvas 纹理生成 ----------

/**
 * 加载真实地球夜景纹理
 */
function createNightLightsTexture() {
    const texture = new THREE.TextureLoader().load('textures/earth_night.jpg');
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
}

// ---------- 自定义 Shader ----------

/** 地球日夜混合顶点着色器 */
const earthDayNightVertex = `
varying vec2 vUv;
varying vec3 vNormal;

void main() {
    vUv = uv;
    vNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/** 地球日夜混合片段着色器 */
const earthDayNightFragment = `
uniform sampler2D dayMap;
uniform sampler2D nightMap;
uniform vec3 sunDirection;
uniform float nightIntensity;

varying vec2 vUv;
varying vec3 vNormal;

void main() {
    vec3 normal = normalize(vNormal);
    float NdotL = dot(normal, sunDirection);
    float dayFactor = smoothstep(-0.15, 0.25, NdotL);
    vec4 dayColor = texture2D(dayMap, vUv);
    vec4 nightColor = texture2D(nightMap, vUv);
    gl_FragColor = mix(nightColor * nightIntensity, dayColor, dayFactor);
}
`;


// ---------- 主创建函数 ----------

/**
 * 生成程序化云纹理
 */
function createCloudTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    function hash(x, y) {
        const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
        return n - Math.floor(n);
    }

    function smoothNoise(x, y) {
        const ix = Math.floor(x);
        const iy = Math.floor(y);
        const fx = x - ix;
        const fy = y - iy;
        const ux = fx * fx * (3 - 2 * fx);
        const uy = fy * fy * (3 - 2 * fy);
        const a = hash(ix, iy);
        const b = hash(ix + 1, iy);
        const c = hash(ix, iy + 1);
        const d = hash(ix + 1, iy + 1);
        return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
    }

    function fbm(x, y, octaves) {
        let value = 0;
        let amp = 0.5;
        let freq = 1;
        for (let i = 0; i < octaves; i++) {
            value += amp * smoothNoise(x * freq, y * freq);
            amp *= 0.5;
            freq *= 2;
        }
        return value;
    }

    const imageData = ctx.createImageData(canvas.width, canvas.height);
    const data = imageData.data;

    // 预生成噪声场，然后用无缝拼接的后处理消除水平接缝
    const temp = new Float32Array(canvas.width * canvas.height);

    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            const u = x / canvas.width;
            const v = y / canvas.height;

            // 分形噪声
            const n = fbm(u * 5, v * 5, 4);

            // 纬度带：赤道云多，两极云少（更真实）
            const latWeight = 0.4 + 0.6 * Math.pow(Math.sin(v * Math.PI), 1.5);

            // 调低云密度：提高阈值，降低对比度
            const cloudValue = Math.max(0, Math.min(1, (n * latWeight - 0.45) * 1.5));
            temp[y * canvas.width + x] = cloudValue;
        }
    }

    // 水平无缝处理：靠近左右边缘时，混合对面的像素
    const blendWidth = Math.floor(canvas.width * 0.08); // 8% 边缘混合
    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < blendWidth; x++) {
            const t = x / blendWidth;
            const blendFactor = t * t * (3 - 2 * t); // smoothstep
            const mirrorX = canvas.width - 1 - x;
            const idx = y * canvas.width + x;
            const mirrorIdx = y * canvas.width + mirrorX;
            temp[idx] = temp[idx] * (1 - blendFactor) + temp[mirrorIdx] * blendFactor;
            // 对称处理右边缘
            const rx = canvas.width - 1 - x;
            const ridx = y * canvas.width + rx;
            temp[ridx] = temp[ridx] * (1 - blendFactor) + temp[y * canvas.width + blendWidth - 1 - x] * blendFactor;
        }
    }

    // 写入像素
    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            const val = temp[y * canvas.width + x];
            const idx = (y * canvas.width + x) * 4;
            const alpha = Math.round(val * 255);
            data[idx] = 255;
            data[idx + 1] = 255;
            data[idx + 2] = 255;
            data[idx + 3] = alpha;
        }
    }
    ctx.putImageData(imageData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
}

/**
 * 创建行星细节增强效果
 * @param {THREE.Scene} scene
 * @param {Object} planets - { sun, earth, jupiter, saturn, ... }
 * @returns {Object} details 引用，供 updatePlanetDetails 使用
 */
export function createPlanetDetails(scene, planets) {
    const details = {
        earthNightShader: null,
        earthCloudMesh: null,
        earthAtmosphere: null,
    };

    // ------ 1. 地球夜景灯光 ------
    if (planets.earth) {
        const earthRadius = planets.earth.geometry.parameters.radius;
        const nightTexture = createNightLightsTexture();

        const originalMat = planets.earth.material;
        const originalColor = originalMat.color.clone();

        // 纯色模式下，地球保留 MeshBasicMaterial，不应用 shader
        // 用原始颜色生成一张纯色"日间"纹理（供纹理模式使用）
        const dayCanvas = document.createElement('canvas');
        dayCanvas.width = 4;
        dayCanvas.height = 4;
        const dayCtx = dayCanvas.getContext('2d');
        dayCtx.fillStyle = `#${originalColor.getHexString()}`;
        dayCtx.fillRect(0, 0, 4, 4);
        const dayTexture = new THREE.CanvasTexture(dayCanvas);

        const shaderMat = new THREE.ShaderMaterial({
            uniforms: {
                dayMap: { value: dayTexture },
                nightMap: { value: nightTexture },
                sunDirection: { value: new THREE.Vector3(1, 0, 0) },
                nightIntensity: { value: 1.5 },
            },
            vertexShader: earthDayNightVertex,
            fragmentShader: earthDayNightFragment,
        });

        // 不立即应用——materialSwitcher 会在切换到纹理模式时使用
        details.earthNightShader = {
            mesh: planets.earth,
            originalMaterial: originalMat,
            shaderMaterial: shaderMat,
            dayTexture,
            nightTexture,
        };
    }

    // ------ 2. 地球云层 ------
    if (planets.earth) {
        const earthRadius = planets.earth.geometry.parameters.radius;
        const cloudTexture = createCloudTexture();
        const cloudGeometry = new THREE.SphereGeometry(earthRadius * 1.02, 32, 32);
        const cloudMaterial = new THREE.MeshBasicMaterial({
            map: cloudTexture,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
            opacity: 0.3,
        });
        const cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
        cloudMesh.userData.pickable = false;
        planets.earth.add(cloudMesh);
        details.earthCloudMesh = { mesh: cloudMesh, texture: cloudTexture };
    }

    // ------ 3. 地球大气散射（仅在纹理模式可见）------
    if (planets.earth) {
        const earthRadius = planets.earth.geometry.parameters.radius;
        const atmoGeometry = new THREE.SphereGeometry(earthRadius * 1.15, 32, 32);
        const atmoMaterial = new THREE.ShaderMaterial({
            vertexShader: earthAtmosphereVertexShader,
            fragmentShader: earthAtmosphereFragmentShader,
            uniforms: {
                sunDirection: { value: new THREE.Vector3(1, 0, 0) },
                earthColor: { value: new THREE.Color(0x2266cc) },
            },
            transparent: true,
            side: THREE.BackSide,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });
        const atmoMesh = new THREE.Mesh(atmoGeometry, atmoMaterial);
        atmoMesh.userData.pickable = false;
        atmoMesh.visible = false; // 默认隐藏，纹理模式才显示
        planets.earth.add(atmoMesh);
        details.earthAtmosphere = { mesh: atmoMesh, material: atmoMaterial };
    }

    return details;
}

// ---------- 更新函数 ----------

/**
 * 每帧更新行星细节动画
 * @param {Object} details - createPlanetDetails 返回的对象
 * @param {number} time - 秒（累计时间）
 */
export function updatePlanetDetails(details, time) {
    if (!details) return;

    // 地球日夜 shader：计算真实太阳方向（太阳在原点 → normalize(-地球位置)）
    // 直接从 earth.mesh.material 读取，避免 materialSwitcher 替换材质后引用失效
    if (details.earthNightShader) {
        const earth = details.earthNightShader.mesh;
        const mat = earth.material;
        if (mat && mat.uniforms && mat.uniforms.sunDirection) {
            const earthPos = new THREE.Vector3();
            earth.getWorldPosition(earthPos);
            mat.uniforms.sunDirection.value.set(-earthPos.x, -earthPos.y, -earthPos.z).normalize();
        }
    }

    // 云层旋转（速度约为地球自转的 1.5 倍）
    if (details.earthCloudMesh) {
        details.earthCloudMesh.mesh.rotation.y = time * 0.006;
    }

    // 更新大气散射太阳方向
    if (details.earthAtmosphere) {
        const earthPos = new THREE.Vector3();
        details.earthAtmosphere.mesh.getWorldPosition(earthPos);
        details.earthAtmosphere.material.uniforms.sunDirection.value.set(
            -earthPos.x, -earthPos.y, -earthPos.z
        ).normalize();
    }

}
