# Aboard

![Aboard](https://socialify.git.ci/lifeafter619/Aboard/image?custom_description=%E4%B8%80%E4%B8%AA%E7%AE%80%E7%BA%A6%E7%9A%84web%E7%99%BD%E6%9D%BF%EF%BC%8C%E6%9B%B4%E9%80%82%E5%90%88%E8%80%81%E5%B8%88%E4%BD%93%E8%B4%A8+%0A%F0%9D%93%99%F0%9D%93%BE%F0%9D%93%BC%F0%9D%93%BD+%F0%9D%93%AA+%F0%9D%93%AB%F0%9D%93%B8%F0%9D%93%AA%F0%9D%93%BB%F0%9D%93%AD+%F0%9D%93%AF%F0%9D%93%B8%F0%9D%93%BB+%F0%9D%93%BD%F0%9D%93%AE%F0%9D%93%AA%F0%9D%93%AC%F0%9D%93%B1%F0%9D%93%AE%F0%9D%93%BB%F0%9D%93%BC.&description=1&font=Bitter&forks=1&issues=1&language=1&name=1&owner=1&pattern=Brick+Wall&pulls=1&stargazers=1&theme=Auto)

<div align="center">

[简体中文](README.md) | [繁體中文](public/README.zh-TW.md) | [English](public/README.en.md)

[![Demo](https://img.shields.io/badge/Demo-Online-22c55e?style=for-the-badge&labelColor=111827&logo=googlechrome&logoColor=fff)](https://aboard.pp.ua)
<!-- version-badge:start -->
[![Version](https://img.shields.io/badge/Version-2.5.0-f59e0b?style=for-the-badge&labelColor=111827)](version.txt)
<!-- version-badge:end -->
[![License](https://img.shields.io/badge/License-MIT-3b82f6?style=for-the-badge&labelColor=111827&logo=open-source-initiative&logoColor=fff)](LICENSE)
[![PWA](https://img.shields.io/badge/PWA-Ready-8b5cf6?style=for-the-badge&labelColor=111827&logo=pwa&logoColor=fff)](manifest.json)
[![Vanilla JS](https://img.shields.io/badge/Vanilla-JavaScript-facc15?style=for-the-badge&labelColor=111827&logo=javascript&logoColor=000)](js/main.js)
[![HTML5 Canvas](https://img.shields.io/badge/HTML5-Canvas-ef4444?style=for-the-badge&labelColor=111827&logo=html5&logoColor=fff)](index.html)
[![i18n](https://img.shields.io/badge/i18n-8_languages-06b6d4?style=for-the-badge&labelColor=111827&logo=googletranslate&logoColor=fff)](js/modules/i18n.js)

[![GitHub stars](https://img.shields.io/github/stars/lifeafter619/Aboard?style=for-the-badge&labelColor=111827&color=eab308&logo=github)](https://github.com/lifeafter619/Aboard/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/lifeafter619/Aboard?style=for-the-badge&labelColor=111827&color=f97316&logo=github)](https://github.com/lifeafter619/Aboard/issues)
[![GitHub last commit](https://img.shields.io/github/last-commit/lifeafter619/Aboard?style=for-the-badge&labelColor=111827&color=14b8a6&logo=git)](https://github.com/lifeafter619/Aboard/commits/main)
[![Repo size](https://img.shields.io/github/repo-size/lifeafter619/Aboard?style=for-the-badge&labelColor=111827&color=6366f1&logo=github)](https://github.com/lifeafter619/Aboard)

</div>

一个面向课堂、演示与触控大屏场景的轻量网页白板。它尽量保持部署简单、上手直接、功能实用，适合“打开即用”和继续二次开发两种使用方式。

## 摘要
**大一小登的AI-Agent项目**，目标是想做一个**功能简单、部署简单，使用极其简单且符合直觉**的白板，主要是为**国内的初高中一体机教学使用设计**

由于本人的实际开发能力.....，所以本项目大量运用了**Agent Coding**，所以代码可能没有“人味”，也可能存在**相当多不合理的bug和开发方式**，**望大佬您轻喷**

您可以在下面的[**Demo链接**](https://aboard.pp.ua)中体验到本项目的全部，也可以前往[**我的博客**](https://619.pp.ua/article/aboard)看看我做这个项目的前因后果。

**如果大佬您觉得好的话，请给我点个star🌟吧~~~大学生真的很需要这个**

## 特色概览
- 常用白板能力齐全：画笔、形状、橡皮、背景、插图、插字、选择编辑。
- 课堂辅助功能完整：时间显示、计时器、随机点名、计分板、教具等。
- 体验偏向真实教学场景：分页画布、自动保存恢复、PWA、多语言、配置导入导出。
- 高倍率缩放时会自动切换到 SVG 矢量预览，让文字、图片、笔迹与形状在放大查看时更清晰。
- 默认缩放上限已提升到 `1000%`，需要更高倍率时仍可开启“允许无限放大”。
- 响应式与触控做了专门优化。

```mermaid
graph LR
    A[Aboard Project]
    A --> D[在线Demo]
    A --> E[博客文章]
    
    click D "https://aboard.pp.ua" "在线演示链接"
    click E "https://619.pp.ua/article/aboard" "博客文章链接"
```
## 当前分支和部署版本

```mermaid
graph LR
    A[Aboard Project]
    A --> B[main分支]
    A --> C[dev/preview分支]
    A --> D[dev/stable分支]
    A --> E[copilot/xxx分支]
    B --> F[branch Demo/主版本]
    C --> G[branch Demo/最新测试版]
    D --> H[branch Demo/稳定测试版]
    E --> I[PR中Vercel提供临时链接]

    click F "https://aboard.pp.ua" "主"
    click G "https://dev-aboard.619.pp.ua" "最新测试"
    click H "https://dev.aboard.pp.ua" "最新测试"
```

## 功能预览
<table cellpadding="10">
  <tr>
    <td width="50%" align="center" valign="top">
      <img src="public/main.png" alt="主界面" width="94%" /><br>
      <sub><strong>功能：主界面</strong></sub>
    </td>
    <td width="50%" align="center" valign="top">
      <img src="public/timer.png" alt="时间与计时功能" width="94%" /><br>
      <sub><strong>功能：时间与计时功能</strong></sub>
    </td>
  </tr>
  <tr>
    <td width="50%" align="center" valign="top">
      <img src="public/settings.png" alt="设置面板" width="94%" /><br>
      <sub><strong>功能：设置面板</strong></sub>
    </td>
    <td width="50%" align="center" valign="top">
      <img src="public/teaching_tools.png" alt="教具功能" width="94%" /><br>
      <sub><strong>功能：教具功能</strong></sub>
    </td>
  </tr>
  <tr>
    <td width="50%" align="center" valign="top">
      <img src="public/other_tools.png" alt="其他工具" width="94%" /><br>
      <sub><strong>功能：其他工具</strong></sub>
    </td>
    <td width="50%" align="center" valign="top">
      <img src="public/announcement.png" alt="公告功能" width="94%" /><br>
      <sub><strong>功能：公告功能</strong></sub>
    </td>
  </tr>
</table>

## 快速开始
- 在线体验：<https://aboard.pp.ua>
- 本地运行：`npm start` 或 `node server.js`
- 访问地址：<http://localhost:8080>
- 注意：不要直接双击 `index.html`，部分多语言、帮助与版本检查功能依赖 HTTP 环境。

## 文档导航
- 英文文档：[`public/README.en.md`](public/README.en.md)
- 繁体中文文档：[`public/README.zh-TW.md`](public/README.zh-TW.md)

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

## 部署
### 部署到 Vercel
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/lifeafter619/Aboard)

### 部署到 GitHub Pages
1. Fork 本仓库到你的 GitHub 账号。
2. 进入仓库设置 (Settings)。
3. 在 Pages 选项中，选择 Source 为 `main` 分支。
4. 点击 Save，等待部署完成。
5. 访问 `https://你的用户名.github.io/Aboard`。


### 部署到 Cloudflare Pages

[![Deploy to Cloudflare Pages](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/lifeafter619/Aboard)

## 🌟 致谢

感谢所有贡献者和使用者！如果这个项目对您有帮助，欢迎给个Star⭐，这样就对我很有帮助咯~~

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=lifeafter619/Aboard&type=date&legend=top-left)](https://www.star-history.com/#lifeafter619/Aboard&type=date&legend=top-left)
