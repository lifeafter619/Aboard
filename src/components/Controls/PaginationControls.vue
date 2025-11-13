<template>
  <div class="pagination-controls">
    <button @click="$emit('page-change', currentPage - 1)" :disabled="currentPage === 1">◀</button>
    <span>{{ currentPage }} / {{ totalPages }}</span>
    <button @click="$emit('page-change', currentPage + 1)" :disabled="currentPage === totalPages">▶</button>
    <button @click="$emit('add-page')">+</button>
  </div>
</template>

<script setup>
defineProps({ currentPage: Number, totalPages: Number, position: String })
defineEmits(['page-change', 'add-page'])
</script>

<style scoped>
.pagination-controls {
  position: fixed;
  top: 80px;
  right: 20px;
  display: flex;
  gap: 8px;
  background: rgba(255, 255, 255, 0.95);
  padding: 8px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  z-index: 999;
}
button { padding: 6px 12px; border: none; border-radius: 4px; cursor: pointer; }
button:disabled { opacity: 0.3; cursor: not-allowed; }
</style>
