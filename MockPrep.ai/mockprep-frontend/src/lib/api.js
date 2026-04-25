export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export const getAuthHeaders = () => {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const request = async (endpoint, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...getAuthHeaders(),
    ...(options.headers || {}),
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    credentials: 'include',
    ...options,
    headers,
  })
  const data = await res.json().catch(() => ({}))

  if (!res.ok) throw new Error(data.message || 'Something went wrong')
  return data
}

export const authAPI = {
  signup: (body) => request('/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  getMe: () => request('/auth/me'),
  logout: () => request('/auth/logout', { method: 'POST' }),
  onboarding: (body) => request('/auth/onboarding', { method: 'PUT', body: JSON.stringify(body) }),
}

export const interviewAPI = {
  uploadResume: (body) => request('/interviews/upload-resume', {
    method: 'POST',
    body: JSON.stringify(body),
  }),
  start: (body) => request('/interviews/start', {
    method: 'POST',
    body: JSON.stringify(body),
  }),
  getSession: (sessionId) => request(`/interviews/${sessionId}`),
  submitAnswer: (sessionId, answer) => request(`/interviews/${sessionId}/answer`, {
    method: 'POST',
    body: JSON.stringify({ answer }),
  }),
  getReport: (sessionId) => request(`/interviews/${sessionId}/report`),
  uploadFaceFrame: (sessionId, body) => request(`/interviews/${sessionId}/face-frame`, {
    method: 'POST',
    body: JSON.stringify(body),
  }),
}
