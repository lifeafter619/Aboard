/**
 * 形状插入 Composable
 * 处理直线、矩形、圆形等形状的绘制
 */
import { ref } from 'vue'

export function useShapes(canvas, ctx) {
  // ========== 状态管理 ==========
  const shapeObjects = ref([])
  const selectedShapeIndex = ref(null)
  const isDrawingShape = ref(false)
  const currentShapeType = ref('line') // 'line' | 'rectangle' | 'circle' | 'arrow'
  
  // 绘制状态
  const dragStart = ref({ x: 0, y: 0 })
  const previewEnd = ref({ x: 0, y: 0 })
  
  // 形状属性
  const shapeColor = ref('#007AFF')
  const shapeFillColor = ref('rgba(0, 122, 255, 0.2)')
  const shapeStrokeWidth = ref(2)
  const shapeFilled = ref(false)
  
  // 操作状态
  const isDragging = ref(false)
  const isResizing = ref(false)
  const isRotating = ref(false)
  
  // 常量
  const HANDLE_SIZE = 8
  const MIN_SIZE = 20
  const MAX_SIZE = 500
  
  /**
   * 开始绘制形状（第一次点击）
   * @param {Event} e - 鼠标事件
   * @param {Object} transform - 画布变换信息
   */
  function startDrawingShape(e, transform = {}) {
    const { x, y } = getCanvasCoords(e, transform)
    
    isDrawingShape.value = true
    dragStart.value = { x, y }
    previewEnd.value = { x, y }
  }
  
  /**
   * 更新形状预览
   * @param {Event} e - 鼠标事件
   * @param {Object} transform - 画布变换信息
   */
  function updateShapePreview(e, transform = {}) {
    if (!isDrawingShape.value) return
    
    const { x, y } = getCanvasCoords(e, transform)
    previewEnd.value = { x, y }
  }
  
  /**
   * 完成形状绘制（第二次点击）
   * @returns {Object|null} 创建的形状对象
   */
  function finishDrawingShape() {
    if (!isDrawingShape.value) return null
    
    const shape = {
      id: Date.now() + Math.random(),
      type: currentShapeType.value,
      start: { ...dragStart.value },
      end: { ...previewEnd.value },
      color: shapeColor.value,
      fillColor: shapeFillColor.value,
      strokeWidth: shapeStrokeWidth.value,
      filled: shapeFilled.value,
      rotation: 0,
      timestamp: Date.now()
    }
    
    shapeObjects.value.push(shape)
    isDrawingShape.value = false
    
    return shape
  }
  
  /**
   * 取消形状绘制
   */
  function cancelDrawingShape() {
    isDrawingShape.value = false
    dragStart.value = { x: 0, y: 0 }
    previewEnd.value = { x: 0, y: 0 }
  }
  
  /**
   * 绘制形状预览
   * @param {CanvasRenderingContext2D} context - 画布上下文
   */
  function drawShapePreview(context) {
    if (!isDrawingShape.value) return
    
    const ctx = context || ctx.value
    ctx.save()
    
    ctx.strokeStyle = shapeColor.value
    ctx.lineWidth = shapeStrokeWidth.value
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    
    if (shapeFilled.value) {
      ctx.fillStyle = shapeFillColor.value
    }
    
    drawShape(ctx, {
      start: dragStart.value,
      end: previewEnd.value,
      type: currentShapeType.value,
      filled: shapeFilled.value
    })
    
    ctx.restore()
  }
  
  /**
   * 绘制单个形状
   * @param {CanvasRenderingContext2D} ctx - 画布上下文
   * @param {Object} shape - 形状对象
   */
  function drawShape(ctx, shape) {
    const { start, end, type, filled } = shape
    
    ctx.beginPath()
    
    switch (type) {
      case 'line':
        drawLine(ctx, start, end)
        break
      case 'arrow':
        drawArrow(ctx, start, end)
        break
      case 'rectangle':
        drawRectangle(ctx, start, end, filled)
        break
      case 'circle':
        drawCircle(ctx, start, end, filled)
        break
      case 'ellipse':
        drawEllipse(ctx, start, end, filled)
        break
    }
    
    ctx.stroke()
    if (filled) {
      ctx.fill()
    }
  }
  
  /**
   * 绘制直线
   */
  function drawLine(ctx, start, end) {
    ctx.moveTo(start.x, start.y)
    ctx.lineTo(end.x, end.y)
  }
  
  /**
   * 绘制箭头
   */
  function drawArrow(ctx, start, end) {
    const headLength = 15
    const angle = Math.atan2(end.y - start.y, end.x - start.x)
    
    // 绘制线条
    ctx.moveTo(start.x, start.y)
    ctx.lineTo(end.x, end.y)
    
    // 绘制箭头
    ctx.lineTo(
      end.x - headLength * Math.cos(angle - Math.PI / 6),
      end.y - headLength * Math.sin(angle - Math.PI / 6)
    )
    ctx.moveTo(end.x, end.y)
    ctx.lineTo(
      end.x - headLength * Math.cos(angle + Math.PI / 6),
      end.y - headLength * Math.sin(angle + Math.PI / 6)
    )
  }
  
  /**
   * 绘制矩形
   */
  function drawRectangle(ctx, start, end, filled) {
    const width = end.x - start.x
    const height = end.y - start.y
    ctx.rect(start.x, start.y, width, height)
  }
  
  /**
   * 绘制圆形
   */
  function drawCircle(ctx, start, end, filled) {
    const radius = Math.sqrt(
      Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
    )
    ctx.arc(start.x, start.y, radius, 0, Math.PI * 2)
  }
  
  /**
   * 绘制椭圆
   */
  function drawEllipse(ctx, start, end, filled) {
    const radiusX = Math.abs(end.x - start.x) / 2
    const radiusY = Math.abs(end.y - start.y) / 2
    const centerX = (start.x + end.x) / 2
    const centerY = (start.y + end.y) / 2
    
    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2)
  }
  
  /**
   * 绘制所有形状
   * @param {CanvasRenderingContext2D} context - 画布上下文
   */
  function drawAllShapes(context) {
    const ctx = context || ctx.value
    
    shapeObjects.value.forEach((shape, index) => {
      ctx.save()
      
      ctx.strokeStyle = shape.color
      ctx.fillStyle = shape.fillColor
      ctx.lineWidth = shape.strokeWidth
      
      // 如果是选中的形状，添加高亮
      if (index === selectedShapeIndex.value) {
        ctx.shadowColor = '#0066FF'
        ctx.shadowBlur = 10
      }
      
      drawShape(ctx, shape)
      ctx.restore()
    })
  }
  
  /**
   * 删除形状
   * @param {number} index - 形状索引
   */
  function deleteShape(index = null) {
    const indexToDelete = index !== null ? index : selectedShapeIndex.value
    
    if (indexToDelete !== null && indexToDelete >= 0 && indexToDelete < shapeObjects.value.length) {
      shapeObjects.value.splice(indexToDelete, 1)
      if (selectedShapeIndex.value === indexToDelete) {
        selectedShapeIndex.value = null
      }
      return true
    }
    
    return false
  }
  
  /**
   * 选中形状
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   * @returns {number|null} 选中的形状索引
   */
  function selectShapeAtPoint(x, y) {
    // 从后往前查找（最上层的形状优先）
    for (let i = shapeObjects.value.length - 1; i >= 0; i--) {
      const shape = shapeObjects.value[i]
      
      if (isPointNearShape(x, y, shape)) {
        selectedShapeIndex.value = i
        return i
      }
    }
    
    selectedShapeIndex.value = null
    return null
  }
  
  /**
   * 检查点是否在形状附近
   */
  function isPointNearShape(x, y, shape) {
    const threshold = 10
    
    switch (shape.type) {
      case 'line':
      case 'arrow':
        return isPointNearLine(x, y, shape.start, shape.end, threshold)
      case 'rectangle':
        return isPointInRectangle(x, y, shape.start, shape.end, threshold)
      case 'circle':
        return isPointNearCircle(x, y, shape.start, shape.end, threshold)
      default:
        return false
    }
  }
  
  /**
   * 检查点是否在线段附近
   */
  function isPointNearLine(x, y, start, end, threshold) {
    const dx = end.x - start.x
    const dy = end.y - start.y
    const length = Math.sqrt(dx * dx + dy * dy)
    
    if (length === 0) return false
    
    const t = Math.max(0, Math.min(1, ((x - start.x) * dx + (y - start.y) * dy) / (length * length)))
    const nearestX = start.x + t * dx
    const nearestY = start.y + t * dy
    
    const distance = Math.sqrt(
      Math.pow(x - nearestX, 2) + Math.pow(y - nearestY, 2)
    )
    
    return distance <= threshold
  }
  
  /**
   * 检查点是否在矩形内或边界附近
   */
  function isPointInRectangle(x, y, start, end, threshold) {
    const minX = Math.min(start.x, end.x) - threshold
    const maxX = Math.max(start.x, end.x) + threshold
    const minY = Math.min(start.y, end.y) - threshold
    const maxY = Math.max(start.y, end.y) + threshold
    
    return x >= minX && x <= maxX && y >= minY && y <= maxY
  }
  
  /**
   * 检查点是否在圆形边界附近
   */
  function isPointNearCircle(x, y, center, edge, threshold) {
    const radius = Math.sqrt(
      Math.pow(edge.x - center.x, 2) + Math.pow(edge.y - center.y, 2)
    )
    const distance = Math.sqrt(
      Math.pow(x - center.x, 2) + Math.pow(y - center.y, 2)
    )
    
    return Math.abs(distance - radius) <= threshold
  }
  
  /**
   * 获取画布坐标
   */
  function getCanvasCoords(e, transform = {}) {
    const rect = canvas.value.getBoundingClientRect()
    const scaleX = canvas.value.offsetWidth / rect.width
    const scaleY = canvas.value.offsetHeight / rect.height
    
    let x = (e.clientX - rect.left) * scaleX
    let y = (e.clientY - rect.top) * scaleY
    
    if (transform.panOffset && transform.canvasScale) {
      x = (x - transform.panOffset.x) / transform.canvasScale
      y = (y - transform.panOffset.y) / transform.canvasScale
    }
    
    return { x, y }
  }
  
  /**
   * 清除所有形状
   */
  function clearAllShapes() {
    shapeObjects.value = []
    selectedShapeIndex.value = null
  }
  
  // ========== 返回API ==========
  return {
    // 状态
    shapeObjects,
    selectedShapeIndex,
    isDrawingShape,
    currentShapeType,
    shapeColor,
    shapeFillColor,
    shapeStrokeWidth,
    shapeFilled,
    
    // 绘制方法
    startDrawingShape,
    updateShapePreview,
    finishDrawingShape,
    cancelDrawingShape,
    drawShapePreview,
    drawAllShapes,
    
    // 操作方法
    deleteShape,
    selectShapeAtPoint,
    clearAllShapes
  }
}
