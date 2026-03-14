# Aboard

<div align="center">

[Simplified Chinese](../README.md) | [Traditional Chinese](README.zh-TW.md) | [English](README.en.md)

[![Demo](https://img.shields.io/badge/Demo-Online-22c55e?style=for-the-badge&labelColor=111827&logo=googlechrome&logoColor=fff)](https://aboard.pp.ua)
[![Version](https://img.shields.io/badge/Version-2.4.1-f59e0b?style=for-the-badge&labelColor=111827)](../version.txt)
[![License](https://img.shields.io/badge/License-MIT-3b82f6?style=for-the-badge&labelColor=111827&logo=open-source-initiative&logoColor=fff)](../LICENSE)
[![PWA](https://img.shields.io/badge/PWA-Ready-8b5cf6?style=for-the-badge&labelColor=111827&logo=pwa&logoColor=fff)](../manifest.json)
[![Vanilla JS](https://img.shields.io/badge/Vanilla-JavaScript-facc15?style=for-the-badge&labelColor=111827&logo=javascript&logoColor=000)](../js/main.js)
[![HTML5 Canvas](https://img.shields.io/badge/HTML5-Canvas-ef4444?style=for-the-badge&labelColor=111827&logo=html5&logoColor=fff)](../index.html)
[![i18n](https://img.shields.io/badge/i18n-8_languages-06b6d4?style=for-the-badge&labelColor=111827&logo=googletranslate&logoColor=fff)](../js/modules/i18n.js)

[![GitHub stars](https://img.shields.io/github/stars/lifeafter619/Aboard?style=for-the-badge&labelColor=111827&color=eab308&logo=github)](https://github.com/lifeafter619/Aboard/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/lifeafter619/Aboard?style=for-the-badge&labelColor=111827&color=f97316&logo=github)](https://github.com/lifeafter619/Aboard/issues)
[![GitHub last commit](https://img.shields.io/github/last-commit/lifeafter619/Aboard?style=for-the-badge&labelColor=111827&color=14b8a6&logo=git)](https://github.com/lifeafter619/Aboard/commits/main)
[![Repo size](https://img.shields.io/github/repo-size/lifeafter619/Aboard?style=for-the-badge&labelColor=111827&color=6366f1&logo=github)](https://github.com/lifeafter619/Aboard)
[![Docs](https://img.shields.io/badge/Docs-Architecture%20%26%20Guide-a855f7?style=for-the-badge&labelColor=111827&logo=readthedocs&logoColor=fff)](../docs/en/architecture.md)

</div>

A lightweight web whiteboard built for teaching and presentation workflows. It aims to stay simple to deploy, intuitive to use, and practical on touch-enabled classroom screens.

## Highlights
- Multiple pen styles, shapes, eraser modes, background patterns, image insertion, text insertion, and selection editing.
- Classroom helpers including clock display, timer, random picker, scoreboard, and teaching tools.
- Paginated canvas, auto-save and restore, PWA support, configuration import/export, and multi-language UI.
- Resizable utility windows support restore-size plus keep-centered behavior; cache cleanup supports per-item confirmation; eraser size now adapts to the viewport by default.
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
