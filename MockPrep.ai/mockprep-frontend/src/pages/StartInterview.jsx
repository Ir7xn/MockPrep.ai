import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { interviewAPI } from '../lib/api'
import { getUser } from '../lib/auth'

const interviewModes = [
  { id: 'technical', label: 'Technical', desc: 'DSA, system design, core concepts' },
  { id: 'hr', label: 'Behavioral', desc: 'STAR stories, motivation, soft skills' },
  { id: 'mixed', label: 'Mixed', desc: 'Technical and behavioral practice' },
  { id: 'casestudy', label: 'Case Study', desc: 'Problem solving and structured thinking' },
]

const durations = [
  { id: '10', label: '10 min', desc: 'Quick practice' },
  { id: '20', label: '20 min', desc: 'Standard session' },
  { id: '45', label: '45 min', desc: 'Full interview' },
]

const companies = ['Google', 'Amazon', 'Microsoft', 'Meta', 'Flipkart', 'TCS']
const maxResumeBytes = 5 * 1024 * 1024

const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => {
    const result = String(reader.result || '')
    resolve(result.includes(',') ? result.split(',').pop() : result)
  }
  reader.onerror = reject
  reader.readAsDataURL(file)
})

const isAllowedResume = (file) => {
  const extension = file.name.split('.').pop()?.toLowerCase()
  return ['pdf', 'docx'].includes(extension)
}

export default function StartInterview() {
  const navigate = useNavigate()
  const user = getUser()
  const defaultRole = user?.onboardingData?.targetRole || ''
  const [resume, setResume] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [mode, setMode] = useState('mixed')
  const [duration, setDuration] = useState('20')
  const [role, setRole] = useState(defaultRole)
  const [selectedCompany, setSelectedCompany] = useState('')
  const [customCompany, setCustomCompany] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const company = useMemo(() => customCompany.trim() || selectedCompany, [customCompany, selectedCompany])

  const setResumeFile = (file) => {
    setError('')

    if (!file) return
    if (!isAllowedResume(file)) {
      setError('Upload a PDF or DOCX resume.')
      return
    }
    if (file.size > maxResumeBytes) {
      setError('Resume must be 5MB or smaller.')
      return
    }

    setResume(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    setResumeFile(e.dataTransfer.files[0])
  }

  const handleFile = (e) => {
    setResumeFile(e.target.files[0])
  }

  const handleBegin = async () => {
    const cleanedRole = role.trim()

    if (!resume) {
      setError('Upload your resume before starting.')
      return
    }
    if (!cleanedRole) {
      setError('Enter the role you want to practice for.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const data = await fileToBase64(resume)
      const uploaded = await interviewAPI.uploadResume({
        fileName: resume.name,
        mimeType: resume.type,
        size: resume.size,
        data,
        name: user?.firstName || "User",
        email: user?.email
      })

      const started = await interviewAPI.start({
        candidateId: uploaded.candidateId,
        resumeId: uploaded.resumeId,
        role: cleanedRole,
        company,
        mode,
        durationMinutes: Number(duration),
        resumeFile: {
          name: resume.name,
          mimeType: resume.type,
          size: resume.size,
        },
      })

      const sessionState = {
        sessionId: started.session.id,
        interviewId: started.session.interviewId,
        firstQuestion: started.session.firstQuestion,
        questionNumber: started.session.questionNumber,
        totalQuestions: started.session.totalQuestions,
        role: started.session.role,
        company: started.session.company,
        mode: started.session.mode,
        durationMinutes: started.session.durationMinutes,
      }

      sessionStorage.setItem('mockprepInterviewSession', JSON.stringify(sessionState))
      navigate('/interview', { state: sessionState })
    } catch (err) {
      setError(err.message || 'Could not start interview. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f0f0f0] font-body">
      <div className="bg-white border-b border-border-light px-6 py-4 flex items-center gap-3 sticky top-0 z-50">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 text-text-mid hover:text-primary font-body text-sm transition-colors"
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
            <path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Interview Setup
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-8">
        <div>
          <h2 className="font-heading font-bold text-xl text-text-dark mb-4">Upload Your Resume</h2>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center transition-all duration-200 cursor-pointer ${
              dragging
                ? 'border-primary bg-primary/5'
                : resume
                  ? 'border-green-400 bg-green-50'
                  : 'border-border-light bg-white hover:border-primary/40 hover:bg-primary/5'
            }`}
          >
            {resume ? (
              <>
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
                  <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
                    <path d="M5 13l4 4L19 7" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p className="font-body font-semibold text-text-dark text-sm">{resume.name}</p>
                <p className="font-body text-text-light text-xs mt-1">
                  {(resume.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <button
                  type="button"
                  onClick={() => setResume(null)}
                  className="mt-3 text-xs text-red-500 hover:text-red-600 font-body transition-colors"
                >
                  Remove
                </button>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-full bg-[#f4f4f8] flex items-center justify-center mb-4">
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                    <path d="M12 16V8m0 0l-3 3m3-3l3 3" stroke="#8888aa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M20 16.5A4.5 4.5 0 0015.5 12H14a6 6 0 10-11.8 1.5" stroke="#8888aa" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <p className="font-body font-semibold text-text-dark text-sm mb-1">
                  Drag and drop your resume here
                </p>
                <p className="font-body text-text-light text-xs mb-4">PDF or DOCX, max 5MB</p>
                <label className="cursor-pointer border border-border-light hover:border-primary/40 bg-white text-text-mid hover:text-primary font-body text-xs px-4 py-2 rounded-lg transition-all duration-200">
                  Browse Files
                  <input type="file" accept=".pdf,.docx" className="hidden" onChange={handleFile} />
                </label>
              </>
            )}
          </div>
        </div>

        <div>
          <h2 className="font-heading font-bold text-xl text-text-dark mb-4">Practice Target</h2>
          <div className="grid gap-4 bg-white border border-border-light rounded-2xl p-5">
            <label className="grid gap-2">
              <span className="font-body text-sm font-semibold text-text-dark">Role</span>
              <input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Software Engineer, Data Analyst, Product Manager..."
                className="w-full rounded-xl border border-border-light px-4 py-3 text-sm outline-none focus:border-primary bg-white"
              />
            </label>
            <label className="grid gap-2">
              <span className="font-body text-sm font-semibold text-text-dark">Company focus</span>
              <input
                value={customCompany}
                onChange={(e) => {
                  setCustomCompany(e.target.value)
                  if (e.target.value) setSelectedCompany('')
                }}
                placeholder="Optional custom company"
                className="w-full rounded-xl border border-border-light px-4 py-3 text-sm outline-none focus:border-primary bg-white"
              />
            </label>
          </div>
        </div>

        <div>
          <h2 className="font-heading font-bold text-xl text-text-dark mb-4">Select Interview Mode</h2>
          <div className="grid grid-cols-2 gap-3">
            {interviewModes.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setMode(item.id)}
                className={`text-left p-4 rounded-2xl border transition-all duration-200 ${
                  mode === item.id
                    ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10'
                    : 'border-border-light bg-white hover:border-primary/30 hover:bg-primary/5'
                }`}
              >
                <p className={`font-heading font-semibold text-sm mb-0.5 ${
                  mode === item.id ? 'text-primary' : 'text-text-dark'
                }`}
                >
                  {item.label}
                </p>
                <p className="font-body text-text-light text-xs leading-relaxed">{item.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h2 className="font-heading font-bold text-xl text-text-dark mb-4">Interview Duration</h2>
          <div className="grid grid-cols-3 gap-3">
            {durations.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setDuration(item.id)}
                className={`text-left p-4 rounded-2xl border transition-all duration-200 ${
                  duration === item.id
                    ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10'
                    : 'border-border-light bg-white hover:border-primary/30 hover:bg-primary/5'
                }`}
              >
                <p className={`font-heading font-semibold text-sm mb-0.5 ${
                  duration === item.id ? 'text-primary' : 'text-text-dark'
                }`}
                >
                  {item.label}
                </p>
                <p className="font-body text-text-light text-xs">{item.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h2 className="font-heading font-bold text-xl text-text-dark mb-4">Target Company</h2>
          <div className="flex flex-wrap gap-2">
            {companies.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setCustomCompany('')
                  setSelectedCompany(item === selectedCompany ? '' : item)
                }}
                className={`px-4 py-2 rounded-full border font-body text-sm transition-all duration-200 ${
                  selectedCompany === item
                    ? 'border-primary bg-primary text-white'
                    : 'border-border-light bg-white text-text-mid hover:border-primary/40 hover:text-primary'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleBegin}
          disabled={loading}
          className="w-full bg-gradient-to-b from-[#5358F3] via-[#883BE8] to-[#9F3BDF] disabled:opacity-60 disabled:cursor-not-allowed text-white font-body font-semibold py-4 rounded-2xl transition-all duration-200 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 text-base"
        >
          {loading ? 'Starting interview...' : 'Begin Interview'}
        </button>
      </div>
    </div>
  )
}
