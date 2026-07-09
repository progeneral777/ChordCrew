import { render, screen } from '@testing-library/react'
import SheetPreview from './SheetPreview'

const SAMPLE = `[Intro]
| C | G/B | Am | F |

[Verse 1]
這是一首[C]簡單的小情歌 唱著[G/B]人們心腸的曲折`

test('渲染段落標題、和弦與歌詞', () => {
  render(<SheetPreview content={SAMPLE} originalKey="C" />)
  expect(screen.getByText('Intro')).toBeInTheDocument()
  expect(screen.getByText('Verse 1')).toBeInTheDocument()
  expect(screen.getByText('這是一首')).toBeInTheDocument()
  // C 出現在 intro 小節與歌詞錨點
  expect(screen.getAllByText('C').length).toBeGreaterThanOrEqual(2)
  expect(screen.getAllByText('G/B').length).toBeGreaterThanOrEqual(2)
})

test('顯示層移調 +2:C→D、G/B→A/C♯', () => {
  render(<SheetPreview content={SAMPLE} semitones={2} originalKey="C" />)
  expect(screen.getAllByText('D').length).toBeGreaterThanOrEqual(2)
  expect(screen.getAllByText('A/C♯').length).toBeGreaterThanOrEqual(2)
  expect(screen.queryByText('G/B')).not.toBeInTheDocument()
})

test('capo 2:顯示和弦 = 移調 -2', () => {
  render(<SheetPreview content={'歌[D]詞'} capo={2} originalKey="D" />)
  expect(screen.getByText('C')).toBeInTheDocument()
})

test('無法解析的和弦標紅原樣顯示', () => {
  render(<SheetPreview content={'歌[Cx]詞'} />)
  const bad = screen.getByText('Cx')
  expect(bad).toBeInTheDocument()
  expect(bad.className).toContain('text-red-500')
})
