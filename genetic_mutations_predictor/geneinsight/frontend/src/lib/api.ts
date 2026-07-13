import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:7001'

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor: add JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('geneinsight_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor: handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('geneinsight_token')
      localStorage.removeItem('geneinsight_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (email: string, name: string, password: string, role = 'researcher') =>
    api.post('/auth/register', { email, name, password, role }),
  me: () => api.get('/auth/me'),
}

// Reports
export const reportsApi = {
  list: () => api.get('/reports'),
  get: (id: number) => api.get(`/reports/${id}`),
  upload: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/reports/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  getVariants: (
    reportId: number,
    params?: { page?: number; page_size?: number; search?: string; prediction?: string }
  ) => api.get(`/reports/${reportId}/variants`, { params }),
}

// Variants
export const variantsApi = {
  get: (id: number) => api.get(`/variants/${id}`),
  search: (params?: {
    q?: string
    prediction?: string
    gene?: string
    page?: number
    page_size?: number
  }) => api.get('/variants/search', { params }),
}

// Analytics
export const analyticsApi = {
  overview: () => api.get('/analytics/overview'),
  genes: (limit = 10) => api.get('/analytics/genes', { params: { limit } }),
  confidence: () => api.get('/analytics/confidence'),
  pathogenicity: (limit = 10) => api.get('/analytics/pathogenicity', { params: { limit } }),
  features: () => api.get('/analytics/features'),
}

// Assistant
export const assistantApi = {
  chat: (message: string, reportId?: number, variantId?: number) =>
    api.post('/assistant/chat', {
      message,
      report_id: reportId,
      variant_id: variantId,
    }),
}

// Samples
export const samplesApi = {
  list: () => api.get('/samples'),
  download: (size: 'small' | 'medium' | 'large') =>
    api.get(`/samples/${size}`, { responseType: 'blob' }),
}

// Demo Library
export const demoApi = {
  library: () => api.get('/demo/library'),
  datasets: () => api.get('/demo/datasets'),
  cases: () => api.get('/demo/cases'),
  download: (datasetId: string) =>
    api.get(`/demo/download/${datasetId}`, { responseType: 'blob' }),
  readme: (datasetId: string) => api.get(`/demo/readme/${datasetId}`),
}
