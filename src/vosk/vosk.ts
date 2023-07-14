import { createModel } from 'vosk-browser'
import type {
  ServerMessageError,
  ServerMessagePartialResult,
  ServerMessageResult
} from 'vosk-browser/dist/interfaces'
import recognizerWorkletUrl from './recognizer-processor?worker&url'

const SAMPLE_RATE = 16000

export type Result = ServerMessageResult['result']

async function decodeAudio(buffer: ArrayBuffer): Promise<AudioBuffer> {
  const audioContext = new AudioContext({ sampleRate: SAMPLE_RATE })
  return audioContext.decodeAudioData(buffer)
}

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

async function startRendering(
  audio: AudioBuffer,
  recognizerId: string,
  port2: MessagePort
): Promise<void> {
  const offlineAudioContext = new OfflineAudioContext(1, audio.length, audio.sampleRate)
  await offlineAudioContext.audioWorklet.addModule(recognizerWorkletUrl)
  const recognizerProcessor = new AudioWorkletNode(offlineAudioContext, 'recognizer-processor', {
    outputChannelCount: [1],
    numberOfInputs: 1,
    numberOfOutputs: 1
  })
  recognizerProcessor.port.postMessage({ action: 'init', recognizerId }, [port2])
  const source = offlineAudioContext.createBufferSource()
  source.buffer = audio
  source.connect(recognizerProcessor)
  source.start()
  return offlineAudioContext.startRendering().then()
}

/**
 * Starts the recognition process and returns directly while the results array
 * is filled asynchronously. There is currently no way to detect when the
 * process is finished.
 */
export async function recognize(
  buffer: ArrayBuffer,
  progressCallback: (resultText: string, resultIndex: number) => void
): Promise<Result[]> {
  const audio = await decodeAudio(buffer)
  console.assert(audio.numberOfChannels === 1)
  console.assert(audio.sampleRate === SAMPLE_RATE)
  return new Promise((resolve, reject) => {
    const results: Result[] = []
    return initRecognizer(results, progressCallback, reject).then(([recognizerId, port2]) =>
      startRendering(audio, recognizerId, port2).then(() => resolve(results))
    )
  })
}
