const express = require('express')
const router = express.Router()
const {
  signup,
  login,
  getMe,
  logout,
  completeOnboarding,
} = require('../controllers/authController')
const { protect } = require('../middleware/authMiddleware')

router.post('/signup', signup)
router.post('/login', login)
router.get('/me', protect, getMe)
router.post('/logout', logout)
router.put('/onboarding', protect, completeOnboarding)

module.exports = router
