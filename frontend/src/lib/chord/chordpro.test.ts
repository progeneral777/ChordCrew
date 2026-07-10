import { describe, expect, test } from 'vitest'
import { applySectionUpdate, parseChordPro, splitSections, transposeContent } from './chordpro'

const SAMPLE = `{title: 小情歌}
{key: C}
{bpm: 72}

[Intro]
| C | G/B | Am | F |

[Verse 1]
這是一首[C]簡單的小情歌 唱著[G/B]人們心腸的曲折
我想我很[Am]快樂 當有你的[F]溫熱 腳邊的空[G]氣轉了

[Chorus]
你知道 就算大[C]雨讓這座[G]城市顛[Am]倒
我會給你懷[F]抱`

describe('parseChordPro', () => {
  const sheet = parseChordPro(SAMPLE)

  test('解析 metadata', () => {
    expect(sheet.metadata).toEqual({ title: '小情歌', key: 'C', bpm: '72' })
  })

  test('切出段落', () => {
    expect(sheet.sections.map((s) => s.name)).toEqual(['Intro', 'Verse 1', 'Chorus'])
  })

  test('| 行解析為純和弦進行(依 | 分小節)', () => {
    const intro = sheet.sections[0].lines[0]
    expect(intro).toEqual({
      type: 'instrumental',
      measures: [['C'], ['G/B'], ['Am'], ['F']],
    })
  })

  test('歌詞行切 token:和弦錨定在其後文字上', () => {
    const line = sheet.sections[1].lines[0]
    if (line.type !== 'lyric') throw new Error('expected lyric line')
    expect(line.segments).toEqual([
      { chord: null, text: '這是一首', chordValid: true },
      { chord: 'C', text: '簡單的小情歌 唱著', chordValid: true },
      { chord: 'G/B', text: '人們心腸的曲折', chordValid: true },
    ])
  })

  test('無法解析的和弦標記 chordValid=false 原樣保留', () => {
    const sheet2 = parseChordPro('[Verse]\n歌詞[Cx]繼續')
    const line = sheet2.sections[0].lines[0]
    if (line.type !== 'lyric') throw new Error('expected lyric line')
    expect(line.segments[1]).toEqual({ chord: 'Cx', text: '繼續', chordValid: false })
  })

  test('單一和弦獨佔一行仍是和弦行,不是段落標題', () => {
    const sheet3 = parseChordPro('[Verse]\n[C]')
    expect(sheet3.sections).toHaveLength(1)
    expect(sheet3.sections[0].lines[0].type).toBe('lyric')
  })
})

describe('splitSections / applySectionUpdate', () => {
  test('依段落標題切分,join 可無損還原', () => {
    const sections = splitSections(SAMPLE)
    expect(sections).toHaveLength(4) // metadata 前導 + Intro + Verse 1 + Chorus
    expect(sections[0]).toContain('{title: 小情歌}')
    expect(sections[1].startsWith('[Intro]')).toBe(true)
    expect(sections[3].startsWith('[Chorus]')).toBe(true)
    expect(sections.join('\n')).toBe(SAMPLE)
  })

  test('無前導內容時第一段直接是標題段', () => {
    const sections = splitSections('[Verse]\n歌詞')
    expect(sections).toEqual(['[Verse]\n歌詞'])
  })

  test('空字串是單一空段落', () => {
    expect(splitSections('')).toEqual([''])
  })

  test('applySectionUpdate 取代指定段落', () => {
    const updated = applySectionUpdate(SAMPLE, 2, '[Verse 1]\n改寫後的[C]歌詞')
    expect(updated).toContain('改寫後的[C]歌詞')
    expect(updated).toContain('[Chorus]') // 其他段落不動
    expect(updated).not.toContain('人們心腸的曲折')
  })

  test('index 超出範圍回 null', () => {
    expect(applySectionUpdate(SAMPLE, 99, 'x')).toBeNull()
    expect(applySectionUpdate(SAMPLE, -1, 'x')).toBeNull()
  })
})

describe('transposeContent', () => {
  test('整份 +2:key C→D,所有和弦跟著轉', () => {
    const result = transposeContent(SAMPLE, 2)
    expect(result).toContain('{key: D}')
    expect(result).toContain('| D | A/C# | Bm | G |')
    expect(result).toContain('這是一首[D]簡單的小情歌 唱著[A/C#]人們心腸的曲折')
    expect(result).toContain('[Verse 1]') // 段落標題不動
    expect(result).toContain('{title: 小情歌}') // 其他 metadata 不動
  })

  test('目標為 ♭ 調時用 ♭ 記號', () => {
    // key C +1 → Db(♭ 調),E → F、A → Bb
    const result = transposeContent('{key: C}\n歌[E]詞[A]', 1)
    expect(result).toContain('{key: Db}')
    expect(result).toContain('歌[F]詞[Bb]')
  })

  test('無法解析的和弦原樣保留', () => {
    const result = transposeContent('歌詞[Cx]不變[C]會轉', 2)
    expect(result).toBe('歌詞[Cx]不變[D]會轉')
  })
})
