import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { bandsApi, apiErrorMessage, type BandDetail } from '../../api/bands'
import AppLayout from '../../components/AppLayout'
import SongsPanel from '../songs/SongsPanel'
import MembersPanel from './MembersPanel'

type Tab = 'songs' | 'members'

export default function BandDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [band, setBand] = useState<BandDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<Tab>('songs')

  const reload = useCallback(() => {
    if (!id) return
    bandsApi
      .detail(id)
      .then((res) => setBand(res.data.data.band))
      .catch((err) => setError(apiErrorMessage(err, '無法載入樂團')))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    reload()
  }, [reload])

  const onDeleteBand = async () => {
    if (!id || !band) return
    if (!window.confirm(`確定要刪除「${band.name}」嗎?此操作無法復原。`)) return
    try {
      await bandsApi.remove(id)
      navigate('/')
    } catch (err) {
      setError(apiErrorMessage(err, '刪除樂團失敗'))
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <p className="text-slate-400">載入中…</p>
      </AppLayout>
    )
  }

  if (!band) {
    return (
      <AppLayout>
        <p className="text-red-600">{error || '找不到樂團'}</p>
        <Link to="/" className="text-indigo-600 hover:underline text-sm">
          回樂團列表
        </Link>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="mb-6">
        <Link to="/" className="text-sm text-indigo-600 hover:underline">
          ← 樂團列表
        </Link>
        <div className="flex items-center justify-between mt-2">
          <h2 className="text-2xl font-bold text-slate-900">{band.name}</h2>
          {band.myRole === 'OWNER' && (
            <button
              type="button"
              onClick={() => void onDeleteBand()}
              className="text-sm text-red-500 hover:text-red-700"
            >
              刪除樂團
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-1 border-b border-slate-200 mb-6">
        {(
          [
            ['songs', '歌曲'],
            ['members', `成員(${band.members.length})`],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === key
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'songs' ? (
        <SongsPanel bandId={band.id} myRole={band.myRole} />
      ) : (
        <MembersPanel band={band} onReload={reload} />
      )}
    </AppLayout>
  )
}
