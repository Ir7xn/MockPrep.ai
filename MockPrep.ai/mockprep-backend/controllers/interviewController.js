const InterviewSession = require('../models/InterviewSession')
const InterviewReport = require('../models/InterviewReport')
const aiService = require('../services/aiService')

const allowedResumeExtensions = new Set(['pdf', 'docx'])
const maxResumeBytes = 5 * 1024 * 1024

const getFileExtension = (fileName = '') => fileName.split('.').pop()?.toLowerCase()
const getUserDisplayName = (user) => (
  `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'User'
)


const parseMinutes = (value) => {
  const parsed = Number.parseInt(value, 10)
  if ([10, 20, 45].includes(parsed)) return parsed
  return 20
}

const normalizeMode = (mode) => {
  if (['technical', 'hr', 'mixed', 'casestudy'].includes(mode)) return mode
  return 'mixed'
}

const toPercent = (value) => {
  const number = Number(value)
  if (!Number.isFinite(number)) return 0
  if (number <= 1) return Math.round(number * 100)
  if (number <= 10) return Math.round(number * 10)
  return Math.round(Math.min(number, 100))
}

const compactStrings = (items) => (
  Array.isArray(items)
    ? items.map((item) => String(item || '').trim()).filter(Boolean)
    : []
)

const sectionScore = (sections, sectionName) => {
  const section = sections?.[sectionName]
  return {
    score: toPercent(section?.average_score),
    feedback: section?.feedback || '',
  }
}

const buildQuestionFeedback = (rawReport, session) => {
  if (Array.isArray(rawReport?.question_feedback)) return rawReport.question_feedback
  if (Array.isArray(rawReport?.questions)) return rawReport.questions

  const detailed = rawReport?.detailed_feedback
  if (detailed && typeof detailed === 'object' && !Array.isArray(detailed)) {
    return Object.entries(detailed).map(([label, feedback]) => ({
      question: label,
      feedback: typeof feedback === 'string' ? feedback : JSON.stringify(feedback),
    }))
  }

  return session.transcript.map((turn) => ({
    questionNumber: turn.questionNumber,
    question: turn.question,
    answer: turn.answer,
    feedback: 'Review this answer for structure, specificity, and examples before your next practice round.',
  }))
}

const buildImprovementPlan = (weaknesses, recommendations) => {
  if (recommendations.length) return recommendations.slice(0, 5)

  if (weaknesses.length) {
    return weaknesses.slice(0, 5).map((item) => `Practice a stronger example for: ${item}`)
  }

  return [
    'Retake this role once after revising your resume stories.',
    'Use the STAR structure for behavioral answers.',
    'Add one concrete metric or technical tradeoff to each project answer.',
  ]
}

const buildRecommendations = (weaknesses, recommendations) => {
  if (recommendations.length) return recommendations

  if (weaknesses.length) {
    return weaknesses.slice(0, 4).map((item) => `Turn "${item}" into a prepared story with context, action, result, and one measurable detail.`)
  }

  return [
    'Practice concise two-minute answers for your most important resume projects.',
    'Add concrete metrics, tradeoffs, and outcomes when explaining technical work.',
    'Run another mock interview after revising the answers that felt least confident.',
  ]
}

const buildCoachingReport = (rawReport, session) => {
  const report = rawReport && typeof rawReport === 'object' ? rawReport : {}
  const overall = report.overall_performance || {}
  const sections = report.section_wise_evaluation || {}
  const strengths = compactStrings(report.strengths)
  const weaknesses = compactStrings(report.weaknesses || report.areas_to_improve)
  const recommendations = buildRecommendations(weaknesses, compactStrings(report.recommendations))
  const summary = overall.summary || report.summary || (typeof rawReport === 'string' ? rawReport : '')
  const overallScore = toPercent(overall.average_score ?? report.overall_score ?? report.average_score)
  const questionFeedback = buildQuestionFeedback(report, session)

  return {
    user: session.user,
    session: session._id,
    aiInterviewId: session.aiInterviewId,
    role: session.role,
    company: session.company,
    mode: session.mode,
    durationMinutes: session.durationMinutes,
    overallScore,
    performanceLevel: overall.performance_level || report.performance_level || '',
    summary,
    scores: {
      overall: overallScore,
      technical: sectionScore(sections, 'Technical'),
      hr: sectionScore(sections, 'HR'),
      general: sectionScore(sections, 'General'),
      confidence: toPercent(report.face_analysis?.confidence_score),
    },
    strengths,
    weaknesses,
    recommendations,
    improvementPlan: buildImprovementPlan(weaknesses, recommendations),
    questionFeedback,
    rawReport,
  }
}

const saveReportForSession = async (session, rawReport) => {
  const coachingReport = buildCoachingReport(rawReport, session)

  return InterviewReport.findOneAndUpdate(
    { session: session._id, user: session.user },
    coachingReport,
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  )
}

const getOwnedSession = async (sessionId, userId) => {
  const session = await InterviewSession.findOne({ _id: sessionId, user: userId })
  if (!session) {
    const error = new Error('Interview session not found')
    error.statusCode = 404
    throw error
  }
  return session
}

const sendError = (res, error, fallback = 'Interview request failed') => {
  const statusCode = error.statusCode || 500
  res.status(statusCode).json({
    success: false,
    message: error.message || fallback,
  })
}

const uploadResume = async (req, res) => {
  const name = getUserDisplayName(req.user)
  const email = req.user?.email

  if (!name || !email) {
    return res.status(400).json({
      success: false,
      message: "User name/email missing"
    })
  }
  try {
    const { fileName, mimeType, size, data } = req.body
    const extension = getFileExtension(fileName)

    if (!fileName || !data) {
      return res.status(400).json({ success: false, message: 'Resume file is required' })
    }

    if (!allowedResumeExtensions.has(extension)) {
      return res.status(400).json({ success: false, message: 'Resume must be a PDF or DOCX file' })
    }

    if (Number(size) > maxResumeBytes) {
      return res.status(400).json({ success: false, message: 'Resume must be 5MB or smaller' })
    }


const result = await aiService.uploadResume({
  fileName,
  mimeType,
  data,
  name,
  email,
})

    res.status(201).json({
      success: true,
      candidateId: result.candidate_id,
      resumeId: result.resume_id,
      raw: result,
    })
  } catch (error) {
    console.error('AI resume upload error:', error)
    sendError(res, error, 'Resume upload failed')
  }
}

const startInterview = async (req, res) => {
  try {
    const { candidateId, resumeId, role, company, mode, durationMinutes, resumeFile } = req.body
    const normalizedRole = String(role || '').trim()
    const normalizedMode = normalizeMode(mode)
    const minutes = parseMinutes(durationMinutes)

    if (!candidateId || !resumeId || !normalizedRole) {
      return res.status(400).json({ success: false, message: 'Resume, candidate, and role are required' })
    }

    const campaignId = `mockprep-${req.user._id}-${Date.now()}`
    const aiRole = [
      normalizedRole,
      normalizedMode !== 'mixed' ? `${normalizedMode} practice` : 'mixed practice',
      company ? `target company: ${company}` : '',
      `${minutes} minute student coaching session`,
    ].filter(Boolean).join(' | ')

    const aiStart = await aiService.startInterview({
      candidateId,
      resumeId,
      campaignId,
      role: aiRole,
    })

    const questionNumber = aiStart.question_no || aiStart.question_index || 1
    const totalQuestions = aiStart.total_questions || 8
    const firstQuestion = aiStart.question || aiStart.first_question || ''

    const session = await InterviewSession.create({
      user: req.user._id,
      aiInterviewId: aiStart.interview_id,
      candidateId,
      resumeId,
      campaignId,
      role: normalizedRole,
      company: String(company || '').trim(),
      mode: normalizedMode,
      durationMinutes: minutes,
      questionNumber,
      totalQuestions,
      currentQuestion: firstQuestion,
      firstQuestion,
      resumeFile: {
        name: resumeFile?.name || '',
        mimeType: resumeFile?.mimeType || '',
        size: resumeFile?.size || 0,
      },
      lastAiResponse: aiStart,
    })

    if (req.user.plan === 'free' && req.user.interviewCredits > 0) {
      req.user.interviewCredits -= 1
      await req.user.save()
    }

    res.status(201).json({
      success: true,
      session: {
        id: session._id,
        interviewId: session.aiInterviewId,
        firstQuestion: session.firstQuestion,
        questionNumber: session.questionNumber,
        totalQuestions: session.totalQuestions,
        role: session.role,
        company: session.company,
        mode: session.mode,
        durationMinutes: session.durationMinutes,
      },
      user: {
        interviewCredits: req.user.interviewCredits,
      },
    })
  } catch (error) {
    console.error('AI start interview error:', error)
    sendError(res, error, 'Could not start interview')
  }
}

const getSession = async (req, res) => {
  try {
    const session = await getOwnedSession(req.params.sessionId, req.user._id)
    res.json({ success: true, session })
  } catch (error) {
    sendError(res, error)
  }
}

const submitAnswer = async (req, res) => {
  try {
    const { answer } = req.body
    const cleanedAnswer = String(answer || '').trim()

    if (!cleanedAnswer) {
      return res.status(400).json({ success: false, message: 'Answer is required' })
    }

    const session = await getOwnedSession(req.params.sessionId, req.user._id)
    if (session.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Interview session is not active' })
    }

    const aiResponse = await aiService.submitAnswer({
      interviewId: session.aiInterviewId,
      answer: cleanedAnswer,
    })

    session.transcript.push({
      questionNumber: session.questionNumber,
      question: session.currentQuestion,
      answer: cleanedAnswer,
    })
    session.lastAiResponse = aiResponse

    if (aiResponse.stop === true || !aiResponse.next_question) {
      session.status = 'completed'
      session.completedAt = new Date()
      session.currentQuestion = ''
      await session.save()

      let report = null
      let reportPending = false

      try {
        const rawReport = await aiService.fetchReport(session.aiInterviewId)
        report = await saveReportForSession(session, rawReport)
      } catch (reportError) {
        reportPending = true
        session.lastError = reportError.message
        await session.save()
        console.warn('Report fetch after completion failed:', reportError.message)
      }

      return res.json({
        success: true,
        stop: true,
        message: 'Interview completed',
        reportPending,
        reportId: report?._id,
      })
    }

    const nextQuestionNumber = aiResponse.question_no || aiResponse.question_index || (session.questionNumber + 1)
    const totalQuestions = aiResponse.total_questions || session.totalQuestions

    session.questionNumber = nextQuestionNumber
    session.totalQuestions = totalQuestions
    session.currentQuestion = aiResponse.next_question
    await session.save()

    res.json({
      success: true,
      stop: false,
      nextQuestion: session.currentQuestion,
      questionNumber: session.questionNumber,
      totalQuestions: session.totalQuestions,
    })
  } catch (error) {
    console.error('AI answer submit error:', error)
    sendError(res, error, 'Could not submit answer')
  }
}

const getReport = async (req, res) => {
  try {
    const session = await getOwnedSession(req.params.sessionId, req.user._id)
    let report = await InterviewReport.findOne({ session: session._id, user: req.user._id })

    if (!report && session.status === 'completed') {
      const rawReport = await aiService.fetchReport(session.aiInterviewId)
      report = await saveReportForSession(session, rawReport)
    }

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report is not ready yet' })
    }

    res.json({ success: true, report })
  } catch (error) {
    console.error('Report fetch error:', error)
    sendError(res, error, 'Could not fetch report')
  }
}

const getPregeneratedTts = async (req, res) => {
  try {
    const session = await getOwnedSession(req.params.sessionId, req.user._id)
    const audio = await aiService.getPregeneratedTts({
      interviewId: session.aiInterviewId,
      text: req.body.text,
      questionNo: req.body.questionNo || req.body.question_no || session.questionNumber,
      maxWaitMs: req.body.maxWaitMs || req.body.max_wait_ms || 500,
    })

    res.setHeader('Content-Type', audio.contentType)
    res.send(audio.buffer)
  } catch (error) {
    console.error('TTS pregenerated error:', error)
    sendError(res, error, 'Could not load question audio')
  }
}

const generateInterviewTts = async (req, res) => {
  try {
    await getOwnedSession(req.params.sessionId, req.user._id)
    const audio = await aiService.generateInterviewTts({ text: req.body.text })

    res.setHeader('Content-Type', audio.contentType)
    res.send(audio.buffer)
  } catch (error) {
    console.error('TTS generation error:', error)
    sendError(res, error, 'Could not generate question audio')
  }
}

const uploadFaceFrame = async (req, res) => {
  try {
    const session = await getOwnedSession(req.params.sessionId, req.user._id)
    const result = await aiService.uploadFaceFrame({
      interviewId: session.aiInterviewId,
      imageData: req.body.imageData,
      mimeType: req.body.mimeType,
      fileName: req.body.fileName,
    })

    res.json({ success: true, result })
  } catch (error) {
    console.error('Face frame upload error:', error)
    sendError(res, error, 'Could not upload face frame')
  }
}

module.exports = {
  uploadResume,
  startInterview,
  getSession,
  submitAnswer,
  getReport,
  getPregeneratedTts,
  generateInterviewTts,
  uploadFaceFrame,
}
