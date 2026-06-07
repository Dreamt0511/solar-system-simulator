import * as THREE from 'three';

export class AsteroidBelt {
    constructor(scene, count = 1200) {
        this.scene = scene;
        this.count = count;
        this.group = new THREE.Group();
        this.mesh = null;

        this.createBelt();
        this.scene.add(this.group);
    }

    createBelt() {
        const geometry = new THREE.DodecahedronGeometry(0.12, 0);
        const material = new THREE.MeshBasicMaterial({
            color: 0x9a8468
        });
        const mesh = new THREE.Group();

        for (let i = 0; i < this.count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const band = Math.random();
            const radius = 40 + band * 12 + (Math.random() - 0.5) * 1.8;
            const height = (Math.random() - 0.5) * 2.2;
            const size = 0.35 + Math.random() * 0.75;
            const asteroid = new THREE.Mesh(geometry, material);

            asteroid.position.set(
                Math.sin(angle) * radius,
                height,
                Math.cos(angle) * radius
            );
            asteroid.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );
            asteroid.scale.set(size * 1.4, size * (0.6 + Math.random() * 0.8), size);

            mesh.add(asteroid);
        }

        this.mesh = mesh;
        this.geometry = geometry;
        this.material = material;
        this.group.add(mesh);

        // 碰撞环：不可见但可被射线检测，覆盖整个小行星带区域
        const hitGeometry = new THREE.TorusGeometry(46, 10, 4, 64);
        const hitMaterial = new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0,
            depthWrite: false,
            side: THREE.DoubleSide
        });
        const hitMesh = new THREE.Mesh(hitGeometry, hitMaterial);
        hitMesh.rotation.x = Math.PI / 2;
        hitMesh.userData = {
            type: 'asteroidBelt',
            key: 'asteroidBelt',
            data: {
                name: '小行星带',
                info: {
                    radius: '1 ~ 100 km',
                    mass: '约 3.0 × 10²¹ kg',
                    distance: '2.2 ~ 3.2 AU',
                    period: '3 ~ 6 年',
                    moons: '无'
                }
            }
        };
        this.hitMesh = hitMesh;
        this.group.add(hitMesh);
    }

    update(time) {
        this.group.rotation.y = time * 0.025;
    }

    dispose() {
        if (!this.mesh) return;

        this.group.remove(this.mesh);
        if (this.hitMesh) {
            this.group.remove(this.hitMesh);
            this.hitMesh.geometry.dispose();
            this.hitMesh.material.dispose();
        }
        this.scene.remove(this.group);
        if (this.geometry) {
            this.geometry.dispose();
        }
        if (this.material) {
            this.material.dispose();
        }
        this.mesh = null;
    }
}
