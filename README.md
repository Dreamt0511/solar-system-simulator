# 太阳系模拟器

基于 Three.js 的 3D 太阳系行星系统模拟器，支持真实纹理切换、天体列表快速定位、开普勒轨道运行，以及卡尔·萨根《暗淡蓝点》彩蛋。

## 在线访问

**https://dreamt0511.github.io/solar-system-simulator/**

## 功能

- 八大行星 + 太阳 + 月球 + 小行星带
- 开普勒椭圆轨道与行星自转
- 真实纹理 / 纯色模式一键切换
- 8 张高清星空背景轮换（美丽星空模式）
- 左侧天体列表，点击飞往目标
- 右侧信息卡片显示行星数据
- 时间速度控制、暂停/继续
- OrbitControls 自由视角（旋转、缩放、平移）
- 点击行星查看详细信息
- 地球专属背景音乐
- 卡尔·萨根《暗淡蓝点》彩蛋
- 响应式布局，支持移动端横屏提示

## 本地运行

需要本地 HTTP 服务器（ES modules 不支持 `file://` 协议）。

### 方式一：Python（推荐）

```bash
cd 太阳系行星系统
python3 -m http.server 8000
```

### 方式二：Node.js

```bash
npx serve .
```

### 方式三：项目内置服务器

```bash
python3 server.py
```

然后浏览器打开 `http://localhost:8000`（或 `server.py` 指定的端口）。

## 操作说明

| 操作 | 说明 |
|------|------|
| 鼠标左键拖拽 | 旋转视角 |
| 鼠标滚轮 | 缩放 |
| 鼠标右键拖拽 | 平移 |
| 点击行星 | 飞往并查看信息 |
| 左侧天体列表 | 快速定位天体 |
| 右上角齿轮图标 | 打开控制面板 |

## 项目结构

```
太阳系行星系统/
├── index.html          # 入口页面
├── css/style.css       # 样式
├── js/
│   ├── main.js         # 应用入口
│   ├── scene.js        # 场景与光照
│   ├── planets.js      # 行星创建与数据
│   ├── orbital.js      # 开普勒轨道计算
│   ├── controls.js     # 相机控制
│   ├── effects.js      # 后处理效果
│   ├── ui.js           # UI 管理
│   ├── shaders.js      # GLSL 着色器
│   ├── starfield.js    # 粒子星空
│   ├── starfieldBackground.js  # 高清星空背景
│   ├── asteroidBelt.js # 小行星带
│   ├── textureManager.js   # 纹理管理
│   ├── materialSwitcher.js # 材质切换
│   └── planetList.js   # 天体列表
├── textures/           # 行星纹理贴图
├── starfield_textures/ # 星空背景图片
└── music/              # 背景音乐
```

## 纹理来源

- 行星纹理：[Solar System Scope](https://www.solarsystemscope.com/textures/) 免费 2K 纹理
- 星空背景：ESA/Hubble 精选深空影像
