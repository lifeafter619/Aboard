<template>
  <div class="canvas-container">
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
  </div>
</template>

<script setup>
/**
 * 画布组件
 * 处理双层画布（背景+绘图）和所有鼠标/触摸交互
 */
import { ref, computed, onMounted, watch } from 'vue'
import { useDrawing } from '@/composables/useDrawing'

const props = defineProps({
  bgColor: { type: String, default: '#ffffff' },
  bgPattern: { type: String, default: 'blank' },
  currentTool: { type: String, default: 'pen' },
  currentColor: { type: String, default: '#000000' },
  penSize: { type: Number, default: 5 },
  penType: { type: String, default: 'normal' },
  eraserSize: { type: Number, default: 20 },
  eraserShape: { type: String, default: 'circle' }
})

const emit = defineEmits(['drawing-end'])

// ========== 画布引用 ==========
const mainCanvas = ref(null)
const bgCanvas = ref(null)
const mainCtx = ref(null)
const bgCtx = ref(null)

// ========== 使用绘图功能 ==========
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
  getPosition
} = useDrawing(mainCanvas, mainCtx)

// ========== 同步 props 到 composable ==========
watch(() => props.currentTool, (val) => { currentTool.value = val })
watch(() => props.currentColor, (val) => { currentColor.value = val })
watch(() => props.penSize, (val) => { penSize.value = val })
watch(() => props.penType, (val) => { penType.value = val })
watch(() => props.eraserSize, (val) => { eraserSize.value = val })
watch(() => props.eraserShape, (val) => { eraserShape.value = val })

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
})

// ========== 方法 ==========
/**
 * 初始化画布
 */
const initCanvas = () => {
  if (!mainCanvas.value || !bgCanvas.value) return

  mainCtx.value = mainCanvas.value.getContext('2d', {
    desynchronized: true,
    alpha: true
  })
  bgCtx.value = bgCanvas.value.getContext('2d')

  resizeCanvas()
}

/**
 * 调整画布大小
 */
const resizeCanvas = () => {
  if (!mainCanvas.value || !bgCanvas.value) return

  const width = window.innerWidth
  const height = window.innerHeight

  mainCanvas.value.width = width
  mainCanvas.value.height = height
  bgCanvas.value.width = width
  bgCanvas.value.height = height

  drawBackground()
}

/**
 * 绘制背景
 */
const drawBackground = () => {
  if (!bgCtx.value || !bgCanvas.value) return

  bgCtx.value.clearRect(0, 0, bgCanvas.value.width, bgCanvas.value.height)
  bgCtx.value.fillStyle = props.bgColor
  bgCtx.value.fillRect(0, 0, bgCanvas.value.width, bgCanvas.value.height)
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
    emit('drawing-end')
  }
}

const handleTouchStart = (e) => {
  if (e.touches.length === 1) {
    const touch = e.touches[0]
    handleMouseDown({ 
      clientX: touch.clientX, 
      clientY: touch.clientY, 
      preventDefault: () => {} 
    })
  }
}

const handleTouchMove = (e) => {
  if (e.touches.length === 1) {
    const touch = e.touches[0]
    handleMouseMove({ 
      clientX: touch.clientX, 
      clientY: touch.clientY, 
      preventDefault: () => {} 
    })
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

// ========== 监听背景变化 ==========
watch([() => props.bgColor, () => props.bgPattern], () => {
  drawBackground()
})

// ========== 暴露方法给父组件 ==========
defineExpose({
  mainCanvas,
  bgCanvas,
  mainCtx,
  bgCtx,
  resizeCanvas,
  zoom,
  setZoom: (value) => {
    canvasScale.value = value
  }
})
</script>

<style scoped>
.canvas-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
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
