const jwt = require('jsonwebtoken')
const User = require('../models/User')

// Protect route — must be logged in
const protect = async (req, res, next) => {
  let token

  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1]
  } else if (req.cookies?.token) {
    token = req.cookies.token
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = await User.findById(decoded.id).select('-password')
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User not found' })
    }
    if (!req.user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is disabled' })
    }
    next()
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token invalid or expired' })
  }
}

// Plan gate — check if user has required plan
const requirePlan = (requiredPlan) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authorized' })
    }

    const planHierarchy = { free: 0, pro: 1, premium: 2 }

    if (planHierarchy[req.user.plan] < planHierarchy[requiredPlan]) {
      return res.status(403).json({
        success: false,
        message: `This feature requires ${requiredPlan} plan`,
        currentPlan: req.user.plan,
        requiredPlan,
        upgradeRequired: true,
      })
    }

    next()
  }
}

// Check credits
const requireCredits = async (req, res, next) => {
  if (req.user.interviewCredits <= 0 && req.user.plan === 'free') {
    return res.status(403).json({
      success: false,
      message: 'No interview credits remaining',
      upgradeRequired: true,
    })
  }
  next()
}

module.exports = { protect, requirePlan, requireCredits }
