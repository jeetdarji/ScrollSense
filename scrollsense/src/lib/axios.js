import axios from 'axios'
import useAuthStore from '../store/authStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,     // sends httpOnly cookie on every request
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

// Attach access token to every request
api.interceptors.request.use(
  (config) => {
    // getState() is correct way to read Zustand outside React
    const token = useAuthStore.getState().accessToken
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Handle token expiry — refresh and retry automatically
let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error)
    else prom.resolve(token)
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (
      error.response?.status === 401 &&
      error.response?.data?.code === 'TOKEN_EXPIRED' &&
      !originalRequest._retry
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return api(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const res = await api.post('/auth/refresh')
        const { accessToken, user } = res.data
        useAuthStore.getState().setAccessToken(accessToken)
        useAuthStore.getState().setUser(user)
        // Keep extension credentials in sync with the refreshed token
        try {
          const payload = JSON.stringify({ token: accessToken, apiUrl: import.meta.env.VITE_API_URL })
          localStorage.setItem('ss_ext_credentials', payload)
          window.dispatchEvent(new CustomEvent('ss_credentials_updated'))
        } catch (_) {}
        processQueue(null, accessToken)
        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        useAuthStore.getState().clearUser()
        try {
          localStorage.removeItem('ss_ext_credentials')
          window.dispatchEvent(new CustomEvent('ss_credentials_cleared'))
        } catch (_) {}
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default api