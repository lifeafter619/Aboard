# Aboard 架構設計

## 1. 設計目標
- 面向課堂、大螢幕與展示情境，優先保證「打開就能用」。
- 以原生 Web 技術為主，降低部署與二次開發成本。
- 將較複雜的能力拆成獨立模組，避免 `main.js` 持續膨脹成難以維護的單體。

## 2. 執行時分層
### 頁面層
- `index.html` 提供主介面骨架、工具列、設定面板、彈窗與大部分 `data-i18n` 標記。

### 控制層
- `js/main.js` 負責應用初始化、工具切換、跨模組事件協調與主狀態同步。
- `js/modules/settings-manager.js` 負責使用者設定、UI 尺寸與主題同步。
- `js/modules/i18n.js` 負責語言偵測、翻譯載入與動態翻譯套用。

### 功能模組層
- 繪圖相關：`js/drawing.js`、`js/history.js`、`js/selection.js`、`js/modules/shape-drawing.js`、`js/modules/edge-drawing.js`。
- 內容插入相關：`js/insert-image.js`、`js/modules/insert-text-manager.js`、`js/image-controls.js`。
- 教學輔助相關：`js/modules/timer.js`、`js/time-display.js`、`js/modules/random-picker.js`、`js/modules/scoreboard.js`、`js/modules/teaching-tools.js`。
- 支撐能力：`js/modules/storage-manager.js`、`js/modules/pwa-manager.js`、`js/modules/dialog-manager.js`、`js/modules/help-system.js`。

### 樣式層
- `css/style.css` 放公共版面、工具列、主面板與核心互動樣式。
- `css/modules/` 將計時器、時間顯示、匯出、教具、插圖、插字等樣式按功能拆分。

### 服務層
- `server.js` 提供本地靜態服務與 `/api/version`。
- `sw.js` 負責離線快取與版本更新情境。

## 3. 核心資料流
1. 使用者操作工具列或面板。
2. `main.js` 或對應模組接收事件並更新目前工具與設定。
3. 繪圖或輔助模組執行渲染、建立物件或更新控制元件狀態。
4. 歷史記錄與儲存模組接手快照、恢復與持久化。
5. i18n、設定與幫助模組在介面層補上語言、主題與提示內容。

## 4. 多語言策略
- 語言主檔位於 `js/locales/*.js`。
- 幫助文案位於 `js/locales/help/*.js`。
- 目前新增了 `js/locales/overrides.js`，集中補齊缺失 key，避免某一語言介面回退顯示成另一種語言。
- `js/modules/i18n.js` 會先合併主翻譯、幫助翻譯與 override，再套用到頁面。

## 5. 檔案與職責速覽
- `index.html`：靜態結構入口。
- `js/main.js`：主控制器。
- `js/modules/`：複雜能力的拆分中心。
- `css/style.css`：全域基礎樣式。
- `css/modules/`：功能模組樣式。
- `public/README.*.md`：多語言入口文件。
- `docs/`：架構與進階說明。

## 6. 為什麼這樣拆
- 功能越來越多時，模組化比繼續堆在單一腳本裡更容易回歸測試。
- 樣式分模組後，更容易定位 UI 問題，例如計時器、教具、插字互不干擾。
- 多語言與文件拆開維護後，README 可以保持精簡，細節則放在更適合的文件中。
