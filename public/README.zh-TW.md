# Aboard

<div align="center">

[簡體中文](../README.md) | [繁體中文](README.zh-TW.md) | [English](README.en.md)

[![Demo](https://img.shields.io/badge/Demo-Online-2ea44f?style=for-the-badge)](https://aboard.pp.ua)
[![License](https://img.shields.io/badge/License-MIT-1677ff?style=for-the-badge)](../LICENSE)
[![PWA](https://img.shields.io/badge/PWA-Ready-5f4bff?style=for-the-badge)](../manifest.json)
[![Vanilla JS](https://img.shields.io/badge/Vanilla-JavaScript-f7df1e?style=for-the-badge&logo=javascript&logoColor=000)](../js/main.js)
[![Canvas](https://img.shields.io/badge/HTML5-Canvas-e34f26?style=for-the-badge&logo=html5&logoColor=fff)](../index.html)
[![i18n](https://img.shields.io/badge/i18n-8_languages-0ea5e9?style=for-the-badge)](../js/modules/i18n.js)

</div>

Aboard 是一個面向教學與展示情境的輕量網頁白板，重點在於部署簡單、操作直覺，以及對觸控大螢幕友善。

## 特色
- 提供多種筆觸、形狀、橡皮擦、背景圖案、插入圖片、插入文字與選取編輯。
- 內建時間顯示、計時器、點名器、計分板與教具等課堂輔助功能。
- 支援分頁畫布、自動儲存與恢復、PWA、設定匯入匯出，以及多語言介面。
- 可縮放功能視窗支援「恢復大小 / 保持置中」，快取清理支援逐項確認選擇，橡皮擦預設大小會隨視口自適應。
- 以前端模組為主，結構相對清楚，方便後續二次開發。

## 快速開始
- 線上體驗：<https://aboard.pp.ua>
- 本地執行：`npm start` 或 `node server.js`
- 開啟位址：<http://localhost:8080>
- 注意：不建議直接雙擊 `index.html`，因為多語言、幫助內容與版本檢查需要 HTTP 環境。

## 文件導覽
- 架構設計：[`../docs/zh-TW/architecture.md`](../docs/zh-TW/architecture.md)
- 進階說明：[`../docs/zh-TW/advanced.md`](../docs/zh-TW/advanced.md)
- 簡體中文：[`../README.md`](../README.md)
- 英文文件：[`README.en.md`](README.en.md)

## 倉庫概覽
- `index.html`：主要介面結構與靜態標記。
- `js/main.js`：應用主控制器與互動流程協調。
- `js/modules/`：時間、計時器、教具、設定、儲存、PWA、i18n 等功能模組。
- `css/style.css` 與 `css/modules/`：主樣式與功能分模組樣式。
- `server.js` / `sw.js`：本地伺服器、版本介面與離線快取。

## 適合誰
- 想在教室一體機、平板或大螢幕上快速批註的人。
- 想要一個不依賴大型框架、方便繼續擴充的白板專案的人。

如果這個專案對你有幫助，歡迎給個 Star。
