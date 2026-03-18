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
    <div className="min-h-screen bg-navy-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-white font-bold text-3xl tracking-tight">ARIA</div>
          <div className="text-navy-300 text-sm mt-1">Advisor Relationship Intelligence Assistant</div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Advisor Sign In</h2>
          <p className="text-sm text-gray-500 mb-6">Access your client workbench</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="rm_demo"
                required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
              />
            </div>

            {error && (
              <div className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-navy-950 text-white text-sm font-medium rounded-lg hover:bg-navy-800 disabled:opacity-60 transition-colors"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 space-y-1.5 text-center">
            <div>
              <span className="text-xs text-gray-400">Advisor: </span>
              <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">rm_demo</code>
              <span className="text-xs text-gray-400"> / </span>
              <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">aria2026</code>
            </div>
          </div>
        </div>

        <div className="text-center mt-6">
          <Link to="/client-portal/login" className="text-navy-300 text-xs hover:text-white transition-colors">
            Client? Sign in to your portal →
          </Link>
        </div>

        <div className="text-center mt-4 space-y-1">
          <div className="text-navy-700 text-xs">ARIA v1.2</div>
          <div className="text-navy-600 text-xs">Built with ❤️ from Hyderabad</div>
        </div>
      </div>
    </div>
  )
}
