import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1'

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor — attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Response interceptor — handle 401 refresh
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refreshToken = localStorage.getItem('refreshToken')
        if (!refreshToken) throw new Error('No refresh token')
        const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken })
        localStorage.setItem('accessToken', data.data.accessToken)
        original.headers.Authorization = `Bearer ${data.data.accessToken}`
        return api(original)
      } catch {
        localStorage.clear()
        window.location.href = '/login'
        return Promise.reject(error)
      }
    }
    return Promise.reject(error)
  }
)

// Auth
export const authAPI = {
  signup: (data) => api.post('/auth/signup', data),
  login:  (data) => api.post('/auth/login', data),
  logout: ()     => api.post('/auth/logout'),
  me:     ()     => api.get('/auth/me'),
  updateProfile: (data) => api.patch('/auth/profile', data),
  changePassword: (data) => api.post('/auth/change-password', data),
}

// Bookings
export const bookingAPI = {
  estimate:      (params) => api.get('/bookings/estimate', { params }),
  vehicleTypes:  ()       => api.get('/bookings/vehicle-types'),
  create:        (data)   => api.post('/bookings', data),
  myBookings:    (params) => api.get('/bookings/my', { params }),
  getById:       (id)     => api.get(`/bookings/${id}`),
  cancel:        (id, data) => api.post(`/bookings/${id}/cancel`, data),
  rate:          (id, data) => api.post(`/bookings/${id}/rate`, data),
  // Driver
  driverBookings:(params) => api.get('/bookings/driver/my', { params }),
  accept:        (id)     => api.post(`/bookings/${id}/accept`),
  updateStatus:  (id, status) => api.patch(`/bookings/${id}/status`, { status }),
}

// Drivers
export const driverAPI = {
  createProfile: (data) => api.post('/drivers/profile', data),
  getProfile:    ()     => api.get('/drivers/profile'),
  setAvailability: (isAvailable) => api.patch('/drivers/availability', { isAvailable }),
  updateLocation: (lat, lng) => api.post('/drivers/location', { lat, lng }),
  earnings:      (params) => api.get('/drivers/earnings', { params }),
}

// Payments
export const paymentAPI = {
  getByBooking: (bookingId) => api.get(`/payments/booking/${bookingId}`),
  initiateUpi:  (data) => api.post('/payments/upi/initiate', data),
  history:      (params) => api.get('/payments/history', { params }),
}

export default api
