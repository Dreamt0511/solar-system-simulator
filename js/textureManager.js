import * as THREE from 'three';

// 行星列表
const PLANET_KEYS = [
  'sun', 'mercury', 'venus', 'earth', 'mars',
  'jupiter', 'saturn', 'uranus', 'neptune', 'moon',
  'pluto', 'ceres', 'io', 'europa', 'ganymede', 'callisto', 'titan', 'halley',
  'earth_night'
];

// 纹理路径模板（fallback 用）
const TEXTURE_PATH = 'textures/{key}.jpg';

/**
 * 纹理管理器
 * 优先使用 atlas（sprite sheet，2 次请求），无 atlas 时 fallback 到逐个加载
 */
export class TextureManager {
  constructor() {
    this.loader = new THREE.TextureLoader();
    this.cache = new Map();
    this.loadingPromises = new Map();
  }

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
   * 加载 atlas 大图并切出各纹理
   */
  async _loadAtlasSheet(file, keysMeta) {
    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = `textures/${file}`;
    });

    for (const [key, { x, y, w, h }] of Object.entries(keysMeta)) {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      this.cache.set(key, texture);
    }
  }

  /**
   * 尝试加载 atlas，成功则切出各纹理；失败则 fallback 到逐个加载
   */
  async loadAll(onProgress) {
    try {
      const resp = await fetch('textures/atlas.json');
      if (!resp.ok) throw new Error('atlas.json not found');
      const meta = await resp.json();

      if (meta.sheets) {
        // 多张 atlas（新格式）
        await Promise.all(meta.sheets.map(s => this._loadAtlasSheet(s.file, s.keys)));
        const total = meta.sheets.reduce((n, s) => n + Object.keys(s.keys).length, 0);
        console.log(`Atlas 加载完成，共 ${total} 张纹理，${meta.sheets.length} 张图集`);
      } else if (meta.keys) {
        // 单张 atlas（旧格式兼容）
        await this._loadAtlasSheet('atlas.jpg', meta.keys);
        console.log(`Atlas 加载完成，共 ${Object.keys(meta.keys).length} 张纹理`);
      }

      if (onProgress) onProgress(PLANET_KEYS.length, PLANET_KEYS.length);
      return this.cache;
    } catch (e) {
      console.warn('Atlas 加载失败，fallback 到逐个加载:', e.message);
      return this._loadAllIndividual(onProgress);
    }
  }

  /**
   * 逐个加载（fallback）
   */
  async _loadAllIndividual(onProgress) {
    const total = PLANET_KEYS.length;
    let loaded = 0;

    const loadPromises = PLANET_KEYS.map(async (key) => {
      const texture = await this._loadSingleTexture(key);
      loaded++;
      if (onProgress) onProgress(loaded, total);
      return { key, texture };
    });

    await Promise.all(loadPromises);
    return this.cache;
  }

  async _loadSingleTexture(key) {
    if (this.cache.has(key)) return this.cache.get(key);
    if (this.loadingPromises.has(key)) return this.loadingPromises.get(key);

    const path = TEXTURE_PATH.replace('{key}', key);
    const promise = new Promise((resolve) => {
      this.loader.load(
        path,
        (texture) => { this.cache.set(key, texture); this.loadingPromises.delete(key); resolve(texture); },
        undefined,
        (error) => {
          console.warn(`纹理加载失败: ${key}`, error);
          const fallback = this.createDefaultTexture();
          this.cache.set(key, fallback);
          this.loadingPromises.delete(key);
          resolve(fallback);
        }
      );
    });
    this.loadingPromises.set(key, promise);
    return promise;
  }

  getTexture(key) { return this.cache.get(key) || null; }
  hasTexture(key) { return this.cache.has(key); }
  getLoadedKeys() { return Array.from(this.cache.keys()); }

  disposeTexture(key) {
    const t = this.cache.get(key);
    if (t) { t.dispose(); this.cache.delete(key); }
  }

  disposeAll() {
    this.cache.forEach(t => t.dispose());
    this.cache.clear();
    this.loadingPromises.clear();
  }
}

export { PLANET_KEYS };
