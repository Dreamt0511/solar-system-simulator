import * as THREE from 'three';
import { PLANET_DATA } from './planets.js';

/**
 * 材质切换器
 * 控制纹理模式和纯色模式之间的切换
 * - 纹理模式：行星使用 MeshStandardMaterial + 纹理贴图
 * - 纯色模式：行星使用 MeshBasicMaterial + 纯色
 *
 * 特殊处理：
 * - 太阳：保持自发光 MeshBasicMaterial，纹理模式下仅应用纹理贴图
 * - 土星环：保持原样不切换
 * - 小行星带：始终纯色
 */
export class MaterialSwitcher {
    /**
     * @param {Object} planets - 由 createAllPlanets() 返回的行星对象
     * @param {Map<string, THREE.Texture>} textureMap - 纹理管理器的缓存 (TextureManager.cache)
     */
    constructor(planets, textureMap) {
        this.planets = planets;
        this.textureMap = textureMap;
        this.isTextureMode = false;

        // 保存每个行星的原始材质，用于切换回纯色模式
        this.originalMaterials = new Map();

        // 需要切换材质的行星键名（排除太阳、月球，它们有特殊处理）
        this.planetKeys = [
            'mercury', 'venus', 'earth', 'mars',
            'jupiter', 'saturn', 'uranus', 'neptune'
        ];

        // 保存原始材质
        this._saveOriginalMaterials();
    }

    /**
     * 保存所有行星的原始材质引用
     */
    _saveOriginalMaterials() {
        // 太阳
        if (this.planets.sun && this.planets.sun.material) {
            this.originalMaterials.set('sun', this.planets.sun.material);
        }

        // 月球
        if (this.planets.moon && this.planets.moon.material) {
            this.originalMaterials.set('moon', this.planets.moon.material);
        }

        // 各行星
        this.planetKeys.forEach(key => {
            const planet = this.planets[key];
            if (planet && planet.material) {
                this.originalMaterials.set(key, planet.material);
            }
        });
    }

    /**
     * 切换模式（纹理 <-> 纯色）
     */
    toggle() {
        if (this.isTextureMode) {
            this.switchToSolidMode();
        } else {
            this.switchToTextureMode();
        }
    }

    /**
     * 切换到纹理模式
     * - 行星：MeshStandardMaterial + 纹理贴图
     * - 太阳：保持 MeshBasicMaterial，附加纹理贴图
     * - 月球：MeshStandardMaterial + 纹理贴图
     * - 土星环 / 小行星带：不变
     */
    switchToTextureMode() {
        // 普通行星
        this.planetKeys.forEach(key => {
            const planet = this.planets[key];
            if (!planet) return;

            const texture = this.textureMap.get(key);
            if (!texture) return;

            const data = PLANET_DATA[key];
            const newMaterial = new THREE.MeshStandardMaterial({
                map: texture,
                roughness: 0.8,
                metalness: 0.1,
            });

            planet.material.dispose();
            planet.material = newMaterial;
        });

        // 太阳特殊处理：保持自发光，仅附加纹理
        if (this.planets.sun) {
            const sunTexture = this.textureMap.get('sun');
            if (sunTexture) {
                const sunMaterial = new THREE.MeshBasicMaterial({
                    map: sunTexture,
                });
                this.planets.sun.material.dispose();
                this.planets.sun.material = sunMaterial;
            }
        }

        // 月球特殊处理
        if (this.planets.moon) {
            const moonTexture = this.textureMap.get('moon');
            if (moonTexture) {
                const moonMaterial = new THREE.MeshStandardMaterial({
                    map: moonTexture,
                    roughness: 0.9,
                    metalness: 0.0,
                });
                this.planets.moon.material.dispose();
                this.planets.moon.material = moonMaterial;
            }
        }

        this.isTextureMode = true;
    }

    /**
     * 切换到纯色模式
     * - 所有行星恢复为原始的 MeshBasicMaterial + 纯色
     * - 太阳 / 月球也恢复原始材质
     * - 土星环 / 小行星带：不受影响（从未被修改）
     */
    switchToSolidMode() {
        this.originalMaterials.forEach((material, key) => {
            const planet = this.planets[key];
            if (!planet) return;

            // 创建新的纯色材质（不复用旧材质实例，避免已被 dispose 的问题）
            const data = PLANET_DATA[key];
            if (data) {
                const solidMaterial = new THREE.MeshBasicMaterial({
                    color: data.color,
                });
                planet.material.dispose();
                planet.material = solidMaterial;
            }
        });

        this.isTextureMode = false;
    }

    /**
     * 销毁切换器，释放资源
     */
    dispose() {
        this.originalMaterials.clear();
    }
}
