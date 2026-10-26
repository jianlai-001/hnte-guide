# FORESTS ONCHAIN

基于参考视频视觉语言重建的独立交互页面。页面使用黑白与森林绿作为唯一主色，强调巨型断行标题、大量留白、极简导航、噪声纹理和链上数据栏。

## 内容

- `FORESTS ONCHAIN` 首屏
- `REWARDING CONSERVATION`
- `FOREST LABOR`
- `A NEW MONETARY PRIMITIVE`
- `FOREST AT INTERNET SCALE`
- 固定模拟链上数据栏

## 技术

- Three.js 程序化生成低多边形森林、树冠粒子、地面和远方数据节点
- Lenis 平滑滚动
- 滚动驱动的 3D 摄像机移动
- 鼠标视角响应与拖拽观察
- IntersectionObserver 章节淡入
- 自定义光标、加载页、滚动进度和动态模拟数据
- 移动端布局、触控降级及 `prefers-reduced-motion`

## 运行

在上级项目目录执行：

```powershell
cd C:\Users\Lenovo\Documents\ChatGPT\codex
npm start
```

访问：

```text
http://127.0.0.1:4173/forest.html
```

或直接访问：

```text
http://127.0.0.1:4173/%E6%A3%AE%E6%9E%97%E4%BA%A4%E4%BA%92/index.html
```

修改 `forest-entry.js` 后重新构建：

```powershell
npm run build:forest
```

页面中的链上数量为明确标注的模拟数据，不连接真实区块链或金融网络。
