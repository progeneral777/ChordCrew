import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { bandsApi, apiErrorMessage, type BandSummary } from '../../api/bands'
import AppLayout from '../../components/AppLayout'

export default function BandListPage() {
  const [bands, setBands] = useState<BandSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    bandsApi
      .list()
      .then((res) => setBands(res.data.data.bands))
      .catch((err) => setError(apiErrorMessage(err, '無法載入樂團列表')))
      .finally(() => setLoading(false))
  }, [])

  const onCreate = async (e: FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    setError('')
    try {
      const res = await bandsApi.create(newName.trim())
      setBands((prev) => [...prev, res.data.data.band])
      setNewName('')
    } catch (err) {
      setError(apiErrorMessage(err, '建立樂團失敗'))
    } finally {
      setCreating(false)
    }
  }

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">我的樂團</h2>
      </div>

      <form onSubmit={onCreate} className="flex gap-2 mb-8">
        <input
          type="text"
          placeholder="新樂團名稱"
          maxLength={100}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="flex-1 max-w-xs border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
        <button
          type="submit"
          disabled={creating || !newName.trim()}
          className="bg-blue-600 text-white rounded px-4 py-2 font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          建立樂團
        </button>
      </form>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {loading ? (
        <p className="text-gray-400">載入中…</p>
      ) : bands.length === 0 ? (
        <p className="text-gray-400">還沒有樂團,建立一個開始吧!</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bands.map((band) => (
            <li key={band.id}>
              <Link
                to={`/bands/${band.id}`}
                className="block bg-white rounded-lg shadow p-5 hover:shadow-md transition-shadow"
              >
                <h3 className="font-semibold text-gray-900 mb-1">{band.name}</h3>
                <p className="text-sm text-gray-500">
                  {band.memberCount} 位成員 · 我的角色:{band.myRole}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppLayout>
  )
}
