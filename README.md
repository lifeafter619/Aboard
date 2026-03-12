# Aboard

<div align="center">

[简体中文](README.md) | [繁體中文](public/README.zh-TW.md) | [English](public/README.en.md)

[![Demo](https://img.shields.io/badge/Demo-Online-2ea44f?style=for-the-badge)](https://aboard.pp.ua)
[![License](https://img.shields.io/badge/License-MIT-1677ff?style=for-the-badge)](LICENSE)
[![PWA](https://img.shields.io/badge/PWA-Ready-5f4bff?style=for-the-badge)](manifest.json)
[![Vanilla JS](https://img.shields.io/badge/Vanilla-JavaScript-f7df1e?style=for-the-badge&logo=javascript&logoColor=000)](js/main.js)
[![Canvas](https://img.shields.io/badge/HTML5-Canvas-e34f26?style=for-the-badge&logo=html5&logoColor=fff)](index.html)
[![i18n](https://img.shields.io/badge/i18n-8_languages-0ea5e9?style=for-the-badge)](js/modules/i18n.js)

</div>

一个面向课堂与演示场景的轻量网页白板：部署简单、上手直接、触控友好，并且尽量把常用教学功能都做成“打开就能用”。

## 你可以快速获得什么
- 多种笔触、形状、橡皮、背景图案、插图、插字与选择编辑。
- 时间显示、计时器、点名器、计分板、教具等课堂辅助能力。
- 分页画布、自动保存恢复、PWA、配置导入导出、多语言界面。
- 可缩放功能窗口支持“恢复大小 / 保持居中”，缓存清理支持逐项确认选择，橡皮擦默认大小会随视口自适应。
- 纯前端为主，代码结构直观，适合继续二开与功能试验。

## 快速开始
- 在线体验：<https://aboard.pp.ua>
- 本地运行：`npm start` 或 `node server.js`
- 访问地址：<http://localhost:8080>
- 注意：不要直接双击 `index.html`，部分多语言、帮助与版本检查能力依赖 HTTP 环境。

## 文档导航
- 架构设计：[`docs/zh-CN/architecture.md`](docs/zh-CN/architecture.md)
- 进阶说明：[`docs/zh-CN/advanced.md`](docs/zh-CN/advanced.md)
- 英文文档：[`public/README.en.md`](public/README.en.md)
- 繁体文档：[`public/README.zh-TW.md`](public/README.zh-TW.md)

## 仓库概览
- `index.html`：主界面与大部分静态结构。
- `js/main.js`：应用主控制器与事件编排。
- `js/modules/`：时间、计时器、教具、设置、存储、PWA、i18n 等功能模块。
- `css/style.css` 与 `css/modules/`：主样式与功能分模块样式。
- `server.js` / `sw.js`：本地服务、版本接口与离线缓存。

## 适合谁
- 需要在教室一体机、平板、大屏或浏览器里快速批注的人。
- 想要一个无需复杂框架、方便继续改造的白板项目的人。

如果这个项目对你有帮助，欢迎点个 Star。
