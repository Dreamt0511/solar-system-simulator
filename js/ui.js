export class UIManager {
    constructor() {
        this.elements = {
            loadingScreen: document.getElementById('loading-screen'),
            progressFill: document.getElementById('progress-fill'),
            loadingText: document.getElementById('loading-text'),
            controlsPanel: document.getElementById('controls-panel'),
            infoPanel: document.getElementById('info-panel'),
            orientationWarning: document.getElementById('orientation-warning'),
            timeSpeed: document.getElementById('time-speed'),
            timeSpeedValue: document.getElementById('time-speed-value'),
            pauseBtn: document.getElementById('pause-btn'),
            resetBtn: document.getElementById('reset-btn'),
            closePanel: document.getElementById('close-panel'),
            closeInfo: document.getElementById('close-info'),
            planetName: document.getElementById('planet-name'),
            planetRadius: document.getElementById('planet-radius'),
            planetMass: document.getElementById('planet-mass'),
            planetDistance: document.getElementById('planet-distance'),
            planetPeriod: document.getElementById('planet-period'),
            planetMoons: document.getElementById('planet-moons')
        };

        this.state = {
            isPaused: false,
            timeSpeed: 1,
            showControls: false
        };

        this.callbacks = {};

        this.setupEventListeners();
        this.checkOrientation();
    }

    setupEventListeners() {
        // 时间速度滑块
        if (this.elements.timeSpeed) {
            this.elements.timeSpeed.addEventListener('input', (e) => {
                this.state.timeSpeed = parseFloat(e.target.value);
                this.elements.timeSpeedValue.textContent = `${this.state.timeSpeed.toFixed(1)}x`;
                this.emit('timeSpeedChanged', this.state.timeSpeed);
            });
        }

        // 暂停按钮
        if (this.elements.pauseBtn) {
            this.elements.pauseBtn.addEventListener('click', () => {
                this.state.isPaused = !this.state.isPaused;
                this.elements.pauseBtn.textContent = this.state.isPaused ? '继续' : '暂停';
                this.emit('pauseChanged', this.state.isPaused);
            });
        }

        // 重置按钮
        if (this.elements.resetBtn) {
            this.elements.resetBtn.addEventListener('click', () => {
                this.emit('resetView');
            });
        }

        // 关闭控制面板
        if (this.elements.closePanel) {
            this.elements.closePanel.addEventListener('click', () => {
                this.hideControlsPanel();
            });
        }

        // 关闭信息面板
        if (this.elements.closeInfo) {
            this.elements.closeInfo.addEventListener('click', () => {
                this.hideInfoPanel();
            });
        }

        // 监听行星选择事件
        window.addEventListener('planetSelected', (e) => {
            this.showInfoPanel(e.detail);
        });

        window.addEventListener('planetDeselected', () => {
            this.hideInfoPanel();
        });

        // 监听屏幕方向变化
        window.addEventListener('resize', () => {
            this.checkOrientation();
        });
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.checkOrientation(), 100);
        });

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            this.handleKeyboard(e);
        });
    }

    handleKeyboard(e) {
        switch(e.key) {
            case ' ':
                e.preventDefault();
                this.state.isPaused = !this.state.isPaused;
                this.elements.pauseBtn.textContent = this.state.isPaused ? '继续' : '暂停';
                this.emit('pauseChanged', this.state.isPaused);
                break;
            case 'r':
            case 'R':
                this.emit('resetView');
                break;
            case 'h':
            case 'H':
                this.toggleControlsPanel();
                break;
            case 'Escape':
                this.hideInfoPanel();
                this.hideControlsPanel();
                break;
        }
    }

    checkOrientation() {
        const isPortrait = window.innerHeight > window.innerWidth;
        if (this.elements.orientationWarning) {
            if (isPortrait) {
                this.elements.orientationWarning.classList.remove('hidden');
            } else {
                this.elements.orientationWarning.classList.add('hidden');
            }
        }
    }

    // 加载进度
    setLoadingProgress(progress, text) {
        if (this.elements.progressFill) {
            this.elements.progressFill.style.width = `${progress}%`;
        }
        if (this.elements.loadingText && text) {
            this.elements.loadingText.textContent = text;
        }
    }

    // 隐藏加载界面
    hideLoadingScreen() {
        if (this.elements.loadingScreen) {
            this.elements.loadingScreen.style.opacity = '0';
            setTimeout(() => {
                this.elements.loadingScreen.style.display = 'none';
            }, 500);
        }
    }

    // 显示信息面板
    showInfoPanel(planetInfo) {
        if (!this.elements.infoPanel) return;

        const { name, data } = planetInfo;

        this.elements.planetName.textContent = name;
        this.elements.planetRadius.textContent = data.info.radius;
        this.elements.planetMass.textContent = data.info.mass;
        this.elements.planetDistance.textContent = data.info.distance;
        this.elements.planetPeriod.textContent = data.info.period;
        this.elements.planetMoons.textContent = data.info.moons;

        this.elements.infoPanel.classList.remove('hidden');
    }

    // 隐藏信息面板
    hideInfoPanel() {
        if (this.elements.infoPanel) {
            this.elements.infoPanel.classList.add('hidden');
        }
    }

    // 切换控制面板
    toggleControlsPanel() {
        if (this.elements.controlsPanel) {
            this.state.showControls = !this.state.showControls;
            if (this.state.showControls) {
                this.elements.controlsPanel.classList.remove('hidden');
            } else {
                this.elements.controlsPanel.classList.add('hidden');
            }
        }
    }

    hideControlsPanel() {
        if (this.elements.controlsPanel) {
            this.elements.controlsPanel.classList.add('hidden');
            this.state.showControls = false;
        }
    }

    // 事件系统
    on(event, callback) {
        if (!this.callbacks[event]) {
            this.callbacks[event] = [];
        }
        this.callbacks[event].push(callback);
    }

    emit(event, data) {
        if (this.callbacks[event]) {
            this.callbacks[event].forEach(callback => callback(data));
        }
    }
}
