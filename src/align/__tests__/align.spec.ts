import { describe, it, expect } from 'vitest'
import voskOutput from './gongitsune_01_niimi.json'
import expected from './expected.json'
import given from './given.json'
import textMecab from './text-mecab.json'
import voskMecab from './vosk-mecab.json'
import {
  flattenVoskOutput,
  type VoskOutput,
  alignMecabToText,
  getWords,
  alignMecabToKana,
  findParagraphIntervals
} from '../align'
import type { MecabNode } from 'mecab-web-worker/dist/mecab-worker'
import type { UnidicFeature26 } from 'mecab-web-worker'

describe('flattenVoskOutput', () => {
  it('returns a string from concatenated text fields', () => {
    const result = flattenVoskOutput(voskOutput as VoskOutput)
    expect(result).toBe(expected['flattenVoskOutput'])
  })
})

describe('alignMecabToText', () => {
  it('returns a list of indices matching to original text', () => {
    const text = given['text']
    const nodes: MecabNode<UnidicFeature26 | null>[] = textMecab
    const intervals = alignMecabToText(nodes, text)
    expect(intervals).toHaveLength(nodes.length)
    const words = getWords(text, intervals)
    expect(words.join('')).toBe(text.replace(/\n/gm, ''))
    expect(words).toEqual(expected['alignMecabToText'])
  })

  it('returns a list of indices matching a smaller sentence', () => {
    const text = 'これは、私が小さいときに、村の茂平というおじいさんからきいたお話です。\n'
    const nodes = [
      { surface: 'これ', feature: { kana: 'コレ' } },
      { surface: 'は', feature: { kana: 'ハ' } },
      { surface: '、', feature: { kana: '' } },
      { surface: '私', feature: { kana: 'ワタクシ' } },
      { surface: 'が', feature: { kana: 'ガ' } },
      { surface: '小さい', feature: { kana: 'チイサイ' } },
      { surface: 'とき', feature: { kana: 'トキ' } },
      { surface: 'に', feature: { kana: 'ニ' } },
      { surface: '、', feature: { kana: '' } },
      { surface: '村', feature: { kana: 'ムラ' } },
      { surface: 'の', feature: { kana: 'ノ' } },
      { surface: '茂平', feature: { kana: 'モヘイ' } },
      { surface: 'と', feature: { kana: 'ト' } },
      { surface: 'いう', feature: { kana: 'イウ' } },
      { surface: 'お', feature: { kana: 'オ' } },
      { surface: 'じい', feature: { kana: 'ジイ' } },
      { surface: 'さん', feature: { kana: 'サン' } },
      { surface: 'から', feature: { kana: 'カラ' } },
      { surface: 'きい', feature: { kana: 'キイ' } },
      { surface: 'た', feature: { kana: 'タ' } },
      { surface: 'お', feature: { kana: 'オ' } },
      { surface: '話', feature: { kana: 'ハナシ' } },
      { surface: 'です', feature: { kana: 'デス' } },
      { surface: '。', feature: { kana: '' } }
    ] as MecabNode<UnidicFeature26 | null>[]
    const intervals = alignMecabToText(nodes, text)
    expect(intervals).toHaveLength(nodes.length)
    expect(intervals).toEqual([
      [0, 2],
      [2, 4],
      null,
      [4, 5],
      [5, 6],
      [6, 9],
      [9, 11],
      [11, 13],
      null,
      [13, 14],
      [14, 15],
      [15, 17],
      [17, 18],
      [18, 20],
      [20, 21],
      [21, 23],
      [23, 25],
      [25, 27],
      [27, 29],
      [29, 30],
      [30, 31],
      [31, 32],
      [32, 35],
      null
    ])
  })
})

describe('alignMecabToKana', () => {
  it('returns a list of indices matching a text entirely written in katakana', () => {
    const kanaVosk = given['voskKana']
    const nodes: MecabNode<UnidicFeature26 | null>[] = voskMecab
    const intervals = alignMecabToKana(nodes, kanaVosk)
    expect(intervals).toHaveLength(nodes.length)
    const words = getWords(kanaVosk, intervals)
    expect(words.join('')).toBe(kanaVosk)
    expect(words).toEqual(expected['alignMecabToKana'])
  })
})

describe('findParagraphIntervals', () => {
  it('returns a list of indices for text between paragraphs', () => {
    const text = 'abc'
    const intervals = findParagraphIntervals(text)
    expect(intervals).toEqual([[0, 3]])
  })

  it('returns a list of indices for text starting with newlines', () => {
    const text = '\n\nabc'
    const intervals = findParagraphIntervals(text)
    expect(intervals).toEqual([[2, 5]])
  })

  it('returns a list of indices for text ending with newlines', () => {
    const text = 'abc\n\n'
    const intervals = findParagraphIntervals(text)
    expect(intervals).toEqual([[0, 3]])
  })

  it('returns a list of indices for text starting and ending with newlines', () => {
    const text = '\n\nabc\n\n'
    const intervals = findParagraphIntervals(text)
    expect(intervals).toEqual([[2, 5]])
  })

  it('returns a list of indices for text with multiple paragraphs', () => {
    const text = 'abc\ndef\n\nghi'
    const intervals = findParagraphIntervals(text)
    expect(intervals).toEqual([
      [0, 3],
      [4, 7],
      [9, 12]
    ])
  })
})
