import * as THREE from 'three';
import { PLANET_DATA } from './planets.js';
import { EXTENDED_DATA } from './extendedBodies.js';

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
    constructor(planets, textureMap, extendedBodies = {}, earthNightShader = null) {
        this.planets = planets;
        this.textureMap = textureMap;
        this.extendedBodies = extendedBodies;
        this.earthNightShader = earthNightShader;
        this.isTextureMode = false;

        // 保存每个行星的原始材质，用于切换回纯色模式
        this.originalMaterials = new Map();

        // 太阳光晕原始透明度
        this.sunGlowOpacities = [];

        // 需要切换材质的行星键名（排除太阳、月球，它们有特殊处理）
        this.planetKeys = [
            'mercury', 'venus', 'earth', 'mars',
            'jupiter', 'saturn', 'uranus', 'neptune'
        ];

        // 扩展天体键名（矮行星 + 卫星）
        this.extendedKeys = ['pluto', 'ceres', 'io', 'europa', 'ganymede', 'callisto', 'titan'];

        // 保存原始材质
        this._saveOriginalMaterials();
        // 保存太阳光晕透明度
        this._saveSunGlowOpacities();
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

        // 扩展天体
        this.extendedKeys.forEach(key => {
            const body = this.extendedBodies[key];
            if (body && body.material) {
                this.originalMaterials.set(key, body.material);
            }
        });
    }

    _saveSunGlowOpacities() {
        if (this.planets.sun) {
            this.planets.sun.children.forEach(child => {
                if (child.isSprite) {
                    this.sunGlowOpacities.push(child.material.opacity);
                }
            });
        }
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
        // 隐藏所有行星光晕（保留太阳）
        this.planetKeys.forEach(key => {
            const planet = this.planets[key];
            if (planet && planet.userData.glow) {
                planet.userData.glow.visible = false;
            }
        });
        // 月球光晕
        if (this.planets.moon) {
            this.planets.moon.children.forEach(child => {
                if (child.isSprite) child.visible = false;
            });
        }

        // 普通行星
        this.planetKeys.forEach(key => {
            const planet = this.planets[key];
            if (!planet) return;

            const texture = this.textureMap.get(key);
            if (!texture) return;

            // 地球特殊处理：真实纹理 + 昼夜转换
            if (key === 'earth' && this.earthNightShader) {
                const shaderMat = new THREE.ShaderMaterial({
                    uniforms: {
                        dayMap: { value: texture },
                        nightMap: { value: this.earthNightShader.nightTexture },
                        sunDirection: { value: new THREE.Vector3(1, 0, 0) },
                        nightIntensity: { value: 1.5 },
                    },
                    vertexShader: `
                        varying vec2 vUv;
                        varying vec3 vNormal;
                        void main() {
                            vUv = uv;
                            vNormal = normalize(normalMatrix * normal);
                            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                        }
                    `,
                    fragmentShader: `
                        uniform sampler2D dayMap;
                        uniform sampler2D nightMap;
                        uniform vec3 sunDirection;
                        uniform float nightIntensity;
                        varying vec2 vUv;
                        varying vec3 vNormal;
                        void main() {
                            vec3 normal = normalize(vNormal);
                            float NdotL = dot(normal, sunDirection);
                            float dayFactor = smoothstep(-0.15, 0.25, NdotL);
                            vec4 dayColor = texture2D(dayMap, vUv);
                            vec4 nightColor = texture2D(nightMap, vUv);
                            gl_FragColor = mix(nightColor * nightIntensity, dayColor, dayFactor);
                        }
                    `,
                });
                planet.material.dispose();
                planet.material = shaderMat;
                // 同步引用，让 updatePlanetDetails 的 sunDirection 更新继续生效
                this.earthNightShader.shaderMaterial = shaderMat;
                return;
            }

            const newMaterial = new THREE.MeshStandardMaterial({
                map: texture,
                color: 0xffffff,
                roughness: 0.4,
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

            // 太阳光晕缩小
            let i = 0;
            this.planets.sun.children.forEach(child => {
                if (child.isSprite) {
                    child.material.opacity = this.sunGlowOpacities[i] * 0.25;
                    i++;
                }
            });
        }

        // 扩展天体光晕隐藏（哈雷彗星除外，它本身就亮）
        this.extendedKeys.forEach(key => {
            const body = this.extendedBodies[key];
            if (body && body.userData && body.userData.glow) {
                body.userData.glow.visible = false;
            }
        });

        // 月球特殊处理
        if (this.planets.moon) {
            const moonTexture = this.textureMap.get('moon');
            if (moonTexture) {
                const moonMaterial = new THREE.MeshBasicMaterial({
                    map: moonTexture,
                });
                this.planets.moon.material.dispose();
                this.planets.moon.material = moonMaterial;
            }
        }

        // 扩展天体：矮行星和卫星使用 MeshStandardMaterial + 纹理
        this.extendedKeys.forEach(key => {
            const body = this.extendedBodies[key];
            if (!body) return;

            const texture = this.textureMap.get(key);
            if (!texture) return;

            const newMaterial = new THREE.MeshStandardMaterial({
                map: texture,
                color: 0xffffff,
                roughness: 0.5,
                metalness: 0.1,
            });

            body.material.dispose();
            body.material = newMaterial;
        });

        this.isTextureMode = true;
    }

    /**
     * 切换到纯色模式
     * - 所有行星恢复为原始的 MeshBasicMaterial + 纯色
     * - 太阳 / 月球也恢复原始材质
     * - 土星环 / 小行星带：不受影响（从未被修改）
     */
    switchToSolidMode() {
        // 恢复行星光晕
        this.planetKeys.forEach(key => {
            const planet = this.planets[key];
            if (planet && planet.userData.glow) {
                planet.userData.glow.visible = true;
            }
        });
        // 月球光晕
        if (this.planets.moon) {
            this.planets.moon.children.forEach(child => {
                if (child.isSprite) child.visible = true;
            });
        }
        // 恢复太阳光晕透明度
        if (this.planets.sun) {
            let i = 0;
            this.planets.sun.children.forEach(child => {
                if (child.isSprite) {
                    child.material.opacity = this.sunGlowOpacities[i];
                    i++;
                }
            });
        }

        // 恢复扩展天体光晕
        this.extendedKeys.forEach(key => {
            const body = this.extendedBodies[key];
            if (body && body.userData && body.userData.glow) {
                body.userData.glow.visible = true;
            }
        });

        this.originalMaterials.forEach((material, key) => {
            const planet = this.planets[key];
            if (!planet) return;

            // 纯色模式：所有行星统一使用 MeshBasicMaterial + 纯色（包括地球）
            const data = PLANET_DATA[key];
            if (data) {
                const solidMaterial = new THREE.MeshBasicMaterial({
                    color: data.color,
                });
                planet.material.dispose();
                planet.material = solidMaterial;
            }
        });

        // 恢复扩展天体的纯色材质
        this.extendedKeys.forEach(key => {
            const body = this.extendedBodies[key];
            if (!body) return;

            const extBodyData = EXTENDED_DATA[key];
            const color = extBodyData ? extBodyData.color : 0x888888;

            const solidMaterial = new THREE.MeshBasicMaterial({ color });
            body.material.dispose();
            body.material = solidMaterial;
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
