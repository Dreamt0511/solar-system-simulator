import * as THREE from 'three';
import { PLANET_DATA } from './planets.js';
import { KeplerOrbit } from './orbital.js';

// ============================================================
// 行星表面第一人称视角
// ============================================================

// --- 内部状态 ---
let _renderer, _camera, _scene, _planets;
let _orbitControls = null; // 保存原有的轨道控制器引用
let _isActive = false;
let _currentPlanetKey = null;
let _lookEuler = new THREE.Euler(0, 0, 0, 'YXZ'); // 环顾方向
let _isDragging = false;
let _lastPointer = { x: 0, y: 0 };
const _sensitivity = 0.003;

// 相机在行星表面的高度偏移（相对半径）
const SURFACE_OFFSET_RATIO = 0.05;

// ============================================================
// 公共 API
// ============================================================

/**
 * 初始化第一人称模块
 * @param {THREE.WebGLRenderer} renderer
 * @param {THREE.PerspectiveCamera} camera
 * @param {THREE.Scene} scene
 * @param {Object} planets - { sun, mercury, venus, earth, mars, jupiter, saturn, uranus, neptune, moon }
 * @returns {Object} fp state object
 */
export function createFirstPerson(renderer, camera, scene, planets) {
    _renderer = renderer;
    _camera = camera;
    _scene = scene;
    _planets = planets;

    // 注册事件
    setupEventListeners();

    return {
        isActive: () => _isActive,
        currentPlanetKey: () => _currentPlanetKey
    };
}

/**
 * 每帧更新（需在 animate 循环中调用）
 * @param {Object} fp - createFirstPerson 返回的状态对象
 * @param {number} time - simulationTime
 */
export function updateFirstPerson(fp, time) {
    if (_isActive) {
        // 更新相机位置：跟随行星
        updateCameraFollowPlanet(time);
    }
}

/**
 * 进入第一人称视角
 * @param {string} planetKey - 行星标识，如 'earth', 'mars' 等
 */
export function enterFirstPerson(planetKey) {
    if (!_planets || !_planets[planetKey]) {
        console.warn('未知行星:', planetKey);
        return;
    }

    _isActive = true;
    _currentPlanetKey = planetKey;

    // 禁用轨道控制器
    setControlsEnabled(false);

    // 重置视角朝向
    _lookEuler.set(0, 0, 0);

    // 立即定位相机到行星表面
    positionCameraOnSurface(planetKey, 0);

    // 显示提示
    showFirstPersonHint(planetKey);

    // 派发事件
    window.dispatchEvent(new CustomEvent('firstPersonEnter', {
        detail: { planetKey }
    }));
}

/**
 * 退出第一人称视角
 */
export function exitFirstPerson() {
    if (!_isActive) return;

    _isActive = false;
    _currentPlanetKey = null;

    // 恢复轨道控制器
    setControlsEnabled(true);

    // 隐藏提示
    hideFirstPersonHint();

    // 派发事件
    window.dispatchEvent(new CustomEvent('firstPersonExit'));
}

/**
 * 设置轨道控制器引用，以便在进入/退出第一人称时自动禁用/恢复
 * @param {OrbitControls} controls
 */
export function setOrbitControls(controls) {
    _orbitControls = controls;
}

// ============================================================
// 轨道控制器禁用/恢复（内部）
// ============================================================

function setControlsEnabled(enabled) {
    // 直接操作控制器引用
    if (_orbitControls) {
        _orbitControls.enabled = enabled;
    }
    // 同时派发事件供外部监听
    window.dispatchEvent(new CustomEvent(enabled ? 'enableOrbitControls' : 'disableOrbitControls'));
}

// ============================================================
// 相机跟随行星
// ============================================================

function getPlanetWorldPosition(planetKey, time) {
    const planet = _planets[planetKey];
    if (!planet) return new THREE.Vector3();

    // 太阳始终在原点
    if (planetKey === 'sun') {
        return new THREE.Vector3(0, 0, 0);
    }

    // 月球：地球位置 + 月球相对偏移
    if (planetKey === 'moon') {
        const earthPos = getPlanetWorldPosition('earth', time);
        const moonData = PLANET_DATA.moon;
        const initialMA = (moonData.initialMeanAnomaly || 0) * Math.PI / 180;
        const orbit = new KeplerOrbit(moonData.distance, moonData.orbitalEccentricity, 0);
        const theta = orbit.getTrueAnomaly(time, moonData.orbitalPeriod, initialMA);
        const rel = orbit.getPosition3D(theta);
        return new THREE.Vector3(
            earthPos.x + rel.x,
            earthPos.y + rel.y,
            earthPos.z + rel.z
        );
    }

    // 其他行星：使用 Three.js 世界坐标（已在 animate 中被 updatePlanetPosition 更新）
    const worldPos = new THREE.Vector3();
    planet.getWorldPosition(worldPos);
    return worldPos;
}

function positionCameraOnSurface(planetKey, time) {
    const data = PLANET_DATA[planetKey];
    const radius = data ? data.radius : 1;
    const surfaceHeight = radius * (1 + SURFACE_OFFSET_RATIO);
    const planetPos = getPlanetWorldPosition(planetKey, time);

    _camera.position.set(
        planetPos.x,
        planetPos.y + surfaceHeight,
        planetPos.z
    );
}

function updateCameraFollowPlanet(time) {
    if (!_currentPlanetKey) return;

    const planetPos = getPlanetWorldPosition(_currentPlanetKey, time);
    const data = PLANET_DATA[_currentPlanetKey];
    const radius = data ? data.radius : 1;
    const surfaceHeight = radius * (1 + SURFACE_OFFSET_RATIO);

    _camera.position.set(
        planetPos.x,
        planetPos.y + surfaceHeight,
        planetPos.z
    );

    // 根据环顾角度计算看向的方向
    const lookDir = new THREE.Vector3(0, 0, -1);
    lookDir.applyEuler(_lookEuler);

    const lookTarget = _camera.position.clone().add(lookDir);
    _camera.lookAt(lookTarget);
    _camera.up.set(0, 1, 0);
}

// ============================================================
// 事件监听
// ============================================================

function setupEventListeners() {
    const canvas = _renderer.domElement;

    // 双击进入/退出第一人称
    canvas.addEventListener('dblclick', onDoubleClick);

    // 鼠标/触摸拖拽环顾
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);

    // ESC 退出
    window.addEventListener('keydown', onKeyDown);
}

function onDoubleClick(event) {
    if (_isActive) {
        exitFirstPerson();
        return;
    }

    // 射线检测点击了哪个行星
    const mouse = new THREE.Vector2(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, _camera);

    const clickableObjects = [];
    _scene.traverse((child) => {
        if (child.userData && (child.userData.type === 'planet' || child.userData.type === 'sun' || child.userData.type === 'moon')) {
            clickableObjects.push(child);
        }
    });

    const intersects = raycaster.intersectObjects(clickableObjects);
    if (intersects.length > 0) {
        const obj = intersects[0].object;
        const key = obj.userData.key || (obj.userData.type === 'sun' ? 'sun' : null);
        if (key) {
            enterFirstPerson(key);
        }
    }
}

function onPointerDown(event) {
    if (!_isActive) return;
    _isDragging = true;
    _lastPointer.x = event.clientX;
    _lastPointer.y = event.clientY;
    _renderer.domElement.style.cursor = 'grabbing';
    event.preventDefault();
}

function onPointerMove(event) {
    if (!_isActive || !_isDragging) return;

    const dx = event.clientX - _lastPointer.x;
    const dy = event.clientY - _lastPointer.y;
    _lastPointer.x = event.clientX;
    _lastPointer.y = event.clientY;

    // 水平旋转（yaw）
    _lookEuler.y -= dx * _sensitivity;
    // 垂直旋转（pitch），限制在 [-85, 85] 度
    _lookEuler.x -= dy * _sensitivity;
    _lookEuler.x = Math.max(-Math.PI * 85 / 180, Math.min(Math.PI * 85 / 180, _lookEuler.x));
}

function onPointerUp() {
    if (!_isActive || !_isDragging) return;
    _isDragging = false;
    _renderer.domElement.style.cursor = 'default';
}

function onKeyDown(event) {
    if (event.key === 'Escape' && _isActive) {
        exitFirstPerson();
    }
}

// ============================================================
// 第一人称提示 UI
// ============================================================

let _hintEl = null;

function showFirstPersonHint(planetKey) {
    if (!_hintEl) {
        _hintEl = document.createElement('div');
        _hintEl.id = 'fp-hint';
        Object.assign(_hintEl.style, {
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.7)',
            color: '#fff',
            padding: '10px 20px',
            borderRadius: '8px',
            fontSize: '14px',
            fontFamily: 'sans-serif',
            zIndex: '10000',
            pointerEvents: 'none',
            backdropFilter: 'blur(4px)',
            border: '1px solid rgba(255,255,255,0.15)',
            transition: 'opacity 0.3s'
        });
        document.body.appendChild(_hintEl);
    }

    const data = PLANET_DATA[planetKey];
    const name = data ? data.name : planetKey;
    _hintEl.textContent = name + ' 表面 — 拖拽环顾 | 双击或 ESC 退出';
    _hintEl.style.opacity = '1';
}

function hideFirstPersonHint() {
    if (_hintEl) {
        _hintEl.style.opacity = '0';
    }
}
