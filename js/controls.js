import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { KeplerOrbit } from './orbital.js';
import { PLANET_DATA } from './planets.js';

export class CameraController {
    constructor(camera, renderer, scene) {
        this.camera = camera;
        this.renderer = renderer;
        this.scene = scene;
        this.controls = new OrbitControls(camera, renderer.domElement);
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.selectedPlanet = null;
        this.isAnimating = false;
        this.simulationTime = 0;
        this.timeSpeed = 1;
        this.isPaused = false;

        this.setupControls();
        this.setupEventListeners();

        // 第一人称视角状态下禁用 click 和 hover 干扰
        this.isFirstPerson = false;
        window.addEventListener('firstPersonEnter', () => { this.isFirstPerson = true; });
        window.addEventListener('firstPersonExit', () => { this.isFirstPerson = false; });
    }

    setupControls() {
        this.controls.enableDamping = false;
        this.controls.screenSpacePanning = false;
        this.controls.minDistance = 1.5;
        this.controls.maxDistance = 500;
        this.controls.enablePan = true;
        this.controls.enableZoom = true;
        this.controls.enableRotate = true;
        this.controls.autoRotate = false;
        this.controls.autoRotateSpeed = 0.5;
        this.controls.rotateSpeed = 1.5;
        // 设置初始目标为原点（太阳位置）
        this.controls.target.set(0, 0, 0);

        // 永久禁用 makeSafe() 的限制
        const Spherical = THREE.Spherical;
        Spherical.prototype.makeSafe = function() {
            // 不做任何限制，直接返回
            return this;
        };
    }

    setupEventListeners() {
        // 点击事件
        this.renderer.domElement.addEventListener('click', (event) => {
            this.handleClick(event);
        });

        // 鼠标移动（显示光标）
        this.renderer.domElement.addEventListener('mousemove', (event) => {
            this.handleMouseMove(event);
        });
    }

    handleClick(event) {
        // 第一人称模式下跳过，避免干扰拖拽环顾
        if (this.isFirstPerson) return;

        // 计算鼠标位置
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        // 射线检测
        this.raycaster.setFromCamera(this.mouse, this.camera);

        // 获取所有可点击对象
        const clickableObjects = [];
        this.scene.traverse((child) => {
            if (child.userData && (child.userData.type === 'planet' || child.userData.type === 'sun' || child.userData.type === 'moon' || child.userData.type === 'asteroidBelt' || child.userData.type === 'dwarfPlanet' || child.userData.type === 'comet' || child.userData.type === 'spacecraft')) {
                clickableObjects.push(child);
            }
        });

        const intersects = this.raycaster.intersectObjects(clickableObjects, false);

        if (intersects.length > 0) {
            let clickedObject = intersects[0].object;
            // 如果点击的对象没有行星数据，向上遍历父级查找
            while (clickedObject && !(clickedObject.userData && clickedObject.userData.type && clickedObject.userData.data)) {
                clickedObject = clickedObject.parent;
            }
            if (!clickedObject) {
                this.deselectPlanet();
                return;
            }
            this.selectPlanet(clickedObject);
        } else {
            this.deselectPlanet();
        }
    }

    handleMouseMove(event) {
        // 第一人称模式下只重置光标，跳过射线检测
        if (this.isFirstPerson) {
            this.renderer.domElement.style.cursor = 'default';
            return;
        }

        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        const clickableObjects = [];
        this.scene.traverse((child) => {
            if (child.userData && (child.userData.type === 'planet' || child.userData.type === 'sun' || child.userData.type === 'moon' || child.userData.type === 'asteroidBelt' || child.userData.type === 'dwarfPlanet' || child.userData.type === 'comet' || child.userData.type === 'spacecraft')) {
                clickableObjects.push(child);
            }
        });

        const intersects = this.raycaster.intersectObjects(clickableObjects, false);

        if (intersects.length > 0) {
            this.renderer.domElement.style.cursor = 'pointer';
        } else {
            this.renderer.domElement.style.cursor = 'default';
        }
    }

    selectPlanet(planet, shouldFly = false) {
        this.selectedPlanet = planet;

        // 触发自定义事件
        const event = new CustomEvent('planetSelected', {
            detail: {
                name: planet.userData.data.name,
                key: planet.userData.key,
                data: planet.userData.data,
                position: planet.getWorldPosition(new THREE.Vector3())
            }
        });
        window.dispatchEvent(event);

        if (shouldFly) {
            this.flyToPlanet(planet);
        }
    }

    deselectPlanet() {
        this.selectedPlanet = null;
        const event = new CustomEvent('planetDeselected');
        window.dispatchEvent(event);
    }

    flyToPlanet(planet, duration = 1500) {
        if (this.isAnimating) return;
        this.isAnimating = true;

        // 小行星带特殊处理
        if (planet.userData && planet.userData.type === 'asteroidBelt') {
            const beltCenter = new THREE.Vector3(0, 0, 0);
            const cameraTarget = new THREE.Vector3(0, 80, 100);
            this.animateFly(cameraTarget, beltCenter, duration);
            return;
        }

        // 太阳特殊处理（没有轨道数据）
        if (planet.userData && planet.userData.type === 'sun') {
            const sunPos = planet.getWorldPosition(new THREE.Vector3(0, 0, 0));
            const r = planet.geometry.parameters.radius;
            const cameraTarget = new THREE.Vector3(r * 3, r * 2, r * 3);
            this.animateFly(cameraTarget, sunPos, duration, () => {
                window.dispatchEvent(new CustomEvent('cameraArrived', {
                    detail: { name: '太阳', data: planet.userData.data }
                }));
            });
            return;
        }

        // 月球特殊处理（绕地球旋转，需要同时预测地球和月球位置）
        if (planet.userData && planet.userData.type === 'moon') {
            const moonData = planet.userData.data;
            const earthData = PLANET_DATA.earth;
            const futureSimTime = this.isPaused
                ? (this.simulationTime || 0)
                : (this.simulationTime || 0) + ((duration + 750) / 1000) * (this.timeSpeed || 1);

            // 预测地球位置（使用真实轨道数据 + 初始相位）
            const earthInitialMA = (earthData.initialMeanAnomaly || 0) * Math.PI / 180;
            const earthOrbit = new KeplerOrbit(earthData.distance, earthData.orbitalEccentricity, earthData.orbitalInclination);
            const earthTheta = earthOrbit.getTrueAnomaly(futureSimTime, earthData.orbitalPeriod, earthInitialMA);
            const earthPos = earthOrbit.getPosition3D(earthTheta);

            // 预测月球相对地球位置（使用真实轨道数据 + 初始相位）
            const moonInitialMA = (moonData.initialMeanAnomaly || 0) * Math.PI / 180;
            const moonOrbit = new KeplerOrbit(moonData.distance, moonData.orbitalEccentricity, 0);
            const moonTheta = moonOrbit.getTrueAnomaly(futureSimTime, moonData.orbitalPeriod, moonInitialMA);
            const moonRel = moonOrbit.getPosition3D(moonTheta);

            // 月球世界坐标 = 地球位置 + 月球相对偏移
            const moonPos = new THREE.Vector3(
                earthPos.x + moonRel.x,
                earthPos.y + moonRel.y,
                earthPos.z + moonRel.z
            );

            const r = planet.geometry ? planet.geometry.parameters.radius : 0.4;
            const dist = r * 10;
            const cameraAngle = Math.atan2(moonPos.x, moonPos.z);
            const cameraTarget = new THREE.Vector3(
                moonPos.x + dist * Math.sin(cameraAngle),
                moonPos.y + dist * 0.25,
                moonPos.z + dist * Math.cos(cameraAngle)
            );
            this.animateFly(cameraTarget, moonPos, duration, () => {
                window.dispatchEvent(new CustomEvent('cameraArrived', {
                    detail: { name: '月球', data: moonData }
                }));
            });
            return;
        }

        // 彗星和矮行星特殊处理（在 cameraArrived 中包含信息数据）
        if (planet.userData && (planet.userData.type === 'comet' || planet.userData.type === 'dwarfPlanet')) {
            const data = planet.userData.data;
            const orbit = new KeplerOrbit(data.distance, data.orbitalEccentricity, data.orbitalInclination);
            const futureSimTime = this.isPaused
                ? (this.simulationTime || 0)
                : (this.simulationTime || 0) + ((duration + 750) / 1000) * (this.timeSpeed || 1);
            const initialMA = (data.initialMeanAnomaly || 0) * Math.PI / 180;
            const theta = orbit.getTrueAnomaly(futureSimTime, data.orbitalPeriod, initialMA);
            const pos = orbit.getPosition3D(theta);
            const targetPos = new THREE.Vector3(pos.x, pos.y, pos.z);
            const planetRadius = planet.geometry ? planet.geometry.parameters.radius : 0.5;
            const dist = 10;
            const cameraAngle = Math.atan2(targetPos.x, targetPos.z);
            const cameraTarget = new THREE.Vector3(
                targetPos.x + dist * Math.sin(cameraAngle),
                targetPos.y + planetRadius + 2,
                targetPos.z + dist * Math.cos(cameraAngle)
            );
            this.animateFly(cameraTarget, targetPos, duration, () => {
                window.dispatchEvent(new CustomEvent('cameraArrived', {
                    detail: { name: data.name, data }
                }));
            });
            return;
        }

        // 航天器特殊处理 — 预测地球位置+航天器相对偏移
        if (planet.userData && planet.userData.type === 'spacecraft') {
            const earthData = PLANET_DATA.earth;
            const futureSimTime = this.isPaused
                ? (this.simulationTime || 0)
                : (this.simulationTime || 0) + ((duration + 750) / 1000) * (this.timeSpeed || 1);
            const earthInitialMA = (earthData.initialMeanAnomaly || 0) * Math.PI / 180;
            const earthOrbit = new KeplerOrbit(earthData.distance, earthData.orbitalEccentricity, earthData.orbitalInclination);
            const earthTheta = earthOrbit.getTrueAnomaly(futureSimTime, earthData.orbitalPeriod, earthInitialMA);
            const earthPos = earthOrbit.getPosition3D(earthTheta);
            // 航天器在地球局部的位置 (沿轨道方向偏移)
            const orbitAngle = (2 * Math.PI * futureSimTime) / 3;
            const incl = (planet.userData.key === 'tiangong') ? -41.5 : (planet.userData.key === 'iss' ? -51.6 : 0);
            const inclRad = THREE.MathUtils.degToRad(incl);
            const localPos = new THREE.Vector3(1.8, 0, 0);
            if (Math.abs(incl) > 0.1) {
                const qIncl = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), inclRad);
                localPos.applyQuaternion(qIncl);
            }
            const qRot = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), orbitAngle);
            localPos.applyQuaternion(qRot);
            const predictedPos = new THREE.Vector3(
                earthPos.x + localPos.x, earthPos.y + localPos.y, earthPos.z + localPos.z
            );
            // 旅行者一号：直接取当前位置，相机位于旅行者前进方向的前方，回望太阳系
            if (planet.userData.key === 'voyager') {
                const curPos = new THREE.Vector3();
                planet.getWorldPosition(curPos);

                // 旅行者沿 X 轴正方向远离太阳，轨道容器绕 X 轴旋转了 35°
                // 前进方向大致为 (1, 0, 0) 经 35° X 轴旋转
                const dir = new THREE.Vector3(1, 0, 0);
                const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(35));
                dir.applyQuaternion(q);
                dir.normalize();

                // 相机在旅行者前方，回望太阳系
                const lookDist = 8;
                const cameraTarget = curPos.clone().add(dir.clone().multiplyScalar(lookDist));
                this.animateFly(cameraTarget, curPos, duration, () => {
                    window.dispatchEvent(new CustomEvent('cameraArrived', {
                        detail: { name: planet.userData.name, data: planet.userData.data }
                    }));
                });
            } else {
                const dist = 12;
                const cameraTarget = new THREE.Vector3(
                    predictedPos.x + dist, predictedPos.y + dist * 0.3, predictedPos.z + dist
                );
                this.animateFly(cameraTarget, predictedPos, duration, () => {
                    window.dispatchEvent(new CustomEvent('cameraArrived', {
                        detail: { name: planet.userData.name, data: planet.userData.data }
                    }));
                });
            }
            return;
        }

        // 计算目标位置：运动时预判，暂停时直接到达当前点
        const data = planet.userData.data;
        const orbit = new KeplerOrbit(data.distance, data.orbitalEccentricity, data.orbitalInclination);
        const futureSimTime = this.isPaused
            ? (this.simulationTime || 0)
            : (this.simulationTime || 0) + ((duration + 750) / 1000) * (this.timeSpeed || 1);
        const initialMA = (data.initialMeanAnomaly || 0) * Math.PI / 180;
        const futureTheta = orbit.getTrueAnomaly(futureSimTime, data.orbitalPeriod, initialMA);
        const futurePos = orbit.getPosition3D(futureTheta);
        const targetPosition = new THREE.Vector3(futurePos.x, futurePos.y, futurePos.z);

        const planetRadius = planet.geometry ? planet.geometry.parameters.radius : 5;
        const dist = planetRadius * 6;
        const depressionAngle = 15 * (Math.PI / 180);
        const tanAngle = Math.tan(depressionAngle);
        const cameraAngle = Math.atan2(targetPosition.x, targetPosition.z);

        const cameraTarget = new THREE.Vector3(
            targetPosition.x + dist * Math.sin(cameraAngle),
            targetPosition.y + dist * tanAngle + planetRadius,
            targetPosition.z + dist * Math.cos(cameraAngle)
        );

        this.animateFly(cameraTarget, targetPosition, duration, () => {
            if (planet.userData && planet.userData.type === 'planet') {
                window.dispatchEvent(new CustomEvent('cameraArrived', {
                    detail: {
                        name: planet.userData.data.name,
                        data: planet.userData.data
                    }
                }));
            }
        });
    }

    animateFly(cameraTarget, lookAtTarget, duration, onComplete) {
        const startPosition = this.camera.position.clone();
        const startTarget = this.controls.target.clone();
        const startTime = Date.now();

        // 安全超时：如果动画 5 秒内未完成，强制重置 isAnimating
        const safetyTimeout = setTimeout(() => {
            if (this.isAnimating) {
                console.warn('animateFly 安全超时，强制重置 isAnimating');
                this.isAnimating = false;
            }
        }, duration + 3500);

        const animate = () => {
            try {
                // 如果外部取消了动画，立即退出
                if (!this.isAnimating) {
                    clearTimeout(safetyTimeout);
                    return;
                }

                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const eased = this.easeInOutCubic(progress);

                this.camera.position.lerpVectors(startPosition, cameraTarget, eased);
                this.camera.up.set(0, 1, 0);
                this.controls.target.lerpVectors(startTarget, lookAtTarget, eased);
                this.controls.update();

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    clearTimeout(safetyTimeout);
                    this.isAnimating = false;
                    if (onComplete) onComplete();
                }
            } catch (err) {
                console.error('animateFly 出错:', err);
                clearTimeout(safetyTimeout);
                this.isAnimating = false;
            }
        };

        animate();
    }

    easeInOutCubic(t) {
        return t < 0.5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    resetView() {
        this.flyToPosition(new THREE.Vector3(0, 50, 100), new THREE.Vector3(0, 0, 0));
    }

    cancelFlyAnimation() {
        this.isAnimating = false;
    }

    flyToPosition(targetPosition, targetLookAt, duration = 1500) {
        if (this.isAnimating) return;
        this.isAnimating = true;

        const startPosition = this.camera.position.clone();
        const startTarget = this.controls.target.clone();
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = this.easeInOutCubic(progress);

            this.camera.position.lerpVectors(startPosition, targetPosition, eased);
            this.controls.target.lerpVectors(startTarget, targetLookAt, eased);

            this.controls.update();

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.isAnimating = false;
            }
        };

        animate();
    }

    update() {
        this.controls.update();
    }
}
