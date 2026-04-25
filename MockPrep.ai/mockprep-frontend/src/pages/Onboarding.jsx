import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authAPI } from '../lib/api'
import { saveUser, getUser, getToken } from '../lib/auth'

const steps = [
  { id: 1, label: 'Education', icon: '🎓' },
  { id: 2, label: 'Target Role', icon: '🎯' },
  { id: 3, label: 'Experience', icon: '💼' },
  { id: 4, label: 'Complete', icon: '✅' },
]

const experienceLevels = ['Fresher (0 Years)', '1–2 Years', '3–5 Years', '5+ Years']

export default function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    college: '',
    degree: '',
    graduationYear: '',
    targetRole: '',
    targetCompanies: '',
    linkedIn: '',
    experience: '',
  })

  const next = () => setStep(s => Math.min(s + 1, 4))
  const back = () => setStep(s => Math.max(s - 1, 1))

  const progressWidth = `${((step - 1) / 3) * 100}%`

  const handleFinish = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await authAPI.onboarding({
        college: form.college,
        degree: form.degree,
        graduationYear: form.graduationYear,
        targetRole: form.targetRole,
        targetCompanies: form.targetCompanies,
        linkedIn: form.linkedIn,
        experience: form.experience,
      })

      // Update user in localStorage with onboardingCompleted = true
      const currentUser = getUser()
      saveUser(getToken(), {
        ...currentUser,
        onboardingCompleted: true,
        onboardingData: data.user.onboardingData,
      })

      next()
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f0f0f0] font-body">
      {/* Navbar */}
      <nav className="bg-white border-b border-border-light px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-b from-[#5358F3] via-[#883BE8] to-[#9F3BDF] flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
              <path d="M6 9l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-heading font-bold text-text-dark">
            MockPrep<span className="text-primary">.ai</span>
          </span>
        </Link>
        <span className="font-body text-sm text-text-mid font-medium">Step {step} of 4</span>
      </nav>

      {/* Progress bar */}
      <div className="h-1 bg-border-light">
        <div
          className="h-full bg-gradient-to-r from-[#5358F3] to-[#9F3BDF] transition-all duration-500"
          style={{ width: step === 1 ? '8%' : progressWidth }}
        />
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-center gap-8 py-6">
        {steps.map((s) => (
          <div key={s.id} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm transition-all duration-300 ${
              step >= s.id
                ? 'bg-gradient-to-b from-[#5358F3] to-[#9F3BDF]'
                : 'bg-white border border-border-light'
            }`}>
              {step > s.id ? (
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24">
                  <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <span className={`text-xs ${step >= s.id ? 'text-white' : 'text-text-light'}`}>
                  {s.icon}
                </span>
              )}
            </div>
            <span className={`font-body text-sm font-medium transition-colors ${
              step >= s.id ? 'text-primary' : 'text-text-light'
            }`}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Card */}
      <div className="flex items-center justify-center px-6 pb-12">
        <div className="bg-white rounded-2xl shadow-sm border border-border-light w-full max-w-lg p-8">

          {/* Step 1 — Education */}
          {step === 1 && (
            <div>
              <h2 className="font-heading font-bold text-2xl text-text-dark mb-1">
                Tell us About Yourself
              </h2>
              <p className="font-body text-text-mid text-sm mb-6">
                This helps us personalize your interview experience.
              </p>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block font-body text-sm font-medium text-text-dark mb-1.5">
                    College / University
                  </label>
                  <input
                    type="text"
                    placeholder="eg. IIT Delhi"
                    value={form.college}
                    onChange={e => setForm({ ...form, college: e.target.value })}
                    className="w-full bg-[#f4f4f8] border-0 outline-none text-text-dark font-body text-sm px-4 py-3.5 rounded-xl placeholder:text-text-light focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block font-body text-sm font-medium text-text-dark mb-1.5">
                    Degree & Branch
                  </label>
                  <input
                    type="text"
                    placeholder="eg. B. Tech Computer Science"
                    value={form.degree}
                    onChange={e => setForm({ ...form, degree: e.target.value })}
                    className="w-full bg-[#f4f4f8] border-0 outline-none text-text-dark font-body text-sm px-4 py-3.5 rounded-xl placeholder:text-text-light focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block font-body text-sm font-medium text-text-dark mb-1.5">
                    Year of Graduation
                  </label>
                  <input
                    type="text"
                    placeholder="eg. 2027"
                    value={form.graduationYear}
                    onChange={e => setForm({ ...form, graduationYear: e.target.value })}
                    className="w-full bg-[#f4f4f8] border-0 outline-none text-text-dark font-body text-sm px-4 py-3.5 rounded-xl placeholder:text-text-light focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-border-light flex justify-end">
                <button
                  onClick={next}
                  className="bg-gradient-to-b from-[#5358F3] via-[#883BE8] to-[#9F3BDF] text-white font-body font-semibold px-6 py-2.5 rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all duration-200">
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* Step 2 — Target Role */}
          {step === 2 && (
            <div>
              <h2 className="font-heading font-bold text-2xl text-text-dark mb-1">
                What role are you targeting?
              </h2>
              <p className="font-body text-text-mid text-sm mb-6">
                We'll tailor questions to match your career goal.
              </p>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block font-body text-sm font-medium text-text-dark mb-1.5">
                    Target Role
                  </label>
                  <input
                    type="text"
                    placeholder="eg. Software Developer"
                    value={form.targetRole}
                    onChange={e => setForm({ ...form, targetRole: e.target.value })}
                    className="w-full bg-[#f4f4f8] border-0 outline-none text-text-dark font-body text-sm px-4 py-3.5 rounded-xl placeholder:text-text-light focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block font-body text-sm font-medium text-text-dark mb-1.5">
                    Target Companies (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="eg. Google, TCS"
                    value={form.targetCompanies}
                    onChange={e => setForm({ ...form, targetCompanies: e.target.value })}
                    className="w-full bg-[#f4f4f8] border-0 outline-none text-text-dark font-body text-sm px-4 py-3.5 rounded-xl placeholder:text-text-light focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block font-body text-sm font-medium text-text-dark mb-1.5">
                    LinkedIn URL (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="eg. your linkedin url"
                    value={form.linkedIn}
                    onChange={e => setForm({ ...form, linkedIn: e.target.value })}
                    className="w-full bg-[#f4f4f8] border-0 outline-none text-text-dark font-body text-sm px-4 py-3.5 rounded-xl placeholder:text-text-light focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-border-light flex justify-between items-center">
                <button onClick={back} className="font-body text-sm text-text-mid hover:text-primary transition-colors">
                  ← Back
                </button>
                <button
                  onClick={next}
                  className="bg-gradient-to-b from-[#5358F3] via-[#883BE8] to-[#9F3BDF] text-white font-body font-semibold px-6 py-2.5 rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all duration-200">
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* Step 3 — Experience */}
          {step === 3 && (
            <div>
              <h2 className="font-heading font-bold text-2xl text-text-dark mb-1">
                Your Experience Level?
              </h2>
              <p className="font-body text-text-mid text-sm mb-6">
                This helps AI calibrate question difficulty.
              </p>
              <div className="flex flex-col gap-3">
                {experienceLevels.map((level) => (
                  <button
                    key={level}
                    onClick={() => setForm({ ...form, experience: level })}
                    className={`w-full text-left px-4 py-3.5 rounded-xl border font-body text-sm transition-all duration-200 ${
                      form.experience === level
                        ? 'border-primary bg-primary/5 text-primary font-semibold'
                        : 'border-border-light bg-white text-text-dark hover:border-primary/30'
                    }`}>
                    {level}
                  </button>
                ))}
              </div>

              {error && (
                <p className="text-red-500 text-xs mt-3 font-body">{error}</p>
              )}

              <div className="mt-6 pt-4 border-t border-border-light flex justify-between items-center">
                <button onClick={back} className="font-body text-sm text-text-mid hover:text-primary transition-colors">
                  ← Back
                </button>
                <button
                  onClick={handleFinish}
                  disabled={loading}
                  className="bg-gradient-to-b from-[#5358F3] via-[#883BE8] to-[#9F3BDF] text-white font-body font-semibold px-6 py-2.5 rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all duration-200 disabled:opacity-60 flex items-center gap-2">
                  {loading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Saving...
                    </>
                  ) : 'Continue →'}
                </button>
              </div>
            </div>
          )}

          {/* Step 4 — Complete */}
          {step === 4 && (
            <div className="flex flex-col items-center text-center py-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-b from-[#5358F3] via-[#883BE8] to-[#9F3BDF] flex items-center justify-center mb-6">
                <svg width="36" height="36" fill="none" viewBox="0 0 24 24">
                  <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h2 className="font-heading font-bold text-2xl text-text-dark mb-2">
                You're all set! 🎉
              </h2>
              <p className="font-body text-text-mid text-sm">
                Your profile is ready. You have{' '}
                <span className="text-primary font-semibold">2 free interview credits</span>{' '}
                to start practicing.
              </p>
              <div className="w-full mt-8 pt-6 border-t border-border-light flex justify-between items-center">
                <button onClick={back} className="font-body text-sm text-text-mid hover:text-primary transition-colors">
                  ← Back
                </button>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="bg-gradient-to-b from-[#5358F3] via-[#883BE8] to-[#9F3BDF] text-white font-body font-semibold px-6 py-2.5 rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all duration-200">
                  Go To Dashboard →
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
