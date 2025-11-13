<template>
  <div class="time-display">
    {{ currentTime }}
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

defineProps({ settings: Object })

const currentTime = ref(new Date().toLocaleTimeString())
let timer = null

onMounted(() => {
  timer = setInterval(() => {
    currentTime.value = new Date().toLocaleTimeString()
  }, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.time-display {
  position: fixed;
  top: 20px;
  left: 20px;
  background: white;
  padding: 10px 20px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  font-size: 18px;
  z-index: 998;
}
</style>
