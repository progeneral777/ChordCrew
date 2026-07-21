import { useEffect, useRef, useState } from 'react'
import { useAuthStore } from '../../stores/authStore'

// Google Identity Services 的最小型別宣告(由 index.html 載入的 gsi/client 注入 window.google)。
interface GoogleCredentialResponse {
  credential: string
}
interface GoogleAccountsId {
  initialize: (config: {
    client_id: string
    callback: (res: GoogleCredentialResponse) => void
  }) => void
  renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } }
  }
}

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

interface Props {
  onError: (message: string) => void
  onSuccess: () => void
  // 若提供,拿到 credential 後改呼叫這個(例如「綁定 Google」),否則預設走登入流程。
  onCredential?: (credential: string) => Promise<void>
  text?: 'signin_with' | 'signup_with' | 'continue_with'
}

export default function GoogleSignInButton({
  onError,
  onSuccess,
  onCredential,
  text = 'continue_with',
}: Props) {
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle)
  const ref = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)

  // gsi/client 以 async 載入,輪詢等待 window.google 就緒。
  useEffect(() => {
    if (!CLIENT_ID) return
    if (window.google?.accounts?.id) {
      setReady(true)
      return
    }
    const timer = setInterval(() => {
      if (window.google?.accounts?.id) {
        setReady(true)
        clearInterval(timer)
      }
    }, 100)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!ready || !CLIENT_ID || !ref.current) return
    window.google!.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: async (res) => {
        try {
          await (onCredential ? onCredential(res.credential) : loginWithGoogle(res.credential))
          onSuccess()
        } catch {
          onError('Google 操作失敗,請稍後再試')
        }
      },
    })
    window.google!.accounts.id.renderButton(ref.current, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text,
      shape: 'pill',
      logo_alignment: 'center',
      width: 320,
    })
  }, [ready, loginWithGoogle, onCredential, onError, onSuccess, text])

  // 未設定 client id 時完全不顯示,避免在未設定環境出現壞掉的按鈕。
  if (!CLIENT_ID) return null

  return <div ref={ref} className="flex justify-center min-h-[44px]" />
}
