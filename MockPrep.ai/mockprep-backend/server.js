const express = require('express')
const dotenv = require('dotenv')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const connectDB = require('./config/db')
const authRoutes = require('./routes/authRoutes')
const interviewRoutes = require('./routes/interviewRoutes')

dotenv.config()
connectDB()

const app = express()

app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
}))

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/interviews', interviewRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'MockPrep API running' })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
