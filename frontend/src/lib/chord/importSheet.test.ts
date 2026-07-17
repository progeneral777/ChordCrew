import { describe, expect, test } from 'vitest'
import { importChordSheet } from './importSheet'

describe('importChordSheet', () => {
  test('全形歌詞:和弦依欄位對齊插入(中文寬度 2)', () => {
    const input = ['     C       G/B     Am      F', '夜色慢慢亮起 街燈還沒睡去'].join('\n')
    // 欄位:C@5→索引2(夜色|),G/B@13→"街"前,Am@21→? 依寬度計算
    const out = importChordSheet(input)
    expect(out).toContain('[C]')
    expect(out).toContain('[G/B]')
    // C 在第 5 欄:夜(0-1)色(2-3)→第 5 欄落在「慢」之前
    expect(out.startsWith('夜色[C]慢慢亮起')).toBe(true)
  })

  test('半形歌詞:英文照欄位對齊(和弦在字首上方)', () => {
    const input = ['C   G  Am', 'Let it be now'].join('\n')
    const out = importChordSheet(input)
    // C@0→L, G@4→i(it), Am@7→b(be)
    expect(out).toBe('[C]Let [G]it [Am]be now')
  })

  test('段落標題原樣保留', () => {
    const input = ['[Verse 1]', 'C', 'hello'].join('\n')
    const out = importChordSheet(input)
    expect(out.split('\n')[0]).toBe('[Verse 1]')
  })

  test('沒有歌詞的和弦行 → 轉成小節行', () => {
    expect(importChordSheet('C  G/B  Am  F')).toBe('| C | G/B | Am | F |')
  })

  test('已是小節線格式的和弦行也轉成小節行', () => {
    expect(importChordSheet('| C | G | Am | F |')).toBe('| C | G | Am | F |')
  })

  test('純歌詞行不被誤判為和弦(含非和弦字詞)', () => {
    const input = 'Man I love this song'
    expect(importChordSheet(input)).toBe('Man I love this song')
  })

  test('多段落與空行:結構保留、收斂多餘空行', () => {
    const input = [
      '[Intro]',
      '| C | G |',
      '',
      '',
      '',
      '[Verse]',
      'C        F',
      '你好嗎 我很好',
    ].join('\n')
    const out = importChordSheet(input)
    // C@0 落在「你」上方 → [C]你
    expect(out).toBe(['[Intro]', '| C | G |', '', '[Verse]', '[C]你好嗎 我[F]很好'].join('\n'))
  })

  test('尾端超出歌詞長度的和弦附加到行末', () => {
    const input = ['C          G', 'ab'].join('\n')
    const out = importChordSheet(input)
    expect(out.startsWith('[C]ab')).toBe(true)
    expect(out).toContain('[G]')
  })

  test('空輸入回空字串', () => {
    expect(importChordSheet('')).toBe('')
    expect(importChordSheet('\n\n')).toBe('')
  })
})
