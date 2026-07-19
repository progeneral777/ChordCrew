import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'

function errorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const res = (err as {
      response?: { data?: { error?: { message?: string; fieldErrors?: Record<string, string> } } }
    }).response
    const error = res?.data?.error
    if (error?.fieldErrors) return Object.values(error.fieldErrors).join(';')
    return error?.message ?? '註冊失敗,請稍後再試'
  }
  return '註冊失敗,請稍後再試'
}

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const register = useAuthStore((s) => s.register)
  const status = useAuthStore((s) => s.status)
  const navigate = useNavigate()

  if (status === 'authed') return <Navigate to="/" replace />

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('密碼至少 8 字元')
      return
    }
    setSubmitting(true)
    try {
      await register(email, password, displayName)
      navigate('/')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <span className="grid place-items-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white text-3xl shadow-lg shadow-indigo-500/30 mb-3">
            ♪
          </span>
          <h1 className="text-3xl font-bold text-gradient">BandSheet</h1>
          <p className="text-slate-500 mt-1">建立新帳號</p>
        </div>
        <form onSubmit={onSubmit} className="card p-6 space-y-4">
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-slate-700 mb-1.5">
              顯示名稱
            </label>
            <input
              id="displayName"
              type="text"
              required
              maxLength={50}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
              密碼(至少 8 字元)
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={submitting} className="btn-primary w-full py-2.5">
            {submitting ? '註冊中…' : '註冊'}
          </button>
        </form>
        <p className="text-center text-sm text-slate-500 mt-5">
          已經有帳號?{' '}
          <Link to="/login" className="font-medium text-indigo-600 hover:underline">
            登入
          </Link>
        </p>
      </div>
    </div>
  )
}
