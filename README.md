# 太阳系模拟器

基于 Three.js 的 3D 太阳系行星系统模拟器，支持真实纹理切换、天体列表快速定位、开普勒轨道运行，以及卡尔·萨根《暗淡蓝点》彩蛋。

## 功能

- 八大行星 + 太阳 + 月球 + 小行星带
- 开普勒椭圆轨道与行星自转
- 一键切换真实纹理 / 纯色模式
- 左侧天体列表，点击飞往目标
- 右侧信息卡片显示行星数据
- 时间速度控制、暂停/继续
- OrbitControls 自由视角

## 使用

本地运行：

```bash
python3 -m http.server 8000
```

浏览器打开 `http://localhost:8000`。

## 纹理来源

[Solar System Scope](https://www.solarsystemscope.com/textures/) 免费 2K 纹理。
