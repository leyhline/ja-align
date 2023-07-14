<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  text: string
  paragraphGroups: [number, number, number, number][][]
  playAudio: (start: number, end: number) => void
}>()

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
