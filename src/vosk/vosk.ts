import { createModel } from 'vosk-browser'
import type {
  ServerMessageError,
  ServerMessagePartialResult,
  ServerMessageResult
} from 'vosk-browser/dist/interfaces'
import recognizerWorkletUrl from './recognizer-processor?worker&url'

const SAMPLE_RATE = 16000

export type Result = ServerMessageResult['result']

async function initRecognizer(
  results: Result[],
  progressCallback: (resultText: string, resultIndex: number) => void,
  errorCallback: (error: string) => void
): Promise<[string, MessagePort]> {
  const modelUrl = new URL('/vosk-model-small-ja-0.22.tar.gz', import.meta.url)
  const model = await createModel(modelUrl.href)
  const channel = new MessageChannel()
  model.registerPort(channel.port1)
  const recognizer = new model.KaldiRecognizer(SAMPLE_RATE)
  recognizer.setWords(true)
  let resultIndex = 0
  recognizer.on('result', (message) => {
    const result = (message as ServerMessageResult).result
    results.push(result)
    progressCallback(result.text, resultIndex)
    resultIndex++
  })
  recognizer.on('partialresult', (message) => {
    const partialResult = (message as ServerMessagePartialResult).result
    progressCallback(partialResult.partial, resultIndex)
  })
  recognizer.on('error', (message) => {
    const error = (message as ServerMessageError).error
    errorCallback(error)
  })
  return [recognizer.id, channel.port2]
}

async function startProcessing(
  audioContext: AudioContext,
  audio: AudioBuffer,
  recognizerId: string,
  port2: MessagePort
): Promise<void> {
  await audioContext.audioWorklet.addModule(recognizerWorkletUrl)
  const recognizerProcessor = new AudioWorkletNode(audioContext, 'recognizer-processor', {
    outputChannelCount: [1],
    numberOfInputs: 1,
    numberOfOutputs: 1
  })
  recognizerProcessor.port.postMessage({ action: 'init', recognizerId }, [port2])
  const source = audioContext.createBufferSource()
  source.buffer = audio
  source.connect(recognizerProcessor)
  source.connect(audioContext.destination)
  return new Promise((resolve) => {
    source.onended = () => resolve()
    source.start()
  })
}

export async function recognize(
  buffer: ArrayBuffer,
  progressCallback: (resultText: string, resultIndex: number) => void
): Promise<Result[]> {
  const audioContext = new AudioContext({ sampleRate: SAMPLE_RATE })
  const audio = await audioContext.decodeAudioData(buffer)
  console.assert(audio.numberOfChannels === 1)
  console.assert(audio.sampleRate === SAMPLE_RATE)
  return new Promise((resolve, reject) => {
    const results: Result[] = []
    return initRecognizer(results, progressCallback, reject).then(([recognizerId, port2]) =>
      startProcessing(audioContext, audio, recognizerId, port2).then(() => resolve(results))
    )
  })
}
