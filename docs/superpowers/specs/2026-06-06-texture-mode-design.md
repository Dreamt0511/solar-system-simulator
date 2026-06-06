# 太阳系行星系统 - 真实纹理模式设计文档

## 概述

为太阳系行星系统添加真实纹理模式，通过开关自由切换纯色模式和纹理模式。纹理模式使用NASA公开的行星纹理图片，纯色模式保持当前的自发光效果。

## 核心需求

1. **纹理来源**：使用免费在线纹理（NASA公开数据），打包到项目中
2. **切换机制**：控制面板中的开关，支持实时切换
3. **材质系统**：两种独立系统
   - 纯色模式：`MeshBasicMaterial`（自发光，不受光照影响）
   - 纹理模式：`MeshStandardMaterial`（需要光源照射）
4. **UI设计**：右下角设置图标，点击显示控制面板（考虑手机预览）

## 架构设计

### 新增文件

1. **`js/textureManager.js`** - 纹理加载和管理
2. **`js/materialSwitcher.js`** - 材质切换逻辑

### 修改文件

1. **`index.html`** - 添加设置图标和纹理开关UI
2. **`css/style.css`** - 新增样式
3. **`js/main.js`** - 集成纹理系统
4. **`js/ui.js`** - 添加开关事件处理
5. **`js/planets.js`** - 修改行星创建，支持材质切换

### 数据流

```
用户点击开关 → UI事件 → materialSwitcher切换材质 → 更新渲染
```

## 详细设计

### 1. 纹理管理 (textureManager.js)

```javascript
export class TextureManager {
    constructor() {
        this.textures = {};
        this.loaded = false;
    }

    async loadAll() // 异步加载所有纹理
    getTexture(planetKey) // 获取指定行星纹理
    dispose() // 释放纹理内存
}
```

**纹理资源**：
- 纹理图片放在 `textures/` 目录
- 每个行星一个纹理文件（如 `earth.jpg`, `mars.jpg`）
- 总大小约50-100MB

**加载策略**：
- 使用 `THREE.TextureLoader` 异步加载
- 加载过程中显示进度条
- 加载完成后启用纹理开关

**行星纹理列表**：
- 太阳：`sun.jpg`（光晕保持不变）
- 水星：`mercury.jpg`
- 金星：`venus.jpg`
- 地球：`earth.jpg`
- 火星：`mars.jpg`
- 木星：`jupiter.jpg`
- 土星：`saturn.jpg`（环单独处理）
- 天王星：`uranus.jpg`
- 海王星：`neptune.jpg`
- 月球：`moon.jpg`

### 2. 材质切换 (materialSwitcher.js)

```javascript
export class MaterialSwitcher {
    constructor(planets, textureManager) {
        this.planets = planets;
        this.textureManager = textureManager;
        this.isTextureMode = false;
    }

    switchToTextureMode() // 切换到纹理模式
    switchToSolidMode()   // 切换到纯色模式
    toggle()              // 切换当前模式
}
```

**材质创建**：
- 纯色模式：保持当前的 `MeshBasicMaterial`（自发光）
- 纹理模式：使用 `MeshStandardMaterial`（需要光照）

**切换逻辑**：
```javascript
switchToTextureMode() {
    Object.keys(this.planets).forEach(key => {
        const planet = this.planets[key];
        const texture = this.textureManager.getTexture(key);

        // 创建纹理材质
        const material = new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.8,
            metalness: 0.1
        });

        // 替换材质
        planet.material.dispose();
        planet.material = material;
    });
    this.isTextureMode = true;
}
```

**特殊处理**：
- 太阳：纹理模式下仍保持自发光效果（emissive属性）
- 土星环：单独处理纹理
- 小行星带：保持纯色（纹理对小物体无意义）

### 3. UI控制面板改造

**设置图标**：
- 位置：右下角（`position: fixed; bottom: 20px; right: 20px;`）
- 样式：圆形按钮，齿轮图标（CSS伪元素或SVG）
- 大小：48x48px（适合手指点击）
- 点击后显示控制面板

**控制面板**：
- 位置：右下角弹出，覆盖在设置图标上方
- 内容：
  - 时间速度滑块
  - 暂停/继续按钮
  - 重置视角按钮
  - **纹理模式开关**（新增）
- 关闭：点击面板外区域或再次点击设置图标

**纹理开关UI**：
```html
<div class="control-group">
    <label>真实纹理</label>
    <button id="texture-toggle" disabled>加载中...</button>
</div>
```

**状态变化**：
1. 初始：按钮禁用，显示"加载中..."
2. 纹理加载完成：按钮启用，显示"开启"
3. 点击后：切换为"关闭"（或用开关样式）

**手机适配**：
- 按钮和文字足够大（最小44px触摸区域）
- 面板宽度自适应（最大300px）
- 支持触摸滑动（时间速度滑块）

## 实施计划

### 步骤1：下载纹理资源
- 从NASA公开数据源下载行星纹理
- 保存到 `textures/` 目录
- 验证图片质量和大小

### 步骤2：创建textureManager.js
- 实现纹理加载和管理
- 支持异步加载和进度回调

### 步骤3：创建materialSwitcher.js
- 实现材质切换逻辑
- 处理特殊天体（太阳、土星环、小行星带）

### 步骤4：改造UI
- 添加设置图标
- 改造控制面板
- 添加纹理开关

### 步骤5：集成到main.js
- 初始化纹理系统
- 绑定UI事件
- 处理加载状态

### 步骤6：测试和优化
- 测试切换功能
- 优化性能
- 处理错误情况

## 验证清单

- [ ] 纹理下载完成
- [ ] 纯色模式正常工作
- [ ] 纹理模式正常工作
- [ ] 切换功能正常
- [ ] UI交互正常
- [ ] 手机预览正常

## 技术约束

1. **Three.js版本**：v0.160.0（通过CDN加载）
2. **模块系统**：ES模块（import/export）
3. **浏览器兼容性**：现代浏览器（支持ES2020）
4. **性能考虑**：纹理加载可能影响初始加载时间

## 风险和缓解措施

1. **纹理加载失败**
   - 缓解：提供默认纯色fallback
   - 处理：错误提示，禁用纹理开关

2. **内存占用过高**
   - 缓解：按需加载纹理
   - 处理：提供纹理质量选项

3. **切换闪烁**
   - 缓解：添加淡入淡出效果
   - 处理：优化材质创建流程

4. **手机性能问题**
   - 缓解：降低纹理分辨率
   - 处理：提供性能模式选项
