<template>
  <div class="tool-config">
    <button class="close-btn" @click="$emit('close')">×</button>
    <div v-if="tool === 'pen'" class="config-content">
      <h4>笔设置</h4>
      <div class="color-picker">
        <input type="color" :value="color" @input="$emit('update:color', $event.target.value)">
      </div>
      <div class="slider-group">
        <label>粗细: {{ penSize }}px</label>
        <input type="range" min="1" max="50" :value="penSize" @input="$emit('update:pen-size', Number($event.target.value))">
      </div>
    </div>
    <div v-if="tool === 'eraser'" class="config-content">
      <h4>橡皮擦设置</h4>
      <div class="slider-group">
        <label>大小: {{ eraserSize }}px</label>
        <input type="range" min="10" max="50" :value="eraserSize" @input="$emit('update:eraser-size', Number($event.target.value))">
      </div>
    </div>
    <div v-if="tool === 'background'" class="config-content">
      <h4>背景设置</h4>
      <input type="color" :value="bgColor" @input="$emit('update:bg-color', $event.target.value)">
    </div>
  </div>
</template>

<script setup>
defineProps({ tool: String, color: String, penSize: Number, penType: String, eraserSize: Number, eraserShape: String, bgColor: String, bgPattern: String })
defineEmits(['update:color', 'update:pen-size', 'update:pen-type', 'update:eraser-size', 'update:eraser-shape', 'update:bg-color', 'update:bg-pattern', 'close'])
</script>

<style scoped>
.tool-config {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  z-index: 1001;
  min-width: 300px;
}
.close-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  border: none;
  background: none;
  font-size: 24px;
  cursor: pointer;
}
.config-content { padding-top: 10px; }
.slider-group { margin: 10px 0; }
.color-picker input { width: 100%; height: 40px; }
</style>
