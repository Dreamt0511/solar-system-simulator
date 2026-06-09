// 太阳着色器（核心球体）
export const sunVertexShader = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vViewPosition;

void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
}
`;

export const sunFragmentShader = `
uniform float time;
uniform vec3 color1;
uniform vec3 color2;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vViewPosition;

// 噪声函数
float noise(vec3 p) {
    return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
}

float fbm(vec3 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    for (int i = 0; i < 6; i++) {
        value += amplitude * noise(p * frequency);
        amplitude *= 0.5;
        frequency *= 2.0;
    }
    return value;
}

void main() {
    vec3 pos = vPosition * 2.0 + time * 0.1;
    float n = fbm(pos);

    vec3 color = mix(color1, color2, n);

    // 边缘变暗效果（立体感）
    vec3 viewDir = normalize(vViewPosition);
    float rim = dot(vNormal, viewDir);
    color *= 0.7 + 0.3 * rim;

    gl_FragColor = vec4(color, 1.0);
}
`;

// 太阳日冕着色器（外层发光）
export const sunCoronaVertexShader = `
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
}
`;

export const sunCoronaFragmentShader = `
uniform float time;
uniform vec3 glowColor;

varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
    vec3 viewDir = normalize(vViewPosition);
    float rim = 1.0 - max(0.0, dot(vNormal, viewDir));
    float glow = pow(rim, 3.0) * 1.5;

    // 动态闪烁
    float flicker = sin(time * 2.0) * 0.1 + 0.9;
    glow *= flicker;

    vec3 color = glowColor * glow;
    float alpha = glow * 0.6;

    gl_FragColor = vec4(color, alpha);
}
`;

// 大气层着色器
export const atmosphereVertexShader = `
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const atmosphereFragmentShader = `
uniform vec3 atmosphereColor;
uniform float atmosphereIntensity;

varying vec3 vNormal;
varying vec3 vPosition;

void main() {
    vec3 viewDir = normalize(-vPosition);
    float fresnel = pow(1.0 - dot(vNormal, viewDir), 3.0);

    vec3 color = atmosphereColor * fresnel * atmosphereIntensity;
    float alpha = fresnel * 0.8;

    gl_FragColor = vec4(color, alpha);
}
`;

// 地球大气散射（Rayleigh 散射）
export const earthAtmosphereVertexShader = `
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldPosition;

void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const earthAtmosphereFragmentShader = `
uniform vec3 sunDirection;
uniform vec3 earthColor;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldPosition;

void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(-vPosition);

    float fresnel = 1.0 - max(0.0, dot(normal, viewDir));
    fresnel = pow(fresnel, 3.0);

    float sunAngle = max(0.0, dot(normalize(sunDirection), viewDir));

    vec3 blueScatter = vec3(0.3, 0.6, 1.0);
    vec3 orangeScatter = vec3(1.0, 0.5, 0.2);

    float mixFactor = smoothstep(0.0, 0.5, sunAngle);
    vec3 scatterColor = mix(orangeScatter, blueScatter, mixFactor);

    float intensity = fresnel * (0.3 + 0.3 * sunAngle);
    intensity *= 0.6;

    vec3 finalColor = scatterColor * intensity;

    gl_FragColor = vec4(finalColor, intensity * 0.7);
}
`;

// 土星环着色器
export const ringVertexShader = `
varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const ringFragmentShader = `
uniform sampler2D ringTexture;
uniform float opacity;

varying vec2 vUv;

void main() {
    vec4 color = texture2D(ringTexture, vUv);
    color.a *= opacity;
    gl_FragColor = color;
}
`;
