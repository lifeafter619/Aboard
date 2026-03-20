# Aboard

![Aboard](https://socialify.git.ci/lifeafter619/Aboard/image?custom_description=%E4%B8%80%E4%B8%AA%E7%AE%80%E7%BA%A6%E7%9A%84web%E7%99%BD%E6%9D%BF%EF%BC%8C%E6%9B%B4%E9%80%82%E5%90%88%E8%80%81%E5%B8%88%E4%BD%93%E8%B4%A8+%0A%F0%9D%93%99%F0%9D%93%BE%F0%9D%93%BC%F0%9D%93%BD+%F0%9D%93%AA+%F0%9D%93%AB%F0%9D%93%B8%F0%9D%93%AA%F0%9D%93%BB%F0%9D%93%AD+%F0%9D%93%AF%F0%9D%93%B8%F0%9D%93%BB+%F0%9D%93%BD%F0%9D%93%AE%F0%9D%93%AA%F0%9D%93%AC%F0%9D%93%B1%F0%9D%93%AE%F0%9D%93%BB%F0%9D%93%BC.&description=1&font=Bitter&forks=1&issues=1&language=1&name=1&owner=1&pattern=Brick+Wall&pulls=1&stargazers=1&theme=Auto)

<div align="center">

[Simplified Chinese](../README.md) | [Traditional Chinese](README.zh-TW.md) | [English](README.en.md)

[![Demo](https://img.shields.io/badge/Demo-Online-22c55e?style=for-the-badge&labelColor=111827&logo=googlechrome&logoColor=fff)](https://aboard.pp.ua)
<!-- version-badge:start -->
[![Version](https://img.shields.io/badge/Version-2.4.2-f59e0b?style=for-the-badge&labelColor=111827)](../version.txt)
<!-- version-badge:end -->
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

A lightweight web whiteboard for classrooms, presentations, and touch-enabled large-screen scenarios. It tries to stay simple to deploy, easy to pick up, and practical to use, making it suitable both for "open and use right away" and for continued secondary development.

## Summary
**A freshman student's AI-Agent project**. The goal is to make a whiteboard that is **simple in features, simple to deploy, extremely simple and intuitive to use**, mainly **designed for teaching on integrated classroom displays in Chinese middle and high schools**.

Because my actual development ability is still limited, this project makes heavy use of **AI-Agent technology** (basically calling GitHub Agent features to help me develop and push features forward efficiently), so the code may not feel very "human", and there may also be **quite a lot of unreasonable bugs and development approaches**. **Please go easy on me, big shots**.

You can quickly try this project through the **Demo link** below, or visit **my blog** to see the full story of why I made it.

**If you think it's good, please give me a star 🌟~~~ College students really need this**

## Highlights
- Complete common whiteboard capabilities: pen, shapes, eraser, background, image insertion, text insertion, and selection editing.
- Complete classroom helper functions: time display, timer, random picker, scoreboard, teaching tools, and more.
- The experience is oriented toward real teaching scenarios: paginated canvas, automatic save and restore, PWA, multilingual support, and configuration import/export.
- At higher zoom levels, Aboard automatically switches to an SVG vector preview so text, images, strokes, and shapes stay sharper while magnified.
- The default zoom ceiling has been raised to `1000%`, and the unlimited zoom option can still extend beyond that.
- Responsive layout and touch interaction have been specially optimized.

```mermaid
graph LR
    A[Aboard Project]
    A --> D[Live Demo]
    A --> E[Blog Article]
    
    click D "https://aboard.pp.ua" "Live Demo"
    click E "https://66619.eu.org/article/aboard" "Technical Article"
```
## Current Branches and Deployed Versions

```mermaid
graph LR
    A[Aboard Project]
    A --> B[main branch]
    A --> C[dev/preview branch]
    A --> D[dev/stable branch]
    A --> E[copilot/xxx branch]
    B --> F[branch Demo / main version]
    C --> G[branch Demo / latest test version]
    D --> H[branch Demo / stable test version]
    E --> I[temporary Vercel link in PR]

    click F "https://aboard.pp.ua" "Main"
    click G "https://dev-aboard.619.pp.ua" "Latest Test"
    click H "https://dev.aboard.pp.ua" "Latest Test"
```

## Feature Preview
<table cellpadding="10">
  <tr>
    <td width="50%" align="center" valign="top">
      <img src="main.png" alt="Main Interface" width="94%" /><br>
      <sub><strong>Feature: Main Interface</strong></sub>
    </td>
    <td width="50%" align="center" valign="top">
      <img src="timer.png" alt="Time and Timer Features" width="94%" /><br>
      <sub><strong>Feature: Time and Timer Features</strong></sub>
    </td>
  </tr>
  <tr>
    <td width="50%" align="center" valign="top">
      <img src="settings.png" alt="Settings Panel" width="94%" /><br>
      <sub><strong>Feature: Settings Panel</strong></sub>
    </td>
    <td width="50%" align="center" valign="top">
      <img src="teaching_tools.png" alt="Teaching Tools" width="94%" /><br>
      <sub><strong>Feature: Teaching Tools</strong></sub>
    </td>
  </tr>
  <tr>
    <td width="50%" align="center" valign="top">
      <img src="other_tools.png" alt="Other Tools" width="94%" /><br>
      <sub><strong>Feature: Other Tools</strong></sub>
    </td>
    <td width="50%" align="center" valign="top">
      <img src="announcement.png" alt="Announcement Feature" width="94%" /><br>
      <sub><strong>Feature: Announcement Feature</strong></sub>
    </td>
  </tr>
</table>

## Quick Start
- Live demo: <https://aboard.pp.ua>
- Run locally: `npm start` or `node server.js`
- Access URL: <http://localhost:8080>
- Note: do not double-click `index.html` directly. Some multilingual, help, and version-check features depend on an HTTP environment.

## Documentation
- Architecture design: [`../docs/en/architecture.md`](../docs/en/architecture.md)
- Advanced notes: [`../docs/en/advanced.md`](../docs/en/advanced.md)
- English document: [`README.en.md`](README.en.md)
- Traditional Chinese document: [`README.zh-TW.md`](README.zh-TW.md)

## Responsive and Touch Notes
- The project is designed with touch first by default, and major interactive buttons try to maintain a tappable area of at least `44px`.
- In 1366×768, 1920×1080, 2K, 4K, and browser windows after zooming, toolbars, history panels, floating panels, and editing overlay controls all prioritize staying visible and operable.
- For especially small images, text boxes, selections, or stroke objects, controls automatically reflow and, when necessary, shrink while keeping a minimum lower bound, trying to avoid drifting too far outside the object.
- If you continue secondary development, it is recommended to reuse the existing responsive variables, media queries, and `data-i18n-*` mechanism first, and not write fixed-pixel absolute layouts again.

## Repository Structure
- `index.html`: main interface and static structure.
- `js/main.js`: application main controller and event orchestration.
- `js/modules/`: modules for time, timer, teaching tools, settings, storage, PWA, i18n, and more.
- `css/style.css` and `css/modules/`: main styles and module-based styles.
- `server.js` / `sw.js`: local service, version interface, and offline cache.

## Deployment
### Deploy to Vercel
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/lifeafter619/Aboard)

### Deploy to GitHub Pages
1. Fork this repository to your GitHub account
2. Enter the repository settings (Settings)
3. In the Pages options, select `main` as the Source branch
4. Click Save and wait for deployment to finish
5. Visit `https://your-username.github.io/Aboard`


### Deploy to Cloudflare Pages

[![Deploy to Cloudflare Pages](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/lifeafter619/Aboard)

If this project helps you, feel free to give it a Star.
