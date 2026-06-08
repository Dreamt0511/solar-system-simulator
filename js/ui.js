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
            quoteOverlay: document.getElementById('pale-blue-dot'),
            quoteText: document.querySelector('#pale-blue-dot .quote-text'),
            quoteAuthor: document.querySelector('#pale-blue-dot .quote-author'),
            quoteClose: document.querySelector('#pale-blue-dot .quote-close'),
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

        // 日期显示元素（可能不存在于 DOM）
        this.dateDisplayEl = document.getElementById('date-display');

        // 截图按钮（可能不存在于 DOM）
        this.screenshotBtn = document.getElementById('screenshot-btn');

        this.renderer = null;
        this.postProcessing = null;
        this.quoteTimeoutId = null;

        // 地球音乐
        this.earthAudio = new Audio('music/earth.mp3');
        this.earthAudio.preload = 'auto';
        this.earthAudio.loop = true;

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

        // 截图按钮
        if (this.screenshotBtn) {
            this.screenshotBtn.addEventListener('click', () => {
                this.captureScreenshot();
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

        // 相机到达后，延迟1.5秒后同时显示引文和播放音乐
        window.addEventListener('cameraArrived', (e) => {
            const { data } = e.detail;
            if (data.info && data.info.quote) {
                if (this.quoteTimeoutId) {
                    clearTimeout(this.quoteTimeoutId);
                }
                this.quoteTimeoutId = setTimeout(() => {
                    this.showQuoteOverlay(data.info.quote, data.info.quoteSource);
                    if (this.earthAudio.paused) {
                        this.earthAudio.currentTime = 0;
                        this.earthAudio.play().catch(() => {});
                    }
                    this.quoteTimeoutId = null;
                }, 1500);
            }
        });

        // 监听屏幕方向变化
        window.addEventListener('resize', () => {
            this.checkOrientation();
        });
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.checkOrientation(), 100);
        });

        // 关闭引文弹窗（点击关闭按钮、容器本身或按 ESC）
        if (this.elements.quoteClose) {
            this.elements.quoteClose.addEventListener('click', () => {
                this.hideQuoteOverlay();
            });
        }
        // 点击引文容器任意位置关闭
        const quoteContainer = document.querySelector('#pale-blue-dot .quote-container');
        if (quoteContainer) {
            quoteContainer.addEventListener('click', (e) => {
                if (e.target === this.elements.quoteClose) return;
                this.hideQuoteOverlay();
            });
        }

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
                this.hideQuoteOverlay();
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

    // 设置渲染器引用
    setRenderer(renderer) {
        this.renderer = renderer;
    }

    // 设置后处理引用（用于截图）
    setPostProcessing(postProcessing) {
        this.postProcessing = postProcessing;
    }

    // 更新日期显示
    updateDateDisplay(simulationTime) {
        if (!this.dateDisplayEl) return;

        const now = new Date();
        // simulationTime=0 时显示当前真实日期
        // 每增加 365.25 秒模拟时间 = 过了一真实年
        // 即 1 秒模拟时间 = 86400000 ms 真实时间
        const simDate = new Date(now.getTime() + simulationTime * 86400000);

        const year = simDate.getFullYear();
        const month = String(simDate.getMonth() + 1).padStart(2, '0');
        const day = String(simDate.getDate()).padStart(2, '0');

        this.dateDisplayEl.textContent = `${year}年${month}月${day}`;
    }

    // 截图下载
    captureScreenshot() {
        console.log('[截图] 按钮点击, renderer:', !!this.renderer, 'postProcessing:', !!this.postProcessing);
        if (!this.renderer) {
            console.warn('[截图] renderer 未就绪');
            return;
        }

        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        const ss = String(now.getSeconds()).padStart(2, '0');
        const filename = `solar-system-${y}${m}${d}-${hh}${mm}${ss}.png`;

        try {
            // 确保 EffectComposer 最终 pass 输出到屏幕 canvas
            if (this.postProcessing && this.postProcessing.toneMappingPass) {
                this.postProcessing.toneMappingPass.renderToScreen = true;
            }
            // 手动触发一次渲染，确保 canvas 有内容
            if (this.postProcessing) {
                this.postProcessing.render();
            }
            // 读取 canvas 像素
            const dataURL = this.renderer.domElement.toDataURL('image/png');
            console.log('[截图] dataURL 长度:', dataURL.length);
            const link = document.createElement('a');
            link.download = filename;
            link.href = dataURL;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error('[截图] 失败:', err);
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
        this.hideQuoteOverlay();
    }

    // 显示引文弹窗
    showQuoteOverlay(text, source) {
        if (!this.elements.quoteOverlay || !this.elements.quoteText || !this.elements.quoteAuthor) return;
        // 清除可能残留的延迟
        if (this.quoteTimeoutId) {
            clearTimeout(this.quoteTimeoutId);
            this.quoteTimeoutId = null;
        }
        this.elements.quoteText.textContent = text;
        this.elements.quoteAuthor.textContent = source;
        this.elements.quoteOverlay.classList.remove('hidden');
    }

    // 隐藏引文弹窗
    hideQuoteOverlay() {
        if (this.quoteTimeoutId) {
            clearTimeout(this.quoteTimeoutId);
            this.quoteTimeoutId = null;
        }
        if (this.elements.quoteOverlay) {
            this.elements.quoteOverlay.classList.add('hidden');
        }
        // 暂停地球音乐并重置
        try {
            this.earthAudio.pause();
            this.earthAudio.currentTime = 0;
        } catch (e) {}
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
