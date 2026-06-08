import * as THREE from 'three';

// ============================================================
// 航天器模块 - ISS、天宫、星链、旅行者一号
// 距离/轨道缩放：AU^0.4（与行星系统一致）
// 地球 distance = 25.7 视觉单位
// ============================================================

// --- 光晕纹理（内部复用） ---
let _glowTex = null;
function getGlowTexture() {
    if (_glowTex) return _glowTex;
    const c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,0.8)');
    g.addColorStop(0.2, 'rgba(255,255,255,0.4)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    _glowTex = new THREE.CanvasTexture(c);
    return _glowTex;
}

// --- 轨道线辅助函数 ---
function createOrbitLine(radius, color = 0x6688cc, opacity = 0.25) {
    const segments = 64;
    const pts = [];
    for (let i = 0; i <= segments; i++) {
        const a = (i / segments) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
    return new THREE.Line(geo, mat);
}

// --- ISS 国际空间站 ---
function createISS(scene, earth) {
    const group = new THREE.Group();

    const mat = new THREE.MeshBasicMaterial({ color: 0xcccccc });
    const matDark = new THREE.MeshBasicMaterial({ color: 0x999999 });

    // 主桁架（水平横梁）
    const truss = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.015, 0.015), mat);
    group.add(truss);

    // 节点舱 1（中央）
    const node1 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.025, 0.025), mat);
    group.add(node1);

    // 节点舱 2（偏移）
    const node2 = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 0.025), mat);
    node2.position.set(-0.04, 0, 0);
    group.add(node2);

    // 美国实验舱 Destiny
    const destiny = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.022, 0.022), mat);
    destiny.position.set(0.04, 0, 0);
    group.add(destiny);

    // 俄罗斯服务舱 Zvezda
    const zvezda = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.02, 0.02), matDark);
    zvezda.position.set(-0.08, 0, 0);
    group.add(zvezda);

    // 日本实验舱 Kibo
    const kibo = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.02, 0.02), mat);
    kibo.position.set(0.02, -0.02, 0);
    group.add(kibo);

    // 太阳能帆板（四组，对称分布）
    const panelMat = new THREE.MeshBasicMaterial({ color: 0x4466aa });
    const panelW = 0.065, panelH = 0.035, panelD = 0.002;
    [[-1, 0.15], [-1, -0.15], [1, 0.15], [1, -0.15]].forEach(([side, xOff]) => {
        const panel = new THREE.Mesh(new THREE.BoxGeometry(panelW, panelD, panelH), panelMat);
        panel.position.set(side * xOff, 0, 0.02);
        group.add(panel);
    });

    // 轨道容器：倾角 51.6 度
    const orbitContainer = new THREE.Group();
    orbitContainer.rotation.x = THREE.MathUtils.degToRad(-51.6);
    orbitContainer.add(group);
    earth.add(orbitContainer);

    group.position.set(1.8, 0, 0);

    // 轨道线
    const orbitLine = createOrbitLine(1.8, 0x6688cc, 0.2);
    orbitContainer.add(orbitLine);

    group.userData = {
        type: 'spacecraft',
        key: 'iss',
        name: '国际空间站 ISS',
        data: {
            name: '国际空间站 ISS',
            info: {
                radius: '109 m × 73 m（翼展）',
                mass: '420,000 kg',
                distance: '400 km 轨道高度',
                period: '92 分钟',
                moons: '无'
            }
        }
    };

    return { mesh: group, orbitGroup: orbitContainer, orbitLine };
}

// --- 天宫空间站 ---
function createTiangong(scene, earth) {
    const group = new THREE.Group();

    const white = new THREE.MeshBasicMaterial({ color: 0x888888 });
    const gold = new THREE.MeshBasicMaterial({ color: 0xbb8833 });

    // 核心舱 天和（水平方向，沿 X 轴）
    const core = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, 0.06, 12),
        white
    );
    core.rotation.z = Math.PI / 2;
    group.add(core);

    // 问天实验舱（向上，沿 Y 负方向 = T 的左臂）
    const wentian = new THREE.Mesh(
        new THREE.CylinderGeometry(0.011, 0.011, 0.045, 12),
        white
    );
    wentian.position.set(0.01, -0.028, 0);
    group.add(wentian);

    // 梦天实验舱（向下，沿 Y 正方向 = T 的右臂）
    const mengtian = new THREE.Mesh(
        new THREE.CylinderGeometry(0.011, 0.011, 0.045, 12),
        white
    );
    mengtian.position.set(0.01, 0.028, 0);
    group.add(mengtian);

    // 太阳能帆板（金色，三对）
    const panelW = 0.04, panelH = 0.018, panelD = 0.001;
    [
        { pos: [0.03, 0, 0.015] },   // 核心舱
        { pos: [0.01, -0.052, 0.015] }, // 问天
        { pos: [0.01, 0.052, 0.015] }   // 梦天
    ].forEach(({ pos }) => {
        const panel = new THREE.Mesh(
            new THREE.BoxGeometry(panelW, panelD, panelH), gold
        );
        panel.position.set(...pos);
        group.add(panel);
    });

    // 轨道容器：倾角 41.5 度
    const orbitContainer = new THREE.Group();
    orbitContainer.rotation.x = THREE.MathUtils.degToRad(-41.5);
    orbitContainer.add(group);
    earth.add(orbitContainer);

    group.position.set(1.8, 0, 0);

    // 轨道线
    const orbitLine = createOrbitLine(1.8, 0x88aadd, 0.2);
    orbitContainer.add(orbitLine);

    group.userData = {
        type: 'spacecraft',
        key: 'tiangong',
        name: '中国空间站 天宫',
        data: {
            name: '中国空间站 天宫',
            info: {
                radius: '55.6 m（T 字构型）',
                mass: '约 100,000 kg（设计）',
                distance: '400 km 轨道高度',
                period: '约 92 分钟',
                moons: '无'
            }
        }
    };

    return { mesh: group, orbitGroup: orbitContainer, orbitLine };
}

// --- 星链星座（基于 SpaceX FCC 真实轨道数据）---
// Gen2（V2 Mini，2023年起）+ Gen1（V1.5，2019-2022），共约 9,908 颗
// 数据来源：FCC Gen2 授权（2022年底）+ Gen1 部署数据
// 视觉距离公式：1.3 + 0.5 × (altitude/400)^0.6
//   ISS 420km → 1.80，星链 525-570km → 1.87-1.97，月球 → 2.5
function createStarlink(scene, earth) {
    const SHELLS = [
        { planes: 72, perPlane: 22, distance: 1.87, inclination: 53.0 },
        { planes: 66, perPlane: 22, distance: 1.90, inclination: 53.0 },
        { planes: 54, perPlane: 22, distance: 1.94, inclination: 53.0 },
        { planes: 12, perPlane: 28, distance: 1.96, inclination: 97.6 },
    ];

    // 每个壳层一个独立的 Points
    const shellItems = [];
    const group = new THREE.Group();

    SHELLS.forEach((shell) => {
        const total = shell.planes * shell.perPlane;
        const pos = new Float32Array(total * 3);
        const sz = new Float32Array(total);

        const inclRad = THREE.MathUtils.degToRad(shell.inclination);
        const raanStep = (Math.PI * 2) / shell.planes;

        let ci = 0;
        for (let p = 0; p < shell.planes; p++) {
            const raan = p * raanStep;

            // 四元数：先绕 X 轴倾斜（轨道面倾角），再绕 Y 轴旋转到升交点经度
            const qIncl = new THREE.Quaternion().setFromAxisAngle(
                new THREE.Vector3(1, 0, 0), inclRad
            );
            const qRaan = new THREE.Quaternion().setFromAxisAngle(
                new THREE.Vector3(0, 1, 0), raan
            );
            const q = new THREE.Quaternion().multiplyQuaternions(qRaan, qIncl);

            for (let s = 0; s < shell.perPlane; s++) {
                const angle = (s / shell.perPlane) * Math.PI * 2;
                const r = shell.distance + (Math.random() - 0.5) * 0.03;
                const local = new THREE.Vector3(
                    Math.cos(angle) * r, 0, Math.sin(angle) * r
                );
                local.applyQuaternion(q);
                local.y += (Math.random() - 0.5) * 0.03;

                pos[ci * 3]     = local.x;
                pos[ci * 3 + 1] = local.y;
                pos[ci * 3 + 2] = local.z;
                sz[ci] = 0.008 + Math.random() * 0.014;
                ci++;
            }
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo.setAttribute('aSize', new THREE.BufferAttribute(sz, 1));

        const mat = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uPixelRatio: { value: window.devicePixelRatio }
            },
            vertexShader: `
                attribute float aSize;
                uniform float uTime;
                uniform float uPixelRatio;
                varying float vAlpha;
                varying float vGlowSize;
                void main() {
                    float flicker = 0.92 + 0.08 * sin(uTime * 2.0 + aSize * 800.0);
                    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
                    float viewDist = -mvPos.z;
                    float distFade = 1.0 - smoothstep(15.0, 55.0, viewDist);
                    float s = aSize * flicker * uPixelRatio * (700.0 / viewDist) * distFade;
                    gl_PointSize = clamp(s, 0.0, 10.0);
                    vAlpha = flicker * distFade;
                    vGlowSize = distFade;
                    gl_Position = projectionMatrix * mvPos;
                }
            `,
            fragmentShader: `
                varying float vAlpha;
                varying float vGlowSize;
                void main() {
                    vec2 center = gl_PointCoord - vec2(0.5);
                    float d = length(center);
                    if (d > 0.5) discard;
                    float core = 1.0 - smoothstep(0.0, 0.04, d);
                    float glow = exp(-d * 8.0);
                    float alpha = clamp(core + glow * vGlowSize * 0.7, 0.0, 1.0);
                    gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        const points = new THREE.Points(geo, mat);
        // 轨道角速度：开普勒第三定律 T² ∝ r³ → ω ∝ r^(-3/2)
        points.userData = { speed: Math.pow(shell.distance, -1.5) };
        group.add(points);
        shellItems.push(points);
    });

    earth.add(group);
    group.visible = false;

    group.userData = {
        type: 'spacecraft',
        key: 'starlink',
        name: '星链星座 Starlink',
        data: {
            name: '星链星座 Starlink',
            info: {
                radius: '约 3 m × 2.8 m（V1.5）/ 约 4 m × 2.8 m（V2 Mini）',
                mass: '约 300 kg（V1.5）/ 约 800 kg（V2 Mini）',
                distance: '525 - 570 km 轨道高度',
                period: '约 90 - 95 分钟',
                moons: '约 9,900+ 颗在轨（Gen1+Gen2）'
            }
        }
    };

    return { mesh: group, orbitGroup: group, worldGroup: group, shellItems };
}

// --- 旅行者一号 ---
function createVoyager(scene) {
    // 极小金色八面体
    const body = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.05, 0),
        new THREE.MeshBasicMaterial({ color: 0xddb833 })
    );

    // 信号光晕 Sprite
    const glowMat = new THREE.SpriteMaterial({
        map: getGlowTexture(),
        color: 0xeeaa33,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0.5
    });
    const glow = new THREE.Sprite(glowMat);
    glow.scale.set(0.5, 0.5, 1);
    body.add(glow);

    // 轨道容器：偏离黄道面约 35 度
    const orbitContainer = new THREE.Group();
    orbitContainer.rotation.x = THREE.MathUtils.degToRad(35);
    orbitContainer.add(body);
    scene.add(orbitContainer);

    // 170 AU: 170^0.4 ≈ 7.80, 视觉缩放 25.7 → 约 200 单位
    body.position.set(200, 0, 0);

    body.userData = {
        type: 'spacecraft',
        key: 'voyager',
        name: '旅行者一号 Voyager 1',
        data: {
            name: '旅行者一号 Voyager 1',
            info: {
                radius: '约 2.3 m（高增益天线直径 3.7 m）',
                mass: '815 kg',
                distance: '约 170 AU（255 亿公里）',
                period: '无（逃离太阳系）',
                moons: '无'
            }
        },
        glow
    };

    return { mesh: body, orbitGroup: orbitContainer };
}

// ============================================================
// 公共 API
// ============================================================

/**
 * 创建所有航天器
 * @param {THREE.Scene} scene
 * @returns {{ iss, tiangong, starlink, voyager, update }}
 */
export function createSpacecraft(scene) {
    // 需要 earth 引用来挂载空间站和星链
    // earth 被 planets.js 包装在 orbitGroup 中（非 scene 直接子对象），需遍历查找
    let earthRef = null;
    scene.traverse(obj => {
        if (!earthRef && obj.userData && obj.userData.key === 'earth') {
            earthRef = obj;
        }
    });

    const iss = earthRef ? createISS(scene, earthRef) : null;
    const tiangong = earthRef ? createTiangong(scene, earthRef) : null;
    const starlink = earthRef ? createStarlink(scene, earthRef) : null;
    const voyager = createVoyager(scene);

    function update(time) {
        updateSpacecraft({ iss, tiangong, starlink, voyager }, time);
    }

    return { iss, tiangong, starlink, voyager, update };
}

/**
 * 每帧更新所有航天器（在 animate 循环中调用）
 * @param {{ iss?, tiangong?, starlink?, voyager? }} bodies
 * @param {number} time  当前模拟时间（秒）
 */
export function updateSpacecraft(bodies, time) {
    const { iss, tiangong, starlink, voyager } = bodies;

    // ISS：~3 秒一圈（92 分钟缩放）
    if (iss) {
        iss.orbitGroup.rotation.y = (2 * Math.PI * time) / 3;
        iss.mesh.rotation.y += 0.001;
    }

    // 天宫：~3 秒一圈，与 ISS 相近周期
    if (tiangong) {
        tiangong.orbitGroup.rotation.y = (2 * Math.PI * time) / 3 + 1.2;
        tiangong.mesh.rotation.y += 0.001;
    }

    // 星链：各壳层独立旋转 + 闪烁
    if (starlink && starlink.shellItems) {
        starlink.shellItems.forEach((points) => {
            points.rotation.y = points.userData.speed * time;
            if (points.material.uniforms) {
                points.material.uniforms.uTime.value = time;
            }
        });
    }

    // 旅行者一号：以约 0.0192 单位/秒 匀速远离太阳
    // 3.5 AU/年 ≈ 3.5×3.99/31557600 秒 ≈ 4.43e-7 单位/真实秒
    // 模拟缩放：用 time 直接乘以速率（time 已经是模拟秒）
    if (voyager) {
        const speed = 0.16; // 170→200 距离增大，速度等比放大保证可观察运动
        const dist = 200 + speed * time;
        voyager.mesh.position.set(dist, 0, 0);
        voyager.mesh.rotation.y += 0.002;

        // 信号光晕缓慢脉动
        if (voyager.mesh.userData.glow) {
            const s = 0.4 + 0.15 * Math.sin(time * 0.5);
            voyager.mesh.userData.glow.scale.set(s, s, 1);
        }
    }
}
