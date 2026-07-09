import { describe, expect, test } from 'vitest'
import {
  parseChord,
  transposeChord,
  transposeKey,
  isFlatKey,
  formatChordDisplay,
} from './chord'

describe('parseChord', () => {
  test.each([
    ['C', { root: 'C', suffix: '', bass: null }],
    ['F#m', { root: 'F#', suffix: 'm', bass: null }],
    ['Bb7', { root: 'Bb', suffix: '7', bass: null }],
    ['Gmaj7', { root: 'G', suffix: 'maj7', bass: null }],
    ['Am7b5', { root: 'A', suffix: 'm7b5', bass: null }],
    ['Dsus4', { root: 'D', suffix: 'sus4', bass: null }],
    ['C/E', { root: 'C', suffix: '', bass: 'E' }],
    ['E7#9', { root: 'E', suffix: '7#9', bass: null }],
    ['C6/9', { root: 'C', suffix: '6/9', bass: null }],
    ['Cm/Bb', { root: 'C', suffix: 'm', bass: 'Bb' }],
  ])('parses %s', (input, expected) => {
    expect(parseChord(input)).toEqual(expected)
  })

  test.each(['H', 'Cx', '[Verse]', '', 'c'])('rejects %s', (input) => {
    expect(parseChord(input)).toBeNull()
  })
})

describe('transposeChord — CHORD_SPEC §4 必過測試案例', () => {
  test.each([
    ['C', 2, 'D', 'D'],
    ['F#m7', 1, 'Ab', 'Gm7'],
    ['Bb', 2, 'C', 'C'],
    ['C/E', 2, 'D', 'D/F#'],
    ['Am7b5', 3, 'Cm', 'Cm7b5'],
    ['E7#9', -4, 'C', 'C7#9'],
    ['G', 5, 'C', 'C'],
    ['B', 1, 'Db', 'C'],
    ['F', -1, 'E', 'E'],
    ['Dsus4', 7, 'A', 'Asus4'],
  ])('%s %+d (key %s) → %s', (chord, semitones, targetKey, expected) => {
    expect(transposeChord(chord, semitones, targetKey)).toBe(expected)
  })

  test('無 key 時預設用 ♯', () => {
    expect(transposeChord('A', 1)).toBe('A#')
  })

  test('♭ 調用 ♭ 記號', () => {
    expect(transposeChord('A', 1, 'Bb')).toBe('Bb')
  })

  test('無法解析回 null 不 throw', () => {
    expect(transposeChord('H', 2, 'D')).toBeNull()
    expect(transposeChord('Cx', 2, 'D')).toBeNull()
  })

  test('capo 顯示 = 移調 -n', () => {
    // capo 2、原和弦 D → 顯示 C
    expect(transposeChord('D', -2, transposeKey('D', -2))).toBe('C')
  })
})

describe('transposeKey', () => {
  test.each([
    ['G', 1, 'Ab'],
    ['C', 1, 'Db'],
    ['Am', 3, 'Cm'],
    ['C', 2, 'D'],
    ['F', -1, 'E'],
    ['E', 6, 'Bb'],
  ])('%s %+d → %s', (key, semitones, expected) => {
    expect(transposeKey(key, semitones)).toBe(expected)
  })
})

describe('isFlatKey', () => {
  test.each(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm'])(
    '%s 是 ♭ 調',
    (key) => expect(isFlatKey(key)).toBe(true)
  )
  test.each(['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'Am', 'Em', 'Bm', 'F#m', 'C#m'])(
    '%s 是 ♯ 調',
    (key) => expect(isFlatKey(key)).toBe(false)
  )
})

describe('formatChordDisplay', () => {
  test('#→♯、b→♭', () => {
    expect(formatChordDisplay('F#m7b5')).toBe('F♯m7♭5')
    expect(formatChordDisplay('Bb/Db')).toBe('B♭/D♭')
  })
})
