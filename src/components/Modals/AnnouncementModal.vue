<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h2>公告</h2>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>
      <div class="modal-body" v-html="content"></div>
      <div class="modal-actions">
        <button @click="$emit('no-show')">不再显示</button>
        <button @click="$emit('close')" class="ok-btn">确定</button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({ content: String })
defineEmits(['close', 'no-show'])
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}
.modal-content {
  background: white;
  border-radius: 12px;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow: auto;
}
.modal-header {
  padding: 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.modal-body { padding: 20px; }
.modal-actions {
  padding: 20px;
  border-top: 1px solid #eee;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}
.close-btn { border: none; background: none; font-size: 32px; cursor: pointer; }
button { padding: 8px 16px; border: 1px solid #ddd; border-radius: 6px; cursor: pointer; background: white; }
.ok-btn { background: var(--theme-color, #007AFF); color: white; border: none; }
</style>
