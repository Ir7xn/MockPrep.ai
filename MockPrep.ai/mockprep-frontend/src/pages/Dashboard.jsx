import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { getUser, clearUser } from '../lib/auth'
import { authAPI } from '../lib/api'

const scoreData = [
  { session: 0, score: 300 },
  { session: 1, score: 100 },
  { session: 2, score: 750 },
  { session: 3, score: 700 },
  { session: 4, score: 200 },
  { session: 5, score: 400 },
  { session: 6, score: 450 },
]

const achievements = [
  { icon: '🔥', label: 'First Interview', unlocked: true },
  { icon: '⭐', label: '80 + Score', unlocked: true },
  { icon: '⚡', label: '5 - Streak', unlocked: true },
  { icon: '🏆', label: 'Score 90 +', unlocked: true },
  { icon: '📖', label: '10 Sessions', unlocked: false },
  { icon: '💎', label: 'Perfect 100', unlocked: false },
]

const areasToImprove = [
  'System Design', 'Behavioral Questions', 'Time Complexity', 'SQL Queries', 'Leadership Examples'
]

const interviewHistory = [
  { role: 'Software Developer', date: 'Nov 05, 2026 · Average', score: 92, color: '#22c55e' },
  { role: 'Software Developer', date: 'Nov 03, 2026 · Good', score: 86, color: '#22c55e' },
  { role: 'Data Analyst', date: 'Apr 1, 2026 · Mixed', score: 75, color: '#f59e0b' },
  { role: 'Software Developer', date: 'Mar 20, 2026 · Good Body', score: 50, color: '#ef4444' },
]

export default function Dashboard() {
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const navigate = useNavigate()
    const userData = getUser()
    const [user] = useState({
      name: userData?.firstName || 'User',
      plan: userData?.plan || 'free',
      credits: userData?.interviewCredits || 0,
      avatar: `${userData?.firstName?.[0] || 'U'}${userData?.lastName?.[0] || ''}`,
    })

    const handleLogout = async () => {
      try {
        await authAPI.logout()
      } catch (e) {}
      clearUser()
      navigate('/login')
    }

  return (
    <div className="min-h-screen bg-[#f8f7ff] font-body">
      {/* Navbar */}
      <nav className="bg-white border-b border-border-light px-6 py-3 flex items-center justify-between sticky top-0 z-50">
      <button onClick={() => window.location.reload()} className="flex items-center gap-2">             
        <div className="w-8 h-8 rounded-lg bg-gradient-to-b from-[#5358F3] via-[#883BE8] to-[#9F3BDF] flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
              <path d="M6 9l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-heading font-bold text-text-dark">MockPrep<span className="text-primary">.ai</span></span>
        </button>

        <div className="flex items-center gap-3">
          {/* Plan badge */}
          <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-full px-3 py-1.5">
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#5B4FF5"/>
            </svg>
            <span className="text-primary text-xs font-body font-semibold">{user.plan}</span>
          </div>

          {/* Avatar */}
          <div className="relative">
            <div
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-8 h-8 rounded-full bg-gradient-to-b from-[#5358F3] to-[#9F3BDF] flex items-center justify-center cursor-pointer">
              <span className="text-white text-xs font-heading font-bold">{user.avatar}</span>
            </div>

            {/* Dropdown */}
            {dropdownOpen && (
              <>
                {/* Backdrop to close on outside click */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setDropdownOpen(false)}
                />
                <div className="absolute right-0 top-10 bg-white border border-border-light rounded-xl shadow-lg py-2 w-44 z-50">
                  <div className="px-3 py-2 border-b border-border-light">
                    <p className="font-body text-xs font-semibold text-text-dark">
                      {userData?.firstName} {userData?.lastName}
                    </p>
                    <p className="font-body text-xs text-text-light capitalize">{user.plan} plan</p>
                  </div>
                  <button
                    onClick={() => { setDropdownOpen(false); handleLogout() }}
                    className="w-full text-left px-3 py-2 font-body text-sm text-red-500 hover:bg-red-50 transition-colors">
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Main */}
      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Welcome + CTA */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="font-heading font-bold text-2xl text-text-dark">
              Welcome Back, {userData?.firstName} {userData?.lastName}! 👋
            </h1>
            <p className="font-body text-text-mid text-sm mt-1">Ready for your next practice session?</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Credits */}
            <div className="flex items-center gap-2 bg-white border border-border-light rounded-xl px-4 py-2.5">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="#5B4FF5" strokeWidth="1.5"/>
                <path d="M12 6v6l4 2" stroke="#5B4FF5" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <div>
                <p className="font-body text-xs text-text-light leading-none">Credits Left</p>
                <p className="font-heading font-bold text-sm text-text-dark">{user.credits}</p>
              </div>
            </div>
            {/* Start Interview */}
            <button onClick={() => navigate('/start-interview')} className="flex items-center gap-2 bg-gradient-to-b from-[#5358F3] via-[#883BE8] to-[#9F3BDF] text-white font-body font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5">
              
              <svg width="14" height="14" fill="white" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
              Start Interview
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { icon: '📊', value: '82', label: 'Average Score' },
            { icon: '🏆', value: '92', label: 'Best Score' },
            { icon: '🕐', value: '10', label: 'Total Sessions' },
            { icon: '📈', value: '23', label: 'Improvement' },
          ].map((stat, i) => (
            <div key={i} className="bg-white border border-border-light rounded-2xl p-5 hover:shadow-md hover:shadow-primary/5 transition-all duration-200">
              <span className="text-2xl mb-3 block">{stat.icon}</span>
              <p className="font-heading font-bold text-3xl text-text-dark">{stat.value}</p>
              <p className="font-body text-text-light text-sm mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Score Progress */}
          <div className="md:col-span-2 bg-white border border-border-light rounded-2xl p-5">
            <h3 className="font-heading font-semibold text-text-dark mb-4">Score Progress</h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={scoreData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="session" tick={{ fontSize: 11, fill: '#8888aa' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#8888aa' }} axisLine={false} tickLine={false} domain={[0, 900]} />
                <Tooltip
                  contentStyle={{ background: 'white', border: '1px solid #e8e8f0', borderRadius: '12px', fontSize: '12px' }}
                  labelStyle={{ color: '#1a1a2e', fontWeight: 600 }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#5358F3"
                  strokeWidth={2}
                  dot={{ fill: '#5358F3', strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, fill: '#9F3BDF' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Achievements */}
          <div className="bg-white border border-border-light rounded-2xl p-5">
            <h3 className="font-heading font-semibold text-text-dark mb-4">Achievements</h3>
            <div className="grid grid-cols-3 gap-2">
              {achievements.map((a, i) => (
                <div key={i}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl gap-1.5 transition-all ${
                    a.unlocked
                      ? 'bg-primary/10 border border-primary/15'
                      : 'bg-[#f4f4f8] border border-transparent opacity-50'
                  }`}>
                  <span className="text-xl">{a.icon}</span>
                  <p className="font-body text-center leading-tight"
                    style={{ fontSize: '9px', color: a.unlocked ? '#5358F3' : '#8888aa' }}>
                    {a.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Areas to Improve */}
          <div className="bg-white border border-border-light rounded-2xl p-5">
            <h3 className="font-heading font-semibold text-text-dark mb-4">Areas to Improve</h3>
            <div className="flex flex-wrap gap-2">
              {areasToImprove.map((area, i) => (
                <span key={i}
                  className="font-body text-xs px-3 py-1.5 rounded-full border"
                  style={{
                    background: i % 2 === 0 ? '#fff8f0' : '#f0eeff',
                    borderColor: i % 2 === 0 ? '#fed7aa' : '#c4b5fd',
                    color: i % 2 === 0 ? '#c2410c' : '#5358F3',
                  }}>
                  {area}
                </span>
              ))}
            </div>
          </div>

          {/* Interview History */}
          <div className="md:col-span-2 bg-white border border-border-light rounded-2xl p-5">
            <h3 className="font-heading font-semibold text-text-dark mb-4">Interview History</h3>
            <div className="flex flex-col gap-2">
              {interviewHistory.map((item, i) => (
                <div key={i}
                  className="flex items-center gap-3 bg-[#f8f7ff] hover:bg-primary/5 border border-border-light rounded-xl px-4 py-3 transition-all duration-200 cursor-pointer group">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                      <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        stroke="#5358F3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-body font-semibold text-text-dark text-sm">{item.role}</p>
                    <p className="font-body text-text-light text-xs">{item.date}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-bold text-sm" style={{ color: item.color }}>
                      {item.score}
                    </span>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24"
                      className="group-hover:translate-x-0.5 transition-transform">
                      <path d="M9 18l6-6-6-6" stroke="#5358F3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M15 18l6-6-6-6" stroke="#5358F3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.4"/>
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}