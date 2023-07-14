<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{ text?: string }>()
const emit = defineEmits<{ change: [text: string] }>()
const outputElem = ref<HTMLTextAreaElement | null>(null)

watch(props, ({ text }) => {
  emit('change', text || '')
  if (!outputElem.value) return
})

function onChange(event: Event): void {
  const target = event.target as HTMLTextAreaElement
  emit('change', target.value)
}
</script>

<template>
  <textarea ref="outputElem" :value="props.text" @input="onChange"></textarea>
</template>

<style scoped>
textarea {
  overflow-y: scroll;
  border: 1px solid lightgray;
  font-family: 'Noto Serif JP', 'serif';
  font-size: 0.7em;
  line-height: 1.2em;
  min-height: 20em;
  padding: 0;
}
</style>
