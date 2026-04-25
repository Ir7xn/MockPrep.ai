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

const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/
const phoneRegex = /^\d{10}$/

export default function Signup() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '' })
  const [focused, setFocused] = useState('')
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleFieldChange = (key, value) => {
    const nextValue = key === 'phone' ? value.replace(/\D/g, '').slice(0, 10) : value
    setForm({ ...form, [key]: nextValue })
  }

  const handleSubmit = async () => {
    const firstName = form.firstName.trim()
    const lastName = form.lastName.trim()
    const email = form.email.trim().toLowerCase()
    const phone = form.phone.trim()
    const password = form.password

    if (!firstName || !lastName || !email || !phone || !password) {
      setError('Please fill all required fields')
      return
    }

    if (!gmailRegex.test(email)) {
      setError('Please use a Gmail address ending with @gmail.com')
      return
    }

    if (!phoneRegex.test(phone)) {
      setError('Phone number must be exactly 10 digits without +91')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    setError('')
    try {
      const data = await authAPI.signup({
        firstName,
        lastName,
        email,
        password,
        phone,
      })
      saveUser(data.token, data.user)
      navigate('/onboarding')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left — Purple Panel */}
      <motion.div
        initial={{ opacity: 0, x: -60 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="hidden lg:flex w-[45%] bg-gradient-to-b from-[#5358F3] via-[#883BE8] to-[#9F3BDF] flex-col items-center justify-center px-12 text-center relative overflow-hidden">

        <motion.div
          animate={{ scale: [1, 1.2, 1], y: [0, -20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-0 left-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/2 -translate-x-1/2" />
        <motion.div
          animate={{ scale: [1, 1.3, 1], y: [0, 20, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-0 right-0 w-56 h-56 bg-white/5 rounded-full translate-y-1/2 translate-x-1/2" />

        <div className="relative z-10 w-full">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="font-heading font-bold text-4xl text-white leading-tight mb-4">
            Start Your Journey
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="font-body text-white/90 text-lg leading-relaxed mb-10">
            Join students preparing for interviews with AI-powered mock sessions.
          </motion.p>

          <div className="grid grid-cols-2 gap-4">
            {[
              { num: '10K+', label: 'Active Users' },
              { num: '95%', label: 'Success Rate' },
              { num: '3', label: 'Interview Domains' },
              { num: 'Free', label: 'To Get Started' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + i * 0.1, duration: 0.4 }}
                whileHover={{ scale: 1.05 }}
                className="bg-white/20 border border-white/30 rounded-xl p-4">
                <p className="font-heading font-bold text-2xl text-white">{stat.num}</p>
                <p className="font-body text-white text-xs mt-1 opacity-90">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Plan info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.5 }}
            className="mt-8 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-left">
            <div className="flex items-center gap-2 mb-1">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="white"/>
              </svg>
              <p className="font-body font-semibold text-white text-sm">Start Free, Upgrade Anytime</p>
            </div>
            <p className="font-body text-white/70 text-xs">
              2 free interviews on signup. Unlock unlimited with Pro or Premium.
            </p>
          </motion.div>
        </div>
      </motion.div>

      {/* Right — Form */}
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="flex-1 flex items-center justify-center px-8 py-12 bg-white">
        <div className="w-full max-w-md">
          <motion.div {...fadeUp(0.1)}>
            <Link to="/" className="flex items-center gap-2 mb-8">
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
            Create Your Account
          </motion.h1>
          <motion.p {...fadeUp(0.2)} className="font-body text-text-mid text-sm mb-7">
            Start with 2 free interviews — no credit card needed.
          </motion.p>

          {/* Google */}
          <motion.button
            {...fadeUp(0.25)}
            disabled
            title="Google sign-in is not available yet"
            whileHover={{ scale: 1.01, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
            whileTap={{ scale: 0.99 }}
            className="w-full flex items-center justify-center gap-3 bg-white border border-border-light text-text-dark font-body font-medium py-3.5 rounded-2xl transition-all duration-200 mb-5 opacity-60 cursor-not-allowed">
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
            <span className="text-text-light text-xs font-body tracking-wide">OR CONTINUE WITH EMAIL</span>
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
            <motion.div {...fadeUp(0.3)} className="grid grid-cols-2 gap-3">
              {[
                { key: 'firstName', label: 'First Name', placeholder: 'John' },
                { key: 'lastName', label: 'Last Name', placeholder: 'Doe' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block font-body text-sm font-medium text-text-dark mb-1.5">{label}</label>
                  <input
                    type="text"
                    placeholder={placeholder}
                    value={form[key]}
                    onFocus={() => setFocused(key)}
                    onBlur={() => setFocused('')}
                    onChange={e => handleFieldChange(key, e.target.value)}
                    className="w-full bg-[#f4f4f8] border-0 outline-none text-text-dark font-body text-sm px-4 py-3.5 rounded-2xl placeholder:text-text-light focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              ))}
            </motion.div>

            {[
              { key: 'email', label: 'Email', type: 'email', placeholder: 'you@gmail.com', delay: 0.33 },
              { key: 'phone', label: 'Phone Number', type: 'tel', placeholder: '9876543210', delay: 0.36, inputMode: 'numeric', maxLength: 10, pattern: '\\d{10}' },
              { key: 'password', label: 'Password', type: 'password', placeholder: '••••••••', delay: 0.39 },
            ].map(({ key, label, type, placeholder, delay, inputMode, maxLength, pattern }) => (
              <motion.div key={key} {...fadeUp(delay)}>
                <label className="block font-body text-sm font-medium text-text-dark mb-1.5">{label}</label>
                <input
                  type={type}
                  placeholder={placeholder}
                  value={form[key]}
                  inputMode={inputMode}
                  maxLength={maxLength}
                  pattern={pattern}
                  onFocus={() => setFocused(key)}
                  onBlur={() => setFocused('')}
                  onChange={e => handleFieldChange(key, e.target.value)}
                  className="w-full bg-[#f4f4f8] border-0 outline-none text-text-dark font-body text-sm px-4 py-3.5 rounded-2xl placeholder:text-text-light focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </motion.div>
            ))}

            <motion.button
              {...fadeUp(0.42)}
              onClick={handleSubmit}
              disabled={loading}
              whileHover={!loading ? { scale: 1.02, boxShadow: '0 8px 25px rgba(83,88,243,0.35)' } : {}}
              whileTap={!loading ? { scale: 0.98 } : {}}
              className="w-full bg-gradient-to-b from-[#5358F3] via-[#883BE8] to-[#9F3BDF] text-white font-body font-semibold py-3.5 rounded-2xl transition-all duration-200 mt-1 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Creating Account...
                </>
              ) : 'Create Account →'}
            </motion.button>
          </div>

          <motion.p {...fadeUp(0.46)} className="text-center font-body text-sm text-text-mid mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-semibold hover:text-primary-dark transition-colors">
              Login
            </Link>
          </motion.p>
        </div>
      </motion.div>
    </div>
  )
}
