import * as THREE from 'three';

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
varying vec3 vViewPosition;

void main() {
    vUv = uv;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPos.xyz;
    gl_Position = projectionMatrix * mvPos;
}
`;

/** 地球日夜混合片段着色器（含程序化云层 + 大气散射） */
const earthDayNightFragment = `
uniform sampler2D dayMap;
uniform sampler2D nightMap;
uniform vec3 sunDirection;
uniform float nightIntensity;
uniform float cloudTime;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;

// 2D 噪声云
float cloudNoise(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float smoothCloud(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = cloudNoise(i);
    float b = cloudNoise(i + vec2(1.0, 0.0));
    float c = cloudNoise(i + vec2(0.0, 1.0));
    float d = cloudNoise(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbmCloud(vec2 p) {
    float v = 0.0, amp = 0.5, freq = 1.0;
    for (int i = 0; i < 5; i++) {
        v += amp * smoothCloud(p * freq);
        amp *= 0.5;
        freq *= 2.0;
    }
    return v;
}

void main() {
    vec3 normal = normalize(vNormal);
    float NdotL = dot(normal, sunDirection);
    float dayFactor = smoothstep(-0.15, 0.25, NdotL);
    vec4 dayColor = texture2D(dayMap, vUv);
    vec4 nightColor = texture2D(nightMap, vUv);
    vec4 baseColor = mix(nightColor * nightIntensity, dayColor, dayFactor);

    // 程序化云层（随 cloudTime 缓慢漂移）
    vec2 cloudUv = vUv * 5.0 + vec2(cloudTime * 0.003, 0.0);
    float cloud = fbmCloud(cloudUv);
    cloud = max(0.0, (cloud - 0.4) * 2.5);
    cloud = min(1.0, cloud);
    float lat = sin(vUv.y * 3.14159);
    cloud *= 0.25 + 0.75 * pow(lat, 1.2);
    cloud *= smoothstep(0.0, 0.3, NdotL);
    vec3 cloudColor = vec3(1.0, 1.0, 1.0);
    vec3 finalColor = mix(baseColor.rgb, cloudColor, cloud * 0.35);

    // 大气散射边缘光晕（Fresnel 边缘发光）
    vec3 viewDir = normalize(vViewPosition);
    float fresnel = 1.0 - max(0.0, dot(normal, viewDir));
    fresnel = pow(fresnel, 3.0);
    float sunAngle = max(0.0, dot(normalize(sunDirection), viewDir));
    vec3 blueScatter = vec3(0.3, 0.6, 1.0);
    vec3 orangeScatter = vec3(1.0, 0.5, 0.2);
    float mixFactor = smoothstep(0.0, 0.5, sunAngle);
    vec3 atmoColor = mix(orangeScatter, blueScatter, mixFactor);
    float atmoIntensity = fresnel * (0.3 + 0.3 * sunAngle) * 0.6 * 0.7;
    finalColor += atmoColor * atmoIntensity;

    gl_FragColor = vec4(finalColor, 1.0);
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
                cloudTime: { value: 0 },
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
        if (mat && mat.uniforms) {
            // 更新太阳方向
            if (mat.uniforms.sunDirection) {
                const earthPos = new THREE.Vector3();
                earth.getWorldPosition(earthPos);
                mat.uniforms.sunDirection.value.set(-earthPos.x, -earthPos.y, -earthPos.z).normalize();
            }
            // 更新云层时间
            if (mat.uniforms.cloudTime !== undefined) {
                mat.uniforms.cloudTime.value = time;
            }
        }
    }

}
