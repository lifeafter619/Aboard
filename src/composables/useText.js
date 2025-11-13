/**
 * 文本插入 Composable
 * 处理文本的插入、编辑和管理
 */
import { ref } from 'vue'

export function useText(canvas, ctx) {
  // ========== 状态管理 ==========
  const textObjects = ref([])
  const selectedTextIndex = ref(null)
  const isInputting = ref(false)
  const inputPosition = ref({ x: 0, y: 0 })
  
  // 文本属性
  const fontSize = ref(24)
  const fontFamily = ref('Arial, sans-serif')
  const textColor = ref('#000000')
  const textAlign = ref('left') // 'left' | 'center' | 'right'
  const fontWeight = ref('normal') // 'normal' | 'bold'
  const fontStyle = ref('normal') // 'normal' | 'italic'
  
  // 操作状态
  const isDragging = ref(false)
  const isResizing = ref(false)
  const dragStart = ref({ x: 0, y: 0 })
  
  // 常量
  const MIN_FONT_SIZE = 12
  const MAX_FONT_SIZE = 120
  const MIN_SCALE = 0.5
  const MAX_SCALE = 3.0
  
  /**
   * 开始文本输入
   * @param {Event} e - 鼠标事件
   * @param {Object} transform - 画布变换信息
   */
  function startTextInput(e, transform = {}) {
    const { x, y } = getCanvasCoords(e, transform)
    inputPosition.value = { x, y }
    isInputting.value = true
  }
  
  /**
   * 创建文本对象
   * @param {string} text - 文本内容
   * @returns {Object} 文本对象
   */
  function createTextObject(text) {
    if (!text || text.trim() === '') return null
    
    const textObj = {
      id: Date.now() + Math.random(),
      text: text,
      x: inputPosition.value.x,
      y: inputPosition.value.y,
      fontSize: fontSize.value,
      fontFamily: fontFamily.value,
      color: textColor.value,
      align: textAlign.value,
      weight: fontWeight.value,
      style: fontStyle.value,
      rotation: 0,
      scale: 1.0,
      timestamp: Date.now()
    }
    
    textObjects.value.push(textObj)
    isInputting.value = false
    
    return textObj
  }
  
  /**
   * 取消文本输入
   */
  function cancelTextInput() {
    isInputting.value = false
  }
  
  /**
   * 绘制单个文本
   * @param {CanvasRenderingContext2D} context - 画布上下文
   * @param {Object} textObj - 文本对象
   */
  function drawText(context, textObj) {
    const ctx = context || ctx.value
    
    ctx.save()
    
    // 应用变换
    ctx.translate(textObj.x, textObj.y)
    ctx.rotate(textObj.rotation * Math.PI / 180)
    ctx.scale(textObj.scale, textObj.scale)
    
    // 设置字体
    const fontStr = `${textObj.style} ${textObj.weight} ${textObj.fontSize}px ${textObj.fontFamily}`
    ctx.font = fontStr
    ctx.fillStyle = textObj.color
    ctx.textAlign = textObj.align
    ctx.textBaseline = 'top'
    
    // 绘制文本（支持多行）
    const lines = textObj.text.split('\n')
    const lineHeight = textObj.fontSize * 1.2
    
    lines.forEach((line, index) => {
      ctx.fillText(line, 0, index * lineHeight)
    })
    
    ctx.restore()
  }
  
  /**
   * 绘制所有文本
   * @param {CanvasRenderingContext2D} context - 画布上下文
   */
  function drawAllTexts(context) {
    const ctx = context || ctx.value
    
    textObjects.value.forEach((textObj, index) => {
      ctx.save()
      
      // 如果是选中的文本，添加高亮
      if (index === selectedTextIndex.value) {
        // 绘制选择框
        drawTextBoundingBox(ctx, textObj)
      }
      
      drawText(ctx, textObj)
      ctx.restore()
    })
  }
  
  /**
   * 绘制文本边界框
   * @param {CanvasRenderingContext2D} ctx - 画布上下文
   * @param {Object} textObj - 文本对象
   */
  function drawTextBoundingBox(ctx, textObj) {
    ctx.save()
    
    ctx.translate(textObj.x, textObj.y)
    ctx.rotate(textObj.rotation * Math.PI / 180)
    ctx.scale(textObj.scale, textObj.scale)
    
    // 计算文本尺寸
    const fontStr = `${textObj.style} ${textObj.weight} ${textObj.fontSize}px ${textObj.fontFamily}`
    ctx.font = fontStr
    
    const lines = textObj.text.split('\n')
    const lineHeight = textObj.fontSize * 1.2
    const maxWidth = Math.max(...lines.map(line => ctx.measureText(line).width))
    const totalHeight = lines.length * lineHeight
    
    // 绘制边界框
    ctx.strokeStyle = '#0066FF'
    ctx.lineWidth = 2
    ctx.setLineDash([5, 5])
    
    let boxX = 0
    if (textObj.align === 'center') {
      boxX = -maxWidth / 2
    } else if (textObj.align === 'right') {
      boxX = -maxWidth
    }
    
    ctx.strokeRect(boxX - 5, -5, maxWidth + 10, totalHeight + 10)
    
    // 绘制控制点
    ctx.setLineDash([])
    ctx.fillStyle = '#0066FF'
    
    const handleSize = 6
    const handles = [
      { x: boxX - 5, y: -5 }, // 左上
      { x: boxX + maxWidth + 5, y: -5 }, // 右上
      { x: boxX - 5, y: totalHeight + 5 }, // 左下
      { x: boxX + maxWidth + 5, y: totalHeight + 5 } // 右下
    ]
    
    handles.forEach(handle => {
      ctx.fillRect(
        handle.x - handleSize / 2,
        handle.y - handleSize / 2,
        handleSize,
        handleSize
      )
    })
    
    ctx.restore()
  }
  
  /**
   * 选中指定点的文本
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   * @returns {number|null} 选中的文本索引
   */
  function selectTextAtPoint(x, y) {
    // 从后往前查找（最上层的文本优先）
    for (let i = textObjects.value.length - 1; i >= 0; i--) {
      const textObj = textObjects.value[i]
      
      if (isPointInText(x, y, textObj)) {
        selectedTextIndex.value = i
        return i
      }
    }
    
    selectedTextIndex.value = null
    return null
  }
  
  /**
   * 检查点是否在文本区域内
   */
  function isPointInText(x, y, textObj) {
    // 创建临时canvas来测量文本
    const tempCanvas = document.createElement('canvas')
    const tempCtx = tempCanvas.getContext('2d')
    
    const fontStr = `${textObj.style} ${textObj.weight} ${textObj.fontSize}px ${textObj.fontFamily}`
    tempCtx.font = fontStr
    
    const lines = textObj.text.split('\n')
    const lineHeight = textObj.fontSize * 1.2
    const maxWidth = Math.max(...lines.map(line => tempCtx.measureText(line).width)) * textObj.scale
    const totalHeight = lines.length * lineHeight * textObj.scale
    
    // 简化：不考虑旋转，只检查基本边界
    const threshold = 10
    let boxX = textObj.x
    
    if (textObj.align === 'center') {
      boxX -= maxWidth / 2
    } else if (textObj.align === 'right') {
      boxX -= maxWidth
    }
    
    return x >= boxX - threshold &&
           x <= boxX + maxWidth + threshold &&
           y >= textObj.y - threshold &&
           y <= textObj.y + totalHeight + threshold
  }
  
  /**
   * 删除文本
   * @param {number} index - 文本索引
   */
  function deleteText(index = null) {
    const indexToDelete = index !== null ? index : selectedTextIndex.value
    
    if (indexToDelete !== null && indexToDelete >= 0 && indexToDelete < textObjects.value.length) {
      textObjects.value.splice(indexToDelete, 1)
      if (selectedTextIndex.value === indexToDelete) {
        selectedTextIndex.value = null
      }
      return true
    }
    
    return false
  }
  
  /**
   * 编辑选中的文本
   * @returns {Object|null} 选中的文本对象
   */
  function editSelectedText() {
    if (selectedTextIndex.value === null) return null
    
    const textObj = textObjects.value[selectedTextIndex.value]
    
    // 设置当前文本属性
    fontSize.value = textObj.fontSize
    fontFamily.value = textObj.fontFamily
    textColor.value = textObj.color
    textAlign.value = textObj.align
    fontWeight.value = textObj.weight
    fontStyle.value = textObj.style
    
    return textObj
  }
  
  /**
   * 更新文本内容
   * @param {number} index - 文本索引
   * @param {string} newText - 新文本内容
   */
  function updateTextContent(index, newText) {
    if (index >= 0 && index < textObjects.value.length) {
      textObjects.value[index].text = newText
      return true
    }
    return false
  }
  
  /**
   * 移动文本
   * @param {number} index - 文本索引
   * @param {number} dx - X轴偏移
   * @param {number} dy - Y轴偏移
   */
  function moveText(index, dx, dy) {
    if (index >= 0 && index < textObjects.value.length) {
      textObjects.value[index].x += dx
      textObjects.value[index].y += dy
      return true
    }
    return false
  }
  
  /**
   * 缩放文本
   * @param {number} index - 文本索引
   * @param {number} scale - 缩放比例
   */
  function scaleText(index, scale) {
    if (index >= 0 && index < textObjects.value.length) {
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale))
      textObjects.value[index].scale = newScale
      return true
    }
    return false
  }
  
  /**
   * 旋转文本
   * @param {number} index - 文本索引
   * @param {number} rotation - 旋转角度（度）
   */
  function rotateText(index, rotation) {
    if (index >= 0 && index < textObjects.value.length) {
      textObjects.value[index].rotation = rotation % 360
      return true
    }
    return false
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
   * 清除所有文本
   */
  function clearAllTexts() {
    textObjects.value = []
    selectedTextIndex.value = null
  }
  
  // ========== 返回API ==========
  return {
    // 状态
    textObjects,
    selectedTextIndex,
    isInputting,
    inputPosition,
    fontSize,
    fontFamily,
    textColor,
    textAlign,
    fontWeight,
    fontStyle,
    
    // 创建和输入
    startTextInput,
    createTextObject,
    cancelTextInput,
    
    // 绘制
    drawText,
    drawAllTexts,
    drawTextBoundingBox,
    
    // 操作
    selectTextAtPoint,
    deleteText,
    editSelectedText,
    updateTextContent,
    moveText,
    scaleText,
    rotateText,
    clearAllTexts
  }
}
