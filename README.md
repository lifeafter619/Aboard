![Aboard](https://socialify.git.ci/lifeafter619/Aboard/image?custom_description=%E4%B8%80%E4%B8%AA%E7%AE%80%E7%BA%A6%E7%9A%84%E7%BD%91%E9%A1%B5%E7%99%BD%E6%9D%BF%EF%BC%8C%E6%9B%B4%E9%80%82%E5%90%88%E8%80%81%E5%B8%88%E4%BD%93%E8%B4%A8%0A%F0%9D%93%99%F0%9D%93%BE%F0%9D%93%BC%F0%9D%93%BD+%F0%9D%93%AA+%F0%9D%93%AB%F0%9D%93%B8%F0%9D%93%AA%F0%9D%93%BB%F0%9D%93%AD.&description=1&forks=1&issues=1&language=1&name=1&owner=1&pattern=Brick+Wall&pulls=1&stargazers=1&theme=Light)

# Aboard

> 一个简约优雅的网页白板应用，专为教学和演示设计 | 𝓙𝓾𝓼𝓽 𝓪 𝓫𝓸𝓪𝓻𝓭.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## ✨ 特色功能

### 🎨 多样化绘图工具
- **多种笔触类型**：普通笔、铅笔、圆珠笔、钢笔、毛笔，满足不同书写需求
- **文字插入功能**：支持插入文字，可调节字号、颜色，支持拖动、复制、删除
- **智能橡皮擦**：支持圆形和方形，大小可调（10-50px）
- **丰富颜色选择**：预设8种常用颜色 + 自定义取色器
- **灵活粗细调节**：笔触粗细1-50px可调

### 📐 专业背景图案
- **多种教学背景**：空白、点阵、方格、田字格、英语四线格、五线谱、坐标系
- **自定义背景**：支持上传图片作为背景，可调节大小和位置
- **背景样式**：8种预设背景颜色 + 自定义颜色，可调节透明度和图案深浅

### 📄 灵活画布模式
- **无限画布模式**：自由绘制，不受限制
- **分页模式**：支持多页管理，适合课堂演示
  - 预设尺寸：A4、A3、B5（横向/竖向），16:9、4:3宽屏
  - 自定义尺寸：可自由设定画布宽高和比例

### 🎯 智能交互体验
- **文字工具**：点击画布插入文字，支持字号调节（12-72px）、颜色选择、拖动定位
- **选择工具**：可选择和操作画布上的笔迹、图片和文字，支持复制和删除
- **移动画布**：拖动工具或按住Shift键拖动画布
- **智能缩放**：Ctrl+滚轮缩放画布，缩放中心跟随鼠标位置
- **撤销/重做**：支持最多50步历史记录（Ctrl+Z / Ctrl+Y）
- **全屏模式**：专注创作，沉浸体验（F11）

### ⚙️ 个性化设置
- **界面定制**：工具栏大小、属性栏缩放、主题色可调
- **控制布局**：控制按钮位置可选（四个角落）
- **边缘吸附**：拖动面板自动吸附到屏幕边缘
- **背景偏好**：自定义属性栏中显示的背景图案

### 💾 数据管理
- **导出功能**：支持导出为PNG/JPEG图片
- **自动保存**：绘图内容和设置自动保存到本地
- **多页管理**：分页模式下支持多页切换和管理

## 🚀 快速开始

### 在线使用
直接打开 `index.html` 文件即可开始使用，无需安装任何依赖。

### 本地服务器
如果需要完整功能（如加载公告），建议使用HTTP服务器运行：

```bash
# 使用Python
python3 -m http.server 8080

# 使用Node.js
npx http-server -p 8080

# 使用PHP
php -S localhost:8080
```

然后在浏览器访问 `http://localhost:8080`

## 📖 使用指南

### 基本操作
| 操作 | 方法 |
|------|------|
| 绘图 | 点击/触摸画布并拖动 |
| 选择工具 | 点击底部工具栏相应按钮 |
| 改变颜色/粗细 | 点击工具按钮，在弹出的属性面板中调节 |
| 撤销/重做 | Ctrl+Z / Ctrl+Y 或点击右上角按钮 |
| 缩放画布 | Ctrl+滚轮 或点击右上角缩放按钮 |
| 移动画布 | 点击"移动"工具或按住Shift键拖动 |
| 全屏 | F11 或点击全屏按钮 |
| 清空画布 | 点击"清空"按钮（有确认提示） |

### 高级功能
- **拖动面板**：所有控制面板（工具栏、属性栏、控制按钮）均可拖动调整位置
- **图片背景**：点击"背景" → 选择"图片" → 上传图片，可调整大小和位置
- **选择操作**：使用选择工具点击画布元素，可复制或删除
- **分页管理**：在设置中启用分页模式，使用右上角分页控件切换页面

## 🛠️ 技术实现

### 技术栈
- **HTML5 Canvas** - 高性能2D图形渲染
- **Vanilla JavaScript** - 无框架依赖，模块化架构
- **CSS3** - 现代化UI设计

### 核心特性
- ✅ 实时低延迟渲染，目标60fps
- ✅ 笔迹平滑算法，确保线条流畅
- ✅ 同时支持鼠标和触控输入
- ✅ 高DPI显示屏自适应
- ✅ 响应式界面，适配不同屏幕尺寸
- ✅ 本地存储自动保存

### 浏览器兼容性
| 浏览器 | 支持情况 |
|--------|----------|
| Chrome | ✅ 最新版本 |
| Safari | ✅ 最新版本 |
| Firefox | ✅ 最新版本 |
| Edge | ✅ 最新版本 |
| iOS Safari | ✅ 支持 |
| Chrome Mobile | ✅ 支持 |

## 📁 项目结构

```
Aboard/
├── index.html              # 主HTML文件
├── announcements.json      # 公告内容配置
├── css/
│   └── style.css          # 样式表
├── js/
│   ├── drawing.js         # 绘图引擎模块
│   ├── history.js         # 历史记录管理模块
│   ├── background.js      # 背景管理模块
│   ├── image-controls.js  # 图片控制模块
│   ├── stroke-controls.js # 笔迹控制模块
│   ├── selection.js       # 选择工具模块
│   ├── settings.js        # 设置管理模块
│   ├── announcement.js    # 公告管理模块
│   ├── export.js          # 导出功能模块
│   └── main.js            # 主应用入口
└── README.md              # 项目文档
```

## 🏗️ 架构设计

### 模块化架构
项目采用面向对象的模块化设计，各功能模块职责清晰：

- **DrawingEngine** - 核心绘图引擎，处理所有绘图操作和笔触类型
- **HistoryManager** - 历史记录管理，实现撤销/重做功能
- **BackgroundManager** - 背景管理，处理背景颜色、图案渲染
- **SelectionManager** - 选择管理，处理元素选择和操作
- **SettingsManager** - 设置管理，持久化用户偏好
- **AnnouncementManager** - 公告管理，处理首次访问提示
- **DrawingBoard** - 主应用类，集成所有模块并协调交互

### 性能优化
- Canvas context的`desynchronized`模式减少渲染延迟
- 单路径渲染减少绘制调用次数
- 防抖处理窗口resize事件
- 智能状态管理避免不必要的重绘
- 使用requestAnimationFrame优化动画

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

1. Fork本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 🌟 致谢

感谢所有贡献者和使用者！如果这个项目对你有帮助，欢迎给个Star⭐

---

Made with ❤️ for educators and creators
