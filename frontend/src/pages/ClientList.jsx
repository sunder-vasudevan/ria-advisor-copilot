import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, TrendingUp, ChevronRight, RefreshCw, Bell, CheckCircle, UserPlus, LayoutList, Layers } from 'lucide-react'
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
  const [viewMode, setViewMode] = useState('list') // 'list' | 'grouped'
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
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">

      {/* ── Mobile top nav (hidden on md+) ── */}
      <div className="md:hidden bg-navy-950 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div>
          <div className="text-white font-bold text-base tracking-tight">ARIA</div>
          <div className="text-navy-300 text-xs">Advisor Workbench</div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadBriefing}
            disabled={briefingLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-800 text-white text-xs font-medium rounded-lg disabled:opacity-60"
          >
            {briefingLoading ? <RefreshCw size={12} className="animate-spin" /> : <Bell size={12} />}
            {briefingLoading ? 'Loading…' : 'Briefing'}
          </button>
          <button
            onClick={() => { advisorLogout(); navigate('/login') }}
            className="text-navy-400 text-xs hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* ── Desktop sidebar (hidden on mobile) ── */}
      <div className="hidden md:flex w-64 bg-navy-950 flex-col flex-shrink-0">
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
          <div className="flex items-center gap-2 mt-0.5">
            <div className="text-white text-sm font-medium">{session?.displayName || session?.username || 'rm_demo'}</div>
            {session?.role === 'superadmin' && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-amber-400 text-amber-900 font-semibold leading-none">SUPER</span>
            )}
          </div>
          <button
            onClick={() => { advisorLogout(); navigate('/login') }}
            className="text-navy-400 text-xs hover:text-white transition-colors mt-2"
          >
            Sign out
          </button>
          <div className="text-navy-700 text-xs mt-3">v1.2</div>
          <div className="text-navy-600 text-xs mt-1">Built with ❤️ from Hyderabad</div>
        </div>
      </div>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ── Desktop header (hidden on mobile) ── */}
        <div className="hidden md:block bg-white border-b border-gray-200 px-8 py-5">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Good morning, {session?.displayName || 'Rahul'}.
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
              onClick={() => navigate('/clients/new')}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              <UserPlus size={14} />
              Add Client
            </button>
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

          {/* Morning Briefing Card — desktop */}
          {briefing && <BriefingCard briefing={briefing} clients={clients} navigate={navigate} />}
        </div>

        {/* ── Mobile header + briefing ── */}
        <div className="md:hidden bg-white border-b border-gray-200 px-4 py-4">
          <h1 className="text-base font-bold text-gray-900">
            Good morning, {session?.displayName || 'Rahul'}.
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          {attentionCount > 0 && (
            <p className="text-xs text-red-600 mt-1 font-medium">
              {attentionCount} client{attentionCount !== 1 ? 's' : ''} need attention today.
            </p>
          )}
          {briefing && <BriefingCard briefing={briefing} clients={clients} navigate={navigate} />}
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-auto p-4 md:p-8">

          {/* Search + View toggle */}
          <div className="mb-4 flex items-center gap-3">
            <input
              type="text"
              placeholder="Search clients…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 max-w-sm px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-300 bg-white"
            />
            <div className="flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
                  viewMode === 'list' ? 'bg-navy-950 text-white' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <LayoutList size={13} /> List
              </button>
              <button
                onClick={() => setViewMode('grouped')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
                  viewMode === 'grouped' ? 'bg-navy-950 text-white' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <Layers size={13} /> Grouped
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}

          {viewMode === 'list' ? (
            <>
              {/* ── Mobile: card list ── */}
              <div className="md:hidden space-y-3">
                {filtered.map(client => (
                  <ClientCard key={client.id} client={client} navigate={navigate} />
                ))}
                {filtered.length === 0 && (
                  <div className="text-center py-12 text-gray-400 text-sm">No clients found</div>
                )}
              </div>

              {/* ── Desktop: table ── */}
              <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <ClientTable clients={filtered} navigate={navigate} />
              </div>
            </>
          ) : (
            /* ── Grouped view (both mobile + desktop) ── */
            <GroupedView clients={filtered} navigate={navigate} />
          )}

          <div className="mt-3 text-xs text-gray-400 text-right">
            {filtered.length} of {clients.length} clients
          </div>
        </div>
      </div>
    </div>
  )
}

function ClientCard({ client, navigate }) {
  return (
    <div
      onClick={() => navigate(`/clients/${client.id}`)}
      className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer active:bg-gray-50 transition-colors"
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="font-medium text-gray-900 truncate">{client.name}</div>
          <div className="text-xs text-gray-500 mt-0.5">Age {client.age} · {client.risk_category}</div>
        </div>
        <div className="flex flex-col items-end gap-1.5 ml-3 flex-shrink-0">
          <SegmentBadge segment={client.segment} />
          <div className="font-semibold text-sm text-gray-900">{fmt.inr(client.total_value)}</div>
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1">
        {client.urgency_flags.length === 0 ? (
          <span className="badge-low">On Track</span>
        ) : (
          client.urgency_flags.slice(0, 2).map((f, i) => <UrgencyBadge key={i} flag={f} />)
        )}
        {client.urgency_flags.length > 2 && (
          <span className="text-xs text-gray-500 self-center">+{client.urgency_flags.length - 2} more</span>
        )}
      </div>
    </div>
  )
}

function ClientTable({ clients, navigate }) {
  if (clients.length === 0) {
    return <div className="text-center py-12 text-gray-400 text-sm">No clients found</div>
  }
  return (
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
        {clients.map(client => (
          <tr
            key={client.id}
            onClick={() => navigate(`/clients/${client.id}`)}
            className="hover:bg-gray-50 cursor-pointer transition-colors"
          >
            <td className="px-6 py-4">
              <div className="font-medium text-gray-900">{client.name}</div>
              <div className="text-xs text-gray-500 mt-0.5">Age {client.age} · {client.risk_category}</div>
            </td>
            <td className="px-6 py-4"><SegmentBadge segment={client.segment} /></td>
            <td className="px-6 py-4 text-right">
              <div className="font-semibold text-gray-900">{fmt.inr(client.total_value)}</div>
            </td>
            <td className="px-6 py-4">
              <div className="flex flex-wrap gap-1">
                {client.urgency_flags.length === 0 ? (
                  <span className="badge-low">On Track</span>
                ) : (
                  client.urgency_flags.slice(0, 2).map((f, i) => <UrgencyBadge key={i} flag={f} />)
                )}
                {client.urgency_flags.length > 2 && (
                  <span className="text-xs text-gray-500 self-center">+{client.urgency_flags.length - 2} more</span>
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
  )
}

function GroupedView({ clients, navigate }) {
  const needsAttention = clients.filter(c => c.urgency_score > 0)
  const onTrack = clients.filter(c => c.urgency_score === 0)

  const Section = ({ label, icon, color, clients: group }) => {
    if (group.length === 0) return null
    return (
      <div className="mb-6">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-2 ${color}`}>
          {icon}
          <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
          <span className="ml-auto text-xs font-bold">{group.length}</span>
        </div>
        {/* Mobile cards */}
        <div className="md:hidden space-y-2">
          {group.map(c => <ClientCard key={c.id} client={c} navigate={navigate} />)}
        </div>
        {/* Desktop table */}
        <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <ClientTable clients={group} navigate={navigate} />
        </div>
      </div>
    )
  }

  if (clients.length === 0) {
    return <div className="text-center py-12 text-gray-400 text-sm">No clients found</div>
  }

  return (
    <>
      <Section
        label="Needs Attention"
        icon={<AlertTriangle size={13} className="text-red-500" />}
        color="bg-red-50 text-red-700"
        clients={needsAttention}
      />
      <Section
        label="On Track"
        icon={<CheckCircle size={13} className="text-emerald-600" />}
        color="bg-emerald-50 text-emerald-700"
        clients={onTrack}
      />
    </>
  )
}

function BriefingCard({ briefing, clients, navigate }) {
  return (
    <div className="mt-4 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* Briefing header */}
      <div className="flex items-center gap-2 px-5 py-3 bg-navy-950 border-b border-navy-800">
        <Bell size={13} className="text-navy-300" />
        <span className="text-sm font-semibold text-white">{briefing.headline}</span>
        <span className="ml-auto text-xs text-navy-400">{briefing.date}</span>
      </div>

      {/* Narrative */}
      <div className="px-5 py-3 bg-navy-50 border-b border-gray-100">
        <p className="text-sm text-navy-900 leading-relaxed">{briefing.overall_narrative}</p>
      </div>

      {/* Needs attention — per-client rows */}
      {briefing.clients && briefing.clients.length > 0 && (
        <div className="divide-y divide-gray-100">
          <div className="px-5 py-2 bg-red-50 flex items-center gap-1.5">
            <AlertTriangle size={11} className="text-red-500" />
            <span className="text-xs font-semibold text-red-600 uppercase tracking-wider">Needs Attention</span>
          </div>
          {briefing.clients.map(c => (
            <div
              key={c.client_id}
              onClick={() => navigate(`/clients/${c.client_id}`)}
              className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
                c.urgency_flags.some(f => f.severity === 'high') ? 'bg-red-500' : 'bg-amber-400'
              }`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{c.name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                    c.segment === 'HNI' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                  }`}>{c.segment}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 leading-snug">{c.summary}</p>
              </div>
              <ChevronRight size={14} className="text-gray-300 flex-shrink-0 mt-1" />
            </div>
          ))}
        </div>
      )}

      {/* On track — green section */}
      {(() => {
        const briefingIds = new Set((briefing.clients || []).map(c => c.client_id))
        const onTrack = clients.filter(c => !briefingIds.has(c.id))
        if (onTrack.length === 0) return null
        return (
          <div className="border-t border-gray-100">
            <div className="px-5 py-2 bg-green-50 flex items-center gap-1.5">
              <CheckCircle size={11} className="text-green-600" />
              <span className="text-xs font-semibold text-green-700 uppercase tracking-wider">
                All Clear — {onTrack.length} client{onTrack.length !== 1 ? 's' : ''} on track
              </span>
            </div>
            <div className="px-5 py-3 flex flex-wrap gap-2">
              {onTrack.map(c => (
                <button
                  key={c.id}
                  onClick={() => navigate(`/clients/${c.id}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full text-xs font-medium text-green-800 hover:bg-green-100 transition-colors"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
