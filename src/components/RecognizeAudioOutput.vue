<script setup lang="ts">
import { watch, ref } from 'vue'

const props = defineProps<{ sentences: string[] }>()
const outputDiv = ref<HTMLDivElement | null>(null)

watch(props, () => {
  if (!outputDiv.value) return
  outputDiv.value.scrollTo({ top: outputDiv.value.scrollHeight, behavior: 'instant' })
})
</script>

<template>
  <div ref="outputDiv" class="recognized-text">
    <p v-for="(sentence, index) in sentences" :key="index">{{ sentence }}</p>
  </div>
</template>

<style scoped>
.recognized-text {
  overflow-y: scroll;
  width: 100%;
  height: 20em;
  border: 1px solid lightgray;
  font-family: 'Noto Serif JP', 'serif';
  font-size: 0.7em;
  line-height: 1.2em;
}

p {
  margin: 0;
}
</style>
