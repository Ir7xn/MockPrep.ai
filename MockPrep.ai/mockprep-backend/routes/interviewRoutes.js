const express = require('express')
const {
  uploadResume,
  startInterview,
  getSession,
  submitAnswer,
  getReport,
  getPregeneratedTts,
  generateInterviewTts,
  uploadFaceFrame,
} = require('../controllers/interviewController')
const { protect, requireCredits } = require('../middleware/authMiddleware')

const router = express.Router()

router.use(protect)

router.post('/upload-resume', uploadResume)
router.post('/start', requireCredits, startInterview)
router.get('/:sessionId', getSession)
router.post('/:sessionId/answer', submitAnswer)
router.get('/:sessionId/report', getReport)
router.post('/:sessionId/tts/get-pregenerated', getPregeneratedTts)
router.post('/:sessionId/tts/interview', generateInterviewTts)
router.post('/:sessionId/face-frame', uploadFaceFrame)

module.exports = router
