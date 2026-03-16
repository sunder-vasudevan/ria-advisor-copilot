import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, TrendingUp, ChevronRight, RefreshCw, Bell } from 'lucide-react'
import { getClients, getBriefing, fmt } from '../api/client'
import { getAdvisorSession, advisorLogout } from '../auth'

function UrgencyBadge({ flag }) {
  const base = 'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium'
  const styles = {
    high: 'bg-red-100 text-red-700',
    medium: 'bg-amber-100 text-amber-700',
    low: 'bg-green-100 text-green-700',
  }
  return (
    <span className={`${base} ${styles[flag.severity] || styles.low}`}>
      {flag.severity === 'high' && <AlertTriangle size={10} />}
      {flag.label}
    </span>
  )
}

function SegmentBadge({ segment }) {
  return (
    <span className={segment === 'HNI' ? 'badge-hni' : 'badge-retail'}>
      {segment}
    </span>
  )
}

export default function ClientList() {
  const navigate = useNavigate()
  const [clients, setClients] = useState([])
  const [briefing, setBriefing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [briefingLoading, setBriefingLoading] = useState(false)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const session = getAdvisorSession()

  useEffect(() => {
    getClients()
      .then(setClients)
      .catch(() => setError('Failed to load clients'))
      .finally(() => setLoading(false))
  }, [])

  const loadBriefing = () => {
    setBriefingLoading(true)
    getBriefing()
      .then(setBriefing)
      .catch(err => alert(`Briefing unavailable — ${err?.response?.data?.detail || err.message || 'check ANTHROPIC_API_KEY'}`))
      .finally(() => setBriefingLoading(false))
  }

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.segment.toLowerCase().includes(search.toLowerCase())
  )

  const attentionCount = clients.filter(c => c.urgency_score > 0).length

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="text-white text-lg font-medium animate-pulse">Loading clients…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-navy-950 flex flex-col flex-shrink-0">
        <div className="p-6 border-b border-navy-800">
          <div className="text-white font-bold text-lg tracking-tight">ARIA</div>
          <div className="text-navy-300 text-xs mt-0.5">Advisor Relationship Intelligence Assistant</div>
        </div>
        <nav className="flex-1 p-4">
          <div className="text-navy-400 text-xs font-semibold uppercase tracking-wider mb-3">Navigation</div>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-navy-800 text-white text-sm font-medium">
            <TrendingUp size={16} />
            Client Book
          </button>
        </nav>
        <div className="p-4 border-t border-navy-800">
          <div className="text-navy-400 text-xs">Logged in as</div>
          <div className="text-white text-sm font-medium mt-0.5">{session?.username || 'rm_demo'}</div>
          <div className="text-navy-400 text-xs">Mumbai Branch</div>
          <button
            onClick={() => { advisorLogout(); navigate('/login') }}
            className="text-navy-400 text-xs hover:text-white transition-colors mt-2"
          >
            Sign out
          </button>
          <div className="text-navy-700 text-xs mt-3">v1.2</div>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-5">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Good morning, Rahul.
                {attentionCount > 0 && (
                  <span className="text-red-600 ml-2">
                    {attentionCount} client{attentionCount !== 1 ? 's' : ''} need attention today.
                  </span>
                )}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <button
              onClick={loadBriefing}
              disabled={briefingLoading}
              className="flex items-center gap-2 px-4 py-2 bg-navy-950 text-white text-sm font-medium rounded-lg hover:bg-navy-800 disabled:opacity-60 transition-colors"
            >
              {briefingLoading
                ? <RefreshCw size={14} className="animate-spin" />
                : <Bell size={14} />
              }
              {briefingLoading ? 'Loading…' : 'Morning Briefing'}
            </button>
          </div>

          {/* Morning Briefing Card */}
          {briefing && (
            <div className="mt-4 p-4 bg-navy-50 border border-navy-200 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Bell size={14} className="text-navy-700" />
                <span className="text-sm font-semibold text-navy-900">{briefing.headline}</span>
              </div>
              <p className="text-sm text-navy-800 leading-relaxed">{briefing.overall_narrative}</p>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-8">
          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search clients by name or segment…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full max-w-sm px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-300 bg-white"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Segment</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Portfolio Value</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Flags</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(client => (
                  <tr
                    key={client.id}
                    onClick={() => navigate(`/clients/${client.id}`)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{client.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">Age {client.age} · {client.risk_category}</div>
                    </td>
                    <td className="px-6 py-4">
                      <SegmentBadge segment={client.segment} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="font-semibold text-gray-900">{fmt.inr(client.total_value)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {client.urgency_flags.length === 0 ? (
                          <span className="badge-low">On Track</span>
                        ) : (
                          client.urgency_flags.slice(0, 2).map((f, i) => (
                            <UrgencyBadge key={i} flag={f} />
                          ))
                        )}
                        {client.urgency_flags.length > 2 && (
                          <span className="text-xs text-gray-500 self-center">
                            +{client.urgency_flags.length - 2} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <ChevronRight size={16} className="text-gray-400 ml-auto" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-12 text-gray-400 text-sm">No clients found</div>
            )}
          </div>
          <div className="mt-3 text-xs text-gray-400 text-right">
            {filtered.length} of {clients.length} clients
          </div>
        </div>
      </div>
    </div>
  )
}
