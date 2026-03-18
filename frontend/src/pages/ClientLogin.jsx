import ARiALogo from '../components/ARiALogo'
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { clientLogin } from '../auth'

export default function ClientLogin() {
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = clientLogin(identifier, pin)
    setLoading(false)
    if (result.success) {
      navigate('/client-portal')
    } else {
      setError('Invalid name or PIN. Try your first name and PIN 1234.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-900 to-navy-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <ARiALogo className="text-white font-bold text-3xl tracking-tight" />
          <div className="text-navy-300 text-sm mt-1">Client Portal</div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Client Sign In</h2>
          <p className="text-sm text-gray-500 mb-6">View your portfolio and goals</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Your First Name</label>
              <input
                type="text"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                placeholder="e.g. Priya"
                required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">PIN</label>
              <input
                type="password"
                value={pin}
                onChange={e => setPin(e.target.value)}
                placeholder="••••"
                maxLength={4}
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
              {loading ? 'Signing in…' : 'Enter Portal'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <span className="text-xs text-gray-400">Demo: enter your first name + PIN </span>
            <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">1234</code>
          </div>
        </div>

        <div className="text-center mt-6">
          <Link to="/login" className="text-navy-300 text-xs hover:text-white transition-colors">
            Advisor? Sign in to your workbench →
          </Link>
        </div>
      </div>
    </div>
  )
}
