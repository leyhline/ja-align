<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  done: [buffer: ArrayBuffer]
}>()

const uploadDone = ref<boolean>(false)

function handleFileUpload(event: Event): void {
  const target = event.target as HTMLInputElement
  const uploadedFile = target.files?.[0] || null
  if (uploadedFile)
    uploadedFile.arrayBuffer().then((buffer) => {
      emit('done', buffer)
      uploadDone.value = true
    })
}

function loadDemoFile(): void {
  fetch('gongitsune_01_niimi.ogg')
    .then((response) => response.arrayBuffer())
    .then((buffer) => {
      emit('done', buffer)
      uploadDone.value = true
    })
}
</script>

<template>
  <div class="container">
    <input type="file" accept="audio/*" @change="handleFileUpload" :disabled="uploadDone" />
    <span>ＯＲ</span>
    <input
      type="button"
      value="Load Demo Audio：新美南吉－ごん狐一"
      @click="loadDemoFile"
      :disabled="uploadDone"
    />
  </div>
</template>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 0.5em;
}

input {
  width: 100%;
  max-width: 20em;
  font-family: 'Noto Serif JP', 'serif';
  text-align: left;
}
</style>
