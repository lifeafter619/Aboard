/**
 * 绘图引擎 Composable
 * 处理所有绘图操作、笔触类型和画布交互
 */
import { ref, computed } from 'vue'

export function useDrawing(canvas, ctx) {
  // ========== 状态管理 ==========
  const isDrawing = ref(false)
  const currentColor = ref(localStorage.getItem('currentColor') || '#000000')
  const penSize = ref(parseInt(localStorage.getItem('penSize')) || 5)
  const penType = ref(localStorage.getItem('penType') || 'normal')
  const eraserSize = ref(parseInt(localStorage.getItem('eraserSize')) || 20)
  const eraserShape = ref(localStorage.getItem('eraserShape') || 'circle')
  const currentTool = ref('pen')

  // 绘图缓冲区
  const points = ref([])
  const lastPoint = ref(null)

  // 笔触存储（用于选择功能）
  const strokes = ref([])
  const selectedStrokeIndex = ref(null)
  
  // 画布缩放和平移
  const canvasScale = ref(parseFloat(localStorage.getItem('canvasScale')) || 1.0)
  const panOffset = ref({
    x: parseFloat(localStorage.getItem('panOffsetX')) || 0,
    y: parseFloat(localStorage.getItem('panOffsetY')) || 0
  })
  const isPanning = ref(false)
  const lastPanPoint = ref(null)

  // ========== 常量 ==========
  const SELECTION_THRESHOLD = 10  // 选择笔触的距离阈值
  const COPY_OFFSET = 20  // 复制笔触的偏移量

  // ========== 计算属性 ==========
  /**
   * 获取当前笔触的透明度
   * 不同笔触类型有不同的透明度效果
   */
  const currentOpacity = computed(() => {
    if (penType.value === 'pencil') return 0.3
    if (penType.value === 'brush') return 0.7
    return 1.0
  })

  // ========== 工具方法 ==========
  /**
   * 获取鼠标或触摸的位置
   * @param {Event} e - 鼠标或触摸事件
   * @returns {{x: number, y: number}} 画布坐标
   */
  const getPosition = (e) => {
    if (!canvas.value) return { x: 0, y: 0 }
    
    const rect = canvas.value.getBoundingClientRect()
    const scaleX = canvas.value.offsetWidth / rect.width
    const scaleY = canvas.value.offsetHeight / rect.height

    let x = (e.clientX - rect.left) * scaleX
    let y = (e.clientY - rect.top) * scaleY

    // 限制在画布范围内
    x = Math.max(0, Math.min(x, canvas.value.offsetWidth))
    y = Math.max(0, Math.min(y, canvas.value.offsetHeight))

    // 考虑缩放和平移
    x = (x - panOffset.value.x) / canvasScale.value
    y = (y - panOffset.value.y) / canvasScale.value

    return { x, y }
  }

  /**
   * 计算两点之间的距离
   * @param {{x: number, y: number}} p1 - 第一个点
   * @param {{x: number, y: number}} p2 - 第二个点
   * @returns {number} 距离
   */
  const distance = (p1, p2) => {
    return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2)
  }

  /**
   * 获取两点之间的中点
   * @param {{x: number, y: number}} p1 - 第一个点
   * @param {{x: number, y: number}} p2 - 第二个点
   * @returns {{x: number, y: number}} 中点
   */
  const midPoint = (p1, p2) => {
    return {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2
    }
  }

  // ========== 绘图功能 ==========
  /**
   * 开始绘制
   * @param {{x: number, y: number}} pos - 起始位置
   */
  const startDrawing = (pos) => {
    if (currentTool.value !== 'pen' && currentTool.value !== 'eraser') return

    isDrawing.value = true
    points.value = [pos]
    lastPoint.value = pos

    if (!ctx.value) return

    ctx.value.beginPath()
    ctx.value.moveTo(pos.x, pos.y)
  }

  /**
   * 绘制线条
   * @param {{x: number, y: number}} pos - 当前位置
   */
  const draw = (pos) => {
    if (!isDrawing.value || !ctx.value || !lastPoint.value) return

    points.value.push(pos)

    if (currentTool.value === 'eraser') {
      // 橡皮擦逻辑
      ctx.value.globalCompositeOperation = 'destination-out'
      ctx.value.lineWidth = eraserSize.value
      ctx.value.lineCap = 'round'
      ctx.value.lineJoin = 'round'

      ctx.value.beginPath()
      ctx.value.moveTo(lastPoint.value.x, lastPoint.value.y)
      ctx.value.lineTo(pos.x, pos.y)
      ctx.value.stroke()

      lastPoint.value = pos
    } else {
      // 绘笔逻辑
      ctx.value.globalCompositeOperation = 'source-over'
      ctx.value.strokeStyle = currentColor.value
      ctx.value.globalAlpha = currentOpacity.value
      ctx.value.lineWidth = penSize.value
      ctx.value.lineCap = 'round'
      ctx.value.lineJoin = 'round'

      // 根据笔触类型应用不同效果
      if (penType.value === 'normal') {
        ctx.value.beginPath()
        ctx.value.moveTo(lastPoint.value.x, lastPoint.value.y)
        ctx.value.lineTo(pos.x, pos.y)
        ctx.value.stroke()
      } else if (penType.value === 'pencil' || penType.value === 'brush') {
        // 使用曲线获得更平滑的效果
        const mid = midPoint(lastPoint.value, pos)
        ctx.value.quadraticCurveTo(lastPoint.value.x, lastPoint.value.y, mid.x, mid.y)
        ctx.value.stroke()
      }

      lastPoint.value = pos
    }
  }

  /**
   * 结束绘制
   */
  const endDrawing = () => {
    if (!isDrawing.value) return

    isDrawing.value = false

    // 保存笔触用于选择功能
    if (currentTool.value === 'pen' && points.value.length > 0) {
      strokes.value.push({
        points: [...points.value],
        color: currentColor.value,
        size: penSize.value,
        type: penType.value
      })
    }

    points.value = []
    lastPoint.value = null

    if (ctx.value) {
      ctx.value.globalAlpha = 1.0
    }
  }

  // ========== 平移功能 ==========
  /**
   * 开始平移画布
   * @param {{x: number, y: number}} pos - 起始位置
   */
  const startPan = (pos) => {
    isPanning.value = true
    lastPanPoint.value = pos
  }

  /**
   * 平移画布
   * @param {{x: number, y: number}} pos - 当前位置
   */
  const pan = (pos) => {
    if (!isPanning.value || !lastPanPoint.value) return

    const dx = pos.x - lastPanPoint.value.x
    const dy = pos.y - lastPanPoint.value.y

    panOffset.value.x += dx
    panOffset.value.y += dy

    lastPanPoint.value = pos

    // 保存到 localStorage
    localStorage.setItem('panOffsetX', panOffset.value.x.toString())
    localStorage.setItem('panOffsetY', panOffset.value.y.toString())
  }

  /**
   * 结束平移
   */
  const endPan = () => {
    isPanning.value = false
    lastPanPoint.value = null
  }

  // ========== 缩放功能 ==========
  /**
   * 缩放画布
   * @param {number} delta - 缩放增量
   * @param {{x: number, y: number}} center - 缩放中心点
   */
  const zoom = (delta, center = null) => {
    const oldScale = canvasScale.value
    const newScale = Math.max(0.1, Math.min(5.0, oldScale + delta))

    if (center) {
      // 以鼠标位置为中心缩放
      const scaleFactor = newScale / oldScale
      panOffset.value.x = center.x - (center.x - panOffset.value.x) * scaleFactor
      panOffset.value.y = center.y - (center.y - panOffset.value.y) * scaleFactor
    }

    canvasScale.value = newScale
    localStorage.setItem('canvasScale', newScale.toString())
  }

  // ========== 工具切换 ==========
  /**
   * 设置当前工具
   * @param {string} tool - 工具名称
   */
  const setTool = (tool) => {
    currentTool.value = tool
  }

  /**
   * 设置笔触颜色
   * @param {string} color - 颜色值
   */
  const setColor = (color) => {
    currentColor.value = color
    localStorage.setItem('currentColor', color)
  }

  /**
   * 设置笔触大小
   * @param {number} size - 大小值
   */
  const setPenSize = (size) => {
    penSize.value = size
    localStorage.setItem('penSize', size.toString())
  }

  /**
   * 设置笔触类型
   * @param {string} type - 笔触类型
   */
  const setPenType = (type) => {
    penType.value = type
    localStorage.setItem('penType', type)
  }

  /**
   * 设置橡皮擦大小
   * @param {number} size - 大小值
   */
  const setEraserSize = (size) => {
    eraserSize.value = size
    localStorage.setItem('eraserSize', size.toString())
  }

  /**
   * 设置橡皮擦形状
   * @param {string} shape - 形状类型
   */
  const setEraserShape = (shape) => {
    eraserShape.value = shape
    localStorage.setItem('eraserShape', shape)
  }

  // ========== 清空画布 ==========
  /**
   * 清空画布
   */
  const clearCanvas = () => {
    if (!canvas.value || !ctx.value) return
    ctx.value.clearRect(0, 0, canvas.value.width, canvas.value.height)
    strokes.value = []
  }

  return {
    // 状态
    isDrawing,
    currentColor,
    penSize,
    penType,
    eraserSize,
    eraserShape,
    currentTool,
    canvasScale,
    panOffset,
    strokes,
    
    // 计算属性
    currentOpacity,
    
    // 方法
    getPosition,
    distance,
    midPoint,
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
    clearCanvas
  }
}
