# Aboard

<div align="center">

[简体中文](README.md) | [繁體中文](public/README.zh-TW.md) | [English](public/README.en.md)

[![Demo](https://img.shields.io/badge/Demo-Online-22c55e?style=for-the-badge&labelColor=111827&logo=googlechrome&logoColor=fff)](https://aboard.pp.ua)
[![Version](https://img.shields.io/badge/Version-2.4.1-f59e0b?style=for-the-badge&labelColor=111827)](version.txt)
[![License](https://img.shields.io/badge/License-MIT-3b82f6?style=for-the-badge&labelColor=111827&logo=open-source-initiative&logoColor=fff)](LICENSE)
[![PWA](https://img.shields.io/badge/PWA-Ready-8b5cf6?style=for-the-badge&labelColor=111827&logo=pwa&logoColor=fff)](manifest.json)
[![Vanilla JS](https://img.shields.io/badge/Vanilla-JavaScript-facc15?style=for-the-badge&labelColor=111827&logo=javascript&logoColor=000)](js/main.js)
[![HTML5 Canvas](https://img.shields.io/badge/HTML5-Canvas-ef4444?style=for-the-badge&labelColor=111827&logo=html5&logoColor=fff)](index.html)
[![i18n](https://img.shields.io/badge/i18n-8_languages-06b6d4?style=for-the-badge&labelColor=111827&logo=googletranslate&logoColor=fff)](js/modules/i18n.js)

[![GitHub stars](https://img.shields.io/github/stars/lifeafter619/Aboard?style=for-the-badge&labelColor=111827&color=eab308&logo=github)](https://github.com/lifeafter619/Aboard/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/lifeafter619/Aboard?style=for-the-badge&labelColor=111827&color=f97316&logo=github)](https://github.com/lifeafter619/Aboard/issues)
[![GitHub last commit](https://img.shields.io/github/last-commit/lifeafter619/Aboard?style=for-the-badge&labelColor=111827&color=14b8a6&logo=git)](https://github.com/lifeafter619/Aboard/commits/main)
[![Repo size](https://img.shields.io/github/repo-size/lifeafter619/Aboard?style=for-the-badge&labelColor=111827&color=6366f1&logo=github)](https://github.com/lifeafter619/Aboard)
[![Docs](https://img.shields.io/badge/Docs-Architecture%20%26%20Guide-a855f7?style=for-the-badge&labelColor=111827&logo=readthedocs&logoColor=fff)](docs/zh-CN/architecture.md)

</div>

一个面向课堂、演示与触控大屏场景的轻量网页白板。它尽量保持部署简单、上手直接、功能实用，适合“打开即用”和继续二次开发两种使用方式。

## 特色概览
- 常用白板能力齐全：画笔、形状、橡皮、背景、插图、插字、选择编辑。
- 课堂辅助功能完整：时间显示、计时器、随机点名、计分板、教具等。
- 体验偏向真实教学场景：分页画布、自动保存恢复、PWA、多语言、配置导入导出。
- 响应式与触控做了专门优化：
  - 浮动面板支持拖拽、缩放与大屏操作；
  - 橡皮擦默认大小会跟随视口调整；
  - 图片、选区、笔迹、文字等编辑控件会随目标尺寸自动调整位置和大小；
  - 小对象场景下，手柄会在保证最小可点尺寸的前提下收缩并尽量移入对象内部。

## 快速开始
- 在线体验：<https://aboard.pp.ua>
- 本地运行：`npm start` 或 `node server.js`
- 访问地址：<http://localhost:8080>
- 注意：不要直接双击 `index.html`，部分多语言、帮助与版本检查功能依赖 HTTP 环境。

## 文档导航
- 架构设计：[`docs/zh-CN/architecture.md`](docs/zh-CN/architecture.md)
- 进阶说明：[`docs/zh-CN/advanced.md`](docs/zh-CN/advanced.md)
- 英文文档：[`public/README.en.md`](public/README.en.md)
- 繁体文档：[`public/README.zh-TW.md`](public/README.zh-TW.md)

## 响应式与触控说明
- 项目默认按触控优先设计，主要交互按钮尽量维持不少于 `44px` 的可触达面积。
- 在 1366×768、1920×1080、2K、4K 以及浏览器缩放后的窗口中，工具栏、历史栏、浮动面板、编辑叠加控件都会优先保证可见与可操作。
- 对于特别小的图片、文字框、选区或笔迹对象，控件会自动重排，必要时缩小但保留最小下限，尽量避免漂到对象外太远。
- 如果你继续二开，建议优先复用现有响应式变量、媒体查询和 `data-i18n-*` 机制，不要再写固定像素的绝对布局。

## 仓库结构
- `index.html`：主界面与静态结构。
- `js/main.js`：应用主控制器与事件编排。
- `js/modules/`：时间、计时器、教具、设置、存储、PWA、i18n 等模块。
- `css/style.css` 与 `css/modules/`：主样式与分模块样式。
- `server.js` / `sw.js`：本地服务、版本接口与离线缓存。

## 适合谁
- 需要在教室一体机、平板、大屏或浏览器中快速批注与展示的人。
- 想要一个不依赖重型框架、方便继续改造的白板项目的人。

如果这个项目对你有帮助，欢迎点个 Star。
