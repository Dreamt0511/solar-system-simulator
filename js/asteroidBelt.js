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
        const mesh = new THREE.InstancedMesh(geometry, material, this.count);
        const dummy = new THREE.Object3D();

        for (let i = 0; i < this.count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const band = Math.random();
            const radius = 40 + band * 12 + (Math.random() - 0.5) * 1.8;
            const height = (Math.random() - 0.5) * 2.2;
            const size = 0.35 + Math.random() * 0.75;

            dummy.position.set(
                Math.sin(angle) * radius,
                height,
                Math.cos(angle) * radius
            );
            dummy.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );
            dummy.scale.set(size * 1.4, size * (0.6 + Math.random() * 0.8), size);
            dummy.updateMatrix();

            mesh.setMatrixAt(i, dummy.matrix);
        }

        mesh.instanceMatrix.needsUpdate = true;

        this.mesh = mesh;
        this.group.add(mesh);
    }

    update(time) {
        this.group.rotation.y = time * 0.025;
    }

    dispose() {
        if (!this.mesh) return;

        this.group.remove(this.mesh);
        this.scene.remove(this.group);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
        this.mesh = null;
    }
}
