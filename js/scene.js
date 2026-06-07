import * as THREE from 'three';

export function createScene() {
    // 场景
    const scene = new THREE.Scene();

    // 相机 - 横屏视角，能看到最外围行星
    const camera = new THREE.PerspectiveCamera(
        50,
        window.innerWidth / window.innerHeight,
        0.1,
        100000
    );
    camera.position.set(0, 80, 150);
    camera.lookAt(0, 0, 0);

    // 渲染器 - 如果 canvas 不存在则创建
    let canvas = document.getElementById('solar-system-canvas');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'solar-system-canvas';
        document.body.appendChild(canvas);
    }
    const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: true  // 允许截图
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // 窗口大小调整
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    return { scene, camera, renderer };
}

export function createLighting(scene) {
    // 环境光（让背光面也能看到）
    const ambientLight = new THREE.AmbientLight(0x8899cc, 2.0);
    scene.add(ambientLight);

    // 太阳光（点光源）
    const sunLight = new THREE.PointLight(0xffffff, 6, 500);
    sunLight.position.set(0, 0, 0);
    scene.add(sunLight);

    // 半球光（模拟太空环境）
    const hemisphereLight = new THREE.HemisphereLight(0x8899cc, 0x445577, 1.5);
    scene.add(hemisphereLight);

    // 补充方向光 — 从侧面照亮纹理细节
    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight1.position.set(100, 50, 100);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    dirLight2.position.set(-100, -30, -80);
    scene.add(dirLight2);

    return { ambientLight, sunLight, hemisphereLight, dirLight1, dirLight2 };
}
