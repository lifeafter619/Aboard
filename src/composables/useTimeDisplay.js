/**
 * 时间显示 Composable
 * 处理时间和日期显示功能
 */
import { ref, computed, watch } from 'vue'

export function useTimeDisplay() {
  // ========== 状态管理 ==========
  const isVisible = ref(false)
  const showDate = ref(localStorage.getItem('timeDisplayShowDate') !== 'false')
  const showTime = ref(localStorage.getItem('timeDisplayShowTime') !== 'false')
  const timeFormat = ref(localStorage.getItem('timeDisplayTimeFormat') || '24') // '12' | '24'
  const dateFormat = ref(localStorage.getItem('timeDisplayDateFormat') || 'YYYY-MM-DD')
  
  // UI设置
  const fontSize = ref(parseInt(localStorage.getItem('timeDisplayFontSize')) || 48)
  const textColor = ref(localStorage.getItem('timeDisplayTextColor') || '#000000')
  const backgroundColor = ref(localStorage.getItem('timeDisplayBgColor') || '#ffffff')
  const backgroundOpacity = ref(parseFloat(localStorage.getItem('timeDisplayBgOpacity')) || 0.9)
  const position = ref({
    x: parseInt(localStorage.getItem('timeDisplayX')) || 100,
    y: parseInt(localStorage.getItem('timeDisplayY')) || 100
  })
  
  const isFullscreen = ref(false)
  const isDragging = ref(false)
  
  // 当前时间
  const currentTime = ref(new Date())
  const updateInterval = ref(null)
  
  // ========== 日期格式选项 ==========
  const dateFormatOptions = [
    { value: 'YYYY-MM-DD', label: '年-月-日 (2024-01-15)' },
    { value: 'MM-DD-YYYY', label: '月-日-年 (01-15-2024)' },
    { value: 'DD-MM-YYYY', label: '日-月-年 (15-01-2024)' },
    { value: 'YYYY年MM月DD日', label: '中文格式 (2024年01月15日)' },
    { value: 'MM月DD日', label: '简短中文 (01月15日)' }
  ]
  
  // ========== 计算属性 ==========
  const formattedTime = computed(() => {
    const date = currentTime.value
    let hours = date.getHours()
    const minutes = date.getMinutes()
    const seconds = date.getSeconds()
    
    if (timeFormat.value === '12') {
      const ampm = hours >= 12 ? 'PM' : 'AM'
      hours = hours % 12 || 12
      return `${hours}:${pad(minutes)}:${pad(seconds)} ${ampm}`
    } else {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    }
  })
  
  const formattedDate = computed(() => {
    const date = currentTime.value
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const weekday = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][date.getDay()]
    
    let formatted = dateFormat.value
    formatted = formatted.replace('YYYY', year)
    formatted = formatted.replace('MM', pad(month))
    formatted = formatted.replace('DD', pad(day))
    
    return `${formatted} ${weekday}`
  })
  
  const displayText = computed(() => {
    const parts = []
    if (showDate.value) parts.push(formattedDate.value)
    if (showTime.value) parts.push(formattedTime.value)
    return parts.join('\n')
  })
  
  // ========== 核心方法 ==========
  
  /**
   * 显示时间显示器
   */
  function show() {
    isVisible.value = true
    startUpdate()
    saveSettings()
  }
  
  /**
   * 隐藏时间显示器
   */
  function hide() {
    isVisible.value = false
    stopUpdate()
    saveSettings()
  }
  
  /**
   * 切换显示状态
   */
  function toggle() {
    if (isVisible.value) {
      hide()
    } else {
      show()
    }
  }
  
  /**
   * 开始更新时间
   */
  function startUpdate() {
    if (updateInterval.value) return
    
    // 立即更新一次
    currentTime.value = new Date()
    
    // 每秒更新
    updateInterval.value = setInterval(() => {
      currentTime.value = new Date()
    }, 1000)
  }
  
  /**
   * 停止更新时间
   */
  function stopUpdate() {
    if (updateInterval.value) {
      clearInterval(updateInterval.value)
      updateInterval.value = null
    }
  }
  
  /**
   * 切换全屏模式
   */
  function toggleFullscreen() {
    isFullscreen.value = !isFullscreen.value
  }
  
  /**
   * 进入全屏模式
   */
  function enterFullscreen() {
    isFullscreen.value = true
  }
  
  /**
   * 退出全屏模式
   */
  function exitFullscreen() {
    isFullscreen.value = false
  }
  
  /**
   * 设置显示选项
   */
  function setShowDate(value) {
    showDate.value = value
    saveSettings()
  }
  
  function setShowTime(value) {
    showTime.value = value
    saveSettings()
  }
  
  function setTimeFormat(format) {
    timeFormat.value = format
    saveSettings()
  }
  
  function setDateFormat(format) {
    dateFormat.value = format
    saveSettings()
  }
  
  /**
   * 设置样式
   */
  function setFontSize(size) {
    fontSize.value = size
    saveSettings()
  }
  
  function setTextColor(color) {
    textColor.value = color
    saveSettings()
  }
  
  function setBackgroundColor(color) {
    backgroundColor.value = color
    saveSettings()
  }
  
  function setBackgroundOpacity(opacity) {
    backgroundOpacity.value = Math.max(0, Math.min(1, opacity))
    saveSettings()
  }
  
  /**
   * 设置位置
   */
  function setPosition(x, y) {
    position.value = { x, y }
    saveSettings()
  }
  
  /**
   * 保存设置
   */
  function saveSettings() {
    localStorage.setItem('timeDisplayVisible', isVisible.value)
    localStorage.setItem('timeDisplayShowDate', showDate.value)
    localStorage.setItem('timeDisplayShowTime', showTime.value)
    localStorage.setItem('timeDisplayTimeFormat', timeFormat.value)
    localStorage.setItem('timeDisplayDateFormat', dateFormat.value)
    localStorage.setItem('timeDisplayFontSize', fontSize.value)
    localStorage.setItem('timeDisplayTextColor', textColor.value)
    localStorage.setItem('timeDisplayBgColor', backgroundColor.value)
    localStorage.setItem('timeDisplayBgOpacity', backgroundOpacity.value)
    localStorage.setItem('timeDisplayX', position.value.x)
    localStorage.setItem('timeDisplayY', position.value.y)
  }
  
  /**
   * 加载设置
   */
  function loadSettings() {
    const savedVisible = localStorage.getItem('timeDisplayVisible')
    if (savedVisible === 'true') {
      show()
    }
  }
  
  /**
   * 补零
   */
  function pad(num) {
    return String(num).padStart(2, '0')
  }
  
  // ========== 初始化 ==========
  loadSettings()
  
  // ========== 监听变化 ==========
  watch([showDate, showTime, timeFormat, dateFormat], () => {
    saveSettings()
  })
  
  watch(isVisible, (newValue) => {
    if (newValue) {
      startUpdate()
    } else {
      stopUpdate()
    }
  })
  
  // ========== 返回API ==========
  return {
    // 状态
    isVisible,
    showDate,
    showTime,
    timeFormat,
    dateFormat,
    fontSize,
    textColor,
    backgroundColor,
    backgroundOpacity,
    position,
    isFullscreen,
    isDragging,
    
    // 计算属性
    formattedTime,
    formattedDate,
    displayText,
    dateFormatOptions,
    
    // 方法
    show,
    hide,
    toggle,
    toggleFullscreen,
    enterFullscreen,
    exitFullscreen,
    
    // 设置方法
    setShowDate,
    setShowTime,
    setTimeFormat,
    setDateFormat,
    setFontSize,
    setTextColor,
    setBackgroundColor,
    setBackgroundOpacity,
    setPosition,
    
    // 数据管理
    saveSettings,
    loadSettings
  }
}
