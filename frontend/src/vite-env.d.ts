/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Google OAuth Web client id,用於「Sign in with Google」按鈕。見 docs/GOOGLE_LOGIN_SETUP.md */
  readonly VITE_GOOGLE_CLIENT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
