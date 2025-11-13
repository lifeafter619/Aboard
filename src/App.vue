<template>
  <div id="aboard-app" class="aboard-container">
    <!-- 缩放控制 -->
    <ZoomControls
      v-if="settings.showZoomControls"
      :scale="canvasScale"
      :position="settings.controlPosition"
      @zoom-in="handleZoomIn"
      @zoom-out="handleZoomOut"
      @zoom-change="handleZoomChange"
      @toggle-fullscreen="toggleFullscreen"
      @export="handleExport"
    />

    <!-- 分页控制 -->
    <PaginationControls
      v-if="!settings.canvasMode === 'infinite'"
      :current-page="currentPage"
      :total-pages="totalPages"
      :position="settings.controlPosition"
      @page-change="handlePageChange"
      @add-page="addPage"
    />

    <!-- 背景画布层 -->
    <canvas
      ref="bgCanvas"
      class="background-canvas"
      :style="canvasStyle"
    />

    <!-- 主绘图画布 -->
    <canvas
      ref="mainCanvas"
      class="drawing-canvas"
      :style="canvasStyle"
      @mousedown="handleMouseDown"
      @mousemove="handleMouseMove"
      @mouseup="handleMouseUp"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
      @wheel="handleWheel"
    />

    <!-- 橡皮擦光标 -->
    <div
      v-if="currentTool === 'eraser' && isDrawing"
      ref="eraserCursor"
      class="eraser-cursor"
      :style="eraserCursorStyle"
    />

    <!-- 底部工具栏 -->
    <Toolbar
      :current-tool="currentTool"
      :toolbar-size="settings.toolbarSize"
      @tool-change="handleToolChange"
      @clear="handleClear"
      @undo="handleUndo"
      @redo="handleRedo"
      @settings="showSettings = true"
    />

    <!-- 工具配置面板 -->
    <ToolConfig
      v-if="showConfig"
      :tool="currentTool"
      :color="currentColor"
      :pen-size="penSize"
      :pen-type="penType"
      :eraser-size="eraserSize"
      :eraser-shape="eraserShape"
      :bg-color="bgColor"
      :bg-pattern="bgPattern"
      @update:color="currentColor = $event"
      @update:pen-size="penSize = $event"
      @update:pen-type="penType = $event"
      @update:eraser-size="eraserSize = $event"
      @update:eraser-shape="eraserShape = $event"
      @update:bg-color="bgColor = $event"
      @update:bg-pattern="bgPattern = $event"
      @close="showConfig = false"
    />

    <!-- 设置模态框 -->
    <SettingsModal
      v-if="showSettings"
      :settings="settings"
      @update:settings="updateSettings"
      @close="showSettings = false"
    />

    <!-- 计时器功能 -->
    <Timer
      v-for="timer in timers"
      :key="timer.id"
      :timer="timer"
      @close="removeTimer(timer.id)"
    />

    <!-- 时间显示 -->
    <TimeDisplay
      v-if="settings.showTimeDisplay"
      :settings="settings"
    />

    <!-- 其他模态框 -->
    <ConfirmModal
      v-if="showConfirm"
      :message="confirmMessage"
      @confirm="handleConfirm"
      @cancel="showConfirm = false"
    />

    <AnnouncementModal
      v-if="showAnnouncement"
      :content="announcementContent"
      @close="showAnnouncement = false"
      @no-show="handleNoShowAnnouncement"
    />
  </div>
</template>

<script setup>
/**
 * Aboard 主应用组件
 * 集成所有功能模块并协调交互
 */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useDrawing } from './composables/useDrawing'
import { useHistory } from './composables/useHistory'
import { useSettings } from './composables/useSettings'

// 导入组件
import ZoomControls from './components/Controls/ZoomControls.vue'
import PaginationControls from './components/Controls/PaginationControls.vue'
import Toolbar from './components/Toolbar/Toolbar.vue'
import ToolConfig from './components/Toolbar/ToolConfig.vue'
import SettingsModal from './components/Settings/SettingsModal.vue'
import Timer from './components/Features/Timer.vue'
import TimeDisplay from './components/Features/TimeDisplay.vue'
import ConfirmModal from './components/Modals/ConfirmModal.vue'
import AnnouncementModal from './components/Modals/AnnouncementModal.vue'

// ========== 画布引用 ==========
const mainCanvas = ref(null)
const bgCanvas = ref(null)
const mainCtx = ref(null)
const bgCtx = ref(null)

// ========== Composables ==========
const { settings, updateSetting, updateSettings } = useSettings()

const {
  currentColor,
  penSize,
  penType,
  eraserSize,
  eraserShape,
  currentTool,
  canvasScale,
  panOffset,
  isDrawing,
  startDrawing,
  draw,
  endDrawing,
  startPan,
  pan,
  endPan,
  zoom,
  setTool,
  setColor,
  setPenSize,
  setPenType,
  setEraserSize,
  setEraserShape,
  clearCanvas,
  getPosition
} = useDrawing(mainCanvas, mainCtx)

const {
  canUndo,
  canRedo,
  saveState,
  undo,
  redo,
  clearHistory
} = useHistory(mainCanvas, mainCtx)

// ========== 状态管理 ==========
const showConfig = ref(false)
const showSettings = ref(false)
const showConfirm = ref(false)
const confirmMessage = ref('')
const confirmCallback = ref(null)
const showAnnouncement = ref(false)
const announcementContent = ref('')

// 背景设置
const bgColor = ref('#ffffff')
const bgPattern = ref('blank')

// 分页
const currentPage = ref(1)
const totalPages = ref(1)
const pages = ref([])

// 计时器
const timers = ref([])

// ========== 计算属性 ==========
const canvasStyle = computed(() => ({
  transform: `scale(${canvasScale.value}) translate(${panOffset.value.x}px, ${panOffset.value.y}px)`,
  transformOrigin: '0 0'
}))

const eraserCursorStyle = computed(() => ({
  width: `${eraserSize.value}px`,
  height: `${eraserSize.value}px`,
  borderRadius: eraserShape.value === 'circle' ? '50%' : '0'
}))

// ========== 生命周期 ==========
onMounted(() => {
  initCanvas()
  setupEventListeners()
  loadAnnouncement()
})

onUnmounted(() => {
  removeEventListeners()
})

// ========== 初始化 ==========
/**
 * 初始化画布
 */
const initCanvas = () => {
  if (!mainCanvas.value || !bgCanvas.value) return

  // 获取上下文
  mainCtx.value = mainCanvas.value.getContext('2d', {
    desynchronized: true,
    alpha: true
  })
  bgCtx.value = bgCanvas.value.getContext('2d')

  // 调整画布大小
  resizeCanvas()

  // 保存初始状态
  saveState()
}

/**
 * 调整画布大小
 */
const resizeCanvas = () => {
  if (!mainCanvas.value || !bgCanvas.value) return

  const width = window.innerWidth
  const height = window.innerHeight

  // 设置画布尺寸
  mainCanvas.value.width = width
  mainCanvas.value.height = height
  bgCanvas.value.width = width
  bgCanvas.value.height = height

  // 重新绘制背景
  drawBackground()
}

/**
 * 绘制背景
 */
const drawBackground = () => {
  if (!bgCtx.value || !bgCanvas.value) return

  // 清空背景
  bgCtx.value.clearRect(0, 0, bgCanvas.value.width, bgCanvas.value.height)

  // 填充背景颜色
  bgCtx.value.fillStyle = bgColor.value
  bgCtx.value.fillRect(0, 0, bgCanvas.value.width, bgCanvas.value.height)

  // 根据图案类型绘制背景图案
  drawBackgroundPattern()
}

/**
 * 绘制背景图案
 */
const drawBackgroundPattern = () => {
  // 这里简化处理，实际应该根据bgPattern绘制不同图案
  // 详细实现可以参考原始的background.js
}

// ========== 事件处理 ==========
const handleMouseDown = (e) => {
  e.preventDefault()
  const pos = getPosition(e)

  if (currentTool.value === 'pan') {
    startPan(pos)
  } else {
    startDrawing(pos)
  }
}

const handleMouseMove = (e) => {
  e.preventDefault()
  const pos = getPosition(e)

  if (currentTool.value === 'pan') {
    pan(pos)
  } else {
    draw(pos)
  }
}

const handleMouseUp = (e) => {
  e.preventDefault()

  if (currentTool.value === 'pan') {
    endPan()
  } else {
    endDrawing()
    saveState()
  }
}

const handleTouchStart = (e) => {
  if (e.touches.length === 1) {
    const touch = e.touches[0]
    handleMouseDown({ clientX: touch.clientX, clientY: touch.clientY, preventDefault: () => {} })
  }
}

const handleTouchMove = (e) => {
  if (e.touches.length === 1) {
    const touch = e.touches[0]
    handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY, preventDefault: () => {} })
  }
}

const handleTouchEnd = (e) => {
  handleMouseUp({ preventDefault: () => {} })
}

const handleWheel = (e) => {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    const pos = getPosition(e)
    zoom(delta, pos)
  }
}

const handleToolChange = (tool) => {
  setTool(tool)
  if (tool === 'pen' || tool === 'eraser' || tool === 'background') {
    showConfig.value = true
  } else {
    showConfig.value = false
  }
}

const handleClear = () => {
  confirmMessage.value = '确定要清空画布吗？此操作无法撤销。'
  confirmCallback.value = () => {
    clearCanvas()
    clearHistory()
    saveState()
  }
  showConfirm.value = true
}

const handleConfirm = () => {
  if (confirmCallback.value) {
    confirmCallback.value()
  }
  showConfirm.value = false
  confirmCallback.value = null
}

const handleUndo = () => {
  undo()
}

const handleRedo = () => {
  redo()
}

const handleZoomIn = () => {
  zoom(0.1)
}

const handleZoomOut = () => {
  zoom(-0.1)
}

const handleZoomChange = (value) => {
  const newScale = parseFloat(value) / 100
  canvasScale.value = newScale
}

const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen()
  } else {
    document.exitFullscreen()
  }
}

const handleExport = () => {
  // 导出功能实现
  console.log('导出画布')
}

const handlePageChange = (page) => {
  currentPage.value = page
}

const addPage = () => {
  totalPages.value++
}

const removeTimer = (id) => {
  timers.value = timers.value.filter(t => t.id !== id)
}

const handleNoShowAnnouncement = () => {
  localStorage.setItem('hideAnnouncement', 'true')
  showAnnouncement.value = false
}

const loadAnnouncement = async () => {
  if (localStorage.getItem('hideAnnouncement') === 'true') return

  try {
    const response = await fetch('/announcements.json')
    const data = await response.json()
    if (data.content) {
      announcementContent.value = data.content
      showAnnouncement.value = true
    }
  } catch (error) {
    console.error('加载公告失败:', error)
  }
}

// ========== 事件监听器设置 ==========
const setupEventListeners = () => {
  window.addEventListener('resize', resizeCanvas)
  document.addEventListener('keydown', handleKeyDown)
}

const removeEventListeners = () => {
  window.removeEventListener('resize', resizeCanvas)
  document.removeEventListener('keydown', handleKeyDown)
}

const handleKeyDown = (e) => {
  // Ctrl+Z 撤销
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
    e.preventDefault()
    handleUndo()
  }
  // Ctrl+Y 或 Ctrl+Shift+Z 重做
  else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
    e.preventDefault()
    handleRedo()
  }
}

// ========== 监听背景变化 ==========
watch([bgColor, bgPattern], () => {
  drawBackground()
})
</script>

<style scoped>
.aboard-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #f5f5f5;
}

.background-canvas,
.drawing-canvas {
  position: absolute;
  top: 0;
  left: 0;
  cursor: crosshair;
}

.background-canvas {
  z-index: 1;
}

.drawing-canvas {
  z-index: 2;
}

.eraser-cursor {
  position: fixed;
  border: 2px solid #ff0000;
  pointer-events: none;
  z-index: 1000;
}
</style>
