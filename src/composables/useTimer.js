/**
 * 计时器管理 Composable
 * 处理正计时、倒计时和音频播放功能
 */
import { ref, computed } from 'vue'

export function useTimer() {
  // ========== 计时器实例管理 ==========
  const timers = ref([])
  const nextTimerId = ref(1)
  
  // ========== 预加载音效 ==========
  const defaultSounds = [
    { name: '上课铃声', url: '/sounds/class-bell.MP3' },
    { name: '考试结束', url: '/sounds/exam-end.MP3' },
    { name: '柔和提示', url: '/sounds/gentle-alarm.MP3' },
    { name: '数字提示', url: '/sounds/digital-beep.MP3' }
  ]
  
  const customSounds = ref(JSON.parse(localStorage.getItem('customTimerSounds') || '[]'))
  
  /**
   * 创建新的计时器实例
   * @param {Object} options - 计时器选项
   * @returns {Object} 计时器实例
   */
  function createTimer(options = {}) {
    const timer = {
      id: nextTimerId.value++,
      mode: options.mode || 'stopwatch', // 'stopwatch' | 'countdown'
      title: options.title || '',
      
      // 时间状态
      isRunning: false,
      isPaused: false,
      startTime: 0,
      elapsedTime: options.startTime || 0,
      countdownDuration: options.duration || 0,
      remainingTime: options.duration || 0,
      intervalId: null,
      
      // 音频设置
      playSound: options.playSound || false,
      selectedSound: options.selectedSound || 'class-bell',
      customSoundUrl: options.customSoundUrl || null,
      loopSound: options.loopSound || false,
      loopCount: options.loopCount || 1,
      currentLoopIteration: 0,
      audioElement: null,
      
      // UI状态
      isFullscreen: false,
      isMinimal: false,
      fontSize: 32,
      fullscreenFontSizePercent: 15,
      position: { x: 100, y: 100 },
      isDragging: false
    }
    
    timers.value.push(timer)
    return timer
  }
  
  /**
   * 删除计时器
   */
  function deleteTimer(timerId) {
    const index = timers.value.findIndex(t => t.id === timerId)
    if (index !== -1) {
      const timer = timers.value[index]
      stopTimer(timerId)
      if (timer.audioElement) {
        timer.audioElement.pause()
        timer.audioElement = null
      }
      timers.value.splice(index, 1)
    }
  }
  
  /**
   * 获取计时器
   */
  function getTimer(timerId) {
    return timers.value.find(t => t.id === timerId)
  }
  
  /**
   * 启动计时器
   */
  function startTimer(timerId) {
    const timer = getTimer(timerId)
    if (!timer || timer.isRunning) return
    
    timer.isRunning = true
    timer.isPaused = false
    timer.startTime = Date.now()
    
    // 启动更新循环
    timer.intervalId = setInterval(() => {
      updateTimer(timerId)
    }, 100)
  }
  
  /**
   * 暂停计时器
   */
  function pauseTimer(timerId) {
    const timer = getTimer(timerId)
    if (!timer || !timer.isRunning) return
    
    timer.isRunning = false
    timer.isPaused = true
    
    if (timer.intervalId) {
      clearInterval(timer.intervalId)
      timer.intervalId = null
    }
  }
  
  /**
   * 重置计时器
   */
  function resetTimer(timerId) {
    const timer = getTimer(timerId)
    if (!timer) return
    
    stopTimer(timerId)
    
    if (timer.mode === 'stopwatch') {
      timer.elapsedTime = 0
    } else {
      timer.remainingTime = timer.countdownDuration
      timer.elapsedTime = 0
    }
    
    timer.currentLoopIteration = 0
  }
  
  /**
   * 停止计时器
   */
  function stopTimer(timerId) {
    const timer = getTimer(timerId)
    if (!timer) return
    
    timer.isRunning = false
    timer.isPaused = false
    
    if (timer.intervalId) {
      clearInterval(timer.intervalId)
      timer.intervalId = null
    }
    
    if (timer.audioElement) {
      timer.audioElement.pause()
      timer.audioElement.currentTime = 0
    }
  }
  
  /**
   * 更新计时器
   */
  function updateTimer(timerId) {
    const timer = getTimer(timerId)
    if (!timer || !timer.isRunning) return
    
    const now = Date.now()
    const delta = now - timer.startTime
    timer.startTime = now
    
    if (timer.mode === 'stopwatch') {
      // 正计时模式
      timer.elapsedTime += delta
    } else {
      // 倒计时模式
      timer.elapsedTime += delta
      timer.remainingTime = Math.max(0, timer.countdownDuration - timer.elapsedTime)
      
      // 倒计时结束
      if (timer.remainingTime <= 0) {
        timer.remainingTime = 0
        stopTimer(timerId)
        
        // 播放音效
        if (timer.playSound) {
          playTimerSound(timer)
        }
      }
    }
  }
  
  /**
   * 播放计时器音效
   */
  function playTimerSound(timer) {
    if (!timer.playSound) return
    
    // 获取音频URL
    let soundUrl = null
    if (timer.customSoundUrl) {
      soundUrl = timer.customSoundUrl
    } else {
      const sound = defaultSounds.find(s => s.url.includes(timer.selectedSound))
      soundUrl = sound ? sound.url : defaultSounds[0].url
    }
    
    // 创建音频元素
    if (!timer.audioElement) {
      timer.audioElement = new Audio(soundUrl)
    }
    
    timer.audioElement.src = soundUrl
    timer.currentLoopIteration = 0
    
    // 循环播放
    if (timer.loopSound && timer.loopCount > 1) {
      timer.audioElement.loop = false
      timer.audioElement.onended = () => {
        timer.currentLoopIteration++
        if (timer.currentLoopIteration < timer.loopCount) {
          timer.audioElement.play()
        }
      }
    } else {
      timer.audioElement.loop = false
    }
    
    timer.audioElement.play()
  }
  
  /**
   * 格式化时间显示
   */
  function formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  
  /**
   * 获取计时器显示时间
   */
  function getTimerDisplay(timerId) {
    const timer = getTimer(timerId)
    if (!timer) return '00:00:00'
    
    if (timer.mode === 'stopwatch') {
      return formatTime(timer.elapsedTime)
    } else {
      return formatTime(timer.remainingTime)
    }
  }
  
  /**
   * 切换全屏模式
   */
  function toggleFullscreen(timerId) {
    const timer = getTimer(timerId)
    if (!timer) return
    
    timer.isFullscreen = !timer.isFullscreen
  }
  
  /**
   * 切换最简模式
   */
  function toggleMinimal(timerId) {
    const timer = getTimer(timerId)
    if (!timer) return
    
    timer.isMinimal = !timer.isMinimal
  }
  
  /**
   * 添加自定义音效
   */
  function addCustomSound(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const sound = {
          name: file.name,
          url: e.target.result,
          isCustom: true
        }
        customSounds.value.push(sound)
        localStorage.setItem('customTimerSounds', JSON.stringify(customSounds.value))
        resolve(sound)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }
  
  /**
   * 删除自定义音效
   */
  function deleteCustomSound(soundUrl) {
    const index = customSounds.value.findIndex(s => s.url === soundUrl)
    if (index !== -1) {
      customSounds.value.splice(index, 1)
      localStorage.setItem('customTimerSounds', JSON.stringify(customSounds.value))
    }
  }
  
  /**
   * 试听音效
   */
  function previewSound(soundUrl) {
    const audio = new Audio(soundUrl)
    audio.play()
  }
  
  // ========== 返回API ==========
  return {
    // 状态
    timers,
    defaultSounds,
    customSounds,
    
    // 计时器管理
    createTimer,
    deleteTimer,
    getTimer,
    
    // 计时器控制
    startTimer,
    pauseTimer,
    resetTimer,
    stopTimer,
    
    // UI控制
    toggleFullscreen,
    toggleMinimal,
    
    // 音效管理
    addCustomSound,
    deleteCustomSound,
    previewSound,
    
    // 工具方法
    formatTime,
    getTimerDisplay
  }
}
