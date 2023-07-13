import { createModel } from 'vosk-browser'
import type { ServerMessagePartialResult, ServerMessageResult } from 'vosk-browser/dist/interfaces'
import recognizerWorkletUrl from './recognizer-processor?worker&url'

const SAMPLE_RATE = 16000

export type Result = ServerMessageResult['result']

export async function recognize(
  buffer: ArrayBuffer,
  progressCallback?: (resultText: string, resultIndex: number) => void
): Promise<Result[]> {
  const audioContext = new AudioContext({ sampleRate: SAMPLE_RATE, latencyHint: 'playback' })
  const modelUrl = new URL('/vosk-model-small-ja-0.22.tar.gz', import.meta.url)
  const [model, audio] = await Promise.all([
    createModel(modelUrl.href),
    audioContext.decodeAudioData(buffer)
  ])
  const channel = new MessageChannel()
  model.registerPort(channel.port1)
  const recognizer = new model.KaldiRecognizer(SAMPLE_RATE)
  recognizer.setWords(true)

  const results: Result[] = []
  let resultIndex = 0
  recognizer.on('result', (message) => {
    const result = (message as ServerMessageResult).result
    results.push(result)
    progressCallback && progressCallback(result.text, resultIndex)
    resultIndex++
  })
  recognizer.on('partialresult', (message) => {
    const partialResult = (message as ServerMessagePartialResult).result
    progressCallback && progressCallback(partialResult.partial, resultIndex)
  })

  await audioContext.audioWorklet.addModule(recognizerWorkletUrl)
  const recognizerProcessor = new AudioWorkletNode(audioContext, 'recognizer-processor', {
    outputChannelCount: [1],
    numberOfInputs: 1,
    numberOfOutputs: 1
  })
  recognizerProcessor.port.postMessage({ action: 'init', recognizerId: recognizer.id }, [
    channel.port2
  ])

  const source = audioContext.createBufferSource()
  source.buffer = audio
  source.connect(recognizerProcessor)
  source.connect(audioContext.destination)
  return new Promise((resolve) => {
    source.onended = () => resolve(results)
    source.start()
  })
}
