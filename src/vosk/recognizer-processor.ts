import type { ClientMessageAudioChunk } from 'vosk-browser/dist/interfaces'

interface InitMessage {
  action: 'init'
  recognizerId: string
}

/**
 * https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletNode/AudioWorkletNode
 */
interface AudioWorkletNodeOptions {
  numberOfInputs?: number
  numberOfOutputs?: number
  outputChannelCount?: number[]
  parameterData?: Record<string, number>
  processorOptions?: any
}

class RecognizerAudioProcessor extends AudioWorkletProcessor {
  private _recognizerId?: string
  private _recognizerPort?: MessagePort

  constructor(options: AudioWorkletNodeOptions) {
    // @ts-ignore
    super(options)
    this.port.onmessage = this._processMessage.bind(this)
  }

  _processMessage(event: MessageEvent) {
    // console.debug(`Received event ${JSON.stringify(event.data, null, 2)}`);
    if (event.data.action === 'init') {
      const init: MessageEvent<InitMessage> = event
      this._recognizerId = init.data.recognizerId
      this._recognizerPort = init.ports[0]
    }
  }

  process(inputs: Float32Array[][]): boolean {
    const data = inputs[0][0]
    if (this._recognizerPort && this._recognizerId && data) {
      // AudioBuffer samples are represented as floating point numbers between -1.0 and 1.0 whilst
      // Kaldi expects them to be between -32768 and 32767 (the range of a signed int16)
      const audioArray = data.map((value) => value * 0x8000)
      const message: ClientMessageAudioChunk = {
        action: 'audioChunk',
        data: audioArray,
        recognizerId: this._recognizerId,
        sampleRate // Part of AudioWorkletGlobalScope
      }
      this._recognizerPort.postMessage(message, { transfer: [audioArray.buffer] })
    }
    return true
  }
}

registerProcessor('recognizer-processor', RecognizerAudioProcessor)
