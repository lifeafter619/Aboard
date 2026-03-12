# Aboard

<div align="center">

[Simplified Chinese](../README.md) | [Traditional Chinese](README.zh-TW.md) | [English](README.en.md)

[![Demo](https://img.shields.io/badge/Demo-Online-2ea44f?style=for-the-badge)](https://aboard.pp.ua)
[![License](https://img.shields.io/badge/License-MIT-1677ff?style=for-the-badge)](../LICENSE)
[![PWA](https://img.shields.io/badge/PWA-Ready-5f4bff?style=for-the-badge)](../manifest.json)
[![Vanilla JS](https://img.shields.io/badge/Vanilla-JavaScript-f7df1e?style=for-the-badge&logo=javascript&logoColor=000)](../js/main.js)
[![Canvas](https://img.shields.io/badge/HTML5-Canvas-e34f26?style=for-the-badge&logo=html5&logoColor=fff)](../index.html)
[![i18n](https://img.shields.io/badge/i18n-8_languages-0ea5e9?style=for-the-badge)](../js/modules/i18n.js)

</div>

A lightweight web whiteboard built for teaching and presentation workflows. It aims to stay simple to deploy, intuitive to use, and practical on touch-enabled classroom screens.

## Highlights
- Multiple pen styles, shapes, eraser modes, background patterns, image insertion, text insertion, and selection editing.
- Classroom helpers including clock display, timer, random picker, scoreboard, and teaching tools.
- Paginated canvas, auto-save and restore, PWA support, configuration import/export, and multi-language UI.
- Mostly front-end architecture with readable modules, making follow-up customization straightforward.

## Quick Start
- Live demo: <https://aboard.pp.ua>
- Run locally: `npm start` or `node server.js`
- Open: <http://localhost:8080>
- Note: opening `index.html` directly is not recommended because locale loading, help content, and version checks expect an HTTP environment.

## Documentation
- Architecture: [`../docs/en/architecture.md`](../docs/en/architecture.md)
- Advanced notes: [`../docs/en/advanced.md`](../docs/en/advanced.md)
- Simplified Chinese: [`../README.md`](../README.md)
- Traditional Chinese: [`README.zh-TW.md`](README.zh-TW.md)

## Repository Map
- `index.html`: main UI shell and static markup.
- `js/main.js`: main controller and interaction orchestration.
- `js/modules/`: feature modules for time, timer, teaching tools, settings, storage, PWA, i18n, and more.
- `css/style.css` and `css/modules/`: base styling plus module-specific styles.
- `server.js` / `sw.js`: local server, version endpoint, and offline caching.

## Good Fit For
- Teachers or presenters who want a browser-based board that works quickly on large touch displays.
- Developers who want a whiteboard project that is easy to read and extend without a heavy framework.

If Aboard helps you, a Star is always appreciated.
