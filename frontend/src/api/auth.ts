import client from './client'

export interface User {
  id: string
  email: string
  displayName: string
}

export const authApi = {
  register: (email: string, password: string, displayName: string) =>
    client.post('/auth/register', { email, password, displayName }),
  login: (email: string, password: string) =>
    client.post('/auth/login', { email, password }),
  me: () => client.get('/auth/me'),
  logout: () => client.post('/auth/logout'),
}
