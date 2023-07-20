<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  text: string
  paragraphGroups: [number, number, number, number][][]
  playAudio: (start: number, end: number) => void
}>()

const dataAvailable = computed<boolean>(() =>
  Boolean(props.text && props.paragraphGroups.length > 0)
)

const minSilenceDuration = ref<number>(0)
const visualizeIntervals = ref<boolean>(false)

const displayGroups = computed<[number, number, number, number][][]>(() => {
  if (minSilenceDuration.value <= 0) {
    return props.paragraphGroups
  } else {
    return props.paragraphGroups.map((paragraphIntervals) =>
      paragraphIntervals.reduce<[number, number, number, number][]>((acc, currentInterval) => {
        const lastInterval = acc[acc.length - 1]
        if (!lastInterval) {
          return [currentInterval]
        } else {
          const [_x, y, start, end] = currentInterval
          const [lastX, _lastY, lastStart, lastEnd] = lastInterval
          if (start - lastEnd > minSilenceDuration.value) {
            return [...acc, currentInterval]
          } else {
            return [...acc.slice(0, acc.length - 1), [lastX, y, lastStart, end]]
          }
        }
      }, [])
    )
  }
})

function exportAsVtt() {
  const vtt = 'WEBVTT\n\n'
  const cues = displayGroups.value
    .map((paragraphIntervals) =>
      paragraphIntervals.map(([x, y, start, end], i) => {
        const startString = createTimeString(start)
        const endString = createTimeString(end)
        let text = props.text.slice(x, y)
        if (i > 0) text = '_' + text
        return `${startString} --> ${endString}\n${text}`
      })
    )
    .flat()
    .join('\n\n')
  const blob = new Blob([vtt + cues], { type: 'text/vtt' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'subtitle.vtt'
  a.click()
  URL.revokeObjectURL(url)
}

function createTimeString(inputSeconds: number) {
  const hours = Math.floor(inputSeconds / 3600)
  const hoursString = hours.toString().padStart(2, '0')
  const minutes = Math.floor((inputSeconds - hours * 3600) / 60)
  const minutesString = minutes.toString().padStart(2, '0')
  const seconds = Math.floor(inputSeconds - hours * 3600 - minutes * 60)
  const secondsString = seconds.toString().padStart(2, '0')
  const milliseconds = Math.floor((inputSeconds - Math.floor(inputSeconds)) * 1000)
  const millisecondsString = milliseconds.toString().padStart(3, '0')
  return `${hoursString}:${minutesString}:${secondsString}.${millisecondsString}`
}
</script>

<template>
  <div class="container">
    <div class="controls">
      <div>
        <label for="silence">Silence: </label>
        <input id="silence" type="range" v-model="minSilenceDuration" min="0" max="2" step="0.01" />
        <span>{{ minSilenceDuration }} seconds</span>
      </div>
      <div>
        <input id="visualize" type="checkbox" v-model="visualizeIntervals" />
        <label for="visualize">Visualize Invervals</label>
      </div>
      <button type="button" @click="exportAsVtt" :disabled="!dataAvailable">Export VTT</button>
    </div>
    <p v-for="(paragraphIntervals, i) in displayGroups" :key="i">
      <span
        v-for="[x, y, start, end] in paragraphIntervals"
        :key="x"
        :title="`${start.toFixed(1)}-${end.toFixed(1)}`"
        :class="{ visualized: visualizeIntervals }"
        @click="playAudio(start, end)"
      >
        {{ text.slice(x, y) }}</span
      >
    </p>
  </div>
</template>

<style scoped>
.container {
  margin-top: 1em;
}

p {
  margin-top: 0.5em;
  margin-bottom: 0.5em;
}

p > span:hover {
  background-color: cyan;
  cursor: pointer;
}

.controls {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  flex-wrap: wrap;
}

.controls > div {
  display: flex;
  flex-direction: row;
  font-size: 0.8em;
  align-items: center;
  margin-bottom: 1em;
}

.visualized {
  border: 1px solid blue;
  background-color: lightcyan;
  margin-left: 0.5em;
}
</style>
