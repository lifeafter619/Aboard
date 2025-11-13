/**
 * 分页管理 Composable
 * 处理多页画布的创建、切换和管理
 */
import { ref, computed, watch } from 'vue'

export function usePagination() {
  // ========== 状态管理 ==========
  const pages = ref([])
  const currentPageIndex = ref(0)
  const canvasMode = ref(localStorage.getItem('canvasMode') || 'infinite')
  const pageSize = ref(localStorage.getItem('pageSize') || 'A4')
  const pageOrientation = ref(localStorage.getItem('pageOrientation') || 'portrait')
  
  // 自定义页面尺寸
  const customWidth = ref(parseInt(localStorage.getItem('customPageWidth')) || 800)
  const customHeight = ref(parseInt(localStorage.getItem('customPageHeight')) || 600)
  
  // 初始化第一页
  if (pages.value.length === 0) {
    pages.value.push(createNewPage())
  }
  
  // ========== 计算属性 ==========
  const currentPage = computed(() => pages.value[currentPageIndex.value])
  const totalPages = computed(() => pages.value.length)
  const hasPrevPage = computed(() => currentPageIndex.value > 0)
  const hasNextPage = computed(() => currentPageIndex.value < totalPages.value - 1)
  const isInfiniteMode = computed(() => canvasMode.value === 'infinite')
  const isPaginatedMode = computed(() => canvasMode.value === 'paginated')
  
  // ========== 页面尺寸配置 ==========
  const pageSizes = {
    'A4': { portrait: { width: 210, height: 297 }, landscape: { width: 297, height: 210 } },
    'A3': { portrait: { width: 297, height: 420 }, landscape: { width: 420, height: 297 } },
    'B5': { portrait: { width: 176, height: 250 }, landscape: { width: 250, height: 176 } },
    '16:9': { landscape: { width: 1920, height: 1080 }, portrait: { width: 1080, height: 1920 } },
    '4:3': { landscape: { width: 1024, height: 768 }, portrait: { width: 768, height: 1024 } },
    'custom': { width: customWidth.value, height: customHeight.value }
  }
  
  /**
   * 创建新页面
   * @returns {Object} 新页面对象
   */
  function createNewPage() {
    return {
      id: Date.now() + Math.random(),
      strokes: [],
      images: [],
      backgroundColor: '#ffffff',
      backgroundPattern: 'blank',
      canvasData: null,
      timestamp: Date.now()
    }
  }
  
  /**
   * 添加新页面
   * @param {number} insertIndex - 插入位置（可选，默认在当前页后）
   */
  function addPage(insertIndex = null) {
    const newPage = createNewPage()
    
    if (insertIndex !== null && insertIndex >= 0 && insertIndex <= pages.value.length) {
      pages.value.splice(insertIndex, 0, newPage)
      if (insertIndex <= currentPageIndex.value) {
        currentPageIndex.value++
      }
    } else {
      // 在当前页后插入
      const insertPos = currentPageIndex.value + 1
      pages.value.splice(insertPos, 0, newPage)
      currentPageIndex.value = insertPos
    }
    
    saveToLocalStorage()
  }
  
  /**
   * 删除页面
   * @param {number} pageIndex - 要删除的页面索引
   */
  function deletePage(pageIndex = null) {
    if (pages.value.length <= 1) {
      // 至少保留一页
      console.warn('至少需要保留一页')
      return false
    }
    
    const indexToDelete = pageIndex !== null ? pageIndex : currentPageIndex.value
    
    if (indexToDelete >= 0 && indexToDelete < pages.value.length) {
      pages.value.splice(indexToDelete, 1)
      
      // 调整当前页索引
      if (currentPageIndex.value >= pages.value.length) {
        currentPageIndex.value = pages.value.length - 1
      }
      
      saveToLocalStorage()
      return true
    }
    
    return false
  }
  
  /**
   * 切换到指定页面
   * @param {number} pageIndex - 目标页面索引
   */
  function goToPage(pageIndex) {
    if (pageIndex >= 0 && pageIndex < pages.value.length) {
      currentPageIndex.value = pageIndex
      saveToLocalStorage()
      return true
    }
    return false
  }
  
  /**
   * 下一页
   */
  function nextPage() {
    if (hasNextPage.value) {
      currentPageIndex.value++
      saveToLocalStorage()
      return true
    }
    return false
  }
  
  /**
   * 上一页
   */
  function prevPage() {
    if (hasPrevPage.value) {
      currentPageIndex.value--
      saveToLocalStorage()
      return true
    }
    return false
  }
  
  /**
   * 复制页面
   * @param {number} pageIndex - 要复制的页面索引
   */
  function duplicatePage(pageIndex = null) {
    const indexToCopy = pageIndex !== null ? pageIndex : currentPageIndex.value
    
    if (indexToCopy >= 0 && indexToCopy < pages.value.length) {
      const originalPage = pages.value[indexToCopy]
      const newPage = {
        ...createNewPage(),
        strokes: JSON.parse(JSON.stringify(originalPage.strokes)),
        images: JSON.parse(JSON.stringify(originalPage.images)),
        backgroundColor: originalPage.backgroundColor,
        backgroundPattern: originalPage.backgroundPattern,
        canvasData: originalPage.canvasData
      }
      
      pages.value.splice(indexToCopy + 1, 0, newPage)
      currentPageIndex.value = indexToCopy + 1
      saveToLocalStorage()
      return true
    }
    
    return false
  }
  
  /**
   * 清空当前页面
   */
  function clearCurrentPage() {
    if (currentPage.value) {
      currentPage.value.strokes = []
      currentPage.value.images = []
      currentPage.value.canvasData = null
      saveToLocalStorage()
      return true
    }
    return false
  }
  
  /**
   * 保存当前页面的画布数据
   * @param {string} canvasData - 画布数据URL
   */
  function saveCurrentPageCanvas(canvasData) {
    if (currentPage.value) {
      currentPage.value.canvasData = canvasData
      currentPage.value.timestamp = Date.now()
      saveToLocalStorage()
    }
  }
  
  /**
   * 设置画布模式
   * @param {string} mode - 'infinite' | 'paginated'
   */
  function setCanvasMode(mode) {
    canvasMode.value = mode
    localStorage.setItem('canvasMode', mode)
  }
  
  /**
   * 设置页面尺寸
   * @param {string} size - 页面尺寸类型
   */
  function setPageSize(size) {
    pageSize.value = size
    localStorage.setItem('pageSize', size)
  }
  
  /**
   * 设置页面方向
   * @param {string} orientation - 'portrait' | 'landscape'
   */
  function setPageOrientation(orientation) {
    pageOrientation.value = orientation
    localStorage.setItem('pageOrientation', orientation)
  }
  
  /**
   * 设置自定义页面尺寸
   * @param {number} width - 宽度
   * @param {number} height - 高度
   */
  function setCustomSize(width, height) {
    customWidth.value = width
    customHeight.value = height
    localStorage.setItem('customPageWidth', width)
    localStorage.setItem('customPageHeight', height)
  }
  
  /**
   * 获取当前页面尺寸
   * @returns {Object} { width, height }
   */
  function getCurrentPageSize() {
    if (pageSize.value === 'custom') {
      return { width: customWidth.value, height: customHeight.value }
    }
    
    const sizeConfig = pageSizes[pageSize.value]
    if (!sizeConfig) {
      return { width: 800, height: 600 }
    }
    
    if (pageOrientation.value === 'landscape') {
      return sizeConfig.landscape || sizeConfig.portrait
    } else {
      return sizeConfig.portrait || sizeConfig.landscape
    }
  }
  
  /**
   * 保存到本地存储
   */
  function saveToLocalStorage() {
    try {
      const data = {
        pages: pages.value.map(page => ({
          id: page.id,
          backgroundColor: page.backgroundColor,
          backgroundPattern: page.backgroundPattern,
          canvasData: page.canvasData,
          timestamp: page.timestamp
        })),
        currentPageIndex: currentPageIndex.value,
        canvasMode: canvasMode.value,
        pageSize: pageSize.value,
        pageOrientation: pageOrientation.value
      }
      localStorage.setItem('paginationData', JSON.stringify(data))
    } catch (error) {
      console.error('保存分页数据失败:', error)
    }
  }
  
  /**
   * 从本地存储加载
   */
  function loadFromLocalStorage() {
    try {
      const data = localStorage.getItem('paginationData')
      if (data) {
        const parsed = JSON.parse(data)
        
        if (parsed.pages && parsed.pages.length > 0) {
          pages.value = parsed.pages.map(page => ({
            ...createNewPage(),
            ...page
          }))
        }
        
        if (parsed.currentPageIndex !== undefined) {
          currentPageIndex.value = Math.max(0, Math.min(parsed.currentPageIndex, pages.value.length - 1))
        }
        
        if (parsed.canvasMode) {
          canvasMode.value = parsed.canvasMode
        }
        
        if (parsed.pageSize) {
          pageSize.value = parsed.pageSize
        }
        
        if (parsed.pageOrientation) {
          pageOrientation.value = parsed.pageOrientation
        }
      }
    } catch (error) {
      console.error('加载分页数据失败:', error)
    }
  }
  
  /**
   * 清除所有数据
   */
  function clearAll() {
    pages.value = [createNewPage()]
    currentPageIndex.value = 0
    saveToLocalStorage()
  }
  
  // ========== 初始化 ==========
  loadFromLocalStorage()
  
  // ========== 监听变化 ==========
  watch([currentPageIndex, canvasMode], () => {
    saveToLocalStorage()
  })
  
  // ========== 返回API ==========
  return {
    // 状态
    pages,
    currentPage,
    currentPageIndex,
    totalPages,
    hasPrevPage,
    hasNextPage,
    canvasMode,
    pageSize,
    pageOrientation,
    customWidth,
    customHeight,
    isInfiniteMode,
    isPaginatedMode,
    
    // 页面管理
    addPage,
    deletePage,
    goToPage,
    nextPage,
    prevPage,
    duplicatePage,
    clearCurrentPage,
    saveCurrentPageCanvas,
    
    // 设置
    setCanvasMode,
    setPageSize,
    setPageOrientation,
    setCustomSize,
    getCurrentPageSize,
    
    // 数据管理
    saveToLocalStorage,
    loadFromLocalStorage,
    clearAll
  }
}
