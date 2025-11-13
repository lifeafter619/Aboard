/**
 * 选择工具 Composable
 * 处理笔触选择、移动、复制和删除
 */
import { ref } from 'vue'

export function useSelection(canvas, ctx, strokes) {
  // ========== 状态管理 ==========
  const isSelecting = ref(false)
  const selectionStart = ref(null)
  const selectionEnd = ref(null)
  const selectedStrokeIndex = ref(null)
  const selectedStrokes = ref([])
  const selectionMode = ref('click') // 'click' | 'rectangle'
  
  // 常量
  const SELECTION_THRESHOLD = 10
  const COPY_OFFSET = 20
  
  /**
   * 查找指定点附近的笔触
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   * @param {number} threshold - 距离阈值
   * @returns {number|null} 笔触索引
   */
  function findStrokeAtPoint(x, y, threshold = SELECTION_THRESHOLD) {
    if (!strokes || !strokes.value) return null
    
    for (let i = strokes.value.length - 1; i >= 0; i--) {
      const stroke = strokes.value[i]
      if (!stroke || !stroke.points || stroke.points.length === 0) continue
      
      // 检查笔触的每个点是否在阈值范围内
      for (const point of stroke.points) {
        const dx = point.x - x
        const dy = point.y - y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        if (distance <= threshold + (stroke.size || 5) / 2) {
          return i
        }
      }
    }
    
    return null
  }
  
  /**
   * 开始选择
   * @param {Event} e - 鼠标事件
   * @param {Object} transform - 画布变换信息 {panOffset, canvasScale}
   * @returns {boolean} 是否选中了笔触
   */
  function startSelection(e, transform = {}) {
    if (!canvas.value) return false
    
    isSelecting.value = true
    const rect = canvas.value.getBoundingClientRect()
    const scaleX = canvas.value.offsetWidth / rect.width
    const scaleY = canvas.value.offsetHeight / rect.height
    
    let x = (e.clientX - rect.left) * scaleX
    let y = (e.clientY - rect.top) * scaleY
    
    // 应用画布变换
    if (transform.panOffset && transform.canvasScale) {
      x = (x - transform.panOffset.x) / transform.canvasScale
      y = (y - transform.panOffset.y) / transform.canvasScale
    }
    
    // 查找点击位置的笔触
    const strokeIndex = findStrokeAtPoint(x, y)
    
    if (strokeIndex !== null) {
      selectedStrokeIndex.value = strokeIndex
      return true
    }
    
    // 未选中笔触，清除选择
    deselectStroke()
    return false
  }
  
  /**
   * 继续选择（矩形选择模式）
   */
  function continueSelection(e) {
    if (!isSelecting.value) return
    
    const rect = canvas.value.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    selectionEnd.value = { x, y }
  }
  
  /**
   * 结束选择
   */
  function endSelection() {
    isSelecting.value = false
    selectionStart.value = null
    selectionEnd.value = null
  }
  
  /**
   * 选中笔触
   * @param {number} index - 笔触索引
   */
  function selectStroke(index) {
    if (index >= 0 && index < strokes.value.length) {
      selectedStrokeIndex.value = index
    }
  }
  
  /**
   * 取消选中
   */
  function deselectStroke() {
    selectedStrokeIndex.value = null
    selectedStrokes.value = []
  }
  
  /**
   * 删除选中的笔触
   * @returns {Object|null} 被删除的笔触
   */
  function deleteSelectedStroke() {
    if (selectedStrokeIndex.value === null) return null
    
    const deletedStroke = strokes.value.splice(selectedStrokeIndex.value, 1)[0]
    deselectStroke()
    return deletedStroke
  }
  
  /**
   * 复制选中的笔触
   * @returns {Object|null} 复制的笔触
   */
  function copySelectedStroke() {
    if (selectedStrokeIndex.value === null) return null
    
    const originalStroke = strokes.value[selectedStrokeIndex.value]
    const copiedStroke = {
      ...originalStroke,
      points: originalStroke.points.map(p => ({
        x: p.x + COPY_OFFSET,
        y: p.y + COPY_OFFSET
      }))
    }
    
    strokes.value.push(copiedStroke)
    selectedStrokeIndex.value = strokes.value.length - 1
    return copiedStroke
  }
  
  /**
   * 移动选中的笔触
   * @param {number} dx - X轴偏移
   * @param {number} dy - Y轴偏移
   */
  function moveSelectedStroke(dx, dy) {
    if (selectedStrokeIndex.value === null) return
    
    const stroke = strokes.value[selectedStrokeIndex.value]
    if (!stroke || !stroke.points) return
    
    stroke.points = stroke.points.map(p => ({
      ...p,
      x: p.x + dx,
      y: p.y + dy
    }))
  }
  
  /**
   * 绘制选择框
   * @param {CanvasRenderingContext2D} context - 画布上下文
   */
  function drawSelectionRect(context) {
    if (!selectionStart.value || !selectionEnd.value) return
    
    const ctx = context || ctx.value
    ctx.save()
    ctx.strokeStyle = '#0066FF'
    ctx.lineWidth = 2
    ctx.setLineDash([5, 5])
    
    const width = selectionEnd.value.x - selectionStart.value.x
    const height = selectionEnd.value.y - selectionStart.value.y
    
    ctx.strokeRect(
      selectionStart.value.x,
      selectionStart.value.y,
      width,
      height
    )
    
    ctx.restore()
  }
  
  /**
   * 绘制选中笔触的高亮
   * @param {CanvasRenderingContext2D} context - 画布上下文
   */
  function drawSelectionHighlight(context) {
    if (selectedStrokeIndex.value === null) return
    
    const stroke = strokes.value[selectedStrokeIndex.value]
    if (!stroke || !stroke.points || stroke.points.length === 0) return
    
    const ctx = context || ctx.value
    ctx.save()
    
    // 绘制高亮边界
    ctx.strokeStyle = '#0066FF'
    ctx.lineWidth = (stroke.size || 5) + 4
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.globalAlpha = 0.3
    
    ctx.beginPath()
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y)
    }
    ctx.stroke()
    
    ctx.restore()
  }
  
  /**
   * 检查点是否在矩形内
   */
  function isPointInRect(point, rect) {
    return point.x >= rect.x &&
           point.x <= rect.x + rect.width &&
           point.y >= rect.y &&
           point.y <= rect.y + rect.height
  }
  
  /**
   * 矩形选择笔触
   */
  function selectStrokesInRect(rect) {
    selectedStrokes.value = []
    
    strokes.value.forEach((stroke, index) => {
      if (!stroke || !stroke.points) return
      
      // 检查笔触的任意点是否在矩形内
      const hasPointInRect = stroke.points.some(point =>
        isPointInRect(point, rect)
      )
      
      if (hasPointInRect) {
        selectedStrokes.value.push(index)
      }
    })
  }
  
  // ========== 返回API ==========
  return {
    // 状态
    isSelecting,
    selectedStrokeIndex,
    selectedStrokes,
    selectionMode,
    
    // 方法
    startSelection,
    continueSelection,
    endSelection,
    selectStroke,
    deselectStroke,
    deleteSelectedStroke,
    copySelectedStroke,
    moveSelectedStroke,
    findStrokeAtPoint,
    selectStrokesInRect,
    
    // 绘制方法
    drawSelectionRect,
    drawSelectionHighlight
  }
}
