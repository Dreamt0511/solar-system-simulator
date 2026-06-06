import * as THREE from 'three';

// 行星列表
const PLANET_KEYS = [
  'sun', 'mercury', 'venus', 'earth', 'mars',
  'jupiter', 'saturn', 'uranus', 'neptune', 'moon'
];

// 纹理路径模板
const TEXTURE_PATH = 'textures/{key}.jpg';

/**
 * 纹理管理器
 * 管理行星纹理的加载、缓存和释放
 */
export class TextureManager {
  constructor() {
    this.loader = new THREE.TextureLoader();
    this.cache = new Map();
    this.loadingPromises = new Map();
  }

  /**
   * 创建默认纹理（纯色）
   * @param {number} color - 颜色值
   * @returns {THREE.Texture}
   */
  createDefaultTexture(color = 0x808080) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
    ctx.fillRect(0, 0, 64, 64);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  /**
   * 加载单个纹理
   * @param {string} key - 行星键名
   * @returns {Promise<THREE.Texture>}
   */
  async loadTexture(key) {
    // 检查缓存
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    // 检查是否正在加载
    if (this.loadingPromises.has(key)) {
      return this.loadingPromises.get(key);
    }

    const path = TEXTURE_PATH.replace('{key}', key);

    const promise = new Promise((resolve) => {
      this.loader.load(
        path,
        (texture) => {
          this.cache.set(key, texture);
          this.loadingPromises.delete(key);
          resolve(texture);
        },
        undefined,
        (error) => {
          console.warn(`纹理加载失败: ${key}, 使用默认纹理`, error);
          const defaultTexture = this.createDefaultTexture();
          this.cache.set(key, defaultTexture);
          this.loadingPromises.delete(key);
          resolve(defaultTexture);
        }
      );
    });

    this.loadingPromises.set(key, promise);
    return promise;
  }

  /**
   * 异步加载所有行星纹理
   * @param {Function} [onProgress] - 进度回调 (loaded, total)
   * @returns {Promise<Map<string, THREE.Texture>>}
   */
  async loadAll(onProgress) {
    const total = PLANET_KEYS.length;
    let loaded = 0;

    const loadPromises = PLANET_KEYS.map(async (key) => {
      const texture = await this.loadTexture(key);
      loaded++;
      if (onProgress) {
        onProgress(loaded, total);
      }
      return { key, texture };
    });

    await Promise.all(loadPromises);
    return this.cache;
  }

  /**
   * 获取指定行星的纹理
   * @param {string} key - 行星键名
   * @returns {THREE.Texture|null}
   */
  getTexture(key) {
    return this.cache.get(key) || null;
  }

  /**
   * 释放指定行星的纹理内存
   * @param {string} key - 行星键名
   */
  disposeTexture(key) {
    const texture = this.cache.get(key);
    if (texture) {
      texture.dispose();
      this.cache.delete(key);
    }
  }

  /**
   * 释放所有纹理内存
   */
  disposeAll() {
    this.cache.forEach((texture) => {
      texture.dispose();
    });
    this.cache.clear();
    this.loadingPromises.clear();
  }

  /**
   * 获取所有已加载的行星键名
   * @returns {string[]}
   */
  getLoadedKeys() {
    return Array.from(this.cache.keys());
  }

  /**
   * 检查指定纹理是否已加载
   * @param {string} key - 行星键名
   * @returns {boolean}
   */
  hasTexture(key) {
    return this.cache.has(key);
  }
}

// 导出行星列表供外部使用
export { PLANET_KEYS };
