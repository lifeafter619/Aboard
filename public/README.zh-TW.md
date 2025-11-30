![Aboard](https://socialify.git.ci/lifeafter619/Aboard/image?custom_description=%E4%B8%80%E4%B8%AA%E7%AE%80%E7%BA%A6%E7%9A%84%E7%BD%91%E9%A1%B5%E7%99%BD%E6%9D%BF%EF%BC%8C%E6%9B%B4%E9%80%82%E5%90%88%E8%80%81%E5%B8%88%E4%BD%93%E8%B4%A8%0A%F0%9D%93%99%F0%9D%93%BE%F0%9D%93%BC%F0%9D%93%BD+%F0%9D%93%AA+%F0%9D%93%AB%F0%9D%93%B8%F0%9D%93%AA%F0%9D%93%BB%F0%9D%93%AD.&description=1&forks=1&issues=1&language=1&name=1&owner=1&pattern=Brick+Wall&pulls=1&stargazers=1&theme=Light)

# Aboard

<div align="center">

**[简体中文](../README.md)** | **[繁體中文](README.zh-TW.md)** | **[English](README.en.md)**

</div>

> 一个簡約优雅的网頁白板套用，专为教学和演示設計 | 𝓙𝓾𝓼𝓽 𝓪 𝓫𝓸𝓪𝓻𝓭.

# 摘要

大一學生的**AI-Agent**項目，目標是創建一個**功能簡單、部署簡便，且使用極其符合直覺**的電子白板，主要為**中國大陸初高中一體機教學場景設計**。

由於本人實際開發能力有限，本項目大量運用AI-Agent技術（即通過調用GitHub的Agent功能來協助開發與推進功能實現），因此程式碼可能缺乏「人味」，也可能存在**不少不合理的设计缺陷與開發方式**，**還請各位前輩輕噴**。

您可透過下方演示連結快速體驗本項目，也可前往我的部落格了解項目背後的故事。

**若您覺得這個項目有價值，請給我一個星星🌟——大學生真的很需要這個鼓勵！**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## ✨ 特色功能

### 🎨 多样化繪圖工具
- **多种筆触类型**：普通筆、铅筆、圆珠筆、钢筆、毛筆，满足不同书写需求
- **智能橡皮擦**：支持圆形和方形，大小可调（10-50px）
- **丰富顏色選擇**：预设8种常用顏色 + 自定义取色器
- **灵活粗细調節**：筆触粗细1-50px可调
- **形狀繪製**：點擊畫布上的兩個點來繪製直線等形狀

### 📐 专业背景圖案
- **多种教学背景**：空白、点阵、方格、田字格、英语四線格、五線谱、座標系
- **自定义背景**：支持上传圖片作为背景，可調節大小和位置
- **背景样式**：8种预设背景顏色 + 自定义顏色，可調節透明度和圖案深浅
- **動態座標系**：座標系預設居中於畫布中心，可在"移動"模式下拖動原點改變位置

### 📄 分頁畫布模式
- **分頁模式**：支持多頁管理，適合課堂演示和教學
  - 預設尺寸：A4、A3、B5（橫向/豎向），16:9、4:3寬螢幕
  - 自定義尺寸：可自由設定畫布寬高和比例
  - 畫布自動居中：確保畫布在瀏覽器窗口正中心，上下左右邊距相等

### 🎯 智能交互体验
- **選擇工具**：可選擇和操作畫布上的筆迹和圖片，支持複製和刪除
- **移动畫布**：拖动工具或按住Shift键拖动畫布
- **智能縮放**：Ctrl+滚轮縮放畫布，縮放中心跟随鼠标位置，支持50%-500%縮放範圍
- **初始畫布大小**：首次打開或刷新後，畫布自動調整為瀏覽器窗口的80%大小
- **撤銷/重做**：支持最多50步历史记录（Ctrl+Z / Ctrl+Y）
- **全屏模式**：专注创作，沉浸体验（F11）
- **刷新保護**：刷新頁面時會彈出警告提示，防止誤操作導致畫布內容丟失

### ⏱️ 計時器功能
- **正計時模式**：支持設置起始時間，从指定時間开始計時
- **倒計時模式**：精确倒計時，适合考试、演讲等场景
- **顏色自定义**：
  - 字体顏色選擇：8种预设顏色 + 自定义顏色選擇器
  - 背景顏色選擇：8种预设顏色 + 自定义顏色選擇器
  - 顏色設置套用于計時器顯示和全屏模式
- **提示音系统**：
  - 頁面加载时预加载4种内置提示音，确保即时播放
  - 4种預設提示音排列成2行2列，選擇更直观
  - 支持上传多个自定义音频檔案
  - 自定义音频自动儲存到本地，刷新后仍可使用
  - 自定义音频支持试听功能
- **循环播放**：支持設置循环播放次数（1-100次）
- **拖动与全屏**：
  - 支持鼠标和觸控拖动定位，移动更流畅不卡顿
  - 网頁内全屏顯示，字体大小可调（10%-85%屏幕比例）
  - 标题字体大小固定，不受時間字体滑块影响
- **最简顯示模式**：
  - 点击"最简"按钮切换到仅顯示時間的极简模式
  - 雙擊時間數位即可恢复完整控制面板，恢复后可正常拖动
- **多实例支持**：可同时创建多个独立計時器

### 🕐 時間顯示功能
- **时区支持**：自动检测并顯示用户目前时区的時間和日期
- **灵活顯示**：可選擇顯示日期、時間或两者
- **多种格式**：
  - 時間格式：12小时制/24小时制
  - 日期格式：年-月-日、月-日-年、日-月-年、中文格式
- **全屏模式**：支持單擊或雙擊进入全屏時間顯示
- **自定义样式**：字体顏色、背景顏色、透明度可调

### ⚙️ 個人化設置
- **界面定制**：工具欄大小、屬性欄縮放、主題色可調
- **控制佈局**：控制按鈕位置可選（四個角落），工具欄自動保持在窗口範圍內
- **邊緣吸附**：拖動面板自動吸附到屏幕邊緣，避免畫布留痕
- **背景偏好**：自定義屬性欄中顯示的背景圖案
- **設置分組**：可折疊的設置組，默認展開狀態，點擊即可查看詳細選項
- **多語言支持**：
  - 支持中文簡體、中文繁體、English、日本語、한국어、Français、Deutsch、Español
  - 自動檢測瀏覽器語言
  - 在設置-通用中可隨時切換語言
  - 切換語言後立即生效

### 💾 資料管理
- **匯出功能**：支持匯出为PNG/JPEG圖片
  - 匯出目前頁、全部頁面或指定頁面
  - 檔案名自动包含用户目前时区的時間戳
  - 多頁匯出时自动新增頁码后缀（例如：檔案名-1, 檔案名-2）
- **自动儲存**：繪圖内容和設置自动儲存到本地
- **多頁管理**：分頁模式下支持多頁切换和管理
  - 智能分頁按钮：仅1頁时顯示"+"图标新增頁面，多頁时顯示翻頁箭头
  - 指定頁面匯出支持選擇单頁或多頁

## 🚀 快速开始

### 在線使用
直接打开 `index.html` 檔案即可开始使用，无需安装任何依赖。

### 一键部署

#### 部署到 Vercel
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/lifeafter619/Aboard)

#### 部署到 GitHub Pages
1. Fork 本仓库到你的 GitHub 账号
2. 进入仓库設置 (Settings)
3. 在 Pages 選項中，選擇 Source 为 `main` 分支
4. 点击 Save，等待部署完成
5. 访问 `https://你的用户名.github.io/Aboard`

或使用 GitHub Actions 自动部署：
[![GitHub Pages](https://img.shields.io/badge/Deploy%20to-GitHub%20Pages-blue?logo=github)](https://github.com/lifeafter619/Aboard/settings/pages)

#### 部署到 Cloudflare Pages

[![Deploy to Cloudflare Pages](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/lifeafter619/Aboard)

点击上方按钮即可快速部署到 Cloudflare Pages，享受全球CDN加速。

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

然后在瀏覽器访问 `http://localhost:8080`

## 📖 使用指南

### 基本操作
| 操作 | 方法 |
|------|------|
| 繪圖 | 点击/觸控畫布并拖动 |
| 選擇工具 | 点击底部工具栏相应按钮 |
| 改变顏色/粗细 | 点击工具按钮，在弹出的属性面板中調節 |
| 撤銷/重做 | Ctrl+Z / Ctrl+Y 或点击右上角按钮 |
| 縮放畫布 | Ctrl+滚轮 或点击右上角縮放按钮（50%-500%） |
| 移动畫布 | 点击"移动"工具或按住Shift键拖动 |
| 全屏 | F11 或点击全屏按钮 |
| 清空畫布 | 点击"清空"按钮（有确认提示） |

### 高级功能
- **拖动面板**：所有控制面板（工具栏、属性栏、控制按钮）均可拖动調整位置
- **圖片背景**：点击"背景" → 選擇"圖片" → 上传圖片，可調整大小和位置
- **選擇操作**：使用選擇工具点击畫布元素，可複製或刪除
- **分頁管理**：在設置中启用分頁模式，使用右上角分頁控件切换頁面

## 🛠️ 技术实现

### 技术栈
- **HTML5 Canvas** - 高性能2D图形渲染
- **Vanilla JavaScript** - 无框架依赖，模块化架构
- **CSS3** - 现代化UI設計

### 核心特性
- ✅ 实时低延迟渲染，目标60fps
- ✅ 筆迹平滑算法，确保線條流畅
- ✅ 同时支持鼠标和触控输入，最佳化大屏触控设备兼容性
- ✅ 高DPI顯示屏自适应
- ✅ 回應式界面，适配不同屏幕尺寸
- ✅ 本地存储自动儲存
- ✅ GPU加速渲染最佳化，提升性能
- ✅ 觸控事件最佳化，支持多点触控拖动

### 性能最佳化
- Canvas context的`desynchronized`模式减少渲染延迟
- 单路径渲染减少繪製调用次数
- 防抖处理視窗resize事件
- 智能状态管理避免不必要的重绘
- 使用requestAnimationFrame最佳化拖动和动画性能
- 事件监听器按需新增/移除，减少内存占用
- CSS will-change属性最佳化拖动元素性能
- 觸控事件使用passive和non-passive模式最佳化

### 瀏覽器兼容性
| 瀏覽器 | 支持情况 |
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
├── index.html              # 主HTML檔案
├── LICENSE                 # MIT許可證檔案
├── announcements.json      # 公告内容配置
├── css/
│   ├── style.css          # 主样式表
│   └── modules/           # 模块化样式
│       ├── timer.css      # 計時器样式
│       ├── time-display.css # 時間顯示样式
│       ├── export.css     # 匯出功能样式
│       ├── feature-area.css # 功能区样式
│       ├── teaching-tools.css # 教具功能样式
│       └── shape-drawing.css # 形狀繪製样式
├── js/
│   ├── drawing.js         # 繪圖引擎模块
│   ├── history.js         # 历史记录管理模块
│   ├── background.js      # 背景管理模块
│   ├── image-controls.js  # 圖片控制模块
│   ├── stroke-controls.js # 筆迹控制模块
│   ├── selection.js       # 選擇工具模块
│   ├── settings.js        # 設置管理模块
│   ├── announcement.js    # 公告管理模块
│   ├── export.js          # 匯出功能模块
│   ├── time-display.js    # 時間顯示模块
│   ├── collapsible.js     # 可折疊面板模块
│   ├── shape-insertion.js # 形狀插入模块
│   ├── text-insertion.js  # 文字插入模块
│   ├── locales/           # 國際化語言檔案
│   │   ├── zh-CN.js       # 簡體中文
│   │   ├── zh-TW.js       # 繁體中文
│   │   ├── en-US.js       # 英文
│   │   ├── ja-JP.js       # 日語
│   │   ├── ko-KR.js       # 韓語
│   │   ├── fr-FR.js       # 法語
│   │   ├── de-DE.js       # 德語
│   │   └── es-ES.js       # 西班牙語
│   ├── modules/
│   │   ├── timer.js       # 計時器模块
│   │   ├── time-display-controls.js # 時間顯示控制
│   │   ├── time-display-settings.js # 時間顯示設置
│   │   ├── edge-drawing.js # 邊緣繪製模块（沿教具邊緣畫線）
│   │   ├── teaching-tools.js # 教具功能模块
│   │   ├── shape-drawing.js # 形狀繪製模块（直線等形狀繪製）
│   │   └── i18n.js        # 國際化核心模块
│   └── main.js            # 主套用入口
├── img/                    # 圖片資源目錄
│   ├── ruler_1.png        # 直尺樣式1
│   ├── ruler_2.png        # 直尺樣式2
│   ├── set_square_1.png   # 60°三角板（√3:1寬高比）
│   └── set_square_2.png   # 45°三角板（1:1寬高比）
├── public/                 # 公開文檔目錄
│   ├── README.en.md       # 英文版README
│   └── README.zh-TW.md    # 繁體中文版README
├── sounds/                 # 提示音檔案夹
│   ├── class-bell.MP3     # 上课铃声
│   ├── exam-end.MP3       # 考试结束音
│   ├── gentle-alarm.MP3   # 柔和提示音
│   ├── digital-beep.MP3   # 數位提示音
│   └── README.md          # 音頻檔案說明
└── README.md              # 项目文檔（簡體中文）
```

## 🏗️ 架构設計

### 模块化架构
项目采用面向对象的模块化設計，各功能模块职责清晰：

- **DrawingEngine** - 核心繪圖引擎，处理所有繪圖操作和筆触类型
- **HistoryManager** - 历史记录管理，实现撤銷/重做功能
- **BackgroundManager** - 背景管理，处理背景顏色、圖案渲染
- **SelectionManager** - 選擇管理，处理元素選擇和操作
- **SettingsManager** - 設置管理，持久化用户偏好
- **AnnouncementManager** - 公告管理，处理首次访问提示
- **TimerManager** - 計時器管理，支持多实例計時器
- **TimeDisplayManager** - 時間顯示管理，处理日期時間顯示
- **ExportManager** - 匯出管理，处理畫布匯出功能
- **DrawingBoard** - 主套用类，集成所有模块并協調交互

### 性能最佳化
- Canvas context的`desynchronized`模式减少渲染延迟
- 单路径渲染减少繪製调用次数
- 防抖处理視窗resize事件
- 智能状态管理避免不必要的重绘
- 使用requestAnimationFrame最佳化拖动和动画性能
- 事件监听器按需新增/移除，减少内存占用
- CSS will-change属性最佳化拖动元素GPU加速
- 觸控事件最佳化，提升大屏触控设备回應速度

### 安全与用户体验
- 拖动面板时自动禁用繪圖，避免误操作
- 視窗調整后智能重新定位面板
- 全屏模式使用標準瀏覽器API，支持ESC退出
- 音频播放使用HTML5 Audio元素，避免Web Audio API复杂性
- 工具栏属性面板預設定位最佳化，位于工具栏上方更方便操作
- 時間顯示選項面板使用精确的inset定位，避免位置偏移
- checkbox标签宽度最佳化，避免占用过多横向空间
- 計時器标题字体独立控制，不受時間字体大小滑块影响
- 所有可拖动面板统一支持觸控和鼠标操作

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

1. Fork本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 檔案

## 🌟 致谢

感谢所有贡献者和使用者！如果这个项目对你有帮助，欢迎给个Star⭐

---

Made with ❤️ for educators and creators
