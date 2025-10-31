# Aboard
一个简约的web白板，更适合中国宝宝体质 | Just a board.

## 功能特性 Features

### 核心绘图引擎 Core Drawing Engine
- ✅ 实时、连续、低延迟渲染 (Real-time, continuous, low-latency rendering)
- ✅ 笔迹平滑算法，确保线条流畅 (Stroke smoothing for fluid lines)
- ✅ 同时支持鼠标和触控输入 (Mouse and touch input support)
- ✅ 性能优化，目标60fps (Performance optimized for 60fps)

### 工具栏 Toolbar
- **笔工具** (Pen Tool) - 默认选中，支持多种颜色和粗细
- **橡皮擦** (Eraser Tool) - 可调节大小的橡皮擦
- **清空画布** (Clear Canvas) - 一键清空（有确认提示）

### 动态配置区 Dynamic Configuration
- **笔模式**: 颜色选择器（黑/红/蓝/绿）+ 粗细滑块（3-15px）
- **橡皮模式**: 橡皮擦大小滑块（10-30px）

### 历史管理 History Management
- ↶ 撤销 (Undo) - 快捷键 Ctrl+Z
- ↷ 重做 (Redo) - 快捷键 Ctrl+Y
- 支持最多50步历史记录

## 使用方法 Usage

### 快速开始 Quick Start
1. 打开 `index.html` 文件即可使用
2. 或使用任何HTTP服务器运行：
   ```bash
   python3 -m http.server 8080
   # 然后访问 http://localhost:8080
   ```

### 操作说明 Instructions
- **绘图**: 点击/触摸画布并拖动
- **切换工具**: 点击底部工具栏按钮
- **改变颜色**: 在笔模式下点击颜色按钮
- **调节粗细**: 拖动滑块
- **撤销/重做**: 点击右上角按钮或使用键盘快捷键

## 技术栈 Tech Stack
- HTML5 Canvas
- Vanilla JavaScript (无框架依赖)
- CSS3

## 浏览器兼容性 Browser Compatibility
- ✅ Chrome (最新版本)
- ✅ Safari (最新版本)
- ✅ Firefox (最新版本)
- ✅ Edge (最新版本)
- ✅ 移动浏览器 (iOS Safari, Chrome Mobile)

## 项目结构 Project Structure
```
Aboard/
├── index.html    # 主HTML文件
├── style.css     # 样式表
├── app.js        # 核心JavaScript逻辑
└── README.md     # 项目说明
```

## 性能优化 Performance Optimizations
- 使用 `requestAnimationFrame` 进行流畅渲染
- Canvas context 的 `desynchronized` 模式
- 单路径渲染减少绘制调用
- 高DPI显示屏适配

## License
MIT License - 详见 LICENSE 文件
