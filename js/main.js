import * as THREE from 'three';
import { createScene, createLighting } from './scene.js';
import { createAllPlanets, PLANET_DATA } from './planets.js';
import { createAllOrbits, updatePlanetPosition, KeplerOrbit } from './orbital.js';
import { CameraController } from './controls.js';
import { PostProcessing } from './effects.js';
import { UIManager } from './ui.js';
import { Starfield } from './starfield.js';
import { AsteroidBelt } from './asteroidBelt.js';
import { TextureManager } from './textureManager.js';
import { MaterialSwitcher } from './materialSwitcher.js';
import { PlanetList } from './planetList.js';

class SolarSystemApp {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.planets = {};
        this.orbits = {};
        this.starfield = null;
        this.asteroidBelt = null;
        this.cameraController = null;
        this.postProcessing = null;
        this.uiManager = null;
        this.textureManager = null;
        this.materialSwitcher = null;

        this.clock = new THREE.Clock();
        this.simulationTime = 0;
        this.isPaused = false;
        this.timeSpeed = 1;

        this.init();
    }

    async init() {
        try {
        // 初始化UI
        this.uiManager = new UIManager();
        this.uiManager.setLoadingProgress(10, '初始化场景...');

        // 创建场景
        const { scene, camera, renderer } = createScene();
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;

        this.uiManager.setLoadingProgress(20, '创建光照...');

        // 创建光照
        createLighting(this.scene);

        this.uiManager.setLoadingProgress(30, '生成星空...');

        // 创建星空
        this.starfield = new Starfield(this.scene, 50000);

        this.uiManager.setLoadingProgress(50, '创建行星...');

        // 创建行星
        this.planets = createAllPlanets(this.scene);

        // 初始化纹理系统
        this.textureManager = new TextureManager();
        this.materialSwitcher = new MaterialSwitcher(this.planets, this.textureManager.cache);

        // 加载纹理
        this.textureManager.loadAll((loaded, total) => {
            this.uiManager.setLoadingProgress(50 + (loaded / total) * 30, `加载纹理: ${loaded}/${total}`);
        }).then(() => {
            // 纹理加载完成，启用开关
            const textureBtn = document.getElementById('texture-toggle');
            if (textureBtn) {
                textureBtn.disabled = false;
                textureBtn.textContent = '开启';
            }
        });

        this.uiManager.setLoadingProgress(70, '计算轨道...');

        // 创建轨道线
        this.orbits = createAllOrbits(this.scene, PLANET_DATA);
        this.asteroidBelt = new AsteroidBelt(this.scene);

        this.uiManager.setLoadingProgress(80, '初始化控制器...');

        // 初始化相机控制器
        this.cameraController = new CameraController(this.camera, this.renderer, this.scene);

        // 初始化后处理
        this.postProcessing = new PostProcessing(this.renderer, this.scene, this.camera);

        // 初始化行星列表
        this.planetList = new PlanetList(
            { ...this.planets, asteroidBelt: this.asteroidBelt?.hitMesh },
            this.cameraController
        );

        this.uiManager.setLoadingProgress(90, '绑定事件...');

        // 绑定UI事件
        this.setupUIBindings();

        this.uiManager.setLoadingProgress(100, '准备就绪！');

        // 短暂延迟后隐藏加载界面
        setTimeout(() => {
            this.uiManager.hideLoadingScreen();
        }, 500);

        // 开始渲染循环
        this.animate();

        } catch (error) {
            console.error('初始化失败:', error);
            // 强制隐藏加载界面并显示错误
            const loading = document.getElementById('loading-screen');
            if (loading) {
                const loadingText = document.getElementById('loading-text');
                if (loadingText) {
                    loadingText.textContent = '加载失败: ' + error.message;
                }
                setTimeout(() => {
                    loading.style.display = 'none';
                }, 3000);
            }
        }
    }

    setupUIBindings() {
        // 时间速度控制
        this.uiManager.on('timeSpeedChanged', (speed) => {
            this.timeSpeed = speed;
        });

        // 暂停控制
        this.uiManager.on('pauseChanged', (paused) => {
            this.isPaused = paused;
        });

        // 重置视角
        this.uiManager.on('resetView', () => {
            this.cameraController.resetView();
        });

        // 设置图标点击事件
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.uiManager.toggleControlsPanel();
            });
        }

        // 纹理开关事件
        const textureBtn = document.getElementById('texture-toggle');
        if (textureBtn) {
            textureBtn.addEventListener('click', () => {
                if (this.materialSwitcher) {
                    this.materialSwitcher.toggle();
                    textureBtn.textContent = this.materialSwitcher.isTextureMode ? '关闭' : '开启';
                }
            });
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const delta = this.clock.getDelta();

        // 更新模拟时间
        if (!this.isPaused) {
            this.simulationTime += delta * this.timeSpeed;
        }

        // 更新行星位置
        this.updatePlanets();

        // 更新星空闪烁
        if (this.starfield) {
            this.starfield.update(this.simulationTime);
        }
        if (this.asteroidBelt) {
            this.asteroidBelt.update(this.simulationTime);
        }

        // 更新太阳光晕动画
        if (this.planets.sun && this.planets.sun.userData.glow) {
            const scale = 5.5 + Math.sin(this.simulationTime * 2) * 0.5;
            this.planets.sun.userData.glow.scale.set(scale, scale, 1);
        }

        // 更新相机控制器
        this.cameraController.update();

        // 更新土星环
        this.updateRings();

        // 渲染
        this.postProcessing.render();
    }

    updatePlanets() {
        const planetKeys = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

        planetKeys.forEach(key => {
            const planet = this.planets[key];
            if (planet) {
                updatePlanetPosition(planet, this.simulationTime, PLANET_DATA);
            }
        });

        // 更新月球 - 绕地球旋转
        if (this.planets.moon && this.planets.moon.userData.orbitGroup) {
            const moonData = PLANET_DATA.moon;
            // 月球轨道容器旋转
            this.planets.moon.userData.orbitGroup.rotation.y += (2 * Math.PI) / (moonData.orbitalPeriod * 60);
        }
    }

    updateRings() {
        // 土星环跟随土星
        if (this.planets.saturn && this.planets.saturn.userData.rings) {
            // 土星环已经是土星的子对象，会自动跟随
            // 但需要确保旋转同步
            this.planets.saturn.userData.rings.rotation.z = this.planets.saturn.rotation.y;
        }
    }

    dispose() {
        // 清理纹理系统
        if (this.textureManager) {
            this.textureManager.disposeAll();
        }
        if (this.materialSwitcher) {
            this.materialSwitcher.dispose();
        }
    }
}

// 启动应用
window.addEventListener('DOMContentLoaded', () => {
    new SolarSystemApp();
});
