<template>
  <div class="modal-overlay" @click.self="$emit('cancel')">
    <div class="modal-content">
      <h3>确认</h3>
      <p>{{ message }}</p>
      <div class="modal-actions">
        <button @click="$emit('cancel')">取消</button>
        <button @click="$emit('confirm')" class="confirm-btn">确定</button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({ message: String })
defineEmits(['confirm', 'cancel'])
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
  padding: 24px;
  border-radius: 12px;
  max-width: 400px;
  width: 90%;
}
.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 20px;
}
button {
  padding: 8px 16px;
  border: 1px solid #ddd;
  border-radius: 6px;
  cursor: pointer;
  background: white;
}
.confirm-btn {
  background: var(--theme-color, #007AFF);
  color: white;
  border: none;
}
</style>
