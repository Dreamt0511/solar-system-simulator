import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { KeplerOrbit } from './orbital.js';

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
        // 计算鼠标位置
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        // 射线检测
        this.raycaster.setFromCamera(this.mouse, this.camera);

        // 获取所有可点击对象
        const clickableObjects = [];
        this.scene.traverse((child) => {
            if (child.userData && (child.userData.type === 'planet' || child.userData.type === 'sun' || child.userData.type === 'asteroidBelt')) {
                clickableObjects.push(child);
            }
        });

        const intersects = this.raycaster.intersectObjects(clickableObjects);

        if (intersects.length > 0) {
            const clickedObject = intersects[0].object;
            this.selectPlanet(clickedObject);
        } else {
            this.deselectPlanet();
        }
    }

    handleMouseMove(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        const clickableObjects = [];
        this.scene.traverse((child) => {
            if (child.userData && (child.userData.type === 'planet' || child.userData.type === 'sun' || child.userData.type === 'asteroidBelt')) {
                clickableObjects.push(child);
            }
        });

        const intersects = this.raycaster.intersectObjects(clickableObjects);

        if (intersects.length > 0) {
            this.renderer.domElement.style.cursor = 'pointer';
        } else {
            this.renderer.domElement.style.cursor = 'default';
        }
    }

    selectPlanet(planet) {
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

        // 飞行动画
        this.flyToPlanet(planet);
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
            const earthData = { distance: 28, orbitalPeriod: 25, orbitalEccentricity: 0.2, orbitalInclination: 0 };
            const futureSimTime = this.isPaused
                ? (this.simulationTime || 0)
                : (this.simulationTime || 0) + ((duration + 750) / 1000) * (this.timeSpeed || 1);

            // 预测地球位置
            const earthOrbit = new KeplerOrbit(earthData.distance, earthData.orbitalEccentricity, earthData.orbitalInclination);
            const earthTheta = earthOrbit.getTrueAnomaly(futureSimTime, earthData.orbitalPeriod);
            const earthPos = earthOrbit.getPosition3D(earthTheta);

            // 预测月球相对地球位置
            const moonOrbit = new KeplerOrbit(moonData.distance, moonData.orbitalEccentricity, 0);
            const moonTheta = moonOrbit.getTrueAnomaly(futureSimTime, moonData.orbitalPeriod);
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

        // 计算目标位置：运动时预判，暂停时直接到达当前点
        const data = planet.userData.data;
        const orbit = new KeplerOrbit(data.distance, data.orbitalEccentricity, data.orbitalInclination);
        const futureSimTime = this.isPaused
            ? (this.simulationTime || 0)
            : (this.simulationTime || 0) + ((duration + 750) / 1000) * (this.timeSpeed || 1);
        const futureTheta = orbit.getTrueAnomaly(futureSimTime, data.orbitalPeriod);
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

        const animate = () => {
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
                this.isAnimating = false;
                if (onComplete) onComplete();
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
