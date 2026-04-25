import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { clearUser, getToken, isLoggedIn, saveUser } from './lib/auth'
import { authAPI } from './lib/api'
import LandingPage from './pages/LandingPage'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Onboarding from './pages/Onboarding'
import StartInterview from './pages/StartInterview'
import Interview from './pages/Interview'
import InterviewReport from './pages/InterviewReport'

function CheckingSession() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
    </div>
  )
}

function ProtectedRoute({ children }) {
  const [status, setStatus] = useState(isLoggedIn() ? 'checking' : 'guest')

  useEffect(() => {
    let active = true

    const verifySession = async () => {
      if (!isLoggedIn()) {
        setStatus('guest')
        return
      }

      try {
        const data = await authAPI.getMe()
        if (!active) return
        saveUser(getToken(), data.user)
        setStatus('authenticated')
      } catch {
        clearUser()
        if (active) setStatus('guest')
      }
    }

    verifySession()

    return () => {
      active = false
    }
  }, [])

  if (status === 'checking') return <CheckingSession />
  return status === 'authenticated' ? children : <Navigate to="/login" replace />
}

function GuestRoute({ children }) {
  return !isLoggedIn() ? children : <Navigate to="/dashboard" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />

        {/* Guest only — redirect to dashboard if already logged in */}
        <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
        <Route path="/signup" element={<GuestRoute><Signup /></GuestRoute>} />

        {/* Protected — redirect to login if not logged in */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
        <Route path="/start-interview" element={<ProtectedRoute><StartInterview /></ProtectedRoute>} />
        <Route path="/interview" element={<ProtectedRoute><Interview /></ProtectedRoute>} />
        <Route path="/report" element={<ProtectedRoute><InterviewReport /></ProtectedRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
