import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Clock, Mic, MicOff, RotateCcw, Send, X } from 'lucide-react'
import { BASE_URL, getAuthHeaders, interviewAPI } from '../lib/api'

const MAX_RESTARTS = 6
const MAX_ANSWER_SECONDS = 120
const INACTIVITY_MS = 3000
const FACE_CAPTURE_INTERVAL_MS = 12000
const AUDIO_FALLBACK_TIMEOUT_MS = 6000

const getStoredSession = () => {
  try {
    const stored = sessionStorage.getItem('mockprepInterviewSession')
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

function CompletionOverlay({ onViewReport }) {
  return (
    <div className="fixed inset-0 bg-white/95 z-[100] flex items-center justify-center px-6">
      <div className="max-w-md w-full bg-white border border-border-light rounded-2xl shadow-xl p-8 text-center">
        <div className="w-12 h-12 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-4">
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
            <path d="M5 13l4 4L19 7" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="font-heading font-bold text-2xl text-text-dark">Interview Complete</h2>
        <p className="font-body text-text-mid text-sm mt-2">
          Your practice session is complete. Your coaching feedback is being prepared now.
        </p>
        <button
          type="button"
          onClick={onViewReport}
          className="mt-6 w-full bg-gradient-to-b from-[#5358F3] via-[#883BE8] to-[#9F3BDF] text-white font-body font-semibold py-3 rounded-xl"
        >
          View Feedback
        </button>
      </div>
    </div>
  )
}

export default function Interview() {
  const navigate = useNavigate()
  const location = useLocation()
  const initialSession = location.state || getStoredSession()

  const [sessionInfo, setSessionInfo] = useState(initialSession)
  const [timer, setTimer] = useState(0)
  const [statusMessage, setStatusMessage] = useState('Preparing your practice interview...')
  const [aiQuestion, setAiQuestion] = useState(initialSession?.firstQuestion || '')
  const [questionNumber, setQuestionNumber] = useState(initialSession?.questionNumber || 1)
  const [totalQuestions, setTotalQuestions] = useState(initialSession?.totalQuestions || 8)
  const [isInterviewStarted, setIsInterviewStarted] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isAiSpeaking, setIsAiSpeaking] = useState(false)
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false)
  const [liveTranscript, setLiveTranscript] = useState('')
  const [manualAnswer, setManualAnswer] = useState('')
  const [isSpeechUnavailable, setIsSpeechUnavailable] = useState(false)
  const [micError, setMicError] = useState('')
  const [cameraError, setCameraError] = useState('')
  const [showCompleteModal, setShowCompleteModal] = useState(false)

  const userVideoRef = useRef(null)
  const streamRef = useRef(null)
  const recognitionRef = useRef(null)
  const finalTranscriptRef = useRef('')
  const latestTranscriptRef = useRef('')
  const totalAnswerElapsedRef = useRef(0)
  const restartAttemptsRef = useRef(0)
  const inactivityTimeoutRef = useRef(null)
  const answerIntervalRef = useRef(null)
  const faceCaptureIntervalRef = useRef(null)
  const faceCanvasRef = useRef(null)
  const faceCaptureInFlightRef = useRef(false)
  const activeAudioRef = useRef(null)
  const audioFallbackTimeoutRef = useRef(null)
  const submitInFlightRef = useRef(false)
  const sessionIdRef = useRef(initialSession?.sessionId || null)
  const questionNumberRef = useRef(initialSession?.questionNumber || 1)
  const totalQuestionsRef = useRef(initialSession?.totalQuestions || 8)

  useEffect(() => {
    sessionIdRef.current = sessionInfo?.sessionId || null
  }, [sessionInfo])

  useEffect(() => {
    questionNumberRef.current = questionNumber
  }, [questionNumber])

  useEffect(() => {
    totalQuestionsRef.current = totalQuestions
  }, [totalQuestions])

  const clearInactivityTimeout = () => {
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current)
      inactivityTimeoutRef.current = null
    }
  }

  const clearAnswerInterval = () => {
    if (answerIntervalRef.current) {
      clearInterval(answerIntervalRef.current)
      answerIntervalRef.current = null
    }
  }

  const clearAudioFallbackTimeout = () => {
    if (audioFallbackTimeoutRef.current) {
      clearTimeout(audioFallbackTimeoutRef.current)
      audioFallbackTimeoutRef.current = null
    }
  }

  const stopFaceCapture = () => {
    if (faceCaptureIntervalRef.current) {
      clearInterval(faceCaptureIntervalRef.current)
      faceCaptureIntervalRef.current = null
    }
  }

  const stopRecognition = () => {
    try {
      if (recognitionRef.current) {
        recognitionRef.current._autoRestart = false
        recognitionRef.current.onend = null
        recognitionRef.current.onerror = null
        recognitionRef.current.stop()
      }
    } catch {
      // Browser speech APIs throw if already stopped.
    }
  }

  const stopActiveAudio = () => {
    clearAudioFallbackTimeout()
    setIsAiSpeaking(false)

    if (activeAudioRef.current) {
      try {
        activeAudioRef.current.pause()
        activeAudioRef.current.src = ''
      } catch {
        // Audio may already be released.
      }
      activeAudioRef.current = null
    }
  }

  const cleanupMedia = () => {
    stopFaceCapture()
    stopActiveAudio()
    stopRecognition()
    clearInactivityTimeout()
    clearAnswerInterval()

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }

  useEffect(() => {
    if (!sessionInfo?.sessionId) return undefined
    let active = true

    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        if (!active) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        streamRef.current = stream
        if (userVideoRef.current) {
          userVideoRef.current.srcObject = stream
        }
        setStatusMessage('Camera and microphone are ready.')
        setIsInterviewStarted(true)
      } catch (err) {
        if (err.name === 'NotAllowedError') {
          setMicError('Camera or microphone permission is blocked.')
        } else if (err.name === 'NotFoundError') {
          setCameraError('Camera or microphone device was not found.')
        } else {
          setCameraError('Could not start camera or microphone.')
        }
        setStatusMessage('Allow camera and microphone access to continue.')
      }
    }

    initCamera()
    return () => {
      active = false
      cleanupMedia()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionInfo?.sessionId])

  useEffect(() => {
    let interval
    if (isInterviewStarted) {
      interval = setInterval(() => setTimer((current) => current + 1), 1000)
    }
    return () => clearInterval(interval)
  }, [isInterviewStarted])

  const fetchAudio = async (path, body) => {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      throw new Error(payload.message || 'Audio request failed')
    }

    return response.blob()
  }

  const startRecognitionForAnswer = (answerSeconds = MAX_ANSWER_SECONDS) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setIsSpeechUnavailable(true)
      setStatusMessage('Speech recognition is not available in this browser. Type your answer below.')
      return
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current._autoRestart = false
        recognitionRef.current.onend = null
        recognitionRef.current.onerror = null
        recognitionRef.current.stop()
        recognitionRef.current = null
      }
    } catch {
      // Ignore stale speech recognition instances.
    }

    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition
    recognition._autoRestart = true
    recognition._isAborted = false
    recognition.lang = 'en-US'
    recognition.interimResults = true
    recognition.continuous = true
    recognition.maxAlternatives = 5

    recognition.onstart = () => {
      setIsSpeechUnavailable(false)
      setIsListening(true)
      setStatusMessage('Listening. Speak your answer clearly.')

      if (!answerIntervalRef.current) {
        totalAnswerElapsedRef.current = totalAnswerElapsedRef.current || 0
        answerIntervalRef.current = setInterval(() => {
          totalAnswerElapsedRef.current += 1
          if (totalAnswerElapsedRef.current >= answerSeconds) {
            clearAnswerInterval()
            finalizeAnswer()
          }
        }, 1000)
      }

      clearInactivityTimeout()
    }

    recognition.onresult = (event) => {
      setIsListening(true)
      let interim = ''

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = event.results[index][0].transcript
        if (event.results[index].isFinal) {
          finalTranscriptRef.current += `${transcript} `
          restartAttemptsRef.current = 0
        } else {
          interim += transcript
        }
      }

      const fullText = finalTranscriptRef.current + interim
      setLiveTranscript(fullText)
      setManualAnswer(fullText)
      latestTranscriptRef.current = fullText

      clearInactivityTimeout()
      inactivityTimeoutRef.current = setTimeout(() => {
        finalizeAnswer()
      }, INACTIVITY_MS)
    }

    recognition.onerror = (event) => {
      if (event.error === 'aborted') {
        recognition._isAborted = true
        recognition._autoRestart = false
        setIsListening(false)
        return
      }

      if (event.error === 'network' || event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        recognition._isAborted = true
        recognition._autoRestart = false
        clearInactivityTimeout()
        clearAnswerInterval()
        setIsListening(false)
        setIsSpeechUnavailable(true)
        setStatusMessage('Speech recognition is unstable. Type your answer and submit it.')
        return
      }

      setStatusMessage(`Speech recognition error: ${event.error}`)
    }

    recognition.onend = () => {
      if (recognition._isAborted || recognition._autoRestart === false) {
        setIsListening(false)
        return
      }

      if (inactivityTimeoutRef.current) return

      if (totalAnswerElapsedRef.current < answerSeconds) {
        restartAttemptsRef.current = (restartAttemptsRef.current || 0) + 1
        if (restartAttemptsRef.current <= MAX_RESTARTS) {
          setTimeout(() => {
            startRecognitionForAnswer(answerSeconds - totalAnswerElapsedRef.current)
          }, 500 + restartAttemptsRef.current * 150)
          return
        }

        setIsSpeechUnavailable(true)
        setStatusMessage('Speech recognition paused. Use retry or submit a typed answer.')
        return
      }

      finalizeAnswer()
    }

    setTimeout(() => {
      try {
        recognition.start()
      } catch {
        setIsSpeechUnavailable(true)
        setStatusMessage('Could not start speech recognition. Type your answer below.')
      }
    }, 300)
  }

  const speakThenListen = async (text, answerSeconds = MAX_ANSWER_SECONDS) => {
    if (!sessionIdRef.current || !text) return

    setStatusMessage('Playing the next question.')
    stopActiveAudio()
    stopRecognition()
    clearAnswerInterval()
    clearInactivityTimeout()
    setIsListening(false)
    setIsAiSpeaking(true)

    try {
      let audioBlob
      try {
        audioBlob = await fetchAudio(`/interviews/${sessionIdRef.current}/tts/get-pregenerated`, {
          text,
          questionNo: questionNumberRef.current,
          maxWaitMs: 500,
        })
      } catch {
        audioBlob = await fetchAudio(`/interviews/${sessionIdRef.current}/tts/interview`, { text })
      }

      const audioUrl = URL.createObjectURL(audioBlob)
      const audio = new Audio(audioUrl)
      activeAudioRef.current = audio
      let listeningStarted = false

      const beginListening = () => {
        if (listeningStarted) return
        listeningStarted = true
        clearAudioFallbackTimeout()
        URL.revokeObjectURL(audioUrl)
        activeAudioRef.current = null
        setIsAiSpeaking(false)
        startRecognitionForAnswer(answerSeconds)
      }

      audio.onended = beginListening
      audio.onerror = beginListening
      audio.onplaying = () => {
        clearAudioFallbackTimeout()
        setStatusMessage('Question is playing.')
      }

      audioFallbackTimeoutRef.current = setTimeout(beginListening, AUDIO_FALLBACK_TIMEOUT_MS)
      await audio.play()
    } catch {
      stopActiveAudio()
      setStatusMessage('Audio playback was unavailable. Listening now.')
      startRecognitionForAnswer(answerSeconds)
    }
  }

  useEffect(() => {
    if (!aiQuestion || !isInterviewStarted) return undefined

    finalTranscriptRef.current = ''
    latestTranscriptRef.current = ''
    totalAnswerElapsedRef.current = 0
    restartAttemptsRef.current = 0
    setLiveTranscript('')
    setManualAnswer('')
    speakThenListen(aiQuestion, MAX_ANSWER_SECONDS)

    return () => {
      clearAnswerInterval()
      clearInactivityTimeout()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiQuestion, isInterviewStarted])

  const submitAnswer = async (answer) => {
    if (submitInFlightRef.current || !sessionIdRef.current) return

    submitInFlightRef.current = true
    setIsSubmittingAnswer(true)

    try {
      const data = await interviewAPI.submitAnswer(sessionIdRef.current, answer)

      if (data.stop === true || !data.nextQuestion) {
        cleanupMedia()
        setIsInterviewStarted(false)
        setIsListening(false)
        setAiQuestion('')
        setStatusMessage(data.reportPending ? 'Interview complete. Report is still being prepared.' : 'Interview complete.')
        setShowCompleteModal(true)
        return
      }

      const nextSessionInfo = {
        ...sessionInfo,
        firstQuestion: data.nextQuestion,
        questionNumber: data.questionNumber,
        totalQuestions: data.totalQuestions,
      }

      setSessionInfo(nextSessionInfo)
      sessionStorage.setItem('mockprepInterviewSession', JSON.stringify(nextSessionInfo))
      setQuestionNumber(data.questionNumber)
      setTotalQuestions(data.totalQuestions)
      setAiQuestion(data.nextQuestion)
      setLiveTranscript('')
      setManualAnswer('')
      finalTranscriptRef.current = ''
      latestTranscriptRef.current = ''
      restartAttemptsRef.current = 0
    } catch (err) {
      setStatusMessage(`Could not submit answer: ${err.message}`)
    } finally {
      submitInFlightRef.current = false
      setIsSubmittingAnswer(false)
    }
  }

  const finalizeAnswer = () => {
    if (submitInFlightRef.current) return

    clearInactivityTimeout()
    clearAnswerInterval()
    setIsListening(false)
    stopRecognition()

    const cleaned = ((finalTranscriptRef.current || '').trim() || (latestTranscriptRef.current || '').trim() || manualAnswer.trim())
    if (!cleaned) {
      setStatusMessage('No answer detected. Use retry or type your answer below.')
      return
    }

    setStatusMessage('Answer captured. Preparing the next question.')
    submitAnswer(cleaned)
  }

  const retryListening = () => {
    if (isAiSpeaking || isSubmittingAnswer) return
    finalTranscriptRef.current = ''
    latestTranscriptRef.current = ''
    totalAnswerElapsedRef.current = 0
    restartAttemptsRef.current = 0
    setLiveTranscript('')
    setManualAnswer('')
    startRecognitionForAnswer(MAX_ANSWER_SECONDS)
  }

  const submitCurrentAnswer = () => {
    const answer = (manualAnswer || liveTranscript || '').trim()
    if (!answer) {
      setStatusMessage('Type or speak an answer before submitting.')
      return
    }

    clearInactivityTimeout()
    clearAnswerInterval()
    stopRecognition()
    setIsListening(false)
    setStatusMessage('Processing your answer.')
    submitAnswer(answer)
  }

  const captureFaceFrame = async () => {
    if (faceCaptureInFlightRef.current) return
    if (!sessionIdRef.current || !userVideoRef.current || !isInterviewStarted) return

    const video = userVideoRef.current
    if (!video.videoWidth || !video.videoHeight || video.readyState < 2) return

    if (!faceCanvasRef.current) {
      faceCanvasRef.current = document.createElement('canvas')
    }

    const canvas = faceCanvasRef.current
    const targetWidth = 320
    const targetHeight = Math.max(180, Math.round((video.videoHeight / video.videoWidth) * targetWidth))
    canvas.width = targetWidth
    canvas.height = targetHeight

    const context = canvas.getContext('2d')
    if (!context) return

    context.drawImage(video, 0, 0, targetWidth, targetHeight)
    const imageData = canvas.toDataURL('image/jpeg', 0.75).split(',').pop()

    faceCaptureInFlightRef.current = true
    try {
      await interviewAPI.uploadFaceFrame(sessionIdRef.current, {
        imageData,
        mimeType: 'image/jpeg',
        fileName: `face-frame-${Date.now()}.jpg`,
      })
    } catch {
      // Face analysis is supportive; the interview should continue if a frame fails.
    } finally {
      faceCaptureInFlightRef.current = false
    }
  }

  useEffect(() => {
    stopFaceCapture()

    if (!isInterviewStarted || !sessionIdRef.current || !isListening || isAiSpeaking) {
      return undefined
    }

    captureFaceFrame()
    faceCaptureIntervalRef.current = setInterval(captureFaceFrame, FACE_CAPTURE_INTERVAL_MS)

    return () => stopFaceCapture()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInterviewStarted, isListening, isAiSpeaking])

  const viewReport = () => {
    cleanupMedia()
    navigate(`/report?sessionId=${sessionIdRef.current}`)
  }

  const exitInterview = () => {
    cleanupMedia()
    navigate('/dashboard')
  }

  if (!sessionInfo?.sessionId) {
    return (
      <div className="min-h-screen bg-[#f8f7ff] flex items-center justify-center px-6 font-body">
        <div className="max-w-md w-full bg-white border border-border-light rounded-2xl p-8 text-center">
          <h1 className="font-heading font-bold text-2xl text-text-dark">No active interview</h1>
          <p className="text-text-mid text-sm mt-2">Start a new session to enter the live room.</p>
          <button
            type="button"
            onClick={() => navigate('/start-interview')}
            className="mt-6 w-full bg-primary text-white font-semibold py-3 rounded-xl"
          >
            Start Interview
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f1923] font-body flex flex-col text-white">
      <nav className="bg-[#141e2b] border-b border-white/10 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-heading font-bold text-white text-sm">MockPrep.ai</span>
          <div className="flex items-center gap-1.5 bg-green-500/20 border border-green-500/30 rounded-full px-2.5 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-400 text-xs font-body font-medium">Live</span>
          </div>
          <div className="hidden md:flex items-center gap-1.5 text-white/50 text-xs">
            <Clock size={14} />
            <span>{formatTime(timer)}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={exitInterview}
          className="flex items-center gap-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 font-body font-medium text-sm px-4 py-2 rounded-lg transition-all duration-200"
        >
          <X size={14} />
          Exit
        </button>
      </nav>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4 p-4 min-h-0">
        <section className="bg-white text-text-dark rounded-2xl border border-white/10 p-5 flex flex-col gap-5 order-2 lg:order-1">
          <div>
            <p className="font-body text-xs text-text-light">Practice target</p>
            <h1 className="font-heading font-bold text-xl mt-1">{sessionInfo.role}</h1>
            <p className="font-body text-sm text-text-mid mt-1">
              {[sessionInfo.company, sessionInfo.mode, `${sessionInfo.durationMinutes} min`].filter(Boolean).join(' - ')}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs text-text-mid mb-2">
              <span>Question {questionNumber} of {totalQuestions}</span>
              <span>{Math.round((questionNumber / Math.max(totalQuestions, 1)) * 100)}%</span>
            </div>
            <div className="h-2 bg-[#eef0f6] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#5358F3] to-[#9F3BDF] transition-all"
                style={{ width: `${(questionNumber / Math.max(totalQuestions, 1)) * 100}%` }}
              />
            </div>
          </div>

          <div className="grid gap-3">
            <div className="rounded-xl bg-[#f8f7ff] border border-border-light p-4">
              <p className="font-body text-xs text-text-light mb-2">Status</p>
              <p className="font-body text-sm text-text-dark leading-relaxed">{statusMessage}</p>
              {(micError || cameraError) && (
                <p className="font-body text-sm text-red-500 mt-2">{micError || cameraError}</p>
              )}
            </div>

            <div className="rounded-xl bg-[#f8f7ff] border border-border-light p-4">
              <p className="font-body text-xs text-text-light mb-2">Current question</p>
              <p className="font-heading font-semibold text-lg text-text-dark leading-snug">
                {aiQuestion || 'Waiting for the next question...'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              isListening ? 'bg-primary text-white' : isAiSpeaking ? 'bg-green-500 text-white' : 'bg-[#eef0f6] text-text-mid'
            }`}
            >
              {isListening ? <Mic size={20} /> : <MicOff size={20} />}
            </div>
            <div>
              <p className="font-body text-sm font-semibold text-text-dark">
                {isAiSpeaking ? 'AI is speaking' : isListening ? 'Listening' : 'Idle'}
              </p>
              <p className="font-body text-xs text-text-light">Elapsed {formatTime(timer)}</p>
            </div>
          </div>

          <div className="mt-auto grid gap-3">
            <textarea
              value={manualAnswer}
              onChange={(e) => setManualAnswer(e.target.value)}
              placeholder="Typed answer fallback"
              rows={5}
              className="w-full rounded-xl border border-border-light px-3 py-3 text-sm outline-none focus:border-primary resize-none"
            />
            {liveTranscript && (
              <div className="rounded-xl bg-[#f8f7ff] border border-border-light px-3 py-2">
                <p className="text-xs text-text-light mb-1">Live transcript</p>
                <p className="text-sm text-text-mid leading-relaxed">{liveTranscript}</p>
              </div>
            )}
            {isSpeechUnavailable && (
              <p className="text-xs text-amber-600">Speech recognition fallback is active.</p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={retryListening}
                disabled={isAiSpeaking || isSubmittingAnswer}
                className="flex items-center justify-center gap-2 border border-primary/30 text-primary font-semibold py-3 rounded-xl disabled:opacity-50"
              >
                <RotateCcw size={16} />
                Retry
              </button>
              <button
                type="button"
                onClick={submitCurrentAnswer}
                disabled={isSubmittingAnswer}
                className="flex items-center justify-center gap-2 bg-primary text-white font-semibold py-3 rounded-xl disabled:opacity-50"
              >
                <Send size={16} />
                {isSubmittingAnswer ? 'Sending' : 'Submit'}
              </button>
            </div>
          </div>
        </section>

        <section className="relative bg-black rounded-2xl overflow-hidden min-h-[42vh] lg:min-h-0 order-1 lg:order-2">
          <video ref={userVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
          <div className="absolute left-4 bottom-4 right-4 flex items-center justify-between gap-3">
            <div className="bg-black/50 backdrop-blur px-3 py-2 rounded-xl border border-white/10">
              <p className="text-xs text-white/60">Camera preview</p>
              <p className="text-sm font-semibold text-white">You</p>
            </div>
            <div className="flex items-end justify-center gap-[3px] h-12">
              {Array.from({ length: 18 }).map((_, index) => (
                <span
                  key={index}
                  className={`w-1 rounded-full ${isAiSpeaking ? 'bg-green-400 animate-pulse' : isListening ? 'bg-primary animate-pulse' : 'bg-white/30'}`}
                  style={{ height: `${isAiSpeaking || isListening ? 18 + ((index * 7) % 28) : 8}px` }}
                />
              ))}
            </div>
          </div>
        </section>
      </main>

      {showCompleteModal && <CompletionOverlay onViewReport={viewReport} />}
    </div>
  )
}
