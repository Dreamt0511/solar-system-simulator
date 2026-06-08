import * as THREE from 'three';
import { PLANET_DATA } from './planets.js';
import { KeplerOrbit } from './orbital.js';

// ============================================================
// 行星表面第一人称视角
// ============================================================

// --- 内部状态 ---
let _renderer, _camera, _scene, _planets;
let _cameraController = null;
let _orbitControls = null;
let _isActive = false;
let _currentPlanetKey = null;
let _yaw = 0;
let _pitch = 0;
let _isDragging = false;
let _lastPointer = { x: 0, y: 0 };
const _sensitivity = 0.003;
let _pendingFirstPerson = false; // 双击飞行后进入表面的标记

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

    // 定位相机到行星表面
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

export function setCameraController(controller) {
    _cameraController = controller;
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

/**
 * 计算行星表面指定经纬度的相机位置（不在北极）
 */
function getSurfacePosition(planetKey, time) {
    const data = PLANET_DATA[planetKey];
    const radius = data ? data.radius : 1;
    const planetPos = getPlanetWorldPosition(planetKey, time);
    const height = radius * (1 + SURFACE_OFFSET_RATIO);

    // 使用 30° 纬度，避免在北极点导致的视角问题
    const lat = 30 * Math.PI / 180;
    const lon = 0;

    return new THREE.Vector3(
        planetPos.x + height * Math.cos(lat) * Math.cos(lon),
        planetPos.y + height * Math.sin(lat),
        planetPos.z + height * Math.cos(lat) * Math.sin(lon)
    );
}

function positionCameraOnSurface(planetKey, time) {
    const pos = getSurfacePosition(planetKey, time);
    _camera.position.copy(pos);

    // 初始往下看一点，看到行星表面和地平线
    _lookEuler.set(-0.2, 0, 0);

    // 直接使用欧拉角旋转，避免 lookAt + up 导致的万向锁
    _camera.rotation.order = 'YXZ';
    _camera.rotation.x = _lookEuler.x;
    _camera.rotation.y = _lookEuler.y;
    _camera.rotation.z = 0;
}

function updateCameraFollowPlanet(time) {
    if (!_currentPlanetKey) return;

    // 相机始终跟随行星表面位置
    const pos = getSurfacePosition(_currentPlanetKey, time);
    _camera.position.copy(pos);

    // 直接设置旋转，不做 lookAt，避免欧拉角与 lookAt 的冲突
    _camera.rotation.order = 'YXZ';
    _camera.rotation.x = _lookEuler.x;
    _camera.rotation.y = _lookEuler.y;
    _camera.rotation.z = 0;
}

// ============================================================
// 事件监听
// ============================================================

function setupEventListeners() {
    const canvas = _renderer.domElement;

    // 鼠标/触摸拖拽环顾
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);

    // ESC 退出
    window.addEventListener('keydown', onKeyDown);

    // 飞行到达后自动进入表面
    window.addEventListener('cameraArrived', (e) => {
        if (_pendingFirstPerson && e.detail && e.detail.name) {
            _pendingFirstPerson = false;
            // 根据中文名反向查找行星 key
            for (const [key, data] of Object.entries(PLANET_DATA)) {
                if (data.name === e.detail.name && _planets[key]) {
                    enterFirstPerson(key);
                    break;
                }
            }
        }
    });
}

let _pointerMoved = false;

function onPointerDown(event) {
    if (!_isActive) return;
    _isDragging = true;
    _pointerMoved = false;
    _lastPointer.x = event.clientX;
    _lastPointer.y = event.clientY;
    _renderer.domElement.style.cursor = 'grabbing';
    // 捕获指针：拖拽移出画布后仍然能收到事件
    _renderer.domElement.setPointerCapture(event.pointerId);
}

function onPointerMove(event) {
    if (!_isActive || !_isDragging) return;

    const dx = event.clientX - _lastPointer.x;
    const dy = event.clientY - _lastPointer.y;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) _pointerMoved = true;
    _lastPointer.x = event.clientX;
    _lastPointer.y = event.clientY;

    // 水平旋转（yaw）
    _lookEuler.y -= dx * _sensitivity;
    // 垂直旋转（pitch），限制在 [-85, 85] 度
    _lookEuler.x -= dy * _sensitivity;
    _lookEuler.x = Math.max(-Math.PI * 85 / 180, Math.min(Math.PI * 85 / 180, _lookEuler.x));
}

function onPointerUp(event) {
    if (!_isActive || !_isDragging) return;
    _isDragging = false;
    _renderer.domElement.style.cursor = 'default';
    _renderer.domElement.releasePointerCapture(event.pointerId);
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
