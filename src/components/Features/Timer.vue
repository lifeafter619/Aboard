<template>
  <div class="timer">
    <div>计时器: {{ timer.id }}</div>
    <button @click="$emit('close')">关闭</button>
  </div>
</template>

<script setup>
defineProps({ timer: Object })
defineEmits(['close'])
</script>

<style scoped>
.timer {
  position: fixed;
  top: 100px;
  right: 20px;
  background: white;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  z-index: 998;
}
</style>
