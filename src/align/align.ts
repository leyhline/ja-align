import type { UnidicFeature26, MecabWorker, MecabNode } from 'mecab-web-worker'
import { alignKana } from './needleman-wunsch'
import type { Result } from '@/vosk/vosk'

export type VoskOutput = Result[]
export type Interval = [number, number]
export type MaybeInterval = Interval | null
type Aligner<S1, S2> = (data1: S1, data2: S2) => MaybeInterval[]
type AsyncAligner<S1, S2> = (data1: S1, data2: S2) => Promise<MaybeInterval[]>

export function buildAligner<S1, S2, T1, T2>(
  transform1: (data1: S1) => T1,
  transform2: (data2: S2) => T2,
  alignFn: (t1: T1, t2: T2) => MaybeInterval[]
): Aligner<S1, S2> {
  return (data1, data2) => alignFn(transform1(data1), transform2(data2))
}

export function buildAsyncAligner<S1, S2, T1, T2>(
  transform1: (data1: S1) => T1,
  transform2: (data2: S2) => T2,
  alignFn: (t1: T1, t2: T2) => Promise<MaybeInterval[]>
): AsyncAligner<S1, S2> {
  return async (data1, data2) => alignFn(transform1(data1), transform2(data2))
}

export function flattenVoskOutput(voskOutput: VoskOutput): string {
  return voskOutput.flatMap((sentence) => sentence.result.map((term) => term.word)).join('')
}

export function extractVoskText(voskOutput: VoskOutput): string[] {
  return voskOutput.flatMap((sentence) => sentence.result.map((term) => term.word))
}

/** @returns kana word array has same length as input array. */
function extractKana(nodes: MecabNode<UnidicFeature26 | null>[]): string[] {
  return nodes.map((node) => (node.feature?.kana ?? '').trim())
}

function extractSurfaceAndKana(nodes: MecabNode<UnidicFeature26 | null>[]): [string, string][] {
  return nodes.map((node) => [node.surface.trim(), (node.feature?.kana ?? '').trim()])
}

const stringIdentity = (x: string) => x

const stringArrayIdentity = (x: string[]) => x

/**
 * Use the `surface` (and `feature.kana`) field of `MecabNode` to align text to its mecab output.
 * @param surfaceKanaTuples A pair of surface and kana strings.
 * @param text The original text that was used for mecab parsing.
 * @returns A list of of intervals with the same length as `surfaceKanaTuples`; `null` if there was no match (e.g. for commas, punctuation).
 */
function alignBySurface(surfaceKanaTuples: [string, string][], text: string): MaybeInterval[] {
  const intervals: MaybeInterval[] = []
  let nullArray: null[] = []
  const firstTuple = surfaceKanaTuples.shift()
  if (!firstTuple) return intervals
  let start = 0
  let end = firstTuple[0].length
  let lastSurface: string = firstTuple[0]
  for (const [surface, kana] of surfaceKanaTuples) {
    if (kana && lastSurface !== '「') {
      intervals.push([start, end])
      if (nullArray.length > 0) {
        intervals.push(...nullArray)
        nullArray = []
      }
      start = text.indexOf(surface, end)
      end = start + surface.length
    } else if (surface === '「') {
      intervals.push([start, end])
      start = text.indexOf(surface, end)
      end = start + surface.length
    } else {
      nullArray.push(null)
      end += surface.length
    }
    lastSurface = surface
  }
  intervals.push([start, end], ...nullArray)
  return intervals
}

function alignByKana(kanas: string[], kanaText: string): MaybeInterval[] {
  const intervals: MaybeInterval[] = []
  let start = 0
  let end = 0
  for (const kana of kanas) {
    start = kanaText.indexOf(kana, end)
    end = start + kana.length
    intervals.push([start, end])
  }
  return intervals
}

export function findParagraphIntervals(text: string): Interval[] {
  const intervals: Interval[] = []
  let start = 0
  let end = 0
  for (const char of text) {
    if (char === '\n') {
      if (start !== end) intervals.push([start, end])
      start = end + 1
    }
    end++
  }
  if (start !== end) intervals.push([start, end])
  return intervals
}

export function getWords(text: string, intervals: MaybeInterval[]): string[] {
  const words: string[] = []
  for (const interval of intervals) {
    if (!interval) continue
    const [start, end] = interval
    words.push(text.slice(start, end))
  }
  return words
}

export const alignMecabToText: Aligner<MecabNode<UnidicFeature26 | null>[], string> = buildAligner(
  extractSurfaceAndKana,
  stringIdentity,
  alignBySurface
)

export const alignMecabToKana: Aligner<MecabNode<UnidicFeature26 | null>[], string> = buildAligner(
  extractKana,
  stringIdentity,
  alignByKana
)

export const alignWordsToKana: Aligner<string[], string> = buildAligner(
  stringArrayIdentity,
  stringIdentity,
  alignByKana
)

export const alignWordsToTextClosure: (
  mecabWorker: MecabWorker<UnidicFeature26>
) => AsyncAligner<VoskOutput, string> = (mecabWorker) =>
  buildAsyncAligner(extractVoskText, stringIdentity, alignVoskToTextClosure(mecabWorker))

export const alignVoskToTextClosure: (
  mecabWorker: MecabWorker<UnidicFeature26>
) => (words: string[], text: string) => Promise<MaybeInterval[]> = (mecabWorker) => (words, text) =>
  alignVoskToText(mecabWorker, words, text)

async function alignVoskToText(
  mecabWorker: MecabWorker<UnidicFeature26>,
  words: string[],
  text: string
): Promise<MaybeInterval[]> {
  const resultIntervals: MaybeInterval[] = new Array(words.length).fill(null)
  const voskNodesByWord = await Promise.all(words.map((word) => mecabWorker.parseToNodes(word)))
  const voskKanasByWord = voskNodesByWord.map((nodes) => extractKana(nodes).join(''))
  assertEveryLength([resultIntervals, voskNodesByWord, voskKanasByWord], words.length)
  const voskKanas = extractKana(voskNodesByWord.flat()).join('')
  const textNodes = await mecabWorker.parseToNodes(text)
  const textKanaWords = extractKana(textNodes)
  const textIntervals = alignMecabToText(textNodes, text)
  assertEveryLength([textKanaWords, textIntervals], textNodes.length)
  const textKanas = textKanaWords.join('')
  const path = alignKana(textKanas, voskKanas)
  const sharedIntervals: Interval[] = []
  const incrementVoskIndex = incrementVoskIndexClosure(
    voskKanasByWord,
    resultIntervals,
    sharedIntervals
  )
  const incrementTextIndex = incrementTextIndexClosure(
    textKanaWords,
    textIntervals,
    sharedIntervals
  )
  const handleDirection = pathDirectionClosure(incrementTextIndex, incrementVoskIndex)
  path.forEach(handleDirection)
  return resultIntervals
}

function pathDirectionClosure(
  incrementTextIndex: () => void,
  incrementVoskIndex: () => void
): (direction: number) => void {
  return (direction) => {
    if (direction & 0b100) {
      // match
      incrementTextIndex()
      incrementVoskIndex()
    } else if (direction & 0b010) {
      // skip vosk
      incrementVoskIndex()
    } else if (direction & 0b001) {
      // skip text
      incrementTextIndex()
    } else {
      throw new Error('path: invalid direction: ' + direction.toString(2))
    }
  }
}

function incrementTextIndexClosure(
  kanaWords: string[],
  textIntervals: MaybeInterval[],
  sharedIntervals: Interval[]
): () => void {
  let wordIndex = 0
  let charIndex = 0
  return () => {
    while (kanaWords[wordIndex].length === 0) {
      const interval = textIntervals[wordIndex]
      if (interval) {
        sharedIntervals.push(interval)
      }
      wordIndex++
    }
    const word = kanaWords[wordIndex]
    charIndex++
    if (charIndex >= word.length) {
      const interval = textIntervals[wordIndex]
      if (interval) {
        sharedIntervals.push(interval)
      }
      wordIndex++
      charIndex = 0
    }
  }
}

function incrementVoskIndexClosure(
  voskKanaWords: string[],
  resultIntervals: MaybeInterval[],
  sharedIntervals: Interval[]
): () => void {
  let wordIndex = 0
  let charIndex = 0
  return () => {
    while (voskKanaWords[wordIndex].length === 0) {
      wordIndex++
    }
    const word = voskKanaWords[wordIndex]
    charIndex++
    if (charIndex >= word.length) {
      if (sharedIntervals.length > 0) {
        const start = sharedIntervals[0][0]
        const end = sharedIntervals[sharedIntervals.length - 1][1]
        resultIntervals[wordIndex] = [start, end]
        sharedIntervals.length = 0
      }
      wordIndex++
      charIndex = 0
    }
  }
}

function assertEveryLength(arrays: any[][], expectedLength: number) {
  console.assert(
    arrays.every((arr) => arr.length === expectedLength),
    `length mismatch of align intervals (expected: ${expectedLength})`
  )
}
