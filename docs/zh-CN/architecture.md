# Aboard 架构设计

## 1. 设计目标
- 面向课堂、大屏与演示场景，优先保证“打开即可用”。
- 以原生 Web 技术为主，降低部署与二开成本。
- 让复杂功能拆成独立模块，避免 `main.js` 持续膨胀成无法维护的单体。

## 2. 运行时分层
### 页面层
- `index.html` 提供主界面骨架、工具栏、设置面板、弹窗与大部分 `data-i18n` 标记。

### 控制层
- `js/main.js` 负责应用初始化、工具切换、跨模块事件编排、主状态同步。
- `js/modules/settings-manager.js` 负责用户设置、UI 尺寸与主题同步。
- `js/modules/i18n.js` 负责语言检测、翻译加载、动态翻译应用。

### 功能模块层
- 绘图相关：`js/drawing.js`、`js/history.js`、`js/selection.js`、`js/modules/shape-drawing.js`、`js/modules/edge-drawing.js`。
- 内容插入相关：`js/insert-image.js`、`js/modules/insert-text-manager.js`、`js/image-controls.js`。
- 教学辅助相关：`js/modules/timer.js`、`js/time-display.js`、`js/modules/random-picker.js`、`js/modules/scoreboard.js`、`js/modules/teaching-tools.js`。
- 支撑能力：`js/modules/storage-manager.js`、`js/modules/pwa-manager.js`、`js/modules/dialog-manager.js`、`js/modules/help-system.js`。

### 样式层
- `css/style.css` 放公共布局、工具栏、主面板与核心交互样式。
- `css/modules/` 将计时器、时间显示、导出、教具、插图、插字等样式按功能拆分。

### 服务层
- `server.js` 提供本地静态服务与 `/api/version`。
- `sw.js` 负责离线缓存与版本更新场景。

## 3. 核心数据流
1. 用户操作工具栏或面板。
2. `main.js` 或具体模块接收事件并更新当前工具/配置。
3. 绘图与功能模块执行渲染、创建对象或更新控件状态。
4. 历史记录与存储模块接管快照、恢复与持久化。
5. i18n、设置与帮助模块在界面层补充语言、主题和提示内容。

## 4. 多语言策略
- 语言资源主文件位于 `js/locales/*.js`。
- 帮助文案位于 `js/locales/help/*.js`。
- 当前新增了 `js/locales/overrides.js`，用于集中补齐缺失 key，避免某一语言界面回退显示成另一种语言。
- `js/modules/i18n.js` 负责把主翻译、帮助翻译与 override 合并后再应用到页面。

## 5. 文件与职责速览
- `index.html`：静态结构入口。
- `js/main.js`：主控制器。
- `js/modules/`：复杂能力的拆分中心。
- `css/style.css`：全局基础样式。
- `css/modules/`：功能模块样式。
- `public/README.*.md`：多语言入口文档。
- `docs/`：架构和进阶说明。

## 6. 为什么这样拆
- 功能越来越多时，模块拆分比继续堆在一个脚本里更容易回归测试。
- 样式分模块后，更容易定位 UI 问题，例如计时器、教具、插字互不干扰。
- 多语言单独维护后，文档、帮助和 UI 翻译都可以分别迭代。
