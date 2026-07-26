# 已知问题与审查归档

最后核验：2026-07-26

## 当前状态

当前没有已复现且尚未修复的阻断性或影响主要使用流程的问题。

这不表示项目在所有环境中绝对无缺陷。当前验证边界如下：

- 浏览器端到端测试以 Chromium 内核为主，未覆盖 Safari 与 Firefox 的完整交互矩阵。
- 已覆盖 360x640 到 3840x2160 的响应式布局，但没有执行持续整节课时长的 300 页内存压力测试。
- 多标签页自动保存冲突由 Web Locks 防护；不支持 Web Locks 的旧浏览器会退化为单标签使用假设，并在控制台记录兼容性信息。
- 公告内容目前由 `js/features/announcement/announcement-manager.js` 内的本地化资源管理，不存在独立的远程公告配置源。

发现新问题时，应先添加最小复现测试，再在本文件的“当前状态”下记录适用环境、复现步骤和影响范围。

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
