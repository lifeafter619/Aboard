<template>
  <div id="aboard-app" class="aboard-container">
    <!-- 缩放控制 -->
    <ZoomControls
      v-if="settings.showZoomControls"
      :scale="1.0"
      :position="settings.controlPosition"
      @zoom-in="handleZoomIn"
      @zoom-out="handleZoomOut"
      @zoom-change="handleZoomChange"
      @toggle-fullscreen="toggleFullscreen"
      @export="handleExport"
    />

    <!-- 分页控制 -->
    <PaginationControls
      v-if="canvasMode !== 'infinite'"
      :current-page="currentPage"
      :total-pages="totalPages"
      :position="settings.controlPosition"
      @page-change="handlePageChange"
      @add-page="handleAddPage"
      @delete-page="handleDeletePage"
    />

    <!-- 画布组件 -->
    <DrawingCanvas
      ref="canvasRef"
      :bg-color="bgColor"
      :bg-pattern="bgPattern"
      :current-tool="currentTool"
      :current-color="currentColor"
      :pen-size="penSize"
      :pen-type="penType"
      :eraser-size="eraserSize"
      :eraser-shape="eraserShape"
      @drawing-end="handleDrawingEnd"
    />

    <!-- 底部工具栏 -->
    <Toolbar
      :current-tool="currentTool"
      :toolbar-size="settings.toolbarSize"
      :can-undo="canUndo()"
      :can-redo="canRedo()"
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
      @update:bg-color="backgroundColor = $event"
      @update:bg-pattern="backgroundPattern = $event"
      @update:bg-image="setBackgroundImage($event)"
      @update:shape-type="currentShapeType = $event"
      @update:stroke-width="handleStrokeWidthUpdate"
      @update:font-size="handleFontSizeUpdate"
      @update:text-align="handleTextAlignUpdate"
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
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useHistory } from './composables/useHistory'
import { useSettings } from './composables/useSettings'
import { useBackground } from './composables/useBackground'
import { useTimer } from './composables/useTimer'
import { useExport } from './composables/useExport'
import { usePagination } from './composables/usePagination'
import { useTimeDisplay } from './composables/useTimeDisplay'
import { useSelection } from './composables/useSelection'
import { useShapes } from './composables/useShapes'
import { useText } from './composables/useText'

// 导入组件
import DrawingCanvas from './components/Canvas/DrawingCanvas.vue'
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
const canvasRef = ref(null)
const mainCanvas = ref(null)
const mainCtx = ref(null)
const bgCanvas = ref(null)
const bgCtx = ref(null)

// ========== Composables 集成 ==========
const { settings, updateSetting, updateSettings } = useSettings()

// 背景管理
const {
  backgroundColor,
  backgroundPattern,
  bgOpacity,
  patternIntensity,
  drawBackground,
  setBackgroundImage,
  clearBackgroundImage
} = useBackground(bgCanvas, bgCtx)

// 分页管理
const {
  pages,
  currentPageIndex,
  totalPages: paginationTotalPages,
  hasPrevPage,
  hasNextPage,
  canvasMode,
  addPage,
  deletePage,
  goToPage,
  nextPage,
  prevPage,
  clearCurrentPage,
  setCanvasMode,
  getCurrentPageSize
} = usePagination()

// 历史记录
const { canUndo, canRedo, saveState, undo, redo, clearHistory } = useHistory(
  mainCanvas,
  mainCtx
)

// 导出功能
const {
  exportCurrentPage,
  exportAllPages,
  exportFormat,
  setExportFormat
} = useExport(mainCanvas, bgCanvas)

// 计时器管理
const {
  timers: timersList,
  createTimer,
  deleteTimer: removeTimer,
  startTimer,
  pauseTimer,
  resetTimer,
  getTimerDisplay
} = useTimer()

// 时间显示
const {
  isVisible: timeDisplayVisible,
  showDate,
  showTime,
  timeFormat,
  dateFormat,
  toggle: toggleTimeDisplay
} = useTimeDisplay()

// 选择工具
const {
  selectedStrokeIndex,
  selectStroke,
  deselectStroke,
  deleteSelectedStroke,
  copySelectedStroke
} = useSelection(mainCanvas, mainCtx, ref([]))

// 形状插入
const {
  shapeObjects,
  currentShapeType,
  isDrawingShape,
  startDrawingShape,
  updateShapePreview,
  finishDrawingShape,
  drawAllShapes
} = useShapes(mainCanvas, mainCtx)

// 文本插入
const {
  textObjects,
  isInputting,
  startTextInput,
  createTextObject,
  drawAllTexts
} = useText(mainCanvas, mainCtx)

// ========== 状态管理 ==========
const showConfig = ref(false)
const showSettings = ref(false)
const showConfirm = ref(false)
const confirmMessage = ref('')
const confirmCallback = ref(null)
const showAnnouncement = ref(false)
const announcementContent = ref('')

// 工具和设置
const currentTool = ref('pen')
const currentColor = ref('#000000')
const penSize = ref(5)
const penType = ref('normal')
const eraserSize = ref(20)
const eraserShape = ref('circle')

// 使用 composables 中的值
const bgColor = backgroundColor
const bgPattern = backgroundPattern

// 分页
const currentPage = computed(() => currentPageIndex.value + 1)
const totalPages = computed(() => paginationTotalPages.value)

// 计时器
const timers = timersList

// ========== 生命周期 ==========
onMounted(() => {
  setupEventListeners()
  loadAnnouncement()
  
  // 初始化画布引用
  nextTick(() => {
    if (canvasRef.value) {
      mainCanvas.value = canvasRef.value.mainCanvas
      mainCtx.value = canvasRef.value.mainCtx
      bgCanvas.value = canvasRef.value.bgCanvas
      bgCtx.value = canvasRef.value.bgCtx
      
      // 绘制初始背景
      if (bgCtx.value) {
        drawBackground()
      }
    }
  })
})

onUnmounted(() => {
  removeEventListeners()
})

// ========== 监听背景变化 ==========
watch([backgroundColor, backgroundPattern, bgOpacity, patternIntensity], () => {
  if (bgCtx.value) {
    drawBackground()
  }
})

// ========== 事件处理 ==========
const handleToolChange = (tool) => {
  currentTool.value = tool
  
  // 根据工具显示配置面板
  if (['pen', 'eraser', 'background', 'shape', 'text'].includes(tool)) {
    showConfig.value = true
  } else {
    showConfig.value = false
  }
  
  // 处理特殊工具
  if (tool === 'timer') {
    // 创建新的计时器
    createTimer({
      mode: 'stopwatch',
      title: `计时器 ${timers.value.length + 1}`
    })
  } else if (tool === 'time-display') {
    toggleTimeDisplay()
  } else if (tool === 'text') {
    // 文本工具会在画布点击时触发
  } else if (tool === 'select') {
    // 选择工具激活
  }
}

const handleClear = () => {
  confirmMessage.value = '确定要清空画布吗？此操作无法撤销。'
  confirmCallback.value = () => {
    if (canvasMode.value === 'paginated') {
      // 分页模式：清空当前页
      clearCurrentPage()
    }
    
    // 清空画布
    if (mainCtx.value && mainCanvas.value) {
      mainCtx.value.clearRect(0, 0, mainCanvas.value.width, mainCanvas.value.height)
    }
    
    // 清空所有对象
    shapeObjects.value = []
    textObjects.value = []
    
    clearHistory()
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

const handleUndo = () => undo()
const handleRedo = () => redo()

const handleDrawingEnd = () => {
  saveState()
  
  // 如果是形状绘制，完成形状
  if (isDrawingShape.value) {
    finishDrawingShape()
  }
}

const handleZoomIn = () => {
  if (canvasRef.value && canvasRef.value.zoom) {
    canvasRef.value.zoom(1.1)
  }
}

const handleZoomOut = () => {
  if (canvasRef.value && canvasRef.value.zoom) {
    canvasRef.value.zoom(0.9)
  }
}

const handleZoomChange = (value) => {
  if (canvasRef.value && canvasRef.value.setZoom) {
    canvasRef.value.setZoom(value)
  }
}

const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen()
  } else {
    document.exitFullscreen()
  }
}

const handleExport = () => {
  if (canvasMode.value === 'paginated' && totalPages.value > 1) {
    // 多页模式：询问导出选项
    const choice = confirm('导出所有页面？\n确定 = 导出所有页面\n取消 = 仅导出当前页')
    if (choice) {
      exportAllPages(pages.value)
    } else {
      exportCurrentPage()
    }
  } else {
    // 单页或无限画布模式：导出当前页
    exportCurrentPage()
  }
}

const handlePageChange = (page) => {
  goToPage(page - 1) // Convert to 0-based index
}

const handleAddPage = () => {
  addPage()
}

const handleDeletePage = () => {
  if (totalPages.value > 1) {
    confirmMessage.value = '确定要删除当前页面吗？'
    confirmCallback.value = () => {
      deletePage()
    }
    showConfirm.value = true
  }
}

// 工具配置更新处理
const handleStrokeWidthUpdate = (value) => {
  // 更新形状描边宽度
  if (currentTool.value === 'shape') {
    // 形状描边宽度会在 useShapes 中处理
  }
}

const handleFontSizeUpdate = (value) => {
  // 更新文本字体大小
  if (currentTool.value === 'text') {
    // 字体大小会在 useText 中处理
  }
}

const handleTextAlignUpdate = (value) => {
  // 更新文本对齐方式
  if (currentTool.value === 'text') {
    // 文本对齐会在 useText 中处理
  }
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
  window.addEventListener('resize', handleResize)
  document.addEventListener('keydown', handleKeyDown)
}

const removeEventListeners = () => {
  window.removeEventListener('resize', handleResize)
  document.removeEventListener('keydown', handleKeyDown)
}

const handleResize = () => {
  if (canvasRef.value) {
    canvasRef.value.resizeCanvas()
  }
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
</script>

<style scoped>
.aboard-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #f5f5f5;
}
</style>
