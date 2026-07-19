import { useState } from 'react'
import {
  bandsApi,
  apiErrorMessage,
  type BandDetail,
  type InviteResult,
  type Role,
} from '../../api/bands'
import { useAuthStore } from '../../stores/authStore'

interface MembersPanelProps {
  band: BandDetail
  onReload: () => void
}

export default function MembersPanel({ band, onReload }: MembersPanelProps) {
  const myUserId = useAuthStore((s) => s.user?.id)
  const isOwner = band.myRole === 'OWNER'

  const [error, setError] = useState('')
  const [invite, setInvite] = useState<InviteResult | null>(null)
  const [inviteRole, setInviteRole] = useState<Role>('EDITOR')
  const [copied, setCopied] = useState(false)

  const onCreateInvite = async () => {
    setError('')
    try {
      const res = await bandsApi.createInvite(band.id, inviteRole)
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
    setError('')
    try {
      await bandsApi.changeRole(band.id, userId, role)
      onReload()
    } catch (err) {
      setError(apiErrorMessage(err, '變更角色失敗'))
    }
  }

  const onRemoveMember = async (userId: string, displayName: string) => {
    if (!window.confirm(`確定要將 ${displayName} 移出樂團嗎?`)) return
    setError('')
    try {
      await bandsApi.removeMember(band.id, userId)
      onReload()
    } catch (err) {
      setError(apiErrorMessage(err, '移除成員失敗'))
    }
  }

  return (
    <div>
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {isOwner && (
        <section className="card p-5 mb-6">
          <h3 className="font-semibold text-slate-900 mb-3">邀請成員</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as Role)}
              className="input"
            >
              <option value="EDITOR">EDITOR(可編輯)</option>
              <option value="VIEWER">VIEWER(僅檢視)</option>
            </select>
            <button
              type="button"
              onClick={() => void onCreateInvite()}
              className="btn-primary"
            >
              產生邀請連結
            </button>
          </div>
          {invite && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <code className="text-sm bg-slate-100 rounded px-2 py-1 break-all">
                {invite.inviteUrl}
              </code>
              <button
                type="button"
                onClick={() => void onCopyInvite()}
                className="text-sm text-indigo-600 hover:underline shrink-0"
              >
                {copied ? '已複製 ✓' : '複製'}
              </button>
              <span className="text-xs text-slate-400 shrink-0">7 天內有效</span>
            </div>
          )}
        </section>
      )}

      <section className="card overflow-hidden">
        <h3 className="font-semibold text-slate-900 px-5 py-3 border-b border-slate-100">
          成員({band.members.length})
        </h3>
        <ul className="divide-y divide-slate-100">
          {band.members.map((m) => (
            <li key={m.userId} className="px-5 py-3 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium text-slate-900 truncate">
                  {m.displayName}
                  {m.userId === myUserId && <span className="text-slate-400">(我)</span>}
                </p>
                <p className="text-sm text-slate-500 truncate">{m.email}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {isOwner && m.role !== 'OWNER' ? (
                  <>
                    <select
                      value={m.role}
                      onChange={(e) => void onChangeRole(m.userId, e.target.value as Role)}
                      className="input w-auto"
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
                  <span className="text-sm text-slate-500">{m.role}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
