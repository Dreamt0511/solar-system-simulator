import * as THREE from 'three';

// ============================================================
// 行星细节增强模块
// 地球夜景灯光
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
 * 创建行星细节增强效果
 * @param {THREE.Scene} scene
 * @param {Object} planets - { sun, earth, jupiter, saturn, ... }
 * @returns {Object} details 引用，供 updatePlanetDetails 使用
 */
export function createPlanetDetails(scene, planets) {
    const details = {
        earthNightShader: null,
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

}
