const { Blob } = require('buffer')

const getConfig = () => {
  const baseUrl = process.env.AI_API_BASE_URL?.replace(/\/$/, '')
  const apiKey = process.env.AI_API_KEY

  if (!baseUrl) {
    throw new Error('AI_API_BASE_URL is not configured')
  }

  if (!apiKey) {
    throw new Error('AI_API_KEY is not configured')
  }

  if (typeof fetch !== 'function' || typeof FormData !== 'function') {
    throw new Error('MockPrep backend requires Node 18+ for fetch and FormData support')
  }

  return { baseUrl, apiKey }
}

const parseJson = async (response) => {
  const text = await response.text()
  if (!text) return {}

  try {
    return JSON.parse(text)
  } catch {
    return { message: text }
  }
}

const buildErrorMessage = (status, payload) => {
  if (payload?.detail) return Array.isArray(payload.detail) ? payload.detail.join(', ') : payload.detail
  if (payload?.error) return payload.error
  if (payload?.message) return payload.message
  return `AI service request failed with status ${status}`
}

const requestJson = async (path, { method = 'GET', body } = {}) => {
  const { baseUrl, apiKey } = getConfig()

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const payload = await parseJson(response)
  if (!response.ok) {
    throw new Error(buildErrorMessage(response.status, payload))
  }

  return payload
}

const requestBinary = async (path, { method = 'POST', body } = {}) => {
  const { baseUrl, apiKey } = getConfig()

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const payload = await parseJson(response)
    throw new Error(buildErrorMessage(response.status, payload))
  }

  const arrayBuffer = await response.arrayBuffer()
  return {
    buffer: Buffer.from(arrayBuffer),
    contentType: response.headers.get('content-type') || 'audio/wav',
  }
}

const decodeBase64 = (data) => {
  if (!data || typeof data !== 'string') {
    throw new Error('File data is required')
  }

  const normalized = data.includes(',') ? data.split(',').pop() : data
  const buffer = Buffer.from(normalized, 'base64')

  if (!buffer.length) {
    throw new Error('File data is empty')
  }

  return buffer
}

const requestForm = async (path, formData) => {
  const { baseUrl, apiKey } = getConfig()

  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
    },
    body: formData,
  })

  const payload = await parseJson(response)
  if (!response.ok) {
    throw new Error(buildErrorMessage(response.status, payload))
  }

  return payload
}

const uploadResume = async ({ fileName, mimeType, data, name, email }) => {
  const buffer = decodeBase64(data)
  if (buffer.length > 5 * 1024 * 1024) {
    throw new Error('Resume must be 5MB or smaller')
  }

  const formData = new FormData()

  const fileBlob = new Blob([buffer], { type: mimeType || 'application/pdf' })
  formData.append('file', fileBlob, fileName)
  formData.append('name', name)
  formData.append('email', email)

  return requestForm('/api/resumes/upload', formData)
}

const startInterview = async ({ candidateId, resumeId, campaignId, role }) => (
  requestJson('/api/interviews/start', {
    method: 'POST',
    body: {
      candidate_id: candidateId,
      resume_id: resumeId,
      campaign_id: campaignId,
      role,
    },
  })
)

const submitAnswer = async ({ interviewId, answer }) => (
  requestJson('/api/interviews/handle', {
    method: 'POST',
    body: {
      interview_id: interviewId,
      answer,
    },
  })
)

const fetchReport = async (interviewId) => requestJson(`/api/reports/${interviewId}`)

const getPregeneratedTts = async ({ interviewId, text, questionNo, maxWaitMs = 500 }) => (
  requestBinary('/api/tts/get-pregenerated', {
    body: {
      interview_id: interviewId,
      text,
      question_no: questionNo,
      max_wait_ms: maxWaitMs,
    },
  })
)

const generateInterviewTts = async ({ text }) => (
  requestBinary('/api/tts/interview', {
    body: { text },
  })
)

const uploadFaceFrame = async ({ interviewId, imageData, mimeType, fileName }) => {
  const buffer = decodeBase64(imageData)
  if (buffer.length > 1024 * 1024) {
    throw new Error('Face frame is too large')
  }

  const formData = new FormData()

  formData.append('interview_id', interviewId)
  formData.append('image', new Blob([buffer], { type: mimeType || 'image/jpeg' }), fileName || `face-frame-${Date.now()}.jpg`)

  return requestForm('/api/face-analysis/frame', formData)
}

module.exports = {
  uploadResume,
  startInterview,
  submitAnswer,
  fetchReport,
  getPregeneratedTts,
  generateInterviewTts,
  uploadFaceFrame,
}
