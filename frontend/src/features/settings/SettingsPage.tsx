import { useEffect, useState, type FormEvent } from 'react'
import { apiErrorMessage } from '../../api/bands'
import { authApi, type User } from '../../api/auth'
import { useAuthStore } from '../../stores/authStore'
import AppLayout from '../../components/AppLayout'
import GoogleSignInButton from '../auth/GoogleSignInButton'

const GOOGLE_ENABLED = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID)

export default function SettingsPage() {
  const setUser = useAuthStore((s) => s.setUser)
  const [profile, setProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // 個人資料
  const [displayName, setDisplayName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [nameMsg, setNameMsg] = useState('')
  const [nameErr, setNameErr] = useState('')

  // 密碼
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [savingPw, setSavingPw] = useState(false)
  const [pwMsg, setPwMsg] = useState('')
  const [pwErr, setPwErr] = useState('')

  // Google 綁定
  const [googleErr, setGoogleErr] = useState('')
  const [googleMsg, setGoogleMsg] = useState('')

  const applyProfile = (u: User) => {
    setProfile(u)
    setUser(u)
  }

  useEffect(() => {
    authApi
      .me()
      .then((res) => {
        const u: User = res.data.data.user
        setProfile(u)
        setDisplayName(u.displayName)
      })
      .catch(() => setNameErr('無法載入個人資料'))
      .finally(() => setLoading(false))
  }, [])

  const onSaveName = async (e: FormEvent) => {
    e.preventDefault()
    if (!displayName.trim()) return
    setSavingName(true)
    setNameMsg('')
    setNameErr('')
    try {
      const res = await authApi.updateProfile(displayName.trim())
      applyProfile(res.data.data.user)
      setNameMsg('顯示名稱已更新')
    } catch (err) {
      setNameErr(apiErrorMessage(err, '更新失敗'))
    } finally {
      setSavingName(false)
    }
  }

  const onChangePassword = async (e: FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 8) {
      setPwErr('新密碼至少 8 字元')
      return
    }
    setSavingPw(true)
    setPwMsg('')
    setPwErr('')
    try {
      const res = await authApi.changePassword(
        profile?.hasPassword ? currentPassword : null,
        newPassword
      )
      applyProfile(res.data.data.user)
      setCurrentPassword('')
      setNewPassword('')
      setPwMsg(profile?.hasPassword ? '密碼已更新' : '密碼已設定,之後可用 email + 密碼登入')
    } catch (err) {
      setPwErr(apiErrorMessage(err, '變更密碼失敗'))
    } finally {
      setSavingPw(false)
    }
  }

  const onLinkGoogle = async (credential: string) => {
    setGoogleErr('')
    setGoogleMsg('')
    const res = await authApi.linkGoogle(credential)
    applyProfile(res.data.data.user)
    setGoogleMsg('已成功綁定 Google 帳號')
  }

  const onUnlinkGoogle = async () => {
    if (!window.confirm('確定要解除 Google 綁定嗎?')) return
    setGoogleErr('')
    setGoogleMsg('')
    try {
      const res = await authApi.unlinkGoogle()
      applyProfile(res.data.data.user)
      setGoogleMsg('已解除 Google 綁定')
    } catch (err) {
      setGoogleErr(apiErrorMessage(err, '解除綁定失敗'))
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <p className="text-slate-400">載入中…</p>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <h2 className="text-2xl font-bold text-slate-900 mb-6">個人設定</h2>
      <div className="max-w-xl space-y-6">
        {/* 個人資料 */}
        <section className="card p-6">
          <h3 className="font-semibold text-slate-900 mb-4">個人資料</h3>
          <form onSubmit={onSaveName} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <input value={profile?.email ?? ''} disabled className="input bg-slate-50 text-slate-400" />
            </div>
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-slate-700 mb-1.5">
                顯示名稱
              </label>
              <input
                id="displayName"
                maxLength={50}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="input"
              />
            </div>
            {nameErr && <p className="text-sm text-red-600">{nameErr}</p>}
            {nameMsg && <p className="text-sm text-emerald-600">{nameMsg}</p>}
            <button
              type="submit"
              disabled={savingName || !displayName.trim() || displayName === profile?.displayName}
              className="btn-primary"
            >
              {savingName ? '儲存中…' : '儲存'}
            </button>
          </form>
        </section>

        {/* 密碼 */}
        <section className="card p-6">
          <h3 className="font-semibold text-slate-900 mb-1">
            {profile?.hasPassword ? '變更密碼' : '設定密碼'}
          </h3>
          {!profile?.hasPassword && (
            <p className="text-sm text-slate-500 mb-4">
              你目前用 Google 登入,尚未設定密碼。設定後也能用 email + 密碼登入。
            </p>
          )}
          <form onSubmit={onChangePassword} className="space-y-4 mt-3">
            {profile?.hasPassword && (
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-slate-700 mb-1.5">
                  目前密碼
                </label>
                <input
                  id="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="input"
                />
              </div>
            )}
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700 mb-1.5">
                新密碼(至少 8 字元)
              </label>
              <input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input"
              />
            </div>
            {pwErr && <p className="text-sm text-red-600">{pwErr}</p>}
            {pwMsg && <p className="text-sm text-emerald-600">{pwMsg}</p>}
            <button type="submit" disabled={savingPw || !newPassword} className="btn-primary">
              {savingPw ? '處理中…' : profile?.hasPassword ? '變更密碼' : '設定密碼'}
            </button>
          </form>
        </section>

        {/* 連結帳號 */}
        <section className="card p-6">
          <h3 className="font-semibold text-slate-900 mb-4">連結帳號</h3>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="grid place-items-center w-9 h-9 rounded-full bg-slate-100 text-slate-600 shrink-0">
                G
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900">Google</p>
                <p className="text-sm text-slate-500">
                  {profile?.googleLinked ? '已連結,可用 Google 快速登入' : '尚未連結'}
                </p>
              </div>
            </div>
            {profile?.googleLinked ? (
              <button
                type="button"
                onClick={() => void onUnlinkGoogle()}
                disabled={!profile?.hasPassword}
                title={!profile?.hasPassword ? '請先設定密碼,才能解除綁定' : undefined}
                className="btn-secondary shrink-0 disabled:opacity-50 disabled:pointer-events-none"
              >
                解除綁定
              </button>
            ) : GOOGLE_ENABLED ? (
              <GoogleSignInButton
                text="continue_with"
                onCredential={onLinkGoogle}
                onError={setGoogleErr}
                onSuccess={() => {}}
              />
            ) : (
              <span className="text-sm text-slate-400 shrink-0">未啟用</span>
            )}
          </div>
          {profile?.googleLinked && !profile?.hasPassword && (
            <p className="text-sm text-slate-400 mt-3">
              目前只用 Google 登入,請先在上方設定密碼,才能解除綁定。
            </p>
          )}
          {googleErr && <p className="text-sm text-red-600 mt-3">{googleErr}</p>}
          {googleMsg && <p className="text-sm text-emerald-600 mt-3">{googleMsg}</p>}
        </section>
      </div>
    </AppLayout>
  )
}
