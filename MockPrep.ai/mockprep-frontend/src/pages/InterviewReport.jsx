import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { interviewAPI } from '../lib/api'

const getStoredSessionId = () => {
  try {
    const stored = sessionStorage.getItem('mockprepInterviewSession')
    return stored ? JSON.parse(stored)?.sessionId : null
  } catch {
    return null
  }
}

const scoreColor = (score) => {
  if (score >= 80) return '#22c55e'
  if (score >= 60) return '#5B4FF5'
  return '#f97316'
}

const titleForScore = (score) => {
  if (score >= 85) return 'Strong practice round'
  if (score >= 70) return 'Good progress'
  if (score >= 50) return 'Building momentum'
  return 'Focused practice needed'
}

function ScoreBar({ label, score, feedback }) {
  const safeScore = Number.isFinite(Number(score)) ? Number(score) : 0
  return (
    <div>
      <div className="flex justify-between gap-3 mb-1">
        <span className="font-body text-text-mid text-sm">{label}</span>
        <span className="font-body font-semibold text-sm" style={{ color: scoreColor(safeScore) }}>
          {safeScore}%
        </span>
      </div>
      <div className="h-2 bg-[#f4f4f8] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${safeScore}%`, background: scoreColor(safeScore) }}
        />
      </div>
      {feedback && <p className="font-body text-text-light text-xs leading-relaxed mt-2">{feedback}</p>}
    </div>
  )
}

function FeedbackList({ title, items, tone }) {
  const color = tone === 'good' ? '#22c55e' : tone === 'warn' ? '#f97316' : '#5B4FF5'

  return (
    <div className="bg-white border border-border-light rounded-2xl p-4">
      <h3 className="font-heading font-semibold text-text-dark text-sm mb-3">{title}</h3>
      {items?.length ? (
        <ul className="flex flex-col gap-2">
          {items.map((item, index) => (
            <li key={`${title}-${index}`} className="flex items-start gap-2">
              <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: color }} />
              <span className="font-body text-text-mid text-xs leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="font-body text-text-light text-xs">No feedback available yet.</p>
      )}
    </div>
  )
}

export default function InterviewReport() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('sessionId') || getStoredSessionId()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [openQ, setOpenQ] = useState(null)

  const scoreBreakdown = useMemo(() => {
    if (!report) return []
    return [
      { label: 'Overall', score: report.scores?.overall ?? report.overallScore },
      { label: 'Technical Depth', score: report.scores?.technical?.score, feedback: report.scores?.technical?.feedback },
      { label: 'Behavioral Clarity', score: report.scores?.hr?.score, feedback: report.scores?.hr?.feedback },
      { label: 'Career Communication', score: report.scores?.general?.score, feedback: report.scores?.general?.feedback },
      { label: 'Confidence Signals', score: report.scores?.confidence },
    ].filter((item) => Number(item.score) > 0 || item.feedback)
  }, [report])

  const loadReport = async () => {
    if (!sessionId) {
      setError('No interview session was found for this report.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      const data = await interviewAPI.getReport(sessionId)
      setReport(data.report)
    } catch (err) {
      setError(err.message || 'Report is not ready yet.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReport()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0f0f0] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-[#f0f0f0] font-body flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-white border border-border-light rounded-2xl p-8 text-center">
          <h1 className="font-heading font-bold text-2xl text-text-dark">Feedback Not Ready</h1>
          <p className="font-body text-text-mid text-sm mt-2">{error || 'Please try again in a moment.'}</p>
          <div className="grid grid-cols-2 gap-3 mt-6">
            <button
              type="button"
              onClick={loadReport}
              className="bg-primary text-white font-semibold py-3 rounded-xl"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="bg-white border border-border-light text-text-dark font-semibold py-3 rounded-xl"
            >
              Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  const overallScore = Number(report.overallScore || report.scores?.overall || 0)
  const questionFeedback = report.questionFeedback || []

  return (
    <div className="min-h-screen bg-[#f0f0f0] font-body">
      <div className="bg-white border-b border-border-light px-6 py-4 sticky top-0 z-50">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 text-text-mid hover:text-primary font-body text-sm transition-colors"
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
            <path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Interview Report
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 flex flex-col gap-6">
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <div className="relative w-28 h-28">
            <svg width="112" height="112" viewBox="0 0 112 112">
              <circle cx="56" cy="56" r="48" fill="none" stroke="#e8e8f0" strokeWidth="8" />
              <circle
                cx="56"
                cy="56"
                r="48"
                fill="none"
                stroke="url(#scoreGrad)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 48}`}
                strokeDashoffset={`${2 * Math.PI * 48 * (1 - overallScore / 100)}`}
                transform="rotate(-90 56 56)"
              />
              <defs>
                <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#5358F3" />
                  <stop offset="100%" stopColor="#9F3BDF" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <span className="font-heading font-bold text-2xl text-text-dark">{overallScore}</span>
                <span className="font-body text-text-light text-xs">/100</span>
              </div>
            </div>
          </div>

          <div>
            <h2 className="font-heading font-bold text-2xl text-text-dark">
              {titleForScore(overallScore)}
            </h2>
            <p className="font-body text-text-mid text-sm mt-1">
              {[report.role, report.company, report.mode, `${report.durationMinutes} min`].filter(Boolean).join(' - ')}
            </p>
            {report.summary && (
              <p className="font-body text-text-mid text-sm leading-relaxed mt-3 max-w-2xl">
                {report.summary}
              </p>
            )}
          </div>
        </div>

        <div className="bg-white border border-border-light rounded-2xl p-5">
          <h3 className="font-heading font-semibold text-text-dark mb-4">Score Breakdown</h3>
          <div className="flex flex-col gap-4">
            {scoreBreakdown.map((item) => (
              <ScoreBar key={item.label} label={item.label} score={item.score} feedback={item.feedback} />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FeedbackList title="Strengths" items={report.strengths} tone="good" />
          <FeedbackList title="Areas to Improve" items={report.weaknesses} tone="warn" />
        </div>

        <FeedbackList title="Recommendations" items={report.recommendations} tone="focus" />
        <FeedbackList title="Improvement Plan" items={report.improvementPlan} tone="focus" />

        <div className="bg-white border border-border-light rounded-2xl p-5">
          <h3 className="font-heading font-semibold text-text-dark mb-4">
            Question-by-Question Feedback
          </h3>
          <div className="flex flex-col gap-2">
            {questionFeedback.length ? questionFeedback.map((item, index) => (
              <div key={`question-${index}`} className="border border-border-light rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenQ(openQ === index ? null : index)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#f8f7ff] transition-colors text-left"
                >
                  <span className="font-heading font-bold text-sm text-primary flex-shrink-0">
                    {item.score || item.questionNumber || index + 1}
                  </span>
                  <span className="font-body text-text-mid text-sm flex-1">
                    {item.question || item.label || `Question ${index + 1}`}
                  </span>
                  <svg
                    width="16"
                    height="16"
                    fill="none"
                    viewBox="0 0 24 24"
                    className={`flex-shrink-0 transition-transform duration-200 ${openQ === index ? 'rotate-180' : ''}`}
                  >
                    <path d="M6 9l6 6 6-6" stroke="#8888aa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {openQ === index && (
                  <div className="px-4 py-3 bg-[#f8f7ff] border-t border-border-light grid gap-2">
                    {item.answer && (
                      <p className="font-body text-text-light text-xs leading-relaxed">
                        Your answer: {item.answer}
                      </p>
                    )}
                    <p className="font-body text-text-mid text-xs leading-relaxed">
                      {item.feedback || item.comment || 'Use a clearer structure, add specifics, and connect your answer back to the role.'}
                    </p>
                  </div>
                )}
              </div>
            )) : (
              <p className="font-body text-text-light text-sm">Question feedback is not available for this report.</p>
            )}
          </div>
        </div>

        <div className="flex gap-3 pb-4">
          <button
            onClick={() => navigate('/start-interview')}
            className="flex-1 bg-gradient-to-b from-[#5358F3] via-[#883BE8] to-[#9F3BDF] text-white font-body font-semibold py-3.5 rounded-2xl transition-all duration-200 hover:shadow-lg hover:shadow-primary/25"
          >
            Retake Interview
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex-1 bg-white border border-border-light hover:border-primary/30 text-text-dark font-body font-semibold py-3.5 rounded-2xl transition-all duration-200 hover:shadow-sm"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
