/**
 * 历史记录管理 Composable
 * 实现撤销/重做功能
 */
import { ref } from 'vue'

export function useHistory(canvas, ctx) {
  // ========== 状态管理 ==========
  const history = ref([])  // 历史记录栈
  const currentIndex = ref(-1)  // 当前历史记录索引
  const MAX_HISTORY = 50  // 最大历史记录数量

  // ========== 计算属性 ==========
  /**
   * 是否可以撤销
   */
  const canUndo = () => currentIndex.value > 0

  /**
   * 是否可以重做
   */
  const canRedo = () => currentIndex.value < history.value.length - 1

  // ========== 核心功能 ==========
  /**
   * 保存当前状态到历史记录
   */
  const saveState = () => {
    if (!canvas.value || !ctx.value) return

    // 删除当前索引之后的所有历史记录
    if (currentIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, currentIndex.value + 1)
    }

    // 保存当前画布状态
    const imageData = ctx.value.getImageData(
      0, 0,
      canvas.value.width,
      canvas.value.height
    )
    history.value.push(imageData)

    // 限制历史记录数量
    if (history.value.length > MAX_HISTORY) {
      history.value.shift()
    } else {
      currentIndex.value++
    }
  }

  /**
   * 撤销操作
   */
  const undo = () => {
    if (!canUndo() || !canvas.value || !ctx.value) return

    currentIndex.value--
    const imageData = history.value[currentIndex.value]
    ctx.value.putImageData(imageData, 0, 0)
  }

  /**
   * 重做操作
   */
  const redo = () => {
    if (!canRedo() || !canvas.value || !ctx.value) return

    currentIndex.value++
    const imageData = history.value[currentIndex.value]
    ctx.value.putImageData(imageData, 0, 0)
  }

  /**
   * 清空历史记录
   */
  const clearHistory = () => {
    history.value = []
    currentIndex.value = -1
  }

  return {
    // 状态
    history,
    currentIndex,

    // 方法
    canUndo,
    canRedo,
    saveState,
    undo,
    redo,
    clearHistory
  }
}
