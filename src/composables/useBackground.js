/**
 * 背景管理 Composable
 * 处理背景颜色、图案和图片背景
 */
import { ref, watch } from 'vue'

export function useBackground(bgCanvas, bgCtx) {
  // ========== 状态管理 ==========
  const backgroundColor = ref(localStorage.getItem('backgroundColor') || '#ffffff')
  const backgroundPattern = ref(localStorage.getItem('backgroundPattern') || 'blank')
  const bgOpacity = ref(parseFloat(localStorage.getItem('bgOpacity')) || 1.0)
  const patternIntensity = ref(parseFloat(localStorage.getItem('patternIntensity')) || 0.5)
  const patternDensity = ref(parseFloat(localStorage.getItem('patternDensity')) || 1.0)
  const backgroundImage = ref(null)
  const backgroundImageData = ref(localStorage.getItem('backgroundImageData') || null)
  const imageSize = ref(parseFloat(localStorage.getItem('imageSize')) || 1.0)
  
  // 坐标系原点偏移
  const coordinateOriginX = ref(parseFloat(localStorage.getItem('coordinateOriginX')) || 0)
  const coordinateOriginY = ref(parseFloat(localStorage.getItem('coordinateOriginY')) || 0)
  
  // 图片变换
  const imageTransform = ref({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    rotation: 0,
    scale: 1.0
  })
  
  // 加载保存的变换
  const savedTransform = localStorage.getItem('imageTransform')
  if (savedTransform) {
    imageTransform.value = JSON.parse(savedTransform)
  }
  
  // 加载保存的背景图片
  if (backgroundImageData.value) {
    const img = new Image()
    img.onload = () => {
      backgroundImage.value = img
      if (backgroundPattern.value === 'image') {
        drawBackground()
      }
    }
    img.src = backgroundImageData.value
  }
  
  // ========== 核心方法 ==========
  
  /**
   * 绘制背景
   */
  function drawBackground() {
    if (!bgCanvas.value || !bgCtx.value) return
    
    const canvas = bgCanvas.value
    const ctx = bgCtx.value
    
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // 绘制背景颜色
    ctx.globalAlpha = bgOpacity.value
    ctx.fillStyle = backgroundColor.value
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.globalAlpha = 1.0
    
    // 绘制背景图案
    drawBackgroundPattern()
    
    // 保存设置
    saveSettings()
  }
  
  /**
   * 绘制背景图案
   */
  function drawBackgroundPattern() {
    if (backgroundPattern.value === 'blank') return
    
    if (backgroundPattern.value === 'image' && backgroundImage.value) {
      drawImagePattern()
      return
    }
    
    const ctx = bgCtx.value
    ctx.save()
    ctx.globalCompositeOperation = 'source-over'
    
    const dpr = window.devicePixelRatio || 1
    const patternColor = getPatternColor()
    
    switch(backgroundPattern.value) {
      case 'dots':
        drawDotsPattern(dpr, patternColor)
        break
      case 'grid':
        drawGridPattern(dpr, patternColor)
        break
      case 'tianzige':
        drawTianzigePattern(dpr, patternColor)
        break
      case 'english-lines':
        drawEnglishLinesPattern(dpr, patternColor)
        break
      case 'music-staff':
        drawMusicStaffPattern(dpr, patternColor)
        break
      case 'coordinate':
        drawCoordinatePattern(dpr, patternColor)
        break
    }
    
    ctx.restore()
  }
  
  /**
   * 获取图案颜色
   * 根据背景颜色的亮度选择深色或浅色图案
   */
  function getPatternColor() {
    const rgb = hexToRgb(backgroundColor.value)
    const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000
    const baseColor = brightness > 128 ? 0 : 255
    const alpha = patternIntensity.value
    return `rgba(${baseColor}, ${baseColor}, ${baseColor}, ${alpha})`
  }
  
  /**
   * 绘制点阵图案
   */
  function drawDotsPattern(dpr, color) {
    const ctx = bgCtx.value
    const canvas = bgCanvas.value
    const spacing = 20 * patternDensity.value * dpr
    
    ctx.fillStyle = color
    for (let x = spacing; x < canvas.width; x += spacing) {
      for (let y = spacing; y < canvas.height; y += spacing) {
        ctx.beginPath()
        ctx.arc(x, y, 1.5 * dpr, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }
  
  /**
   * 绘制方格图案
   */
  function drawGridPattern(dpr, color) {
    const ctx = bgCtx.value
    const canvas = bgCanvas.value
    const spacing = 20 * patternDensity.value * dpr
    
    ctx.strokeStyle = color
    ctx.lineWidth = 1 * dpr
    
    // 垂直线
    for (let x = spacing; x < canvas.width; x += spacing) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvas.height)
      ctx.stroke()
    }
    
    // 水平线
    for (let y = spacing; y < canvas.height; y += spacing) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width, y)
      ctx.stroke()
    }
  }
  
  /**
   * 绘制田字格图案
   */
  function drawTianzigePattern(dpr, color) {
    const ctx = bgCtx.value
    const canvas = bgCanvas.value
    const size = 100 * patternDensity.value * dpr
    
    ctx.strokeStyle = color
    ctx.lineWidth = 1.5 * dpr
    
    for (let x = 0; x < canvas.width; x += size) {
      for (let y = 0; y < canvas.height; y += size) {
        // 外框
        ctx.strokeRect(x, y, size, size)
        
        // 十字线
        ctx.beginPath()
        ctx.moveTo(x + size / 2, y)
        ctx.lineTo(x + size / 2, y + size)
        ctx.moveTo(x, y + size / 2)
        ctx.lineTo(x + size, y + size / 2)
        ctx.stroke()
        
        // 对角线
        ctx.lineWidth = 0.5 * dpr
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x + size, y + size)
        ctx.moveTo(x + size, y)
        ctx.lineTo(x, y + size)
        ctx.stroke()
        ctx.lineWidth = 1.5 * dpr
      }
    }
  }
  
  /**
   * 绘制英语四线格图案
   */
  function drawEnglishLinesPattern(dpr, color) {
    const ctx = bgCtx.value
    const canvas = bgCanvas.value
    const lineHeight = 15 * patternDensity.value * dpr
    const groupSpacing = 60 * patternDensity.value * dpr
    
    ctx.strokeStyle = color
    
    for (let y = 0; y < canvas.height; y += groupSpacing) {
      // 四条线
      for (let i = 0; i < 4; i++) {
        const lineY = y + i * lineHeight
        ctx.lineWidth = (i === 1 || i === 2) ? 0.5 * dpr : 1 * dpr
        
        ctx.beginPath()
        ctx.moveTo(0, lineY)
        ctx.lineTo(canvas.width, lineY)
        ctx.stroke()
      }
    }
  }
  
  /**
   * 绘制五线谱图案
   */
  function drawMusicStaffPattern(dpr, color) {
    const ctx = bgCtx.value
    const canvas = bgCanvas.value
    const lineSpacing = 10 * patternDensity.value * dpr
    const groupSpacing = 80 * patternDensity.value * dpr
    
    ctx.strokeStyle = color
    ctx.lineWidth = 1 * dpr
    
    for (let y = 30 * dpr; y < canvas.height; y += groupSpacing) {
      // 五条线
      for (let i = 0; i < 5; i++) {
        const lineY = y + i * lineSpacing
        ctx.beginPath()
        ctx.moveTo(0, lineY)
        ctx.lineTo(canvas.width, lineY)
        ctx.stroke()
      }
    }
  }
  
  /**
   * 绘制坐标系图案
   */
  function drawCoordinatePattern(dpr, color) {
    const ctx = bgCtx.value
    const canvas = bgCanvas.value
    const spacing = 20 * patternDensity.value * dpr
    
    // 原点位置
    const originX = coordinateOriginX.value * dpr || canvas.width / 2
    const originY = coordinateOriginY.value * dpr || canvas.height / 2
    
    // 绘制网格线
    ctx.strokeStyle = color
    ctx.lineWidth = 0.5 * dpr
    
    // 垂直网格线
    for (let x = originX % spacing; x < canvas.width; x += spacing) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvas.height)
      ctx.stroke()
    }
    
    // 水平网格线
    for (let y = originY % spacing; y < canvas.height; y += spacing) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width, y)
      ctx.stroke()
    }
    
    // 绘制坐标轴
    ctx.strokeStyle = color
    ctx.lineWidth = 2 * dpr
    
    // X轴
    ctx.beginPath()
    ctx.moveTo(0, originY)
    ctx.lineTo(canvas.width, originY)
    ctx.stroke()
    
    // Y轴
    ctx.beginPath()
    ctx.moveTo(originX, 0)
    ctx.lineTo(originX, canvas.height)
    ctx.stroke()
    
    // 绘制箭头
    const arrowSize = 10 * dpr
    
    // X轴箭头
    ctx.beginPath()
    ctx.moveTo(canvas.width - arrowSize, originY - arrowSize / 2)
    ctx.lineTo(canvas.width, originY)
    ctx.lineTo(canvas.width - arrowSize, originY + arrowSize / 2)
    ctx.stroke()
    
    // Y轴箭头
    ctx.beginPath()
    ctx.moveTo(originX - arrowSize / 2, arrowSize)
    ctx.lineTo(originX, 0)
    ctx.lineTo(originX + arrowSize / 2, arrowSize)
    ctx.stroke()
  }
  
  /**
   * 绘制图片背景
   */
  function drawImagePattern() {
    if (!backgroundImage.value) return
    
    const ctx = bgCtx.value
    const canvas = bgCanvas.value
    const img = backgroundImage.value
    const transform = imageTransform.value
    
    ctx.save()
    ctx.translate(transform.x, transform.y)
    ctx.rotate(transform.rotation * Math.PI / 180)
    ctx.scale(transform.scale, transform.scale)
    
    const width = transform.width || img.width
    const height = transform.height || img.height
    
    ctx.drawImage(img, 0, 0, width, height)
    ctx.restore()
  }
  
  /**
   * 设置背景图片
   */
  function setBackgroundImage(file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        backgroundImage.value = img
        backgroundImageData.value = e.target.result
        
        // 初始化变换
        imageTransform.value = {
          x: 0,
          y: 0,
          width: img.width,
          height: img.height,
          rotation: 0,
          scale: 1.0
        }
        
        backgroundPattern.value = 'image'
        drawBackground()
        
        localStorage.setItem('backgroundImageData', e.target.result)
        localStorage.setItem('imageTransform', JSON.stringify(imageTransform.value))
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  }
  
  /**
   * 清除背景图片
   */
  function clearBackgroundImage() {
    backgroundImage.value = null
    backgroundImageData.value = null
    backgroundPattern.value = 'blank'
    localStorage.removeItem('backgroundImageData')
    localStorage.removeItem('imageTransform')
    drawBackground()
  }
  
  /**
   * 保存设置
   */
  function saveSettings() {
    localStorage.setItem('backgroundColor', backgroundColor.value)
    localStorage.setItem('backgroundPattern', backgroundPattern.value)
    localStorage.setItem('bgOpacity', bgOpacity.value)
    localStorage.setItem('patternIntensity', patternIntensity.value)
    localStorage.setItem('patternDensity', patternDensity.value)
    localStorage.setItem('coordinateOriginX', coordinateOriginX.value)
    localStorage.setItem('coordinateOriginY', coordinateOriginY.value)
  }
  
  /**
   * 十六进制颜色转RGB
   */
  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 }
  }
  
  // ========== 监听变化 ==========
  watch([backgroundColor, backgroundPattern, bgOpacity, patternIntensity, patternDensity], () => {
    drawBackground()
  })
  
  // ========== 返回API ==========
  return {
    // 状态
    backgroundColor,
    backgroundPattern,
    bgOpacity,
    patternIntensity,
    patternDensity,
    backgroundImage,
    imageSize,
    coordinateOriginX,
    coordinateOriginY,
    imageTransform,
    
    // 方法
    drawBackground,
    setBackgroundImage,
    clearBackgroundImage,
    saveSettings
  }
}
