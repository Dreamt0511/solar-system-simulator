import * as THREE from 'three';

const STARFIELD_IMAGES = [
    'starfield_textures/01_cosmic_couple.jpg',
    'starfield_textures/02_blue_bubble.jpg',
    'starfield_textures/03_cat_eye_nebula.jpg',
    'starfield_textures/04_milky_way.jpg',
    'starfield_textures/05_andromeda.jpg',
    'starfield_textures/06_stormy_sagittarius.jpg',
    'starfield_textures/07_legion_of_galaxies.jpg',
    'starfield_textures/08_carina_landscape.jpg',
];

export class StarfieldBackground {
    constructor(scene) {
        this.scene = scene;
        this.isActive = false;
        this.lastIndex = -1;
        this.savedBackground = null;
        this.galaxy = null;
    }

    setGalaxy(galaxy) {
        this.galaxy = galaxy;
    }

    async toggle() {
        if (this.isActive) {
            this.hide();
            return false;
        }
        await this.show();
        return true;
    }

    async show() {
        // 隐藏银河背景
        if (this.galaxy) {
            this.galaxy.setVisible(false);
        }

        let idx;
        do {
            idx = Math.floor(Math.random() * STARFIELD_IMAGES.length);
        } while (idx === this.lastIndex && STARFIELD_IMAGES.length > 1);
        this.lastIndex = idx;

        const url = STARFIELD_IMAGES[idx];
        const texture = await this._loadTexture(url);

        // 保存原始背景
        if (this.savedBackground === null) {
            this.savedBackground = this.scene.background;
        }

        texture.mapping = THREE.EquirectangularReflectionMapping;
        this.scene.background = texture;
        this.savedIntensity = this.scene.backgroundIntensity;
        this.scene.backgroundIntensity = 0.15;
        this.isActive = true;
    }

    hide() {
        this.scene.background = this.savedBackground;
        this.scene.backgroundIntensity = this.savedIntensity ?? 1;
        this.isActive = false;

        // 恢复银河背景
        if (this.galaxy) {
            this.galaxy.setVisible(true);
        }
    }

    dispose() {
        this.hide();
    }

    _loadTexture(url) {
        return new Promise((resolve, reject) => {
            new THREE.TextureLoader().load(url, resolve, undefined, reject);
        });
    }
}
