<script setup lang="ts">
import AlignText from '@/components/AlignText.vue'
import RecognizeAudio from '@/components/RecognizeAudio.vue'
import AudioUpload from '@/components/AudioUpload.vue'
import TextArea from '@/components/TextArea.vue'
import TextUpload from './components/TextUpload.vue'
import TheFooter from './components/TheFooter.vue'
import { ref } from 'vue'
import type { VoskOutput } from './align/align'

const sourceBuffer = ref<ArrayBuffer | undefined>()
const sourceText = ref<string | undefined>()
const recognitionResults = ref<VoskOutput | undefined>()
const textToAlign = ref<string | undefined>()

/**
 * https://stackoverflow.com/questions/10100798/whats-the-most-straightforward-way-to-copy-an-arraybuffer-object
 */
function copyArrayBuffer(src: ArrayBuffer) {
  var dst = new ArrayBuffer(src.byteLength)
  new Uint8Array(dst).set(new Uint8Array(src))
  return dst
}
</script>

<template>
  <main>
    <section>
      <h1>① ＬＯＡＤ　ＤＡＴＡ</h1>
      <div class="content">
        <AudioUpload
          @done="
            (buffer) => {
              sourceBuffer = buffer
            }
          "
        />
        <TextUpload
          @done="
            (text) => {
              sourceText = text
            }
          "
        />
      </div>
    </section>
    <section>
      <h1>② ＰＲＥＰＡＲＥ</h1>
      <div class="content">
        <RecognizeAudio
          :buffer="sourceBuffer && copyArrayBuffer(sourceBuffer)"
          @done="
            (results) => {
              recognitionResults = results
            }
          "
        />
        <TextArea
          :text="sourceText"
          @change="
            (text) => {
              textToAlign = text
            }
          "
        />
      </div>
    </section>
    <section>
      <h1>③ ＡＬＩＧＮ</h1>
      <div class="content">
        <AlignText
          class="full-width"
          :recognitionResults="recognitionResults"
          :text="textToAlign"
          :audio="sourceBuffer && copyArrayBuffer(sourceBuffer)"
        />
      </div>
    </section>
    <footer>
      <TheFooter />
    </footer>
  </main>
</template>

<style scoped>
main {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

section {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  border-bottom: 1px solid grey;
  padding: 1em;
  width: 40em;
}

.content {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: stretch;
  width: 100%;
  gap: 1em;
}

.content > * {
  width: 50%;
}

.full-width {
  width: 100%;
}

@media (max-width: 840px) {
  section {
    width: 100%;
    padding: 0;
  }

  .content {
    display: flex;
    flex-direction: column;
  }

  .content > * {
    width: 100%;
  }
}
</style>
