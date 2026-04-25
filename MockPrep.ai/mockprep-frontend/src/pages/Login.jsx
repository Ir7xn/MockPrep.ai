import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { authAPI } from '../lib/api'
import { saveUser } from '../lib/auth'

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay, ease: 'easeOut' },
})

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [focused, setFocused] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleLogin = async () => {
    if (!form.email || !form.password) {
      setError('Please enter email and password')
      return
    }
    setLoading(true)
    setError('')
    try {
      const data = await authAPI.login({
        email: form.email,
        password: form.password,
      })
      saveUser(data.token, data.user)
      if (data.user.onboardingCompleted) {
        navigate('/dashboard')
      } else {
        navigate('/onboarding')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleLogin()
  }

  return (
    <div className="min-h-screen flex">
      {/* Left — Form */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="flex-1 flex items-center justify-center px-8 py-12 bg-white">
        <div className="w-full max-w-md">
          <motion.div {...fadeUp(0.1)}>
            <Link to="/" className="flex items-center gap-2 mb-10">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-b from-[#5358F3] to-[#9F3BDF] flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
                  <path d="M6 9l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="font-heading font-bold text-text-dark">
                MockPrep<span className="text-primary">.ai</span>
              </span>
            </Link>
          </motion.div>

          <motion.h1 {...fadeUp(0.15)} className="font-heading font-bold text-3xl text-text-dark mb-1">
            Welcome Back
          </motion.h1>
          <motion.p {...fadeUp(0.2)} className="font-body text-text-mid text-sm mb-8">
            Log in to continue your MockPrep practice sessions.
          </motion.p>

          {/* Google */}
          <motion.button
            {...fadeUp(0.25)}
            disabled
            title="Google sign-in is not available yet"
            whileHover={{ scale: 1.01, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
            whileTap={{ scale: 0.99 }}
            className="w-full flex items-center justify-center gap-3 border border-border-light text-text-dark font-body font-medium py-3 rounded-xl transition-all duration-200 mb-5 opacity-60 cursor-not-allowed">
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google Sign-In Coming Soon
          </motion.button>

          <motion.div {...fadeUp(0.28)} className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-border-light" />
            <span className="text-text-light text-xs font-body">OR CONTINUE WITH EMAIL</span>
            <div className="flex-1 h-px bg-border-light" />
          </motion.div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                  stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <p className="font-body text-red-600 text-xs">{error}</p>
            </motion.div>
          )}

          <div className="flex flex-col gap-4">
            {[
              { key: 'email', label: 'Email', type: 'email', placeholder: '@youremail.com', delay: 0.3 },
              { key: 'password', label: 'Password', type: 'password', placeholder: '••••••••', delay: 0.35 },
            ].map(({ key, label, type, placeholder, delay }) => (
              <motion.div key={key} {...fadeUp(delay)}>
                <div className="flex justify-between mb-1.5">
                  <label className="font-body text-sm text-text-mid">{label}</label>
                  {key === 'password' && (
                    <a href="#" className="font-body text-xs text-primary hover:text-primary-dark transition-colors">
                      Forgot Password?
                    </a>
                  )}
                </div>
                <motion.input
                  type={type}
                  placeholder={placeholder}
                  value={form[key]}
                  onFocus={() => setFocused(key)}
                  onBlur={() => setFocused('')}
                  onChange={e => setForm({ ...form, [key]: e.target.value })}
                  onKeyDown={handleKeyDown}
                  animate={{ borderColor: focused === key ? '#5358F3' : '#e8e8f0' }}
                  className="w-full border border-border-light outline-none text-text-dark font-body text-sm px-4 py-3 rounded-xl transition-colors bg-white placeholder:text-text-light focus:ring-2 focus:ring-primary/10"
                />
              </motion.div>
            ))}

            <motion.div {...fadeUp(0.4)} className="flex items-center gap-2">
              <input type="checkbox" id="remember" className="accent-primary w-4 h-4"/>
              <label htmlFor="remember" className="font-body text-sm text-text-mid">Remember me</label>
            </motion.div>

            <motion.button
              {...fadeUp(0.43)}
              onClick={handleLogin}
              disabled={loading}
              whileHover={!loading ? { scale: 1.02, boxShadow: '0 8px 25px rgba(83,88,243,0.35)' } : {}}
              whileTap={!loading ? { scale: 0.98 } : {}}
              className="w-full bg-gradient-to-b from-[#5358F3] via-[#883BE8] to-[#9F3BDF] text-white font-body font-semibold py-3 rounded-xl transition-all duration-200 mt-1 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Logging in...
                </>
              ) : 'LOGIN →'}
            </motion.button>
          </div>

          <motion.p {...fadeUp(0.48)} className="text-center font-body text-sm text-text-mid mt-6">
            Don't have an account?{' '}
            <Link to="/signup" className="text-primary font-semibold hover:text-primary-dark transition-colors">
              Signup for free
            </Link>
          </motion.p>
        </div>
      </motion.div>

      {/* Right — Purple Panel */}
      <motion.div
        initial={{ opacity: 0, x: 60 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="hidden lg:flex w-[45%] bg-gradient-to-b from-[#5358F3] via-[#883BE8] to-[#9F3BDF] flex-col items-center justify-center px-12 text-center relative overflow-hidden">

        <motion.div
          animate={{ scale: [1, 1.2, 1], x: [0, 20, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <motion.div
          animate={{ scale: [1, 1.3, 1], x: [0, -20, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-0 left-0 w-56 h-56 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="font-heading font-bold text-4xl text-white leading-tight mb-4">
            Ace Every Interview
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="font-body text-white/80 text-lg leading-relaxed mb-10">
            Practice with AI, get instant feedback, and track your progress to land your dream job.
          </motion.p>

          <div className="flex flex-col gap-3">
            {[
              { label: 'Technical Rounds', desc: 'DSA, System Design, CS Fundamentals' },
              { label: 'HR Rounds', desc: 'Behavioural, situational, culture fit' },
              { label: 'Instant AI Feedback', desc: 'Scores and improvement tips' },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.1, duration: 0.5 }}
                whileHover={{ x: 4 }}
                className="flex items-center gap-3 bg-white/15 border border-white/20 rounded-xl px-4 py-3 text-left">
                <div className="w-5 h-5 rounded-full bg-white/25 flex items-center justify-center flex-shrink-0">
                  <svg width="10" height="10" fill="none" viewBox="0 0 24 24">
                    <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <p className="font-body font-semibold text-white text-sm">{item.label}</p>
                  <p className="font-body text-white/70 text-xs">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Plan badges */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.5 }}
            className="mt-10 flex items-center justify-center gap-3">
            {['Free', 'Pro', 'Premium'].map((plan, i) => (
              <div key={plan}
                className={`px-3 py-1.5 rounded-full text-xs font-body font-semibold border ${
                  i === 2
                    ? 'bg-white text-primary border-white'
                    : 'bg-white/10 text-white border-white/20'
                }`}>
                {plan}
              </div>
            ))}
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
