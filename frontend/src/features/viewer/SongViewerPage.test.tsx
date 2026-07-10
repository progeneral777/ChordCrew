import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'
import SongViewerPage from './SongViewerPage'
import { songsApi } from '../../api/songs'

vi.mock('../../api/songs', () => ({
  songsApi: { get: vi.fn() },
}))

const SONG = {
  id: 's1',
  bandId: 'b1',
  title: '小情歌',
  artist: '蘇打綠',
  originalKey: 'C',
  bpm: 72,
  timeSignature: '4/4',
  tags: [],
  content: '[Verse]\n這是一首[C]簡單的小情歌',
  revision: 1,
  myRole: 'VIEWER',
  updatedAt: '2026-01-01T00:00:00Z',
}

function renderViewer() {
  return render(
    <MemoryRouter initialEntries={['/songs/s1/view']}>
      <Routes>
        <Route path="/songs/:id/view" element={<SongViewerPage />} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  localStorage.clear()
  vi.mocked(songsApi.get).mockResolvedValue({
    data: { data: { song: SONG } },
  } as never)
})

test('渲染歌名、譜面與控制列', async () => {
  renderViewer()
  expect(await screen.findByRole('heading', { name: '小情歌' })).toBeInTheDocument()
  expect(screen.getByText('這是一首')).toBeInTheDocument()
  expect(screen.getByText('C')).toBeInTheDocument()
  expect(screen.getByLabelText('自動捲動')).toBeInTheDocument()
  expect(screen.getByLabelText('捲動速度')).toBeInTheDocument()
})

test('A+ 放大字級', async () => {
  renderViewer()
  await screen.findByRole('heading', { name: '小情歌' })
  const container = screen.getByText('這是一首').closest('[style]') as HTMLElement
  const before = container.style.fontSize
  await userEvent.click(screen.getByLabelText('放大字級'))
  expect(Number.parseInt(container.style.fontSize)).toBeGreaterThan(Number.parseInt(before))
})

test('移調 + 後和弦跟著轉', async () => {
  renderViewer()
  await screen.findByRole('heading', { name: '小情歌' })
  const plusButtons = screen.getAllByRole('button', { name: '+' })
  await userEvent.click(plusButtons[0]) // 移調 +1 → key C→Db,C→Db
  expect(screen.getByText('D♭')).toBeInTheDocument()
})

test('深色模式切換', async () => {
  localStorage.setItem('viewerDark', '0')
  renderViewer()
  await screen.findByRole('heading', { name: '小情歌' })
  await userEvent.click(screen.getByLabelText('切換深色模式'))
  expect(localStorage.getItem('viewerDark')).toBe('1')
})
