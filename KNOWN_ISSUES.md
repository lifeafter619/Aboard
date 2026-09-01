# 已知问题与审查归档

最后核验：2026-09-01

## 当前状态

当前没有已复现且尚未修复的阻断性或影响主要使用流程的问题。

这不表示项目在所有环境中绝对无缺陷。当前验证边界如下：

- 浏览器端到端测试以 Chromium 内核为主，未覆盖 Safari 与 Firefox 的完整交互矩阵。
- 已覆盖 360x640 到 3840x2160 的响应式布局，但没有执行持续整节课时长的 300 页内存压力测试。
- 多标签页自动保存冲突由 Web Locks 防护；不支持 Web Locks 的旧浏览器会退化为单标签使用假设，并在控制台记录兼容性信息。
- 公告内容目前由 `js/features/announcement/announcement-manager.js` 内的本地化资源管理，不存在独立的远程公告配置源。

发现新问题时，应先添加最小复现测试，再在本文件的“当前状态”下记录适用环境、复现步骤和影响范围。

## 2026-09-01 审计归档

对撤销历史、选区测量与字体路径做了一轮定向审计，修复 3 项缺陷，提交于 `51e5f7a`。三项都先写失败测试再改实现，并逐个回退实现确认测试会红。

| 范围 | 问题 | 回归测试 |
| --- | --- | --- |
| 撤销历史 | `trimToMemoryLimit` 从头无条件淘汰到只剩 1 条。当最新一帧自身超过 `memoryLimitBytes`（raster fallback 页面必须保留完整合成位图）时，上限无论怎么淘汰都追不上，于是整个撤销栈被清空且一个字节都没省下 | `known-issues-regression.test.js` |
| 撤销历史 | `getEntryByteLength` 只数位图字节，而 `createHistoryEntry` 会主动丢弃超过 `singleBitmapMemoryLimitBytes` 的位图、只留场景；场景携带 `stampedImages` 的 data URL 与笔迹点数组，却按 0 字节记账，上限形同虚设 | `known-issues-regression.test.js` |
| 文字选区 | `buildTextFontString` 把未加引号的自定义字体名拼进 CSS font shorthand。字体名直接取自上传文件名，`2024新字体` 这类不是合法 CSS 标识符，整条声明失效、`ctx.font` 赋值被静默忽略，于是用上一个字体测量，选框与实际渲染错位。渲染路径已走 `normalizeFontFamilyForCanvas`，测量改为复用同一函数。与 `b71c7b4` 同类，当时只修了 drawing.js 的 SVG 路径 | `known-issues-regression.test.js` |

同轮新增智能对齐参考线，提交于 `7f10c96`（`js/modules/alignment-guides.js` + `js/selection.js` 接线）。几何为纯函数、不碰 DOM；参考线画在 `#transform-layer` 内的独立 overlay canvas 上，因此不会进入历史快照与导出位图，`stopDrag` 在任何保存前清除，`clearSelection` 也清除以覆盖 pointercancel 与翻页。

已知边界：
- 旋转过的对象在吸附中被双向排除——其轴对齐外接框与视觉边缘不一致，画出来的参考线会指向空处。
- 背景图与坐标点不参与吸附，它们各自有自己的坐标系。
- 参考线的视觉观感当轮只验证了坐标与图层，未做像素级核对。后续补测时发现两项真实缺陷，见下一节。

本轮验证基线：core 53 项、full 100 项（含真实 Chromium 绘图冒烟与 8 视口 × 15 状态响应式检查）、静态发布构建、真实 Chromium 下的对齐吸附与 overlay 图层检查。

## 2026-09-01 参考线可见性与图层几何跟进

上一节把「参考线的视觉观感未核对」记为已知边界。补做这项核对时发现两项真实缺陷，都不是观感问题而是功能缺陷。修复与本节说明在同一提交里（`ba9955d` 之后的那个 fix 提交）。

| 范围 | 问题 | 回归测试 |
| --- | --- | --- |
| 参考线图层几何 | overlay 与画布同在 `#transform-layer` 里，但 overlay 用 `inset:0` + `width/height:100%` 贴的是**图层**，而画布是棋盘自身尺寸。1080p 窗口下图层 1920 CSS px、画布 1280 CSS px，overlay 的 1280 内部坐标被拉伸到 1920 的盒子里，**每条参考线都画在它所标注边缘的约 1.5 倍位置外**（实测偏移 235px）。吸附计算一直是对的，画出来的线一直是错的。改为每次渲染都对齐画布的布局盒（`offsetLeft/Top/Width/Height`），因为画布会随窗口、缩放与翻页改变 | `alignment-snap-wiring.test.js` |
| 参考线对比度 | `#f43f5e` 对 index.html 里四个深色板子达不到 WCAG 1.4.11 的 3:1 非文本对比度下限：墨绿 2.52:1、绿 1.32:1、深棕 2.40:1、棕 1.93:1。绿板上实测合成像素 2.17:1，基本看不见——而这正是一体机上最常用的板子。改为按背景决定是否在参考线下面垫一层描边：够 3:1 就保持原样的单像素线，不够就垫白或近黑（取对比度更高的一侧）。背景取的是 `background-canvas` 的**实际像素**（每手势采一次 3x3 网格），所以背景图也覆盖得到，而不是只看配置色 | `alignment-guides.test.js`、`alignment-snap-wiring.test.js` |

两项都先写失败测试再改实现，并逐个回退实现确认测试会红（共 4 处变异：casing 恒为 null、不解析 casing、core 与 casing 描边顺序颠倒、透明像素按黑色计；外加 overlay 盒子的 2 处）。

真实 Chromium 下的核对结果：8 个背景预设全部达到 3:1（原本通过的 4 个保持单像素线不变，失败的 4 个垫白后为 4.86:1 到 9.25:1）；虚线 `ink:5 gap:4` 在 core 与 casing 两列都完好，垫层没有把虚线间隙填平；overlay 盒子与画布盒子比值 1.0000，参考线与它标注的边缘同在屏幕 x=380.3，偏移 0px；缩放 1x/2x/4x 下该不变量依旧成立且吸附精确落位。另外单独验证了背景图路径：把 `background-canvas` 画成深绿而把配置色留成白色，采样读到深绿并正确垫白——只看配置色的实现会漏掉这种情况。

仍未做的：真实一体机上的主观观感（虚线疏密是否顺眼、垫白在强光教室里是否发闷）。数值与几何已核对，剩下的只能目视。

## 2026-07-27 桌面快照审计归档

以 `C:\Users\lenovo\Desktop\Aboard-main` 为审计快照，对 Git 工作区逐项复现并修复了快照问题清单中的有效缺陷。主要闭环如下：

| 范围 | 已处理内容 | 主要回归测试 |
| --- | --- | --- |
| 会话、导入与缓存 | 压缩包解压预算、图片尺寸预算、场景数字规范化、清理键白名单、恢复/清理期间的保存守卫 | `known-issues-2026-07-26-regression.test.js`、`session-*.test.js`、`project-import-background-reset.test.js` |
| 触控与选区 | 笔/触摸主指针语义、手势 pointerId 归属、旋转/缩放本地坐标、图像和文字控制框一致性 | `event-setup-touchcancel.test.js`、`known-issues-followup-regression.test.js`、`known-issues-regression.test.js` |
| 绘制与教学工具 | 多线笔迹持久化、笔型纹理重放、教具断笔、三角板旋转命中、形状预览钳制、缩放虚线间距 | `known-issues-drawing-regression.test.js`、`shape-*.test.js`、`drawing-live-preview-lazy.test.js` |
| 背景与导出 | 点阵/田字格 SVG pattern、英语四线格分组、显示设置合并、多页图片单 ZIP 下载 | `background-customization-resilience.test.js`、`export-page-readiness.test.js`、浏览器冒烟测试 |
| 文字与字体 | URL 富文本边界、Canvas 自定义字体族引用、待插入文字重复编辑 | `rich-text-parser.test.js`、`insert-text-modal-ux.test.js`、`known-issues-followup-regression.test.js` |
| 启动与 PWA | HelpSystem 延迟实例化、后置脚本重试/隔离/可见错误、完整离线预缓存、导航超时与 5xx 回退、启动版本超时 | `create-app-browser-check-order.test.js`、`script-loader-existing-script.test.mjs`、`sw-essential-assets.test.js` |
| 离线媒体 | 音频完整响应独立缓存，Range 请求按字节返回 206，离线重播不再依赖网络 | `sw-essential-assets.test.js`、`timer-audio-fallback.test.js` |
| 工程卫生 | 删除不可达的旧 StrokeControls 及全局监听，生产启动复用 ES5 浏览器预检，语言键与占位符零缺口 | `project-quality-guards.test.js`、`browser-check-no-eval.test.js`、`locale-files.test.js` |

本轮验证基线：core 44 项、full 91 项（含真实 Chromium 绘图冒烟与 8 个视口 x 15 个状态响应式检查）、静态发布构建、`npm audit --audit-level=high` 与 `git diff --check`。

## 2026-07 审查归档

2026-07-08 审查记录中的条目已经重新核对。以下问题已修复并由自动化测试覆盖：

| 原编号 | 已处理内容 | 主要回归测试 |
| --- | --- | --- |
| A1 | 多标签页会话写锁、失效传播与只读提示 | `session-write-lock-invalidation.test.js`、`session-planned-update-recovery.test.js` |
| A2 | 历史尺寸不匹配、大位图降级与页面位图内存预算 | `known-issues-regression.test.js`、`pagination-page-action-i18n.test.js` |
| A3 | 同步快照剔除超大 PNG、图片库和内联图片数据 | `known-issues-regression.test.js` |
| B1-B2 | 旋转中心与旋转后缩放的本地坐标换算 | `known-issues-regression.test.js` |
| B3 | 带样式形状保留旋转后的几何变换 | `shape-drawing-lazy-preview.test.js`、`shape-polygon.test.js` |
| B4 | 绘制中延后画质重建并取消过期定时器 | `known-issues-regression.test.js` |
| B5 | PWA 立即更新等待安装完成并显示失败反馈 | `known-issues-regression.test.js`、`pwa-*.test.js` |
| B6 | 粘贴后自动切换到选择工具 | `known-issues-regression.test.js` |
| C1-C3 | 文字选区无效手柄、轻点脏状态和手势阈值 | `known-issues-regression.test.js` |
| D1 | 补充 192/512 PNG 与 maskable PWA 图标 | `pwa-locale-guard.test.js`、`sw-essential-assets.test.js` |
| D4-D5 | 清理旧运行时副本并统一浏览器兼容检查入口 | `project-quality-guards.test.js`、`browser-check-no-eval.test.js` |

本次后续审查还补充了活动按钮的 `aria-pressed` 同步、混合触控设备点击目标、画布辅助名称、形状面板响应式覆盖和课堂激光笔。对应测试位于 `active-control-aria.test.js`、`classroom-mode-*.test.js` 与 `responsive-layout-smoke.mjs`。
