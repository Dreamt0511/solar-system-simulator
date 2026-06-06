import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

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

        // 小行星带特殊处理：飞到带中间高度俯瞰
        if (planet.userData && planet.userData.type === 'asteroidBelt') {
            const beltCenter = new THREE.Vector3(0, 0, 0);
            const cameraTarget = new THREE.Vector3(0, 80, 100);
            this.animateFly(cameraTarget, beltCenter, duration);
            return;
        }

        const targetPosition = planet.getWorldPosition(new THREE.Vector3());
        const planetRadius = planet.geometry ? planet.geometry.parameters.radius : 5;

        // 轨道="地面"（XZ平面），相机像人站在地面上：
        //   身体垂直（up=0,1,0），视线基本水平微微向下看行星
        //   → 轨道在视野下方展开成椭圆
        const dist = planetRadius * 6;
        const depressionAngle = 15 * (Math.PI / 180); // 15度俯角，像人站着往前看
        const tanAngle = Math.tan(depressionAngle);
        // 相机在行星的径向方向后退 dist，同时抬升使视线以15°俯角看向行星
        const cameraAngle = Math.atan2(targetPosition.x, targetPosition.z);

        const cameraTarget = new THREE.Vector3(
            targetPosition.x + dist * Math.sin(cameraAngle),
            targetPosition.y + dist * tanAngle + planetRadius, // 略高于行星，保证不穿地
            targetPosition.z + dist * Math.cos(cameraAngle)
        );

        // 保存初始位置
        this.animateFly(cameraTarget, targetPosition, duration);
    }

    animateFly(cameraTarget, lookAtTarget, duration) {
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
