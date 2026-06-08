# 太阳系模拟器

基于 Three.js 的 3D 太阳系行星系统模拟器，支持真实 NASA 历元数据、中英文切换、开普勒轨道运行、航天器实时位置模拟，以及卡尔·萨根《暗淡蓝点》彩蛋。

## 在线访问

**https://dreamt0511.github.io/solar-system-simulator/**

## 功能

### 天体系统
- 八大行星 + 太阳 + 月球 + 小行星带 + 矮行星（冥王星、谷神星）
- 哈雷彗星（带彗尾效果）
- 航天器：ISS 国际空间站、天宫空间站、星链星座、旅行者一号
- 基于 NASA 历元数据的实时轨道位置推算
- 开普勒椭圆轨道与行星自转（含轨道倾角）

### 视觉效果
- 真实纹理 / 纯色模式一键切换
- 8 张高清星空背景轮换（美丽星空模式）
- 粒子星空闪烁效果
- 动态太阳日冕与太阳耀斑/日珥/CME
- 行星轨道拖尾效果
- 后处理特效（泛光、色调映射）
- 木星大红斑、地球夜景灯光、土星环

### 交互与控制
- 中英文语言切换（右下角按钮）
- 左侧天体列表，点击飞往目标
- 右键信息卡片显示天体数据
- 时间速度控制（0.1x ~ 10x）、暂停/继续
- OrbitControls 自由视角（旋转、缩放、平移）
- 点击天体飞近查看详细信息
- 行星表面第一人称视角（拖拽环顾）
- 截图下载功能
- 键盘快捷键（空格暂停、R 重置视角、H 控制面板、ESC 退出）
- 地球专属背景音乐（暗淡蓝点）

### 宇宙现象
- 拉格朗日点标注
- 恒星宜居带可视化
- 凌日现象模拟
- 星链星座（4560 颗卫星，真实分布）

## 本地运行

需要本地 HTTP 服务器（ES modules 不支持 `file://` 协议）。

### Python（推荐）

```bash
cd 太阳系行星系统
python3 -m http.server 8000
```

### Node.js

```bash
npx serve .
```

然后浏览器打开 `http://localhost:8000`。

## 操作说明

| 操作 | 说明 |
|------|------|
| 鼠标左键拖拽 | 旋转视角 |
| 鼠标滚轮 | 缩放 |
| 鼠标右键拖拽 | 平移 |
| 点击天体 | 飞往并查看信息 |
| 左侧天体列表 | 快速定位天体 |
| 右下齿轮图标 | 打开控制面板 |
| 空格 | 暂停/继续 |
| R | 重置视角 |
| H | 切换控制面板 |
| ESC | 退出/关闭面板 |

## 项目结构

```
太阳系行星系统/
├── index.html                  # 入口页面
├── css/style.css               # 样式
├── js/
│   ├── main.js                 # 应用入口
│   ├── scene.js                # 场景与光照
│   ├── planets.js              # 行星创建与数据
│   ├── orbital.js              # 开普勒轨道计算
│   ├── controls.js             # 相机控制
│   ├── effects.js              # 后处理效果
│   ├── ui.js                   # UI 管理
│   ├── i18n.js                 # 中英文翻译
│   ├── shaders.js              # GLSL 着色器
│   ├── starfield.js            # 粒子星空
│   ├── starfieldBackground.js  # 高清星空背景
│   ├── asteroidBelt.js         # 小行星带
│   ├── textureManager.js       # 纹理管理
│   ├── materialSwitcher.js     # 材质切换
│   ├── planetList.js           # 天体列表
│   ├── extendedBodies.js       # 矮行星与卫星
│   ├── comet.js                # 哈雷彗星
│   ├── spacecraft.js           # 航天器
│   ├── trailEffect.js          # 轨道拖尾
│   ├── solarCorona.js          # 太阳日冕
│   ├── solarFlares.js          # 太阳耀斑
│   ├── planetDetails.js        # 行星细节
│   ├── cosmicPhenomena.js      # 宇宙现象
│   ├── firstPerson.js          # 第一人称视角
│   └── ephemeris.js            # NASA 历元数据
├── textures/                   # 行星纹理贴图
├── starfield_textures/         # 星空背景图片
└── music/                      # 背景音乐
```

## 纹理来源

- 行星纹理：[Solar System Scope](https://www.solarsystemscope.com/textures/) 免费 2K 纹理
- 星空背景：ESA/Hubble 精选深空影像
