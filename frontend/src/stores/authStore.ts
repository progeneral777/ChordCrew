import { create } from 'zustand'
import { authApi, type User } from '../api/auth'

type AuthStatus = 'loading' | 'authed' | 'anon'

interface AuthState {
  user: User | null
  status: AuthStatus
  init: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  loginWithGoogle: (credential: string) => Promise<void>
  register: (email: string, password: string, displayName: string) => Promise<void>
  setUser: (user: User) => void
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  status: 'loading',

  init: async () => {
    try {
      const res = await authApi.me()
      set({ user: res.data.data.user, status: 'authed' })
    } catch {
      localStorage.removeItem('accessToken')
      set({ user: null, status: 'anon' })
    }
  },

  login: async (email, password) => {
    const res = await authApi.login(email, password)
    localStorage.setItem('accessToken', res.data.data.accessToken)
    set({ user: res.data.data.user, status: 'authed' })
  },

  loginWithGoogle: async (credential) => {
    const res = await authApi.googleLogin(credential)
    localStorage.setItem('accessToken', res.data.data.accessToken)
    set({ user: res.data.data.user, status: 'authed' })
  },

  register: async (email, password, displayName) => {
    await authApi.register(email, password, displayName)
    await get().login(email, password)
  },

  setUser: (user) => set({ user }),

  logout: async () => {
    try {
      await authApi.logout()
    } finally {
      localStorage.removeItem('accessToken')
      set({ user: null, status: 'anon' })
    }
  },
}))
