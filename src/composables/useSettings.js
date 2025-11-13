/**
 * 设置管理 Composable
 * 处理用户设置的持久化和应用
 */
import { ref, watch } from 'vue'

export function useSettings() {
  // ========== 常量 ==========
  const SETTINGS_KEY = 'aboardSettings'
  
  // ========== 默认设置 ==========
  const defaultSettings = {
    // 通用设置
    globalFont: 'system',
    edgeSnap: true,
    controlPosition: 'top-right',
    
    // 显示设置
    showZoomControls: true,
    showFullscreenBtn: true,
    toolbarSize: 40,
    configScale: 100,
    themeColor: '#007AFF',
    
    // 画布设置
    canvasMode: 'infinite',
    canvasWidth: 1920,
    canvasHeight: 1080,
    canvasPreset: 'custom',
    canvasRatio: 'custom',
    
    // 背景设置
    bgOpacity: 100,
    patternIntensity: 50,
    patternDensity: 100,
    bgColor: '#ffffff',
    bgPattern: 'blank',
    
    // 图案偏好
    patternPreferences: {
      blank: true,
      dots: true,
      grid: true,
      tianzige: true,
      'english-lines': true,
      'music-staff': true,
      coordinate: true,
      image: true
    },
    
    // 时间显示设置
    showTimeDisplay: false,
    timeDisplayType: 'both',
    timezone: 'Asia/Shanghai',
    timeFormat: '24h',
    dateFormat: 'yyyy-mm-dd',
    timeColor: '#000000',
    timeBgColor: '#FFFFFF',
    timeFontSize: 16,
    timeOpacity: 100,
    timeFullscreenMode: 'double',
    timeFullscreenFontSize: 15
  }

  // ========== 状态管理 ==========
  const settings = ref({ ...defaultSettings })

  // ========== 方法 ==========
  /**
   * 加载设置
   */
  const loadSettings = () => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        settings.value = { ...defaultSettings, ...parsed }
      }
    } catch (error) {
      console.error('加载设置失败:', error)
      settings.value = { ...defaultSettings }
    }
  }

  /**
   * 保存设置
   */
  const saveSettings = () => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings.value))
    } catch (error) {
      console.error('保存设置失败:', error)
    }
  }

  /**
   * 更新单个设置
   * @param {string} key - 设置键
   * @param {*} value - 设置值
   */
  const updateSetting = (key, value) => {
    settings.value[key] = value
    saveSettings()
  }

  /**
   * 批量更新设置
   * @param {Object} updates - 设置更新对象
   */
  const updateSettings = (updates) => {
    settings.value = { ...settings.value, ...updates }
    saveSettings()
  }

  /**
   * 重置设置为默认值
   */
  const resetSettings = () => {
    settings.value = { ...defaultSettings }
    saveSettings()
  }

  /**
   * 获取特定设置的值
   * @param {string} key - 设置键
   * @returns {*} 设置值
   */
  const getSetting = (key) => {
    return settings.value[key]
  }

  /**
   * 应用主题色
   */
  const applyThemeColor = () => {
    document.documentElement.style.setProperty(
      '--theme-color',
      settings.value.themeColor
    )
  }

  /**
   * 应用字体
   */
  const applyGlobalFont = () => {
    const fontMap = {
      system: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      serif: 'serif',
      'sans-serif': 'sans-serif',
      monospace: 'monospace',
      cursive: 'cursive',
      'Microsoft YaHei': '"Microsoft YaHei", sans-serif',
      SimSun: 'SimSun, serif',
      SimHei: 'SimHei, sans-serif',
      KaiTi: 'KaiTi, serif',
      FangSong: 'FangSong, serif'
    }

    const font = fontMap[settings.value.globalFont] || fontMap.system
    document.documentElement.style.setProperty('--global-font', font)
  }

  /**
   * 应用工具栏大小
   */
  const applyToolbarSize = () => {
    document.documentElement.style.setProperty(
      '--toolbar-height',
      `${settings.value.toolbarSize}px`
    )
  }

  /**
   * 应用配置面板缩放
   */
  const applyConfigScale = () => {
    document.documentElement.style.setProperty(
      '--config-scale',
      `${settings.value.configScale / 100}`
    )
  }

  /**
   * 应用所有设置
   */
  const applyAllSettings = () => {
    applyThemeColor()
    applyGlobalFont()
    applyToolbarSize()
    applyConfigScale()
  }

  // ========== 自动保存 ==========
  // 监听设置变化，自动保存
  watch(
    settings,
    () => {
      saveSettings()
    },
    { deep: true }
  )

  // 初始化时加载设置
  loadSettings()
  applyAllSettings()

  return {
    // 状态
    settings,

    // 方法
    loadSettings,
    saveSettings,
    updateSetting,
    updateSettings,
    resetSettings,
    getSetting,
    applyThemeColor,
    applyGlobalFont,
    applyToolbarSize,
    applyConfigScale,
    applyAllSettings
  }
}
