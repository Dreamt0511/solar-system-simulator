import * as THREE from 'three';
import { createScene, createLighting } from './scene.js';
import { createAllPlanets, PLANET_DATA } from './planets.js';
import { createAllOrbits, updatePlanetPosition } from './orbital.js';
import { CameraController } from './controls.js';
import { PostProcessing } from './effects.js';
import { UIManager } from './ui.js';
import { Starfield } from './starfield.js';
import { AsteroidBelt } from './asteroidBelt.js';
import { TextureManager } from './textureManager.js';
import { MaterialSwitcher } from './materialSwitcher.js';
import { PlanetList } from './planetList.js';
import { StarfieldBackground } from './starfieldBackground.js';
import { createExtendedBodies, EXTENDED_DATA } from './extendedBodies.js';
import { getCurrentMeanAnomalies } from './ephemeris.js';
import { createComet, updateComet } from './comet.js';
import { createTrails, updateTrail } from './trailEffect.js';
import { createSolarCorona, updateSolarCorona } from './solarCorona.js';
import { createSpacecraft } from './spacecraft.js';
import { createSolarFlares, updateSolarFlares } from './solarFlares.js';
import { createPlanetDetails, updatePlanetDetails } from './planetDetails.js';
import { createCosmicPhenomena, updateCosmicPhenomena } from './cosmicPhenomena.js';
import { createFirstPerson, updateFirstPerson, setOrbitControls, setCameraController } from './firstPerson.js';

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
        this.starfieldBackground = null;
        this.extendedBodies = null;
        this.comet = null;
        this.trails = null;
        this.corona = null;
        this.spacecraft = null;
        this.solarFlares = null;
        this.planetDetails = null;
        this.cosmicPhenomena = null;
        this.firstPerson = null;

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

        this.uiManager.setLoadingProgress(25, '计算实时轨道位置...');

        // 获取各天体当前真实位置（基于 NASA 历元数据推算）
        const currentPositions = getCurrentMeanAnomalies();
        for (const [key, ma] of Object.entries(currentPositions)) {
            if (PLANET_DATA[key]) {
                PLANET_DATA[key].initialMeanAnomaly = ma;
            }
            if (EXTENDED_DATA[key]) {
                EXTENDED_DATA[key].initialMeanAnomaly = ma;
            }
        }
        console.log('已设置实时轨道位置:', currentPositions);

        this.uiManager.setLoadingProgress(30, '生成星空...');

        // 创建星空
        this.starfield = new Starfield(this.scene, 50000);

        this.uiManager.setLoadingProgress(50, '创建行星...');

        // 创建行星
        this.planets = createAllPlanets(this.scene);

        // 初始化纹理系统（后台预加载）
        this.textureManager = new TextureManager();
        this.starfieldBackground = new StarfieldBackground(this.scene);
        this.texturesLoaded = false;
        this.textureLoadingPromise = this.textureManager.loadAll().then(() => {
            this.texturesLoaded = true;
            console.log('纹理全部加载完成');
        }).catch((err) => {
            console.error('纹理加载失败:', err);
        });

        this.uiManager.setLoadingProgress(70, '计算轨道...');

        // 创建轨道线
        this.orbits = createAllOrbits(this.scene, PLANET_DATA);
        this.asteroidBelt = new AsteroidBelt(this.scene);

        this.uiManager.setLoadingProgress(73, '创建扩展天体...');

        // 创建矮行星、卫星和彗星
        this.extendedBodies = createExtendedBodies(this.scene, this.planets);
        this.comet = createComet(this.scene);
        // 给彗核添加 userData 供点击和列表使用
        if (this.comet && this.comet.nucleus) {
            this.comet.nucleus.userData = {
                type: 'comet',
                key: 'halley',
                data: {
                    name: '哈雷彗星',
                    distance: 63.5,
                    orbitalEccentricity: 0.677,
                    orbitalInclination: 162.18,
                    orbitalPeriod: 97,
                    initialMeanAnomaly: 192.25,
                    info: {
                        radius: '11 km（彗核）',
                        mass: '2.2 × 10¹⁴ kg',
                        distance: '0.59 AU ~ 35.1 AU',
                        period: '75-76 年'
                    }
                }
            };
        }

        this.uiManager.setLoadingProgress(76, '创建视觉效果...');

        // 创建轨道拖尾和动态日冕
        this.trails = createTrails(this.scene, PLANET_DATA);
        this.corona = createSolarCorona(this.scene);

        // 创建航天器（ISS、天宫、星链、旅行者一号）
        this.spacecraft = createSpacecraft(this.scene);

        // 创建太阳耀斑/日珥/CME
        this.solarFlares = createSolarFlares(this.scene);

        // 创建行星细节（大红斑、土星环阴影、地球夜景、极光）
        this.planetDetails = createPlanetDetails(this.scene, this.planets);

        // 创建宇宙现象（拉格朗日点、宜居带、凌日）
        this.cosmicPhenomena = createCosmicPhenomena(this.scene);

        this.uiManager.setLoadingProgress(78, '初始化材质系统...');

        // 创建材质切换器（此时 extendedBodies、planetDetails 已存在）
        this.materialSwitcher = new MaterialSwitcher(
            this.planets, this.textureManager.cache, this.extendedBodies, this.planetDetails?.earthNightShader
        );

        // 纹理按钮可用
        const textureBtn = document.getElementById('texture-toggle');
        if (textureBtn) {
            textureBtn.disabled = false;
            textureBtn.textContent = '真实纹理';
        }

        this.uiManager.setLoadingProgress(80, '初始化控制器...');

        // 初始化相机控制器
        this.cameraController = new CameraController(this.camera, this.renderer, this.scene);

        // 初始化第一人称视角 + 镜头光晕
        this.firstPerson = createFirstPerson(this.renderer, this.camera, this.scene, this.planets);
        setOrbitControls(this.cameraController.controls);
        setCameraController(this.cameraController);

        // 初始化后处理
        this.postProcessing = new PostProcessing(this.renderer, this.scene, this.camera);

        // 初始化行星列表
        this.planetList = new PlanetList(
            {
                ...this.planets,
                asteroidBelt: this.asteroidBelt?.hitMesh,
                ceres: this.extendedBodies?.ceres,
                pluto: this.extendedBodies?.pluto,
                halley: this.comet?.nucleus,
                iss: this.spacecraft?.iss?.mesh,
                tiangong: this.spacecraft?.tiangong?.mesh,
                starlink: this.spacecraft?.starlink?.mesh,
                voyager: this.spacecraft?.voyager?.mesh
            },
            this.cameraController
        );

        // 给 UI 提供渲染器和后处理引用（用于截图）
        this.uiManager.setRenderer(this.renderer);
        this.uiManager.setPostProcessing(this.postProcessing);

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

        // 纹理开关事件（复用后台预加载的 promise）
        const textureBtn = document.getElementById('texture-toggle');
        const starfieldBtn = document.getElementById('starfield-toggle');

        if (textureBtn) {
            textureBtn.addEventListener('click', async () => {
                if (!this.materialSwitcher) return;

                if (!this.texturesLoaded) {
                    textureBtn.disabled = true;
                    textureBtn.textContent = '加载中...';
                    await this.textureLoadingPromise;
                    textureBtn.disabled = false;
                }

                this.materialSwitcher.toggle();
                textureBtn.textContent = '真实纹理';
                textureBtn.style.background = this.materialSwitcher.isTextureMode ? '#4CAF50' : '';
            });
        }

        if (starfieldBtn) {
            starfieldBtn.addEventListener('click', async () => {
                if (!this.starfieldBackground) return;

                const active = await this.starfieldBackground.toggle();
                starfieldBtn.textContent = '美丽星空';
                starfieldBtn.style.background = active ? '#4CAF50' : '';
            });
        }

        // 扩展轨道开关
        const extraOrbitsBtn = document.getElementById('extra-orbits-toggle');
        if (extraOrbitsBtn) {
            extraOrbitsBtn.addEventListener('click', () => {
                const allExtraOrbits = [
                    ...(this.extendedBodies?.orbitLines || []),
                    this.comet?.orbitLine
                ].filter(Boolean);

                const visible = extraOrbitsBtn.classList.toggle('active');
                allExtraOrbits.forEach(line => { line.visible = visible; });
                extraOrbitsBtn.textContent = visible ? '隐藏扩展轨道' : '显示扩展轨道';
            });
        }

        // 宜居带开关
        const habitableBtn = document.getElementById('habitable-toggle');
        if (habitableBtn) {
            habitableBtn.addEventListener('click', () => {
                if (!this.cosmicPhenomena) return;
                const visible = !this.cosmicPhenomena.habitableZone.visible;
                this.cosmicPhenomena.habitableZone.visible = visible;
                habitableBtn.style.background = visible ? '#4CAF50' : '';
            });
        }

        // 星链开关
        const starlinkBtn = document.getElementById('starlink-toggle');
        if (starlinkBtn) {
            starlinkBtn.addEventListener('click', () => {
                if (!this.spacecraft?.starlink) return;
                const visible = starlinkBtn.classList.toggle('active');
                this.spacecraft.starlink.worldGroup.visible = visible;
                starlinkBtn.textContent = visible ? '隐藏星链' : '显示星链';
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

        // 更新月球位置与自转 - 基于 simulationTime 计算，使用初始平近点角
        if (this.planets.moon && this.planets.moon.userData.orbitGroup) {
            const moonData = PLANET_DATA.moon;
            const initialMA = (moonData.initialMeanAnomaly || 0) * Math.PI / 180;
            this.planets.moon.userData.orbitGroup.rotation.y = (2 * Math.PI * this.simulationTime) / moonData.orbitalPeriod + initialMA;
            this.planets.moon.rotation.y += moonData.rotationSpeed;
        }

        // 更新日期显示
        if (this.uiManager) {
            this.uiManager.updateDateDisplay(this.simulationTime);
        }

        // 更新星空闪烁
        if (this.starfield) {
            this.starfield.update(this.simulationTime);
        }
        if (this.asteroidBelt) {
            this.asteroidBelt.update(this.simulationTime);
        }

        // 更新扩展天体和彗星
        if (this.extendedBodies) {
            this.extendedBodies.update(this.simulationTime);
        }
        if (this.comet) {
            updateComet(this.comet, this.simulationTime);
        }

        // 更新航天器
        if (this.spacecraft) {
            this.spacecraft.update(this.simulationTime);
        }

        // 更新太阳耀斑/日珥/CME
        if (this.solarFlares) {
            updateSolarFlares(this.solarFlares, this.simulationTime);
        }

        // 更新行星细节（大红斑、极光等）
        if (this.planetDetails) {
            updatePlanetDetails(this.planetDetails, this.simulationTime);
        }

        // 更新宇宙现象（拉格朗日点、凌日）
        if (this.cosmicPhenomena) {
            updateCosmicPhenomena(this.cosmicPhenomena, this.planets, this.camera, this.simulationTime);
        }

        // 更新第一人称视角 + 镜头光晕
        if (this.firstPerson) {
            updateFirstPerson(this.firstPerson, this.simulationTime);
        }

        // 更新轨道拖尾和日冕
        if (this.trails) {
            updateTrail(this.trails, this.simulationTime, this.planets, PLANET_DATA);
        }
        if (this.corona) {
            updateSolarCorona(this.corona, this.simulationTime);
        }

        // 更新太阳光晕动画
        if (this.planets.sun && this.planets.sun.userData.glow) {
            const scale = 5.5 + Math.sin(this.simulationTime * 2) * 0.5;
            this.planets.sun.userData.glow.scale.set(scale, scale, 1);
        }

        // 更新相机控制器
        if (this.cameraController) {
            this.cameraController.simulationTime = this.simulationTime;
            this.cameraController.timeSpeed = this.timeSpeed;
            this.cameraController.isPaused = this.isPaused;
            this.cameraController.update();
        }

        // 更新土星环
        this.updateRings();

        // 渲染
        try {
            this.postProcessing.render();
        } catch (e) {
            // 后处理渲染失败时回退到直接渲染
            this.renderer.render(this.scene, this.camera);
        }
    }

    updatePlanets() {
        const planetKeys = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

        planetKeys.forEach(key => {
            const planet = this.planets[key];
            if (planet) {
                updatePlanetPosition(planet, this.simulationTime, PLANET_DATA);
            }
        });
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
