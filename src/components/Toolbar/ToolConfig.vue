<template>
  <div class="tool-config">
    <button class="close-btn" @click="$emit('close')">×</button>
    
    <!-- 笔工具配置 -->
    <div v-if="tool === 'pen'" class="config-content">
      <h4>笔设置</h4>
      <div class="config-group">
        <label>笔触类型</label>
        <div class="pen-types">
          <button 
            v-for="type in penTypes" 
            :key="type.value"
            :class="{ active: penType === type.value }"
            @click="$emit('update:pen-type', type.value)"
            :title="type.label"
          >
            {{ type.label }}
          </button>
        </div>
      </div>
      <div class="config-group">
        <label>颜色</label>
        <div class="color-picker">
          <input type="color" :value="color" @input="$emit('update:color', $event.target.value)">
          <div class="color-presets">
            <button 
              v-for="c in colorPresets" 
              :key="c"
              :style="{ background: c }"
              @click="$emit('update:color', c)"
              :class="{ active: color === c }"
            ></button>
          </div>
        </div>
      </div>
      <div class="config-group">
        <label>粗细: {{ penSize }}px</label>
        <input type="range" min="1" max="50" :value="penSize" @input="$emit('update:pen-size', Number($event.target.value))">
      </div>
    </div>

    <!-- 橡皮擦配置 -->
    <div v-if="tool === 'eraser'" class="config-content">
      <h4>橡皮擦设置</h4>
      <div class="config-group">
        <label>形状</label>
        <div class="shape-types">
          <button 
            :class="{ active: eraserShape === 'circle' }"
            @click="$emit('update:eraser-shape', 'circle')"
          >
            圆形
          </button>
          <button 
            :class="{ active: eraserShape === 'rectangle' }"
            @click="$emit('update:eraser-shape', 'rectangle')"
          >
            方形
          </button>
        </div>
      </div>
      <div class="config-group">
        <label>大小: {{ eraserSize }}px</label>
        <input type="range" min="10" max="50" :value="eraserSize" @input="$emit('update:eraser-size', Number($event.target.value))">
      </div>
    </div>

    <!-- 背景配置 -->
    <div v-if="tool === 'background'" class="config-content">
      <h4>背景设置</h4>
      <div class="config-group">
        <label>背景颜色</label>
        <input type="color" :value="bgColor" @input="$emit('update:bg-color', $event.target.value)">
      </div>
      <div class="config-group">
        <label>背景图案</label>
        <div class="pattern-types">
          <button 
            v-for="pattern in bgPatterns" 
            :key="pattern.value"
            :class="{ active: bgPattern === pattern.value }"
            @click="$emit('update:bg-pattern', pattern.value)"
          >
            {{ pattern.label }}
          </button>
        </div>
      </div>
      <div class="config-group">
        <label>图片背景</label>
        <input 
          type="file" 
          accept="image/*"
          @change="handleImageUpload"
        >
      </div>
    </div>

    <!-- 形状配置 -->
    <div v-if="tool === 'shape'" class="config-content">
      <h4>形状设置</h4>
      <div class="config-group">
        <label>形状类型</label>
        <div class="shape-types">
          <button @click="$emit('update:shape-type', 'line')">直线</button>
          <button @click="$emit('update:shape-type', 'arrow')">箭头</button>
          <button @click="$emit('update:shape-type', 'rectangle')">矩形</button>
          <button @click="$emit('update:shape-type', 'circle')">圆形</button>
          <button @click="$emit('update:shape-type', 'ellipse')">椭圆</button>
        </div>
      </div>
      <div class="config-group">
        <label>颜色</label>
        <input type="color" :value="color" @input="$emit('update:color', $event.target.value)">
      </div>
      <div class="config-group">
        <label>线宽</label>
        <input type="range" min="1" max="10" :value="2" @input="$emit('update:stroke-width', Number($event.target.value))">
      </div>
    </div>

    <!-- 文本配置 -->
    <div v-if="tool === 'text'" class="config-content">
      <h4>文本设置</h4>
      <div class="config-group">
        <label>字体大小</label>
        <input type="range" min="12" max="120" :value="24" @input="$emit('update:font-size', Number($event.target.value))">
      </div>
      <div class="config-group">
        <label>颜色</label>
        <input type="color" :value="color" @input="$emit('update:color', $event.target.value)">
      </div>
      <div class="config-group">
        <label>对齐方式</label>
        <div class="align-types">
          <button @click="$emit('update:text-align', 'left')">左对齐</button>
          <button @click="$emit('update:text-align', 'center')">居中</button>
          <button @click="$emit('update:text-align', 'right')">右对齐</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

defineProps({ 
  tool: String, 
  color: String, 
  penSize: Number, 
  penType: String, 
  eraserSize: Number, 
  eraserShape: String, 
  bgColor: String, 
  bgPattern: String 
})

const emit = defineEmits([
  'update:color', 
  'update:pen-size', 
  'update:pen-type', 
  'update:eraser-size', 
  'update:eraser-shape', 
  'update:bg-color', 
  'update:bg-pattern',
  'update:bg-image',
  'update:shape-type',
  'update:stroke-width',
  'update:font-size',
  'update:text-align',
  'close'
])

// 笔触类型
const penTypes = [
  { value: 'normal', label: '普通' },
  { value: 'pencil', label: '铅笔' },
  { value: 'ballpoint', label: '圆珠笔' },
  { value: 'fountain', label: '钢笔' },
  { value: 'brush', label: '毛笔' }
]

// 颜色预设
const colorPresets = [
  '#000000', '#FF0000', '#00FF00', '#0000FF',
  '#FFFF00', '#FF00FF', '#00FFFF', '#FFFFFF'
]

// 背景图案
const bgPatterns = [
  { value: 'blank', label: '空白' },
  { value: 'dots', label: '点阵' },
  { value: 'grid', label: '方格' },
  { value: 'tianzige', label: '田字格' },
  { value: 'english-lines', label: '四线格' },
  { value: 'music-staff', label: '五线谱' },
  { value: 'coordinate', label: '坐标系' }
]

// 处理图片上传
const handleImageUpload = (event) => {
  const file = event.target.files[0]
  if (file) {
    emit('update:bg-image', file)
  }
}
</script>

<style scoped>
.tool-config {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  z-index: 1001;
  min-width: 320px;
  max-width: 400px;
  max-height: 70vh;
  overflow-y: auto;
}

.close-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  border: none;
  background: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
  transition: color 0.2s;
}

.close-btn:hover {
  color: #333;
}

.config-content {
  padding-top: 10px;
}

.config-content h4 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 16px;
}

.config-group {
  margin: 15px 0;
}

.config-group label {
  display: block;
  margin-bottom: 8px;
  color: #666;
  font-size: 14px;
}

.config-group input[type="range"] {
  width: 100%;
}

.config-group input[type="color"] {
  width: 100%;
  height: 40px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.config-group input[type="file"] {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.pen-types,
.shape-types,
.pattern-types,
.align-types {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pen-types button,
.shape-types button,
.pattern-types button,
.align-types button {
  padding: 8px 12px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 12px;
}

.pen-types button:hover,
.shape-types button:hover,
.pattern-types button:hover,
.align-types button:hover {
  border-color: var(--theme-color, #007AFF);
  color: var(--theme-color, #007AFF);
}

.pen-types button.active,
.shape-types button.active,
.pattern-types button.active,
.align-types button.active {
  background: var(--theme-color, #007AFF);
  color: white;
  border-color: var(--theme-color, #007AFF);
}

.color-presets {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.color-presets button {
  width: 32px;
  height: 32px;
  border: 2px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.color-presets button:hover {
  transform: scale(1.1);
}

.color-presets button.active {
  border-color: #333;
  border-width: 3px;
}

.slider-group {
  margin: 10px 0;
}

.color-picker input {
  width: 100%;
  height: 40px;
}
</style>
