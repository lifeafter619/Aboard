<template>
  <div class="toolbar" :style="{ height: `${toolbarSize}px` }">
    <!-- 撤销 -->
    <button
      class="tool-btn"
      :class="{ disabled: !canUndo }"
      @click="$emit('undo')"
      title="撤销 (Ctrl+Z)"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 7v6h6"></path>
        <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"></path>
      </svg>
      <span>撤销</span>
    </button>

    <!-- 重做 -->
    <button
      class="tool-btn"
      :class="{ disabled: !canRedo }"
      @click="$emit('redo')"
      title="重做 (Ctrl+Y)"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 7v6h-6"></path>
        <path d="M3 17a9 9 0 019-9 9 9 0 016 2.3l3 2.7"></path>
      </svg>
      <span>重做</span>
    </button>

    <!-- 笔 -->
    <button
      class="tool-btn"
      :class="{ active: currentTool === 'pen' }"
      @click="$emit('tool-change', 'pen')"
      title="笔"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
        <path d="M2 2l7.586 7.586"></path>
        <circle cx="11" cy="11" r="2"></circle>
      </svg>
      <span>笔</span>
    </button>

    <!-- 移动 -->
    <button
      class="tool-btn"
      :class="{ active: currentTool === 'pan' }"
      @click="$emit('tool-change', 'pan')"
      title="移动画布 (Shift+拖动)"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"></path>
        <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"></path>
        <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"></path>
        <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"></path>
      </svg>
      <span>移动</span>
    </button>

    <!-- 橡皮擦 -->
    <button
      class="tool-btn"
      :class="{ active: currentTool === 'eraser' }"
      @click="$emit('tool-change', 'eraser')"
      title="橡皮擦"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M20 20H7L3 16 12 7 17 12"></path>
        <path d="M7 20l5-5"></path>
      </svg>
      <span>橡皮</span>
    </button>

    <!-- 选择 -->
    <button
      class="tool-btn"
      :class="{ active: currentTool === 'select' }"
      @click="$emit('tool-change', 'select')"
      title="选择"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"></path>
        <path d="M13 13l6 6"></path>
      </svg>
      <span>选择</span>
    </button>

    <!-- 形状 -->
    <button
      class="tool-btn"
      :class="{ active: currentTool === 'shape' }"
      @click="$emit('tool-change', 'shape')"
      title="形状"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <circle cx="12" cy="12" r="4"></circle>
      </svg>
      <span>形状</span>
    </button>

    <!-- 文本 -->
    <button
      class="tool-btn"
      :class="{ active: currentTool === 'text' }"
      @click="$emit('tool-change', 'text')"
      title="文本"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="4 7 4 4 20 4 20 7"></polyline>
        <line x1="9" y1="20" x2="15" y2="20"></line>
        <line x1="12" y1="4" x2="12" y2="20"></line>
      </svg>
      <span>文本</span>
    </button>

    <!-- 背景 -->
    <button
      class="tool-btn"
      :class="{ active: currentTool === 'background' }"
      @click="$emit('tool-change', 'background')"
      title="背景"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <circle cx="8.5" cy="8.5" r="1.5"></circle>
        <polyline points="21 15 16 10 5 21"></polyline>
      </svg>
      <span>背景</span>
    </button>

    <!-- 计时器 -->
    <button
      class="tool-btn"
      :class="{ active: currentTool === 'timer' }"
      @click="$emit('tool-change', 'timer')"
      title="计时器"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="13" r="8"></circle>
        <polyline points="12 9 12 13 15 15"></polyline>
        <path d="M16.51 17.35l-.35 3.83a2 2 0 01-2 1.82H9.83a2 2 0 01-2-1.82l-.35-3.83m.01-10.7l.35-3.83A2 2 0 019.83 1h4.35a2 2 0 012 1.82l.35 3.83"></path>
      </svg>
      <span>计时</span>
    </button>

    <!-- 时间显示 -->
    <button
      class="tool-btn"
      :class="{ active: currentTool === 'time-display' }"
      @click="$emit('tool-change', 'time-display')"
      title="时间显示"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <polyline points="12 6 12 12 16 14"></polyline>
      </svg>
      <span>时间</span>
    </button>

    <!-- 清空 -->
    <button
      class="tool-btn"
      @click="$emit('clear')"
      title="清空画布"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
      </svg>
      <span>清空</span>
    </button>

    <!-- 设置 -->
    <button
      class="tool-btn"
      @click="$emit('settings')"
      title="设置"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M12 1v6m0 6v6M5.6 5.6l4.2 4.2m4.2 4.2l4.2 4.2M1 12h6m6 0h6M5.6 18.4l4.2-4.2m4.2-4.2l4.2-4.2"></path>
      </svg>
      <span>设置</span>
    </button>
  </div>
</template>

<script setup>
/**
 * 工具栏组件
 * 显示所有工具按钮并处理工具切换
 */

const props = defineProps({
  currentTool: {
    type: String,
    required: true
  },
  toolbarSize: {
    type: Number,
    default: 40
  },
  canUndo: {
    type: Boolean,
    default: false
  },
  canRedo: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'tool-change',
  'clear',
  'undo',
  'redo',
  'settings'
])
</script>

<style scoped>
.toolbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 4px;
  padding: 8px;
  z-index: 1000;
}

.tool-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 6px 12px;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  color: #333;
}

.tool-btn:hover {
  background: rgba(0, 0, 0, 0.05);
}

.tool-btn.active {
  background: var(--theme-color, #007AFF);
  color: white;
}

.tool-btn.disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.tool-btn span {
  font-size: 11px;
}

.tool-btn svg {
  width: 20px;
  height: 20px;
}
</style>
