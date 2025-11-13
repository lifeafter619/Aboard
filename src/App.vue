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
      v-if="settings.canvasMode !== 'infinite'"
      :current-page="currentPage"
      :total-pages="totalPages"
      :position="settings.controlPosition"
      @page-change="handlePageChange"
      @add-page="addPage"
    />

    <!-- 画布组件 -->
    <DrawingCanvas
      ref="canvasRef"
      :bg-color="bgColor"
      :bg-pattern="bgPattern"
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
import { ref, onMounted, onUnmounted } from 'vue'
import { useHistory } from './composables/useHistory'
import { useSettings } from './composables/useSettings'

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

// ========== Composables ==========
const { settings, updateSetting, updateSettings } = useSettings()

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
const bgColor = ref('#ffffff')
const bgPattern = ref('blank')

// 分页
const currentPage = ref(1)
const totalPages = ref(1)

// 计时器
const timers = ref([])

// ========== 历史记录 ==========
const { canUndo, canRedo, saveState, undo, redo, clearHistory } = useHistory(
  ref(null),
  ref(null)
)

// ========== 生命周期 ==========
onMounted(() => {
  setupEventListeners()
  loadAnnouncement()
})

onUnmounted(() => {
  removeEventListeners()
})

// ========== 事件处理 ==========
const handleToolChange = (tool) => {
  currentTool.value = tool
  if (tool === 'pen' || tool === 'eraser' || tool === 'background') {
    showConfig.value = true
  } else {
    showConfig.value = false
  }
}

const handleClear = () => {
  confirmMessage.value = '确定要清空画布吗？此操作无法撤销。'
  confirmCallback.value = () => {
    if (canvasRef.value?.mainCtx) {
      const canvas = canvasRef.value.mainCanvas
      const ctx = canvasRef.value.mainCtx
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
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
const handleDrawingEnd = () => saveState()

const handleZoomIn = () => {
  console.log('Zoom in')
}

const handleZoomOut = () => {
  console.log('Zoom out')
}

const handleZoomChange = (value) => {
  console.log('Zoom change:', value)
}

const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen()
  } else {
    document.exitFullscreen()
  }
}

const handleExport = () => {
  console.log('Export canvas')
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
