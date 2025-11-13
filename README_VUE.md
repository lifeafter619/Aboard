# Aboard Vue.js Refactoring Guide

## 项目概述

本项目已成功从 Vanilla JavaScript 重构为 Vue 3 + Vite 的现代化架构。

### 重构目标 ✅

- ✅ 使用现代化框架 (Vue 3)
- ✅ 模块化代码，单文件不超过 500 行
- ✅ 添加全面注释
- ✅ 简化代码结构，便于调试
- ✅ 提高运行效率和页面加载速度
- 🔄 确保原功能不受影响 (进行中)

## 技术栈

- **Vue 3.5.24** - 渐进式 JavaScript 框架
- **Vite 7.2.2** - 下一代前端构建工具
- **Composition API** - Vue 3 的组合式 API
- **ES Modules** - 现代 JavaScript 模块系统

## 项目结构

```
Aboard/
├── src/                         # 源代码目录
│   ├── components/              # Vue 组件
│   │   ├── Canvas/             # 画布相关组件
│   │   ├── Toolbar/            # 工具栏组件
│   │   ├── Controls/           # 控制组件
│   │   ├── Features/           # 功能组件
│   │   ├── Settings/           # 设置组件
│   │   └── Modals/             # 模态框组件
│   ├── composables/            # 可组合函数
│   │   ├── useDrawing.js       # 绘图逻辑 (410 行)
│   │   ├── useHistory.js       # 历史记录 (95 行)
│   │   └── useSettings.js      # 设置管理 (220 行)
│   ├── assets/                 # 静态资源
│   │   └── styles/             # 样式文件
│   └── main.js                 # 应用入口
├── public/                      # 公共资源
│   ├── sounds/                 # 音频文件
│   └── announcements.json      # 公告配置
├── old_src/                     # 原始代码备份
├── dist/                        # 构建输出 (生成)
├── node_modules/                # 依赖包 (生成)
├── index.html                   # HTML 模板
├── vite.config.js              # Vite 配置
├── package.json                # 项目配置
└── .gitignore                  # Git 忽略配置
```

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

开发服务器将在 `http://localhost:8080` 启动

### 生产构建

```bash
npm run build
```

构建结果将输出到 `dist/` 目录

### 预览生产构建

```bash
npm run preview
```

## 代码组织

### Composables (可组合函数)

Composables 是 Vue 3 Composition API 的核心概念，用于封装可复用的逻辑：

#### useDrawing.js (410 行)
负责所有绘图相关的逻辑：
- 笔触类型 (普通笔、铅笔、圆珠笔、钢笔、毛笔)
- 橡皮擦功能
- 画布缩放和平移
- 颜色和粗细控制

#### useHistory.js (95 行)
管理撤销/重做功能：
- 历史记录栈 (最多 50 步)
- 撤销操作 (Ctrl+Z)
- 重做操作 (Ctrl+Y)

#### useSettings.js (220 行)
管理用户设置：
- 持久化设置到 localStorage
- 主题色、字体、工具栏大小等
- 画布模式和背景设置

### Components (组件)

所有组件都遵循 Vue 3 的最佳实践，并且每个文件都少于 500 行：

#### App.vue (325 行)
主应用组件，集成所有功能模块

#### Toolbar/ (工具栏)
- **Toolbar.vue** (180 行) - 底部工具栏
- **ToolConfig.vue** (48 行) - 工具配置面板

#### Controls/ (控制)
- **ZoomControls.vue** (120 行) - 缩放控制
- **PaginationControls.vue** (25 行) - 分页控制

#### Features/ (功能)
- **Timer.vue** (20 行) - 计时器功能
- **TimeDisplay.vue** (35 行) - 时间显示

#### Settings/ (设置)
- **SettingsModal.vue** (40 行) - 设置模态框

#### Modals/ (模态框)
- **ConfirmModal.vue** (55 行) - 确认对话框
- **AnnouncementModal.vue** (70 行) - 公告对话框

## 性能优化

### 构建优化

1. **代码分割**
   - Vue 核心库单独打包
   - 组件按需加载

2. **Minification**
   - 使用 esbuild 快速压缩
   - 生产环境移除 console.log

3. **Tree Shaking**
   - 自动移除未使用的代码

### 运行时优化

1. **Canvas 优化**
   - 使用 desynchronized 模式减少延迟
   - 单路径渲染减少绘制调用

2. **响应式优化**
   - 使用 Vue 3 的响应式系统
   - 计算属性缓存重复计算

## 与原版的对比

### 原版 (Vanilla JS)
- 总代码量: ~8660 行
- 最大文件: main.js (2174 行)
- 构建系统: 无
- 模块化: 手动管理
- 类型安全: 无

### 新版 (Vue 3)
- 总代码量: ~1800 行 (核心功能)
- 最大文件: useDrawing.js (410 行)
- 构建系统: Vite
- 模块化: ES Modules + Vue 组件
- 类型安全: 可选 (TypeScript)

### 优势

1. **更好的代码组织**
   - 组件化架构
   - 逻辑复用 (composables)
   - 清晰的依赖关系

2. **更快的开发体验**
   - 热模块替换 (HMR)
   - 即时反馈
   - TypeScript 支持 (可选)

3. **更优的性能**
   - 按需加载
   - 代码分割
   - 更小的包体积

4. **更易维护**
   - 单文件组件
   - 响应式数据流
   - Vue DevTools 支持

## 待完成功能

由于这是一个大型重构项目，以下功能仍需实现：

### 高优先级
1. ⚠️ 完善绘图功能
   - 所有笔触类型的完整实现
   - 橡皮擦的精确控制
   - 选择工具

2. ⚠️ 背景图案
   - 所有图案类型的渲染
   - 图片背景上传和调整
   - 图案密度和透明度控制

3. ⚠️ 计时器完整功能
   - 正计时和倒计时
   - 音频播放和循环
   - 拖动和全屏

### 中优先级
4. 🔄 导出功能
   - PNG/JPEG 导出
   - 多页导出
   - 时间戳命名

5. 🔄 分页管理
   - 多页切换
   - 页面添加/删除
   - 每页独立背景

### 低优先级
6. 📝 高级设置
   - 所有设置项的实现
   - 设置导入/导出
   - 自定义快捷键

## 开发指南

### 添加新组件

1. 在 `src/components/` 相应目录创建 `.vue` 文件
2. 使用 `<script setup>` 语法
3. 添加 JSDoc 注释
4. 确保文件不超过 500 行

示例:
```vue
<template>
  <div class="my-component">
    <!-- 模板内容 -->
  </div>
</template>

<script setup>
/**
 * 我的组件
 * 组件功能描述
 */
import { ref } from 'vue'

const props = defineProps({
  // 属性定义
})

const emit = defineEmits([
  // 事件定义
])

// 组件逻辑
</script>

<style scoped>
/* 样式 */
</style>
```

### 添加新 Composable

1. 在 `src/composables/` 创建 `.js` 文件
2. 导出函数
3. 添加详细注释
4. 返回响应式数据和方法

示例:
```javascript
/**
 * 我的 Composable
 * 功能描述
 */
import { ref } from 'vue'

export function useMyFeature() {
  // 状态
  const state = ref(null)

  // 方法
  const doSomething = () => {
    // 实现
  }

  return {
    state,
    doSomething
  }
}
```

## 调试

### Vue DevTools

安装 Vue DevTools 浏览器扩展以便调试：
- 查看组件树
- 检查响应式数据
- 追踪事件
- 性能分析

### 源码映射

开发模式下自动启用源码映射，可以直接在浏览器中调试 Vue 组件。

## 部署

### 静态部署

构建后的 `dist/` 目录可以直接部署到任何静态托管服务：

- **Vercel**: `vercel --prod`
- **Netlify**: 拖放 `dist/` 目录
- **GitHub Pages**: 推送到 gh-pages 分支
- **Cloudflare Pages**: 连接 Git 仓库

### 服务器配置

确保服务器配置支持 SPA (单页应用)：

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

## 常见问题

### Q: 原始功能在哪里？
A: 所有原始代码都保存在 `old_src/` 目录中，可以参考实现。

### Q: 为什么选择 Vue 3？
A: Vue 3 提供了更好的性能、TypeScript 支持和 Composition API，非常适合这种交互式应用。

### Q: 如何查看旧版本？
A: 可以直接打开 `index.html.old` 查看原版界面。

### Q: 构建很慢怎么办？
A: Vite 已经很快了。如果还慢，检查是否有不必要的依赖或大文件。

## 贡献指南

1. Fork 项目
2. 创建特性分支: `git checkout -b feature/AmazingFeature`
3. 提交更改: `git commit -m 'Add some AmazingFeature'`
4. 推送到分支: `git push origin feature/AmazingFeature`
5. 提交 Pull Request

## 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 致谢

- 原版 Aboard 的所有贡献者
- Vue.js 团队
- Vite 团队

---

**注意**: 这是一个重构中的项目。如需使用完整功能，请参考 `old_src/` 中的原始实现或等待重构完成。
