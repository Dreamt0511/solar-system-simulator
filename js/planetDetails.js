import * as THREE from 'three';

// ============================================================
// 行星细节增强模块
// 木星大红斑 / 土星环阴影 / 地球夜景灯光 / 极光效果
// ============================================================

// ---------- Canvas 纹理生成 ----------

/**
 * 生成木星大红斑纹理（椭圆形红褐色斑块，边缘渐变）
 */
function createGreatRedSpotTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // 透明底
    ctx.clearRect(0, 0, 512, 256);

    // 大红斑中心位于南半球约 -23°，对应 UV 约 y=0.64
    const cx = 256;
    const cy = 163;
    const rx = 56;  // 椭圆长轴
    const ry = 32;  // 椭圆短轴

    // 径向渐变模拟边缘扩散
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
    grad.addColorStop(0, 'rgba(190, 90, 50, 0.85)');
    grad.addColorStop(0.4, 'rgba(170, 75, 40, 0.7)');
    grad.addColorStop(0.7, 'rgba(150, 65, 35, 0.4)');
    grad.addColorStop(1, 'rgba(130, 55, 30, 0)');

    ctx.save();
    ctx.scale(rx / ry, 1); // 拉伸成椭圆
    ctx.beginPath();
    ctx.arc(cx * (ry / rx), cy, ry, 0, Math.PI * 2);
    ctx.closePath();
    ctx.restore();

    ctx.fillStyle = grad;
    ctx.fill();

    // 内部深色核心
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx * 0.35);
    core.addColorStop(0, 'rgba(160, 60, 30, 0.6)');
    core.addColorStop(1, 'rgba(160, 60, 30, 0)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx * 0.35, ry * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
}

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
varying vec3 vWorldPos;

void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
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
varying vec3 vWorldPos;

void main() {
    vec3 normal = normalize(vNormal);
    // 用法线近似光照方向（地球自身旋转，法线在世界空间中变化）
    float NdotL = dot(normal, sunDirection);

    // 平滑过渡：白天 → 黄昏 → 夜晚
    float dayFactor = smoothstep(-0.15, 0.25, NdotL);

    vec4 dayColor = texture2D(dayMap, vUv);
    vec4 nightColor = texture2D(nightMap, vUv);

    vec4 color = mix(nightColor * nightIntensity, dayColor, dayFactor);
    gl_FragColor = color;
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
        greatRedSpot: null,
        earthNightShader: null,
    };

    // ------ 1. 木星大红斑 ------
    if (planets.jupiter) {
        const jupiterRadius = planets.jupiter.geometry.parameters.radius;
        const spotTexture = createGreatRedSpotTexture();

        // 略大于木星的透明球体，承载大红斑纹理
        const spotGeo = new THREE.SphereGeometry(jupiterRadius * 1.005, 48, 24);
        const spotMat = new THREE.MeshBasicMaterial({
            map: spotTexture,
            transparent: true,
            opacity: 0.9,
            depthWrite: false,
            blending: THREE.NormalBlending,
        });
        const spotMesh = new THREE.Mesh(spotGeo, spotMat);
        // 初始旋转：让大红斑朝向观察者（大红斑纹理在 canvas 中已经画在正确 UV 位置）
        planets.jupiter.add(spotMesh);
        details.greatRedSpot = { mesh: spotMesh, baseRotation: 0 };
    }

    // ------ 2. 地球夜景灯光 ------
    if (planets.earth) {
        const earthRadius = planets.earth.geometry.parameters.radius;
        const nightTexture = createNightLightsTexture();

        // 替换地球的材质为自定义 ShaderMaterial（日夜混合）
        // 保存原始材质的引用，以便恢复
        const originalMat = planets.earth.material;
        const originalColor = originalMat.color.clone();

        // 用原始颜色生成一张纯色"日间"纹理
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

        planets.earth.material = shaderMat;
        planets.earth.material.needsUpdate = true;

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

    // 木星大红斑漂移（模拟 ~4.5 天自转周期，这里用慢速动画）
    if (details.greatRedSpot) {
        // 大红斑相对于木星表面缓慢漂移
        details.greatRedSpot.mesh.rotation.y = time * 0.05;
    }

    // 地球日夜 shader：太阳方向随时间缓慢变化
    if (details.earthNightShader) {
        const u = details.earthNightShader.shaderMaterial.uniforms;
        // 地球自转，太阳方向在地球局部坐标中旋转
        const angle = time * 0.15;
        u.sunDirection.value.set(Math.cos(angle), 0.1, Math.sin(angle)).normalize();
    }

}
