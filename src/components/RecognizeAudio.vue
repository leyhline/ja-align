<script setup lang="ts">
import type { VoskOutput } from '@/align/align'
import RecognizeAudioOutput from '@/components/RecognizeAudioOutput.vue'
import { recognize } from '@/vosk/vosk'
import { computed, reactive, ref } from 'vue'

const sentences: string[] = reactive([])
const results = ref<VoskOutput>([])
const emit = defineEmits<{ done: [results: VoskOutput] }>()
const props = defineProps<{ buffer?: ArrayBuffer }>()
const progressValue = ref<0 | 1 | undefined>(0)
const buttonDisabled = computed<boolean>(
  () => !(props.buffer && progressValue.value !== undefined && results.value.length === 0)
)

function recognizeAudio() {
  if (!props.buffer) return
  progressValue.value = undefined
  recognize(props.buffer, (resultText, resultIndex) => {
    sentences[resultIndex] = resultText
  })
    .then((res) => {
      progressValue.value = 1
      results.value = res
      emit('done', res)
    })
    .catch((error) => {
      progressValue.value = 0
      throw error
    })
}

function exportResults(): void {
  const blob = new Blob([JSON.stringify(results.value)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'vosk.json'
  a.click()
  URL.revokeObjectURL(url)
}

function importResults(event: Event): void {
  const input = event.target as HTMLInputElement
  if (!input.files) return
  const file = input.files[0]
  file.text().then((text) => {
    const importedResults: VoskOutput = JSON.parse(text)
    results.value = importedResults
    sentences.length = 0
    importedResults.forEach((result) => sentences.push(result.text))
    emit('done', importedResults)
  })
}
</script>

<template>
  <div class="container">
    <div class="loading-button">
      <button class="primary" type="button" :disabled="buttonDisabled" @click="recognizeAudio">
        Recognize Audio
      </button>
      <progress :value="progressValue" />
    </div>
    <RecognizeAudioOutput :sentences="sentences" />
    <div class="import-export">
      <input
        type="file"
        accept="application/json"
        :disabled="sentences.length > 0"
        @change="importResults"
      />
      <input type="button" value="Export" :disabled="results.length === 0" @click="exportResults" />
    </div>
  </div>
</template>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.loading-button {
  width: 100%;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
}

.loading-button > button {
  font-family: 'Noto Serif JP', 'serif';
  text-align: left;
}

.import-export {
  width: 100%;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: baseline;
}

input {
  font-family: 'Noto Serif JP', 'serif';
  min-width: 8em;
}

.primary {
  border-color: blue;
}
</style>
