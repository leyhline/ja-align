<script setup lang="ts">
const emit = defineEmits<{
  done: [text: string]
}>()

function handleFileUpload(event: Event): void {
  const target = event.target as HTMLInputElement
  const uploadedFile = target.files?.[0] || null
  if (uploadedFile) uploadedFile.text().then((text) => emit('done', text))
}

function loadDemoFile(): void {
  fetch('gongitsune_01_niimi.txt')
    .then((response) => response.text())
    .then((text) => emit('done', text))
}
</script>

<template>
  <div class="container">
    <input type="file" accept="text/plain" @change="handleFileUpload" />
    <span>ＯＲ</span>
    <input type="button" value="Load Demo Text：新美南吉－ごん狐一" @click="loadDemoFile" />
  </div>
</template>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

input {
  font-family: 'Noto Serif JP', 'serif';
  text-align: left;
  max-width: 20em;
}
</style>
