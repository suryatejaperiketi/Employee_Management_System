import axios from 'axios'
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api' })
api.interceptors.request.use(config => {
  const token = localStorage.getItem('access')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
api.interceptors.response.use(r => r, async error => {
  const original = error.config
  if (error.response?.status === 401 && !original._retry && localStorage.getItem('refresh')) {
    original._retry = true
    try {
      const { data } = await axios.post(`${api.defaults.baseURL}/auth/refresh/`, { refresh: localStorage.getItem('refresh') })
      localStorage.setItem('access', data.access)
      original.headers.Authorization = `Bearer ${data.access}`
      return api(original)
    } catch { localStorage.clear(); window.location.href = '/login' }
  }
  return Promise.reject(error)
})
export default api
