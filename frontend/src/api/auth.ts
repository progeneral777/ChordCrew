import client from './client'

export interface User {
  id: string
  email: string
  displayName: string
  // 只有 /auth/me 與個人設定端點會回傳以下欄位。
  hasPassword?: boolean
  googleLinked?: boolean
}

export const authApi = {
  register: (email: string, password: string, displayName: string) =>
    client.post('/auth/register', { email, password, displayName }),
  login: (email: string, password: string) =>
    client.post('/auth/login', { email, password }),
  googleLogin: (credential: string) => client.post('/auth/google', { credential }),
  me: () => client.get('/auth/me'),
  logout: () => client.post('/auth/logout'),

  // 個人設定
  updateProfile: (displayName: string) => client.patch('/auth/profile', { displayName }),
  changePassword: (currentPassword: string | null, newPassword: string) =>
    client.post('/auth/change-password', { currentPassword, newPassword }),
  linkGoogle: (credential: string) => client.post('/auth/link-google', { credential }),
  unlinkGoogle: () => client.delete('/auth/link-google'),
}
