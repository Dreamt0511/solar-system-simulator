# Solar System Detail Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a visually obvious asteroid belt between Mars and Jupiter and reduce the background star density.

**Architecture:** Add a focused `AsteroidBelt` module that owns asteroid generation, animation, and disposal. Wire it into `main.js` beside the existing `Starfield`, keeping planet/orbit code unchanged except for shared scene usage.

**Tech Stack:** JavaScript ES modules, Three.js `InstancedMesh`, `Object3D`, `Matrix4`, and existing animation loop.

---

### File Structure

- Create: `太阳系行星系统/js/asteroidBelt.js` — creates and animates a visually dense asteroid ring using one `THREE.InstancedMesh`.
- Modify: `太阳系行星系统/js/main.js` — imports `AsteroidBelt`, stores it on the app, creates it during initialization, updates it in the animation loop, and reduces `Starfield` count.

### Task 1: Asteroid Belt Module

**Files:**
- Create: `太阳系行星系统/js/asteroidBelt.js`

- [ ] **Step 1: Write the failing geometry smoke test**

Run this before creating the module:

```bash
node --check "太阳系行星系统/js/asteroidBelt.js"
```

Expected: FAIL because the file does not exist yet.

- [ ] **Step 2: Create the asteroid belt module**

Create `太阳系行星系统/js/asteroidBelt.js` with this content:

```javascript
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
            color: 0x9a8468,
            vertexColors: true
        });
        const mesh = new THREE.InstancedMesh(geometry, material, this.count);
        const dummy = new THREE.Object3D();
        const color = new THREE.Color();

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

            const shade = 0.55 + Math.random() * 0.35;
            color.setRGB(shade, shade * (0.78 + Math.random() * 0.15), shade * 0.58);
            mesh.setColorAt(i, color);
        }

        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) {
            mesh.instanceColor.needsUpdate = true;
        }

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
```

- [ ] **Step 3: Verify module syntax**

Run:

```bash
node --check "太阳系行星系统/js/asteroidBelt.js"
```

Expected: PASS with no output.

### Task 2: Main App Wiring and Star Reduction

**Files:**
- Modify: `太阳系行星系统/js/main.js:1-183`

- [ ] **Step 1: Add import and state slot**

Modify the imports and constructor in `main.js` so the top imports include:

```javascript
import { Starfield } from './starfield.js';
import { AsteroidBelt } from './asteroidBelt.js';
```

And the constructor includes:

```javascript
this.starfield = null;
this.asteroidBelt = null;
this.cameraController = null;
```

- [ ] **Step 2: Reduce star count and create the belt**

Change:

```javascript
this.starfield = new Starfield(this.scene, 200000);
```

to:

```javascript
this.starfield = new Starfield(this.scene, 50000);
```

After orbit creation, add:

```javascript
this.asteroidBelt = new AsteroidBelt(this.scene);
```

- [ ] **Step 3: Update the belt in the animation loop**

After the starfield update block, add:

```javascript
if (this.asteroidBelt) {
    this.asteroidBelt.update(this.simulationTime);
}
```

- [ ] **Step 4: Verify JavaScript syntax**

Run:

```bash
node --check "太阳系行星系统/js/main.js" && node --check "太阳系行星系统/js/asteroidBelt.js"
```

Expected: PASS with no output.

### Task 3: Browser Verification

**Files:**
- Runtime check only

- [ ] **Step 1: Start or reuse the local server**

Run:

```bash
python3 "太阳系行星系统/server.py"
```

Expected: the server prints the access address or the command indicates the port is already in use by an existing server.

- [ ] **Step 2: Load the page**

Open:

```text
http://127.0.0.1:8000/
```

Expected: the solar system loads without JavaScript initialization error.

- [ ] **Step 3: Visual checks**

Check these items manually:

```text
1. Between Mars and Jupiter there is a visible asteroid belt.
2. The belt is broad and varied, not a single thin line.
3. The belt slowly rotates with simulation time.
4. Background stars are noticeably less dense than before.
5. Planet click/fly behavior still works.
```

---

### Self-Review

- Spec coverage: asteroid belt, visual emphasis, Mars-Jupiter placement, slower rotation, and reduced stars are covered.
- Placeholder scan: no placeholders remain.
- Type consistency: `AsteroidBelt`, `update(time)`, and `dispose()` names are consistent across module and app wiring.
