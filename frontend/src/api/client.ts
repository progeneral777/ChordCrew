import axios from 'axios'

const client = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// On 401 (except for login/register/refresh themselves), try one silent
// refresh via the HTTP-only cookie, then replay the original request.
const NO_REFRESH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh']

client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    const skip = NO_REFRESH_PATHS.some((p) => original?.url?.includes(p))
    if (error.response?.status === 401 && original && !original._retry && !skip) {
      original._retry = true
      try {
        const { data } = await axios.post('/api/auth/refresh', {}, { withCredentials: true })
        const newToken = data.data.accessToken
        localStorage.setItem('accessToken', newToken)
        original.headers.Authorization = `Bearer ${newToken}`
        return client(original)
      } catch {
        localStorage.removeItem('accessToken')
      }
    }
    return Promise.reject(error)
  }
)

export default client
