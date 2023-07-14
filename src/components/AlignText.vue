<script setup lang="ts">
import AlignTextOutput from '@/components/AlignTextOutput.vue'
import { alignWordsToTextClosure, findParagraphIntervals, type VoskOutput } from '@/align/align'
import { MecabWorker, createUnidicFeature26 } from 'mecab-web-worker'
import { reactive, ref, computed } from 'vue'

const props = defineProps<{ recognitionResults?: VoskOutput; text?: string; audio?: ArrayBuffer }>()
const paragraphGroups: [number, number, number, number][][] = reactive([])
const audioElem = ref<HTMLAudioElement | null>(null)
const progressValue = ref<0 | 1 | undefined>(0)
const alignPossible = computed(() => Boolean(props.recognitionResults && props.text && props.audio))
const dataAvailable = computed(() => Boolean(props.text && paragraphGroups.length > 0))

function align(recognitionResults: VoskOutput, text: string): void {
  const modelUrl = new URL('/unidic-mecab-2.1.2_bin.zip', import.meta.url)
  MecabWorker.create(modelUrl.href, {
    wrapper: createUnidicFeature26
  })
    .then((mecabWorker) => {
      const alignWordsToText = alignWordsToTextClosure(mecabWorker)
      return alignWordsToText(recognitionResults, text)
    })
    .then((maybeIntervals) => {
      const voskTerms = recognitionResults.flatMap((sentence) => sentence.result)
      const intervals: [number, number, number, number][] = []
      for (let i = 0; i < maybeIntervals.length; i++) {
        const interval = maybeIntervals[i]
        if (!interval) continue
        const [x, y] = interval
        const { start, end } = voskTerms[i]
        intervals.push([x, y, start, end])
      }
      const paragraphIntervals = findParagraphIntervals(text)
      paragraphGroups.length = 0
      paragraphIntervals.forEach(() => paragraphGroups.push([]))
      for (const [x, y, start, end] of intervals) {
        for (let i = 0; i < paragraphIntervals.length; i++) {
          const [pX, pY] = paragraphIntervals[i]
          if (x >= pX && y <= pY) {
            if (!paragraphGroups[i]) paragraphGroups[i] = []
            paragraphGroups[i].push([x, y, start, end])
            break
          }
        }
      }
      progressValue.value = 1
    })
}

function addAudioTrack(buffer: ArrayBuffer) {
  if (!audioElem.value) return
  const blob = new Blob([buffer])
  const url = URL.createObjectURL(blob)
  audioElem.value.src = url
}

function playAudio(start: number, end: number) {
  if (!audioElem.value) return
  audioElem.value.currentTime = start
  audioElem.value.play()
  setTimeout(() => {
    audioElem.value?.pause()
  }, (end - start) * 1000)
}

function exportAsVtt() {
  const vtt = 'WEBVTT\n\n'
  const cues = paragraphGroups
    .flatMap((paragraphIntervals) => paragraphIntervals)
    .map(([x, y, start, end]) => {
      const text = props.text?.slice(x, y)
      return `00:${start.toFixed(3)} --> 00:${end.toFixed(3)}\n${text}`
    })
    .join('\n\n')
  const blob = new Blob([vtt + cues], { type: 'text/vtt' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'subtitle.vtt'
  a.click()
}

function triggerAlign() {
  if (!props.recognitionResults || !props.text || !props.audio) return
  progressValue.value = undefined
  align(props.recognitionResults, props.text)
  addAudioTrack(props.audio)
}
</script>

<template>
  <div class="container">
    <div class="controls">
      <button class="primary" type="button" @click="triggerAlign" :disabled="!alignPossible">
        Align Text to Audio
      </button>
      <progress :value="progressValue" />
      <button type="button" @click="exportAsVtt" :disabled="!dataAvailable">Export VTT</button>
    </div>
    <audio ref="audioElem" controls preload="auto"></audio>
    <AlignTextOutput :text="text ?? ''" :paragraphGroups="paragraphGroups" :playAudio="playAudio" />
  </div>
</template>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
}

.controls {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  justify-content: space-between;
  width: 100%;
  flex-wrap: wrap;
  margin-bottom: 1em;
}

.controls > button {
  min-height: 2em;
}

.primary {
  border-color: blue;
}
</style>
