<script setup lang="ts">
import { computed, watch, ref } from 'vue'

const props = defineProps<{ sentences: string[] }>()
const displayText = computed(() => props.sentences.join('\n') || '')
const outputDiv = ref<HTMLDivElement | null>(null)

watch(displayText, () => {
  if (!outputDiv.value) return
  outputDiv.value.scrollTo({ top: outputDiv.value.scrollHeight, behavior: 'instant' })
})
</script>

<template>
  <div ref="outputDiv" class="recognized-text">{{ displayText }}</div>
</template>

<style scoped>
.recognized-text {
  overflow-y: scroll;
  width: 100%;
  height: 20em;
  border: 1px solid lightgray;
  white-space: pre-wrap;
  font-family: 'Noto Serif JP', 'serif';
  font-size: 0.7em;
  line-height: 1.2em;
}
</style>
