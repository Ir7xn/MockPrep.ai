const User = require('../models/User')
const jwt = require('jsonwebtoken')

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  })
}

const getTokenCookieOptions = (expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) => ({
  expires,
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
})

const getUserPayload = (user) => ({
  id: user._id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  phone: user.phone,
  avatar: user.avatar,
  plan: user.plan,
  interviewCredits: user.interviewCredits,
  onboardingCompleted: user.onboardingCompleted,
  onboardingData: user.onboardingData,
  authProvider: user.authProvider,
})

const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/
const phoneRegex = /^\d{10}$/

// Send token response
const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id)

  res.status(statusCode)
    .cookie('token', token, getTokenCookieOptions())
    .json({
      success: true,
      token,
      user: getUserPayload(user),
    })
}

// @POST /api/auth/signup
const signup = async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone } = req.body
    const normalizedEmail = email?.trim().toLowerCase()
    const normalizedPhone = phone?.trim()

    if (!firstName || !lastName || !normalizedEmail || !normalizedPhone || !password) {
      return res.status(400).json({ success: false, message: 'Please fill all required fields' })
    }

    if (!gmailRegex.test(normalizedEmail)) {
      return res.status(400).json({ success: false, message: 'Please use a Gmail address ending with @gmail.com' })
    }

    if (!phoneRegex.test(normalizedPhone)) {
      return res.status(400).json({ success: false, message: 'Phone number must be exactly 10 digits without +91' })
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' })
    }

    const existingUser = await User.findOne({ email: normalizedEmail })
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' })
    }

    const user = await User.create({
      firstName,
      lastName,
      email: normalizedEmail,
      password,
      phone: normalizedPhone,
      plan: 'free',
      interviewCredits: 2,
    })

    sendTokenResponse(user, 201, res)
  } catch (error) {
    console.error('Signup error:', error)
    res.status(500).json({ success: false, message: 'Server error during signup' })
  }
}

// @POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body
    const normalizedEmail = email?.trim().toLowerCase()

    if (!normalizedEmail || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' })
    }

    const user = await User.findOne({ email: normalizedEmail }).select('+password')
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' })
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is disabled' })
    }

    if (user.authProvider === 'google' && !user.password) {
      return res.status(401).json({ success: false, message: 'Please sign in with Google' })
    }

    const isMatch = await user.matchPassword(password)
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' })
    }

    sendTokenResponse(user, 200, res)
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ success: false, message: 'Server error during login' })
  }
}

// @GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    res.status(200).json({ success: true, user: getUserPayload(user) })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// @POST /api/auth/logout
const logout = async (req, res) => {
  res.cookie('token', '', getTokenCookieOptions(new Date(0)))
  res.status(200).json({ success: true, message: 'Logged out successfully' })
}

// @PUT /api/auth/onboarding
const completeOnboarding = async (req, res) => {
  try {
    const { college, degree, graduationYear, targetRole, targetCompanies, linkedIn, experience } = req.body

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        onboardingCompleted: true,
        onboardingData: { college, degree, graduationYear, targetRole, targetCompanies, linkedIn, experience },
      },
      { new: true, runValidators: true }
    )

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    res.status(200).json({ success: true, user: getUserPayload(user) })
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

module.exports = { signup, login, getMe, logout, completeOnboarding }
