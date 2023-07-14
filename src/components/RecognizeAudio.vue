<script setup lang="ts">
import RecognizeAudioOutput from '@/components/RecognizeAudioOutput.vue'
import { recognize, type Result } from '@/vosk/vosk'
import { computed, reactive, ref } from 'vue'

const sentences: string[] = reactive([])
const emit = defineEmits<{ done: [results: Result[]] }>()
const props = defineProps<{ buffer?: ArrayBuffer }>()
const progressValue = ref<0 | 1 | undefined>(0)
const buttonDisabled = computed(() => !(props.buffer && progressValue.value !== undefined))

function recognizeAudio() {
  if (!props.buffer) return
  progressValue.value = undefined
  recognize(props.buffer, (resultText, resultIndex) => {
    sentences[resultIndex] = resultText
  })
    .then((results) => {
      progressValue.value = 1
      emit('done', results)
    })
    .catch((error) => {
      progressValue.value = 0
      throw error
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
      <input type="file" accept="application/json" />
      <input type="button" value="Export" />
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
