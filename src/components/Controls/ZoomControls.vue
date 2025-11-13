<template>
  <div class="zoom-controls" :class="positionClass">
    <button class="control-btn" @click="$emit('export')" title="导出画布">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
    </button>
    
    <button class="control-btn" @click="$emit('zoom-out')" title="缩小 (-)">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"></circle>
        <path d="M21 21l-4.35-4.35"></path>
        <line x1="8" y1="11" x2="14" y2="11"></line>
      </svg>
    </button>
    
    <input
      type="text"
      class="zoom-input"
      :value="`${Math.round(scale * 100)}%`"
      @change="handleZoomChange"
      title="缩放比例"
    >
    
    <button class="control-btn" @click="$emit('zoom-in')" title="放大 (+)">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"></circle>
        <path d="M21 21l-4.35-4.35"></path>
        <line x1="11" y1="8" x2="11" y2="14"></line>
        <line x1="8" y1="11" x2="14" y2="11"></line>
      </svg>
    </button>
    
    <button class="control-btn" @click="$emit('toggle-fullscreen')" title="全屏 (F11)">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
      </svg>
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  scale: { type: Number, default: 1 },
  position: { type: String, default: 'top-right' }
})

const emit = defineEmits(['zoom-in', 'zoom-out', 'zoom-change', 'toggle-fullscreen', 'export'])

const positionClass = computed(() => `position-${props.position}`)

const handleZoomChange = (e) => {
  const value = e.target.value.replace('%', '')
  emit('zoom-change', value)
}
</script>

<style scoped>
.zoom-controls {
  position: fixed;
  display: flex;
  gap: 8px;
  background: rgba(255, 255, 255, 0.95);
  padding: 8px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  z-index: 999;
}

.position-top-right { top: 20px; right: 20px; }
.position-top-left { top: 20px; left: 20px; }
.position-bottom-right { bottom: 80px; right: 20px; }
.position-bottom-left { bottom: 80px; left: 20px; }

.control-btn {
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.control-btn:hover {
  background: rgba(0, 0, 0, 0.05);
}

.zoom-input {
  width: 60px;
  text-align: center;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}
</style>
