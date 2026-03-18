import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { advisorLogin } from '../auth'

export default function AdvisorLogin() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const success = advisorLogin(username, password)
    setLoading(false)
    if (success) {
      navigate('/')
    } else {
      setError('Invalid username or password.')
    }
  }

  return (
    <div className="min-h-screen bg-navy-950 flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 px-16 py-14"
        style={{ background: 'linear-gradient(160deg, #0a1628 0%, #0f2044 60%, #1a3a6e 100%)' }}>
        <div>
          <div className="text-white font-bold text-5xl tracking-tight">A-RiA</div>
          <div className="text-blue-300 text-4xl font-bold mt-1 leading-tight">Real Intelligence for Every Client</div>
        </div>

        <div>
          <h1 className="text-white text-4xl font-bold leading-tight mb-6">
            Every client meeting,<br />
            <span className="text-blue-300">perfectly prepared.</span>
          </h1>
          <p className="text-navy-300 text-base leading-relaxed max-w-sm">
            AI-powered insights on portfolio drift, goal probability, and life events — so you walk in knowing exactly what matters.
          </p>

          <div className="mt-12 grid grid-cols-3 gap-6">
            {[
              { label: 'Goal Success Rate', value: '84%', sub: 'avg across clients' },
              { label: 'Urgency Flags', value: 'Live', sub: 'auto-prioritised' },
              { label: 'Time Saved', value: '2h+', sub: 'per client review' },
            ].map(s => (
              <div key={s.label}>
                <div className="text-white text-2xl font-bold">{s.value}</div>
                <div className="text-blue-300 text-xs font-semibold mt-0.5">{s.label}</div>
                <div className="text-navy-400 text-xs mt-0.5">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-navy-400 text-xs">A-RiA v1.2 · Made with ❤️ in Hyderabad</div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-gray-50">
        {/* Mobile logo */}
        <div className="lg:hidden text-center mb-10">
          <div className="text-navy-950 font-bold text-5xl tracking-tight">A-RiA</div>
          <div className="text-navy-700 text-2xl font-bold mt-1">Real Intelligence for Every Client</div>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Advisor Sign In</h2>
            <p className="text-sm text-gray-500 mt-1">Access your client workbench</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="rm_demo"
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-300 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-300 bg-white"
              />
            </div>

            {error && (
              <div className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-navy-950 text-white text-sm font-semibold rounded-xl hover:bg-navy-800 disabled:opacity-60 transition-colors mt-2"
            >
              {loading ? 'Signing in…' : 'Sign In →'}
            </button>
          </form>

          <div className="mt-6 p-4 bg-white border border-gray-100 rounded-xl">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Demo credentials</div>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <code className="bg-gray-100 px-2 py-1 rounded font-mono">rm_demo</code>
              <span className="text-gray-300">/</span>
              <code className="bg-gray-100 px-2 py-1 rounded font-mono">aria2026</code>
            </div>
          </div>

          <div className="text-center mt-6">
            <Link to="/client-portal/login" className="text-navy-400 text-xs hover:text-navy-700 transition-colors">
              Client? Sign in to your portal →
            </Link>
          </div>

          <div className="lg:hidden text-center mt-8 text-gray-300 text-xs">
            A-RiA v1.2 · Made with ❤️ in Hyderabad
          </div>
        </div>
      </div>
    </div>
  )
}
