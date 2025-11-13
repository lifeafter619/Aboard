/**
 * 导出管理 Composable
 * 处理画布导出为图片功能
 */
import { ref } from 'vue'

export function useExport(canvas, bgCanvas) {
  // ========== 状态管理 ==========
  const isExporting = ref(false)
  const exportFormat = ref(localStorage.getItem('exportFormat') || 'png')
  const exportQuality = ref(parseFloat(localStorage.getItem('exportQuality')) || 0.92)
  
  /**
   * 合并画布（背景 + 绘图内容）
   * @returns {HTMLCanvasElement} 合并后的画布
   */
  function mergeCanvases() {
    const mergedCanvas = document.createElement('canvas')
    const mergedCtx = mergedCanvas.getContext('2d')
    
    // 设置合并画布尺寸
    mergedCanvas.width = canvas.value.width
    mergedCanvas.height = canvas.value.height
    
    // 绘制背景层
    if (bgCanvas.value) {
      mergedCtx.drawImage(bgCanvas.value, 0, 0)
    }
    
    // 绘制内容层
    mergedCtx.drawImage(canvas.value, 0, 0)
    
    return mergedCanvas
  }
  
  /**
   * 获取导出文件名
   * @param {string} baseName - 基础文件名
   * @param {number} pageNumber - 页码（可选）
   * @returns {string} 完整文件名
   */
  function getExportFileName(baseName = '白板', pageNumber = null) {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const seconds = String(now.getSeconds()).padStart(2, '0')
    
    const timestamp = `${year}${month}${day}_${hours}${minutes}${seconds}`
    const pageSuffix = pageNumber !== null ? `-${pageNumber}` : ''
    const extension = exportFormat.value === 'png' ? 'png' : 'jpg'
    
    return `${baseName}_${timestamp}${pageSuffix}.${extension}`
  }
  
  /**
   * 导出当前页面
   * @param {string} fileName - 文件名（可选）
   */
  function exportCurrentPage(fileName = null) {
    if (!canvas.value || isExporting.value) return
    
    isExporting.value = true
    
    try {
      const mergedCanvas = mergeCanvases()
      const dataUrl = mergedCanvas.toDataURL(
        `image/${exportFormat.value === 'png' ? 'png' : 'jpeg'}`,
        exportQuality.value
      )
      
      downloadImage(dataUrl, fileName || getExportFileName())
    } catch (error) {
      console.error('导出失败:', error)
    } finally {
      isExporting.value = false
    }
  }
  
  /**
   * 导出所有页面
   * @param {Array} pages - 页面数组
   * @param {string} baseName - 基础文件名
   */
  async function exportAllPages(pages, baseName = '白板') {
    if (!pages || pages.length === 0 || isExporting.value) return
    
    isExporting.value = true
    
    try {
      for (let i = 0; i < pages.length; i++) {
        // 这里需要根据实际的页面切换逻辑来实现
        // 暂时只导出当前页面的逻辑
        const fileName = getExportFileName(baseName, i + 1)
        
        // 添加短暂延迟以避免浏览器阻止多次下载
        await new Promise(resolve => setTimeout(resolve, 200))
        
        const mergedCanvas = mergeCanvases()
        const dataUrl = mergedCanvas.toDataURL(
          `image/${exportFormat.value === 'png' ? 'png' : 'jpeg'}`,
          exportQuality.value
        )
        
        downloadImage(dataUrl, fileName)
      }
    } catch (error) {
      console.error('批量导出失败:', error)
    } finally {
      isExporting.value = false
    }
  }
  
  /**
   * 导出指定页面
   * @param {Array} pageNumbers - 页码数组
   * @param {Array} pages - 页面数组
   * @param {string} baseName - 基础文件名
   */
  async function exportSelectedPages(pageNumbers, pages, baseName = '白板') {
    if (!pageNumbers || pageNumbers.length === 0 || isExporting.value) return
    
    isExporting.value = true
    
    try {
      for (let i = 0; i < pageNumbers.length; i++) {
        const pageNum = pageNumbers[i]
        const fileName = getExportFileName(baseName, pageNum)
        
        await new Promise(resolve => setTimeout(resolve, 200))
        
        // 这里需要根据实际的页面切换逻辑来实现
        const mergedCanvas = mergeCanvases()
        const dataUrl = mergedCanvas.toDataURL(
          `image/${exportFormat.value === 'png' ? 'png' : 'jpeg'}`,
          exportQuality.value
        )
        
        downloadImage(dataUrl, fileName)
      }
    } catch (error) {
      console.error('选择性导出失败:', error)
    } finally {
      isExporting.value = false
    }
  }
  
  /**
   * 下载图片
   * @param {string} dataUrl - 图片数据URL
   * @param {string} fileName - 文件名
   */
  function downloadImage(dataUrl, fileName) {
    const link = document.createElement('a')
    link.download = fileName
    link.href = dataUrl
    link.click()
  }
  
  /**
   * 设置导出格式
   * @param {string} format - 'png' | 'jpeg'
   */
  function setExportFormat(format) {
    exportFormat.value = format
    localStorage.setItem('exportFormat', format)
  }
  
  /**
   * 设置导出质量（仅JPEG）
   * @param {number} quality - 0-1之间的数值
   */
  function setExportQuality(quality) {
    exportQuality.value = Math.max(0, Math.min(1, quality))
    localStorage.setItem('exportQuality', exportQuality.value)
  }
  
  /**
   * 复制到剪贴板
   */
  async function copyToClipboard() {
    if (!canvas.value) return
    
    try {
      const mergedCanvas = mergeCanvases()
      
      // 将canvas转换为blob
      const blob = await new Promise(resolve => {
        mergedCanvas.toBlob(resolve, 'image/png')
      })
      
      // 复制到剪贴板
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ])
      
      return true
    } catch (error) {
      console.error('复制到剪贴板失败:', error)
      return false
    }
  }
  
  // ========== 返回API ==========
  return {
    // 状态
    isExporting,
    exportFormat,
    exportQuality,
    
    // 导出方法
    exportCurrentPage,
    exportAllPages,
    exportSelectedPages,
    copyToClipboard,
    
    // 设置方法
    setExportFormat,
    setExportQuality
  }
}
