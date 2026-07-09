import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  bandsApi,
  apiErrorMessage,
  type BandDetail,
  type InviteResult,
  type Role,
} from '../../api/bands'
import { useAuthStore } from '../../stores/authStore'
import AppLayout from '../../components/AppLayout'

export default function BandDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const myUserId = useAuthStore((s) => s.user?.id)

  const [band, setBand] = useState<BandDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [invite, setInvite] = useState<InviteResult | null>(null)
  const [inviteRole, setInviteRole] = useState<Role>('EDITOR')
  const [copied, setCopied] = useState(false)

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

  const isOwner = band?.myRole === 'OWNER'

  const onCreateInvite = async () => {
    if (!id) return
    setError('')
    try {
      const res = await bandsApi.createInvite(id, inviteRole)
      setInvite(res.data.data)
      setCopied(false)
    } catch (err) {
      setError(apiErrorMessage(err, '產生邀請連結失敗'))
    }
  }

  const onCopyInvite = async () => {
    if (!invite) return
    await navigator.clipboard.writeText(invite.inviteUrl)
    setCopied(true)
  }

  const onChangeRole = async (userId: string, role: Role) => {
    if (!id) return
    setError('')
    try {
      await bandsApi.changeRole(id, userId, role)
      reload()
    } catch (err) {
      setError(apiErrorMessage(err, '變更角色失敗'))
    }
  }

  const onRemoveMember = async (userId: string, displayName: string) => {
    if (!id || !window.confirm(`確定要將 ${displayName} 移出樂團嗎?`)) return
    setError('')
    try {
      await bandsApi.removeMember(id, userId)
      reload()
    } catch (err) {
      setError(apiErrorMessage(err, '移除成員失敗'))
    }
  }

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
        <p className="text-gray-400">載入中…</p>
      </AppLayout>
    )
  }

  if (!band) {
    return (
      <AppLayout>
        <p className="text-red-600">{error || '找不到樂團'}</p>
        <Link to="/" className="text-blue-600 hover:underline text-sm">
          回樂團列表
        </Link>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="mb-6">
        <Link to="/" className="text-sm text-blue-600 hover:underline">
          ← 樂團列表
        </Link>
        <div className="flex items-center justify-between mt-2">
          <h2 className="text-2xl font-bold text-gray-900">{band.name}</h2>
          {isOwner && (
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

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {isOwner && (
        <section className="bg-white rounded-lg shadow p-5 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">邀請成員</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as Role)}
              className="border border-gray-300 rounded px-3 py-2 bg-white"
            >
              <option value="EDITOR">EDITOR(可編輯)</option>
              <option value="VIEWER">VIEWER(僅檢視)</option>
            </select>
            <button
              type="button"
              onClick={() => void onCreateInvite()}
              className="bg-blue-600 text-white rounded px-4 py-2 font-medium hover:bg-blue-700"
            >
              產生邀請連結
            </button>
          </div>
          {invite && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <code className="text-sm bg-gray-100 rounded px-2 py-1 break-all">
                {invite.inviteUrl}
              </code>
              <button
                type="button"
                onClick={() => void onCopyInvite()}
                className="text-sm text-blue-600 hover:underline shrink-0"
              >
                {copied ? '已複製 ✓' : '複製'}
              </button>
              <span className="text-xs text-gray-400 shrink-0">7 天內有效</span>
            </div>
          )}
        </section>
      )}

      <section className="bg-white rounded-lg shadow overflow-hidden">
        <h3 className="font-semibold text-gray-900 px-5 py-3 border-b border-gray-100">
          成員({band.members.length})
        </h3>
        <ul className="divide-y divide-gray-100">
          {band.members.map((m) => (
            <li key={m.userId} className="px-5 py-3 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {m.displayName}
                  {m.userId === myUserId && <span className="text-gray-400">(我)</span>}
                </p>
                <p className="text-sm text-gray-500 truncate">{m.email}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {isOwner && m.role !== 'OWNER' ? (
                  <>
                    <select
                      value={m.role}
                      onChange={(e) => void onChangeRole(m.userId, e.target.value as Role)}
                      className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
                    >
                      <option value="EDITOR">EDITOR</option>
                      <option value="VIEWER">VIEWER</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => void onRemoveMember(m.userId, m.displayName)}
                      className="text-sm text-red-500 hover:text-red-700"
                    >
                      移除
                    </button>
                  </>
                ) : (
                  <span className="text-sm text-gray-500">{m.role}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </AppLayout>
  )
}
