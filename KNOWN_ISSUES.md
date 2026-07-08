# 已确认待修复问题清单（KNOWN ISSUES）

> **来源**：2026-07-08 全量源码审查（9 个方向分组深审 + 逐条人工复核）。当轮已修复 25 项，本文档记录**审查确认但尚未修复**的问题，按优先级组织，供后续迭代逐项认领。
>
> **使用说明**：
> - 文中行号为 2026-07-08 修复批次落盘后的快照，后续会漂移，**定位以函数/方法名为准**。
> - 每项标注了「验证方式」：*实测* = 审查时已在真实浏览器中复现；*静态确认* = 代码链路逐行确认成立但未实机复现。
> - 修复顺序建议：先写一个能复现问题的测试（参照 `tests/` 现有风格），再动实现。
> - 相关背景：本项目主力设备是国内初高中教室触摸一体机（大屏、多点触控、常见旧内核 WebView、可能离线/内网），评估严重度时以此为准。

---

## A. 数据丢失 / 稳定性（高优先级）

### A1. 多标签页打开同一白板会互相覆盖会话，后写者静默获胜

- **严重度**：中高（机制必然发生，触发频率取决于使用习惯）
- **验证方式**：静态确认
- **位置**：
  - `js/modules/storage-manager.js` — `saveSession()` 用固定主键 `'current_session'` 写 IndexedDB（搜索 `id: 'current_session'`）
  - `js/modules/session-persistence-runtime.js` — `saveSessionSnapshotSync()` 写共享 localStorage 键 `aboardSyncSessionSnapshot`
  - 全库无 `storage` 事件监听、无 BroadcastChannel、无 Web Locks（已 grep 确认）
- **机制**：所有标签页写同一个 IndexedDB 记录和同一个 localStorage 键，没有任何实例检测或冲突合并。
- **复现场景**：教师开着标签 A（5 页板书），又开了标签 B（空板）→ B 中任意一次落笔/翻页触发防抖保存，覆盖 A 的会话 → 若 B 后关闭，beforeunload 再覆盖一次 → 次日恢复得到 B 的空白内容，A 的板书无提示丢失。
- **关联问题**：`js/modules/cache-runtime.js` 的 `clearAllLocalData()` 中 `indexedDB.deleteDatabase` 的 `onblocked` 回调直接 `resolve()` 继续——当另一标签持有连接时删除实际未完成，但共享 localStorage 已被 clear，两标签状态错乱。
- **建议修法**（二选一，推荐前者）：
  1. **单实例写锁**：启动时用 `navigator.locks.request('aboard-session', {ifAvailable: true}, ...)` 尝试持锁；拿不到锁的标签进入"只读/访客"模式（顶部横幅提示"白板已在另一窗口打开"，禁用自动保存），并用 BroadcastChannel 监听主标签关闭后接管。Web Locks 在 Chrome 69+ 可用，一体机内核基本覆盖；不可用时退化为现状并 console.warn。
  2. **按标签会话 + 时间戳合并**：每个标签生成 sessionId，存储键带 id；恢复时列出各会话按时间戳挑选/合并。改动面大，恢复 UI 也要改，不推荐先做。
- **修复注意**：`persistSessionForUpdateReload`（PWA 更新前持久化）与恢复流程的守卫（`isRecoveryFlowBlockingSaves`，本轮新增）都要与锁语义兼容；只读模式下 PWA 更新重载路径需要跳过持久化。
- **验证建议**：新增 `tests/multi-tab-session-lock.test.js`，用两个模拟 board 实例竞争锁，断言从标签只读、主标签关闭后接管。

### A2. 位图历史 / 页面快照的内存与尺寸专题（三个同根子问题）

这三个子问题都源于"撤销历史和翻页快照以全幅 `ImageData` 存储、且不感知画布物理尺寸"，建议一次性设计解决。现在每页/每条历史已携带矢量 `sceneState`（本轮 undo/redo 场景恢复特性），为"位图降级、矢量兜底重建"铺平了路。

#### A2-a. 历史条目不感知画布尺寸变化：改尺寸后撤销输出错位、残留花屏

- **严重度**：中
- **验证方式**：静态确认（机制确定）
- **位置**：
  - `js/history.js` — `restoreState()` 里 `putImageData(imageData, 0, 0)` 无尺寸校验
  - `js/modules/render-quality-runtime.js` — `applyRenderQualityScale()`（约 79 行起）与 `applyCanvasSize()` 重设 canvas backing store 时完全不处理已有历史
  - 用户入口：设置 → 画布尺寸预设/自定义宽高（`js/modules/ui-listeners-runtime.js` 约 1254/1275/1294/1337 行的绑定）；开启 unlimitedZoom 后缩放触发动态渲染倍率切换
- **复现场景**：画几笔 → 设置里切换画布尺寸 → 按撤销 → 旧尺寸的 ImageData 按原始像素贴回 (0,0)，内容比例错误，超出旧尺寸的区域保留撤销前像素，画面拼接错乱。
- **建议修法**：backing store 尺寸变化时，遍历历史条目：有 `sceneState` 的条目丢弃位图、恢复时走矢量重渲染；没有的（旧数据）用临时 canvas `drawImage` 缩放到新尺寸。同时 `restoreState()` 增加防御：`imageData` 尺寸与当前 canvas 不符时经临时 canvas 缩放贴回而不是直接 put。
- **验证建议**：加测试模拟 canvas 尺寸变化后 undo，断言不抛错且输出尺寸匹配。

#### A2-b. 高倍率 + 高 DPI 下单条历史超 128MB 上限，撤销静默失效

- **严重度**：中（依赖 unlimitedZoom 设置 + 4K/dpr2 设备，但一体机恰好是高分大屏）
- **验证方式**：静态确认（算术确定：7680×4320×4 ≈ 132MB > 128MB）
- **位置**：`js/history.js` — `trimToMemoryLimit()`（`while (totalBytes > this.memoryLimitBytes && this.history.length > 1)`，128MB 上限在构造函数 `memoryLimitBytes`）；尺寸来源 `js/modules/render-quality-runtime.js` 的 `getImageData` 尺寸 = CSS 尺寸 × dpr × dynamicRenderScale
- **复现场景**：4K 一体机（或 1080p@dpr2）开启无限缩放，缩放到 ≥4 倍 → renderScale 提到 2 → 每条历史 ≈132MB → 每次 `saveState()` 后 trim 把历史裁到只剩当前 1 条 → `canUndo()` 恒 false，撤销按钮点了没反应且无任何提示；同时每笔 132MB 的 getImageData 造成可感知卡顿。
- **建议修法**：
  1. 单条超过阈值（如 32MB）时不存全幅位图，只存 `sceneState` + 一张降采样缩略位图（恢复时优先矢量重渲染，位图仅兜底）；
  2. 至少：当 `canUndo()` 因内存被裁而失效时，在 UI 上给出一次性提示（toast），不要静默。
- **验证建议**：单测构造大 ImageData 模拟，断言历史保留条数与 canUndo 行为。

#### A2-c. `pages[]` 每页整幅 ImageData 永久驻留，无内存上限

- **严重度**：中（长课时多页教学下可能标签页 OOM 崩溃、丢整堂课）
- **验证方式**：静态确认
- **位置**：`js/modules/pagination-runtime.js` — `saveCurrentPageSnapshot()` 每次翻页 `getImageData` 存入 `this.pages`；仅有 `MAX_PAGES = 300` 的数量上限，无字节总量上限
- **复现场景**：4K/dpr2 下每页快照 33–132MB，一节课翻 20–30 页 → 累计 1–4GB 堆内存 → 一体机浏览器标签页崩溃。
- **建议修法**：给 `pages[]` 加总字节预算（如 512MB），超出时对最久未访问的页面做 LRU 处理：丢弃全幅位图，保留降采样缩略图（翻页列表用）+ 该页 `pageScenes` 矢量数据；翻回该页时优先用矢量重渲染，无矢量数据的旧页用缩略图放大兜底并提示。
- **修复注意**：`buildSyncSnapshot()`、`saveSession()`（把 pages 转 Blob）、`restoreSession()` 都直接消费 `this.pages[i]`，降级后这些路径要能接受"该页只有缩略图"的状态。

### A3. 同步快照把整页 PNG + 贴图 dataURL + 图片库整包塞进单个 localStorage 键

- **严重度**：中（一张几 MB 照片即可让双保险的 localStorage 腿失效 + 主线程卡顿）
- **验证方式**：静态确认
- **位置**：`js/modules/session-persistence-runtime.js` — `buildSyncSnapshot()`：`pageDataUrl: this.canvas.toDataURL('image/png')` + `currentPageScene`（含每张盖章图完整 `imageSrc` dataURL，见 `js/modules/page-scene-runtime.js` 的 `serializeStampedImage`）+ `settings.backgroundImageData` + `settings.uploadedImages`，全部 `JSON.stringify` 后写入 `aboardSyncSessionSnapshot` 一个键
- **机制**：localStorage 单源约 5MB 配额；图片校验上限是 10MB（`js/modules/file-validation.js`），插一张大图后每次历史落库（`historyManager.onStateChanged` → 防抖保存）都会执行 toDataURL + 多 MB 字符串序列化（触摸设备可感知卡顿），且写入静默失败（`safeSessionPersistenceStorageSetItem` 返回 false 仅 console.warn）→ 刷新恢复只剩 IndexedDB 单腿；若 IndexedDB 也不可用则丢当前板书。
- **缓解现状**：本轮已加"连续 3 次保存失败弹 toast"（`js/main.js` 的 `saveSessionDebounced`），教师至少有感知；但快照本身仍然超重。
- **建议修法**：
  1. `buildSyncSnapshot` 剔除三类大字段：`uploadedImages`（图片库与恢复板面无关）、`currentPageScene` 里 stampedImages 的 `imageSrc`（恢复时从 IndexedDB 场景补水，`session-runtime.js` 的恢复路径已有 hydration 逻辑）、`backgroundImageData` 超过阈值时只存标记；
  2. 或按总体积阈值（如 2MB）降级：超限时同步快照只存 `settings` + 页码等元数据，位图交给 IndexedDB。
- **验证建议**：单测构造含大图的 board，断言快照字符串长度低于阈值、且恢复路径在缺 `imageSrc` 时能从 IndexedDB 场景补齐。

---

## B. 交互正确性（中优先级）

### B1. 旋转结束后选框绕"错误的中心"重建：选框跳位、缩水，误差逐次累积

- **严重度**：中
- **验证方式**：静态确认（代码 + 几何推导，审查代理逐行核对）
- **位置**：`js/selection.js` — `getStrokeSelectionBounds(stroke)` 与 `getMultiSelectionBounds()`（搜索函数名；对照 `js/drawing.js` 的 `getStrokeBounds`（含 `size*2` padding）与 selection.js 内的 `getBoundsFromPoints`（无 padding））
- **机制**：旋转操作把角度"烘焙"进 `stroke.points`（绕旋转开始时 `originalBounds` 的中心 C0 旋转每个点）。事后重建"未旋转包围盒"时，却绕**旋转后点云 AABB 的中心 C1** 做反旋转。非对称形状 C1 ≠ C0，重建框相对真实位置平移 `(I − R(−θ))(C1 − C0)`；单笔迹分支还从"带 padding 的 bounds"退化成"无 padding 的点集 bounds"。
- **复现场景**：选中一个 L 形/对勾笔迹 → 旋转手柄转约 45° 松手 → 再拖动选框或双指缩放画布（触发 `updateControlBox`）→ 选框突然跳位并缩小，部分笔迹露在框外；下一次旋转/翻转以错误中心计算，误差逐次累积。
- **建议修法**（两个方向，推荐 2）：
  1. **保存旋转中心**：旋转会话结束（`stopRotate`）时把本次使用的中心 C0 存到 `stroke.rotationCenter`（multi 同理存到选区状态），`getStrokeSelectionBounds` 反旋转时优先用它；单笔迹分支重建后补回与 `getStrokeBounds` 相同的 padding。改动小，兼容现有"烘焙进 points"的模型。
  2. **不烘焙 points**：旋转只更新 `stroke.rotation` 属性，渲染时 `ctx.rotate`。这是更干净的模型（也顺带解决 B3），但涉及渲染、命中测试、序列化（`serializeStroke` 已含 rotation 字段）、橡皮擦交互等多处，工作量大，建议作为独立重构。
- **验证建议**：单测构造 L 形点集 → 旋转 45° → 断言 `getStrokeSelectionBounds` 中心与旋转中心一致、宽高含 padding。

### B2. 旋转后的对象用缩放手柄：增量不做角度补偿，180° 下方向完全颠倒、45° 多选斜切变形

- **严重度**：中
- **验证方式**：静态确认
- **位置**：`js/selection.js` — `resize(e)`（`switch (this.resizeHandle)` 直接用屏幕轴 `deltaX/deltaY` 修改未旋转 bounds，而控制框整体被 CSS rotate）；`js/image-controls.js` 的 resize 同样问题
- **复现场景**：选中图片 → 旋转到约 180° → 拖"视觉上的右下角"手柄向外 → 实际命中 top-left 逻辑分支，图片反而缩小；旋转 45° 的多选拖边缩放会沿屏幕轴拉伸已旋转的内容，产生斜切。
- **建议修法**：`resize()` 计算 delta 后，先把指针位移逆旋转到对象本地坐标系再套用现有 handle 逻辑：`const local = rotatePoint(deltaX, deltaY, 0, 0, -rotation)`（rotation 取当前选区的旋转角：stroke.rotation / img.rotation / multiRotation）。`js/image-controls.js` 同步修改。文件内已有 `rotatePoint` 一类几何工具可复用（搜索确认签名）。
- **验证建议**：单测：bounds(0,0,100,100) 旋转 180°，拖 bottom-right 手柄 (+10,+10)，断言宽高变大而非变小。

### B3. 波浪/双线/三线/多线样式的矩形、椭圆做自由旋转：图形不旋转反而"膨胀回正"

- **严重度**：中低
- **验证方式**：静态确认
- **位置**：触发方 `js/selection.js` 的 `rotate(e)`（把角度烘焙进 points）；根因 `js/modules/shape-drawing.js` 的 `drawStoredShapeOnContext(ctx, stroke)`（约 538 行起）——对 styled lineStyle 的矩形/椭圆用**点云 AABB 重推轴对齐几何**再重画。
- **复现场景**：形状工具选"波浪线"样式画矩形 → 选择工具选中 → 旋转手柄转 45° → 画布上矩形不倾斜，而是被重画成放大了的轴对齐波浪矩形（选框却是斜的）；90° 整倍数时"看起来正常"，掩盖了问题。
- **建议修法**：`drawStoredShapeOnContext` 对 styled 形状：若 `stroke.rotation` 存在，先 `ctx.translate(中心) → ctx.rotate(rotation) → 按未旋转几何绘制`；同时旋转此类形状时不烘焙采样点，只更新 `shapeStart/shapeEnd + rotation`（与 B1 修法 2 同方向，可一起做）。
- **验证建议**：目测用例 + 单测断言旋转 45° 后 `drawStoredShapeOnContext` 输出的变换矩阵含 rotate。

### B4. unlimitedZoom 下画质重建定时器可能在笔画中途清屏，历史里留下断头笔迹

- **严重度**：中低（时序依赖：抬笔后 120ms 内再落笔连续书写才触发）
- **验证方式**：静态确认（机制明确，未实测）
- **位置**：`js/modules/render-quality-runtime.js` — `scheduleRenderQualityUpdate()`（68 行：`|Δ| < 0.15` 提前 return 但**不取消已挂起的旧 setTimeout**）与 `applyRenderQualityScale(scale)`（79 行起：重设 `canvas.width` 即清屏 + 只重渲染已提交笔迹，**无 isDrawing 保护**）
- **复现场景**：开启无限缩放，高倍率下抬笔（调度了升档定时器）→ 120ms 内再次落笔连续书写 → 定时器在笔画中途触发 → 当前未提交笔迹的前半段从位图消失 → 笔画结束 `saveState()` 记录的是断头笔迹（屏幕稍后被矢量重渲染自愈，但该历史条目已损坏）。
- **建议修法**：`applyRenderQualityScale` 开头检查 `this.drawingEngine?.isDrawing || this.isPanning`，为真时改为重新调度（如 150ms 后重试）而不是立即执行；`scheduleRenderQualityUpdate` 的提前返回分支补 `clearTimeout` 取消已挂起的旧定时器。
- **验证建议**：单测用假定时器模拟"调度 → isDrawing=true → 定时器触发"，断言 canvas.width 未被重设。

### B5. PWA"立即刷新更新"在 SW 还在安装时静默失败，约 1 分钟后又"自己"重载

- **严重度**：中（更新体验混乱：点了按钮没反应，之后教学中突然刷新）
- **验证方式**：静态确认（pwa-* 现有测试只覆盖 recovery 阻塞与防环，不覆盖安装耗时场景）
- **位置**：
  - `js/modules/pwa-manager.js` — `UPDATE_APPLY_TIMEOUT = 5000`（第 3 行）；`waitForWaitingWorker(timeoutMs = UPDATE_APPLY_TIMEOUT)`（约 908 行）只等 5 秒；`applyPreparedUpdateNow`（约 681 行）超时后返回 false
  - `js/app/create-app.js` — 两处 `if (!didRequestUpdate && userChoice === IMMEDIATE) { deferUpdatePromptForCurrentSession?.(); return CONTINUE }`（约 219-226 与 248-255 行）：失败后**无任何用户提示**，静默转入 idle 更新
  - 手动检查路径超时更短（`MANUAL_UPDATE_CHECK` 相关，1.2 秒）
- **复现场景**：发新版后启动 → SW install 需预缓存约 145 个文件（校园网远超 5 秒）→ 启动弹窗提示新版本，教师点"立即刷新更新" → 等 5 秒超时返回 false → 弹窗关了、页面没刷新、没有任何提示；约 1 分钟后 install 完成，走 idle 路径，教师停笔 15 秒后页面突然自动重载。
- **建议修法**：
  1. immediate 模式不用固定 5 秒超时：监听 `registration.installing` 的 `statechange`，等它进入 `installed`（成为 waiting）后再走现有 SKIP_WAITING+reload 流程；给一个宽松的兜底超时（如 60–120 秒）+ 进度提示（"正在下载更新…"）。
  2. 兜底超时仍失败时，toast 明确告知"更新仍在后台下载，完成后将在空闲时自动应用"，替代现在的静默。
- **修复注意**：改动处于更新流核心，现有 `tests/pwa-*.test.js` 有多个防环/守卫用例，动之前先跑全量并为新等待逻辑补测试；`hasUnresolvedRecoveryData`/`recoveryPromptOpen` 的门控（`pwa-manager.js` 约 598/1306 行）不能被绕过。
- **验证建议**：模拟 installing→installed 状态迁移的假 registration，断言 immediate 路径等待而非 5 秒放弃。

### B6. 非选择工具下 Ctrl+V：粘贴后弹出选区控制框，但工具栏仍是笔/橡皮，状态不一致

- **严重度**：中低
- **验证方式**：静态确认
- **位置**：`js/modules/board-helpers-runtime.js` — `setupKeyboardShortcuts` 的 `key === 'v'` 分支（不检查当前工具）；`js/selection.js` — `pasteClipboard()` 无条件 select + `showControls()`
- **复现场景**：用选择工具 Ctrl+C 复制后切到笔工具 → Ctrl+V → 粘贴成功但屏幕出现选区框（工具栏仍高亮"笔"）；框区域内无法落笔（控制框 `pointer-events: all`），点画布空白处也不会取消选区（`startSelection` 被 `isActive=false` 拦截），只能点 Done 按钮或切回选择工具再点空白。
- **建议修法**：`pasteClipboard()` 成功后调用 `window.drawingBoard?.setTool?.('select', false)` 让工具状态与选区 UI 对齐（体验与常见白板一致：粘贴后进入可拖动状态）；若产品上希望"粘贴后继续用笔"，则改为粘贴后不 `showControls`，二选一，需要产品决策。
- **验证建议**：手测两条路径；如走 setTool 方案，断言粘贴后 `currentTool === 'select'`。

---

## C. 打磨项（低优先级）

### C1. 单个文字选区显示"水平翻转"手柄，点击完全无效果，还误置脏标记

- **严重度**：低
- **验证方式**：静态确认
- **位置**：`js/selection.js` — `flipHorizontal()` 缺 `'text'` 分支（stroke/image/background/compound 之外落空）；`showControls` 里给控制框加的 `text-selection-only` class 在全部 CSS 中**没有对应规则**（`css/modules/selection-controls.css` 只有 `coordinate-selection-only`），翻转手柄对文字选区可见可点
- **复现场景**：选中文字 → 点绿色翻转手柄 → 无任何视觉变化，但 `hasUnsavedChanges = true`，点 Done 会写入一条与前一状态相同的垃圾历史（之后按一次撤销"没反应"）。
- **建议修法**（推荐 1）：
  1. 在 CSS 补 `text-selection-only` 规则隐藏文字选区的翻转手柄（对齐 coordinate-selection-only 的做法），并在 `flipHorizontal()` 开头对 `selectionType === 'text'` 直接 return（不置脏）；
  2. 或实现文字镜像（渲染时 scaleX(-1)），工作量大收益小。
- **验证建议**：参照 `tests/selection-*.test.js` 风格断言 text 选区下 flip 手柄隐藏。

### C2. 单个文字选区的上/下边中点缩放手柄行为错误：拖"上"变成平移文字，拖"下"无效

- **严重度**：低
- **验证方式**：静态确认
- **位置**：`js/selection.js` — `resize(e)` 中文字分支只用宽度比 `newBounds.width / startBounds.width` 推 fontSize；`'top'` 手柄 width 不变→字号不变但 `textObj.y = newBounds.y` 跟随指针（=平移）；`'bottom'` 分支什么都不改（框短暂跟手后回弹）。
- **建议修法**（推荐 1）：
  1. 对 text 选区隐藏四个边中点手柄，只保留四角等比缩放（改 `showControls` 中手柄可见性，与 C1 一起做）；
  2. 或垂直手柄按高度比缩放字号：`scale = newBounds.height / startBounds.height`。
- **验证建议**：手测四角缩放正常、边中点手柄不出现。

### C3. 轻点选框（未移动）即被记为"有修改"；坐标点选区每次轻点当场写入一条历史

- **严重度**：低（稀释 50 条历史上限、"撤销要按好几下"）
- **验证方式**：静态确认
- **位置**：`js/selection.js` — `startDrag` 在 pointerdown 即置 `isDragging = true`（无移动阈值）；`stopDrag()` 只要 `isDragging` 为真就 `hasUnsavedChanges = true`，坐标选区分支还直接 `commitCoordinateSelectionChange(true)` → `saveHistory()`。
- **复现场景**：触屏用户习惯性轻点选框确认 → 什么都没改却生成历史条目（坐标点选区当场入栈、普通选区在点 Done 时入栈）→ 撤销按钮"按一下没反应"。
- **建议修法**：引入移动阈值：`startDrag` 记录起点但先置 `isDragPending = true`；`drag()` 中位移超过约 3px（除以画布缩放）才真正置 `isDragging = true`；`stopDrag()` 只在真实拖动发生时置脏/commit。注意与本轮新增的 `activePointerId` 手势过滤逻辑（`startDrag/endGesture`）协同——pending 状态也要在 `endGesture` 里清理。
- **验证建议**：单测：pointerdown+pointerup 原地，断言 `hasUnsavedChanges === false` 且未调用 saveHistory。

### C4. 计分板"关闭重开"与"刷新重开"的恢复语义互相矛盾（需产品决策）

- **严重度**：低
- **验证方式**：静态确认（`tests/scoreboard.test.js` 只钉住了"并存实例互不继承"，未覆盖重开语义）
- **位置**：`js/modules/scoreboard.js` — 按 `scoreboard_data_${id}` 加载（legacy 键仅 id===1）；`create()` 用**只增不减**的 `nextId`；入口 `js/modules/ui-listeners-runtime.js`（约 471 行）
- **复现场景**：同一节课内关闭计分板再点开 → 新实例 id=2 → 读 `scoreboard_data_2` 为空 → 分数"丢了"；但刷新页面再开，id 回到 1 → 上次的旧分数又"复活"。两个方向都违反直觉。
- **建议修法**（先做产品决策再动代码）：
  - 方案 A（重开=恢复）：`create()` 复用已释放的最小 id（维护活跃 id 集合），"重开第一个计分板"总能拿回 `scoreboard_data_1`，保留并存隔离；
  - 方案 B（关闭=清零）：destroy 时删除对应存储键，语义统一为"关了就没了"。
  - 注意随机点名器本轮已做成"单配置键持久化"（`randomPickerConfig`），若希望两个组件语义一致，计分板选方案 A 更接近。
- **验证建议**：无论哪个方案，把选定语义写进 `tests/scoreboard.test.js`。

---

## D. 部署 / 资产 / 工程卫生

### D1. manifest.json 只有一条 SVG 图标，旧 Chromium 内核上 PWA 安装条件不满足

- **严重度**：低-中（取决于装机内核占比；国内一体机旧 WebView 常见）
- **验证方式**：静态确认
- **位置**：`manifest.json` — icons 数组仅 `img/icon.svg`（`"sizes": "192x192 512x512"` 合并声明），无 PNG、无 maskable
- **机制**：Chrome 93 之前不接受 SVG manifest icon → 安装条件不满足 → `beforeinstallprompt` 不触发 → pwa-manager 的"安装应用"按钮（默认 display:none，仅该事件后显示）永远不出现。
- **建议修法**：
  1. 从 `img/icon.svg` 导出 192×192 与 512×512 PNG（构建脚本可用 sharp/resvg 一次性生成，或手工导出后入库）；
  2. manifest icons 增加两条 PNG + 一条 `"purpose": "maskable"`；
  3. 把新 PNG 加进 `sw.js` 的预缓存清单（有 `tests/sw-essential-assets.test.js` 钉清单，记得同步）。
- **验证建议**：Lighthouse PWA 审计通过 installability 项。

### D2. `announcements.json` 是死配置：编辑它发公告永远不生效

- **严重度**：低（维护者陷阱，非用户可见故障）
- **验证方式**：静态确认（全仓库仅 `scripts/build-static.js` 复制它、`server.js` 白名单它，无任何 fetch；实际公告内容来自 `js/features/announcement/announcement-manager.js` 读 `i18n.t('settings.announcement.content')`，即 locale 文件）
- **背景**：git 历史（8dabc75）显示该文件曾是公告数据源，后被 i18n 方案替代成为遗留。
- **建议修法**（二选一）：
  1. **删除**：删 `announcements.json` + `build-static.js` 的复制条目 + `server.js` 白名单条目（改完跑 `tests/server-static-paths.test.js`）；
  2. **复活**：AnnouncementManager 改为 networkFirst fetch 该文件（好处：发公告不用发版），但要处理离线降级回 i18n 文案。
- **注意**：不确定线上是否有外部东西直接请求 `/announcements.json`，删除前可在服务器日志/部署平台确认一下。

### D3. 非核心语言缺 90–117 个键，UI 大面积回退英文；locale 测试只检查 2 个键

- **严重度**：低（不崩，观感问题；zh-TW 用户会看到简体回退）
- **验证方式**：静态确认（审查时以 zh-CN 801 键为基准统计：fr-FR/es-ES 缺 117、de-DE 缺 106、ja-JP/ko-KR 缺 92、zh-TW 缺 34；缺失键含 `export.selectAtLeastOnePage`、`timer.customSoundQuotaExceeded`、`settings.display.showToolbarText` 等）
- **位置**：`js/locales/*.js` 与 `js/locales/overrides.js`；测试缺口在 `tests/locale-files.test.js`（只断言 `common.keepCentered` 与 `gestures.pinchZoom` 两个键，不含键 parity、不含 help/ 子目录）
- **建议修法**（分两步）：
  1. **先加测试再补译文**：`locale-files.test.js` 增加"以 zh-CN 为基准的键 parity 断言 + `{placeholder}` 占位符一致性断言"，初期可对已知缺失键维护一个 allowlist 让 CI 先绿，防止缺口继续扩大；
  2. 逐语言补齐译文（可分批：先 zh-TW 34 个，再 ja/ko，最后 de/fr/es）。注意 fr/es 现有文案刻意不带重音符号（如 `Rango numerico`），补译时保持该风格。
- **提醒**：本轮已新增的键：`randomPicker.rangeMin/rangeMax`（8 语言已补齐）、`errors.sessionSaveFailed`（**只补了 zh-CN 与 en-US**，其余 6 语言靠回退链——补译时记得带上）。

### D4. 死代码副本与"自测自"的失效测试清理

- **严重度**：低（当前零线上影响；风险是未来误接回旧副本导致双实例/旧逻辑复活）
- **验证方式**：静态确认（已核对实际加载链：`index.html` → `js/app/bootstrap.js` → `create-app.js` 注册的是 infra/features 版；`js/app/legacy-manifest.js` 不含以下 modules 旧拷贝）
- **待删清单**：
  | 文件 | 状态 | 备注 |
  |---|---|---|
  | `js/modules/gif-manager.js` | 死代码且已漂移 | 在用的是 `js/features/media/gif-manager.js`（触屏控件常显、`move_to(0)` 重播等只在 features 版有）；本轮的 GIF pause 修复只改了在用版 |
  | `js/modules/rich-text-parser.js` | 死代码 | 在用的是 `js/infra/rich-text-parser.js`，逻辑等价但已是两份 |
  | `js/text-insertion.js` | 死代码 | `TextInsertionManager` 全库零引用、未挂 window，坐标换算还是旧公式 |
  | `js/modules/dialog-manager.js` | 死代码且缺能力 | 在用的 `js/infra/dialog-manager.js` 有键盘支持/焦点还原/showPrompt；旧版若被接回，`showPrompt` 调用点会抛 TypeError |
  | `js/modules/toast-manager.js` | 死代码 | 在用的是 `js/features/toast/toast-manager.js`（含去重） |
  | `js/stroke-controls.js` | 整模块不可达 | `strokeControls.showControls()` 无任何调用点，`isActive` 恒 false，但仍在 document 上注册 5 个全局监听并注入 DOM；其内部 `redrawCanvas()`（丢 stampedImages/文字、不重置 DPR transform）与 `updateControlBox()`（双重旋转变换）一旦启用立即成缺陷。**要么删除，要么修复后再接入** |
  | `js/app/critical-modules.js`、`js/app/performance-config.js` | 无消费者 | 连同引用它们的配置一并清 |
- **失效测试**：`tests/rich-text-parser.test.js` 的两个 loader **读的是同一个 infra 文件**（第 7 与 18 行附近），"双副本一致性"测试形同虚设——删除副本后应改为单副本测试，或修正第二个 loader 指向真实第二文件。
- **修复注意**：删除前 grep 每个文件名 + 类名（含 `sw.js` 预缓存清单、`legacy-manifest.js`、`index.html`），删完跑 `npm run test:full`（其中 sw-essential-assets 测试会抓到清单里引用了不存在的文件）。

### D5. browser-check 双实现已行为分叉

- **严重度**：低（当前由 ES5 版兜底，无线上故障）
- **验证方式**：静态确认
- **位置**：`js/infra/browser-check.js`（ESM 版：**没有** `modernSyntax` UA 检查，且自身用了可选链等新语法——在旧内核上它自己就会 SyntaxError）vs `js/modules/browser-check.js`（ES5 版：多出 Chrome<80/Firefox<74/Safari<13.1 的语法级警告）。两处都在跑：`index.html`（约 2304 行）先跑 ES5 版，`create-app.js` 再跑 infra 版（靠 overlay 去重）。
- **风险**：未来只改 modules 版或调整 index.html 加载顺序时，会悄悄失去对旧内核的语法级警告。
- **建议修法**：检查逻辑单一来源——让 infra 版薄封装 ES5 版（import 或直接读全局），或删掉 infra 版的重复 init；保留 `tests/browser-check-no-eval.test.js`、`tests/create-app-browser-check-order.test.js` 并按新结构更新。

---

## E. 审查覆盖缺口（下次审查补上）

### E1. `js/background.js`（约 3250 行）未做逐行审查

- **背景**：该文件体量导致两个审查代理先后上下文超限中断。最终采用的替代覆盖：
  - GIF 背景生命周期 → 已由插入媒体组覆盖并修复（实例泄漏）；
  - 分页背景恢复/`_backgroundLoadToken` 竞态 → 已由分页组核实无问题；
  - innerHTML 转义、存储批量写、监听重复注册 → 已做定向模式扫描，未见问题（转义均有现成测试：`background-*-escaping.test.js`）。
- **未覆盖区域**：图案渲染数学（网格/点阵/坐标系绘制的对齐与 DPR 处理）、自定义背景图变换（`imageTransform` 缩放/旋转/翻转路径）、`background-ui-runtime.js` 的 UI 状态同步细节。
- **建议**：下次专项审查时把 background.js 按功能段拆给多个小任务（每段 ≤800 行），或先做"函数清单 + 调用图"再定向深读；也可以借这次机会把它拆成 `background/` 目录下的多个模块（渲染、存储、GIF、变换），一并降低后续维护成本。

---

## 附：修复时的通用注意事项

1. **触屏优先**：任何指针/手势相关修复，同时考虑 pointer events 与 touch events 双路径（本代码库两者常常都绑）。本轮已建立的两个可复用模式：
   - 手势归属：`selection.js` 的 `activePointerId` + `endGesture`（按 pointerId 过滤驱动/结束）；
   - touchstart preventDefault 会吞掉合成 click：凡靠 click 工作的按钮，必须在 preventDefault 之前放行（参照 `insert-image.js` 的 `handleDragStart` 与 `timer.js` 的双触检测）。
2. **场景恢复期间不要重绘旧场景**：需要在场景数组替换前清选区时，用 `clearSelection({ skipRedraw: true })`（本轮新增的约定）。
3. **保存守卫**：会触发持久化的新代码要考虑三个门：`isClearingLocalData`、`isRecoveryFlowBlockingSaves()`（恢复流程期间）、以及是否需要 `clearTimeout(this.saveTimeout)`。
4. **测试基线**：改动后跑 `npm test`（核心 35 项）与 `npm run test:full`（82 项，含真实 Chromium 冒烟）。涉及 SW 清单/预缓存的改动会被 `sw-essential-assets` 抓到。
