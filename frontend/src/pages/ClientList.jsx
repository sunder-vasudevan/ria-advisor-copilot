import ARiALogo from '../components/ARiALogo'
import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, TrendingUp, ChevronRight, ChevronDown, RefreshCw, Bell, CheckCircle, UserPlus, LayoutList, Layers, HelpCircle, LogOut, Wifi } from 'lucide-react'
import { getClients, getBriefing, getClient, fmt } from '../api/client'
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

function ProbabilityPill({ urgencyScore }) {
  if (urgencyScore === 0) return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-700">On Track</span>
  )
  if (urgencyScore <= 2) return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Review</span>
  )
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-700">Urgent</span>
  )
}

function Avatar({ name }) {
  const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div className="w-9 h-9 rounded-full bg-blue-100 text-[#1D6FDB] flex items-center justify-center text-sm font-bold flex-shrink-0">
      {initials}
    </div>
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
  const [viewMode, setViewMode] = useState('grouped')
  const [briefingCollapsed, setBriefingCollapsed] = useState(false)
  const [showBriefing, setShowBriefing] = useState(false)
  const prefetchCache = useRef({})
  const session = getAdvisorSession()

  const handlePrefetch = (id) => {
    if (!prefetchCache.current[id]) {
      prefetchCache.current[id] = getClient(id).then(data => {
        window.__ariaClientCache = window.__ariaClientCache || {}
        window.__ariaClientCache[id] = data
        return data
      })
    }
  }

  useEffect(() => {
    getClients()
      .then(setClients)
      .catch(() => setError('Failed to load clients'))
      .finally(() => setLoading(false))
  }, [])

  const loadBriefing = () => {
    setBriefingLoading(true)
    setShowBriefing(true)
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
  const totalAUM = clients.reduce((sum, c) => sum + (c.total_value || 0), 0)

  const todayDate = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 md:px-8 py-3 h-14" />
        <div className="flex-1 p-4 md:p-8 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 h-32 bg-gray-200 rounded-2xl animate-pulse" />
            <div className="h-32 bg-gray-200 rounded-2xl animate-pulse" />
          </div>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">

      {/* ── Frosted top bar ── */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 md:px-8 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-shrink-0">
          <ARiALogo className="text-[#1D6FDB] font-bold text-base tracking-tight" />
          <span className="hidden md:block text-xs text-gray-400">Advisor Workbench</span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-[#1D6FDB] text-sm font-medium">
            <TrendingUp size={14} /> Clients
          </button>
          <button
            onClick={() => navigate('/help')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-gray-500 hover:bg-gray-100 text-sm font-medium transition-colors"
          >
            <HelpCircle size={14} /> Help
          </button>
        </nav>

        {/* Right controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={loadBriefing}
            disabled={briefingLoading}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-60 transition-colors"
          >
            {briefingLoading ? <RefreshCw size={13} className="animate-spin" /> : <Bell size={13} />}
            <span className="hidden lg:inline">{briefingLoading ? 'Loading…' : 'Briefing'}</span>
          </button>
          <button
            onClick={() => navigate('/clients/new')}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#1D6FDB] text-white text-sm font-semibold rounded-lg hover:bg-blue-700 shadow-sm transition-colors"
          >
            <UserPlus size={14} />
            <span className="hidden sm:inline">Add Client</span>
          </button>
          <div className="hidden md:flex items-center gap-2 pl-2 border-l border-gray-200">
            <div className="w-7 h-7 rounded-full bg-blue-100 text-[#1D6FDB] flex items-center justify-center text-xs font-bold">
              {(session?.displayName || 'R')[0]}
            </div>
            {session?.role === 'superadmin' && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-amber-400 text-amber-900 font-semibold leading-none">SUPER</span>
            )}
            <button
              onClick={() => { advisorLogout(); navigate('/login') }}
              className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors"
              title="Sign out"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main content ── */}
      <div className="flex-1 p-4 md:p-8 pb-24 md:pb-8">

        {/* ── Greeting bento ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Gradient hero card */}
          <div className="md:col-span-2 bg-gradient-to-br from-[#1D6FDB] to-blue-700 rounded-2xl p-6 text-white">
            <div className="text-2xl font-bold">
              Good morning, {session?.displayName || 'Rahul'}.
            </div>
            <div className="text-blue-100 text-sm mt-0.5">{todayDate}</div>
            {attentionCount > 0 && (
              <div className="mt-3 inline-flex items-center gap-2 bg-white/20 rounded-lg px-3 py-1.5">
                <AlertTriangle size={13} />
                <span className="text-sm font-medium">
                  {attentionCount} client{attentionCount !== 1 ? 's' : ''} need attention
                </span>
              </div>
            )}
            {attentionCount === 0 && clients.length > 0 && (
              <div className="mt-3 inline-flex items-center gap-2 bg-white/20 rounded-lg px-3 py-1.5">
                <CheckCircle size={13} />
                <span className="text-sm font-medium">All clients on track</span>
              </div>
            )}
          </div>

          {/* AUM summary card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col justify-between">
            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wider font-medium">Total AUM</div>
              <div className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">{fmt.inr(totalAUM)}</div>
            </div>
            <div className="flex items-center justify-between mt-4">
              <div>
                <div className="text-xs text-gray-400">Clients</div>
                <div className="text-lg font-bold text-gray-900">{clients.length}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Needs Attention</div>
                <div className={`text-lg font-bold ${attentionCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {attentionCount}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Morning Briefing bento slot ── */}
        {showBriefing && (
          <div className="mb-6">
            {briefingLoading ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center gap-3">
                <RefreshCw size={16} className="animate-spin text-[#1D6FDB]" />
                <span className="text-sm text-gray-500">Generating your morning briefing…</span>
              </div>
            ) : briefing ? (
              <BriefingCard
                briefing={briefing}
                clients={clients}
                navigate={navigate}
                collapsed={briefingCollapsed}
                setCollapsed={setBriefingCollapsed}
              />
            ) : null}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        {/* ── Search + View toggle ── */}
        <div className="mb-4 flex items-center gap-3">
          <input
            type="text"
            placeholder="Search clients…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 max-w-sm px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white"
          />
          <div className="flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grouped')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
                viewMode === 'grouped' ? 'bg-[#1D6FDB] text-white' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <Layers size={13} /> Grouped
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
                viewMode === 'list' ? 'bg-[#1D6FDB] text-white' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <LayoutList size={13} /> List
            </button>
          </div>
        </div>

        {filtered.length === 0 && search && (
          <div className="text-center py-16 text-gray-400">
            <div className="mx-auto mb-3 w-8 h-8 opacity-40 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 15.803a7.5 7.5 0 0 0 10.607 0Z" />
              </svg>
            </div>
            <p className="text-sm">No clients match "{search}"</p>
            <button onClick={() => setSearch('')} className="mt-2 text-xs text-[#1D6FDB] hover:underline">Clear search</button>
          </div>
        )}

        {viewMode === 'list' ? (
          <>
            <div className="md:hidden space-y-3">
              {filtered.map(client => (
                <ClientCard key={client.id} client={client} navigate={navigate} onMouseEnter={() => handlePrefetch(client.id)} />
              ))}
              {filtered.length === 0 && (
                <div className="text-center py-12 text-gray-400 text-sm">No clients found</div>
              )}
            </div>
            <div className="hidden md:block bg-white rounded-xl shadow-card border border-gray-100 overflow-hidden">
              <ClientTable clients={filtered} navigate={navigate} onPrefetch={handlePrefetch} />
            </div>
          </>
        ) : (
          <GroupedView clients={filtered} navigate={navigate} onPrefetch={handlePrefetch} />
        )}

        <div className="mt-3 text-xs text-gray-400 text-right">
          {filtered.length} of {clients.length} clients
        </div>
      </div>

      {/* ── Mobile FAB ── */}
      <button
        onClick={() => navigate('/clients/new')}
        className="md:hidden fixed bottom-20 right-4 z-50 w-14 h-14 bg-[#1D6FDB] text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 active:scale-95 transition-all"
        aria-label="Add client"
      >
        <UserPlus size={22} />
      </button>

      {/* ── Mobile bottom nav ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-200 flex z-40">
        <button
          className="flex-1 flex flex-col items-center py-2 text-[#1D6FDB] text-xs font-medium"
        >
          <TrendingUp size={20} className="mb-0.5" />
          Clients
        </button>
        <button
          onClick={() => navigate('/clients/new')}
          className="flex-1 flex flex-col items-center py-2 text-gray-400 text-xs font-medium"
        >
          <UserPlus size={20} className="mb-0.5" />
          New
        </button>
        <button
          onClick={loadBriefing}
          className="flex-1 flex flex-col items-center py-2 text-gray-400 text-xs font-medium"
        >
          <Bell size={20} className="mb-0.5" />
          Briefing
        </button>
        <button
          onClick={() => navigate('/help')}
          className="flex-1 flex flex-col items-center py-2 text-gray-400 text-xs font-medium"
        >
          <HelpCircle size={20} className="mb-0.5" />
          Help
        </button>
      </nav>
    </div>
  )
}

function ClientCard({ client, navigate, onMouseEnter }) {
  return (
    <div
      onClick={() => navigate(`/clients/${client.id}`)}
      onMouseEnter={onMouseEnter}
      className="bg-white rounded-xl border border-gray-100 p-4 cursor-pointer shadow-card hover:shadow-card-hover active:bg-gray-50 active:scale-[0.98] transition-all"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Avatar name={client.name} />
          <div className="min-w-0">
            <div className="font-medium text-gray-900 truncate">{client.name}</div>
            <div className="text-xs text-gray-500 mt-0.5">Age {client.age} · {client.risk_category}</div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 ml-3 flex-shrink-0">
          <SegmentBadge segment={client.segment} />
          <div className="font-semibold text-sm text-gray-900">{fmt.inr(client.total_value)}</div>
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1">
        <ProbabilityPill urgencyScore={client.urgency_score} />
        {client.urgency_flags.slice(0, 1).map((f, i) => <UrgencyBadge key={i} flag={f} />)}
        {client.urgency_flags.length > 1 && (
          <span className="text-xs text-gray-500 self-center">+{client.urgency_flags.length - 1} more</span>
        )}
      </div>
    </div>
  )
}

function ClientTable({ clients, navigate, onPrefetch }) {
  if (clients.length === 0) {
    return <div className="text-center py-12 text-gray-400 text-sm">No clients found</div>
  }
  return (
    <table className="w-full">
      <thead>
        <tr className="bg-gray-50 border-b border-gray-100">
          <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
          <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Segment</th>
          <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Portfolio Value</th>
          <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
          <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Flags</th>
          <th className="px-6 py-3"></th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {clients.map(client => (
          <tr
            key={client.id}
            onClick={() => navigate(`/clients/${client.id}`)}
            onMouseEnter={() => onPrefetch && onPrefetch(client.id)}
            className="hover:bg-gray-50 cursor-pointer transition-colors"
          >
            <td className="px-6 py-4">
              <div className="flex items-center gap-3">
                <Avatar name={client.name} />
                <div>
                  <div className="font-medium text-gray-900">{client.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Age {client.age} · {client.risk_category}</div>
                </div>
              </div>
            </td>
            <td className="px-6 py-4"><SegmentBadge segment={client.segment} /></td>
            <td className="px-6 py-4 text-right">
              <div className="font-semibold text-gray-900">{fmt.inr(client.total_value)}</div>
            </td>
            <td className="px-6 py-4">
              <ProbabilityPill urgencyScore={client.urgency_score} />
            </td>
            <td className="px-6 py-4">
              <div className="flex flex-wrap gap-1">
                {client.urgency_flags.length === 0 ? (
                  <span className="text-xs text-gray-400">—</span>
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

function GroupedView({ clients, navigate, onPrefetch }) {
  const needsAttention = clients.filter(c => c.urgency_score > 0)
  const onTrack = clients.filter(c => c.urgency_score === 0)

  const Section = ({ label, icon, color, clients: group, defaultOpen = true }) => {
    const [open, setOpen] = useState(defaultOpen)
    if (group.length === 0) return null
    return (
      <div className="mb-4">
        <button
          onClick={() => setOpen(o => !o)}
          className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg transition-colors ${color} hover:opacity-90`}
        >
          {icon}
          <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
          <span className="text-xs font-bold bg-white/40 px-1.5 py-0.5 rounded-full ml-1">{group.length}</span>
          <ChevronRight size={13} className={`ml-auto transition-transform ${open ? 'rotate-90' : ''}`} />
        </button>
        {open && (
          <div className="mt-2">
            <div className="md:hidden space-y-2">
              {group.map(c => <ClientCard key={c.id} client={c} navigate={navigate} onMouseEnter={() => onPrefetch && onPrefetch(c.id)} />)}
            </div>
            <div className="hidden md:block bg-white rounded-xl shadow-card border border-gray-100 overflow-hidden">
              <ClientTable clients={group} navigate={navigate} onPrefetch={onPrefetch} />
            </div>
          </div>
        )}
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
        defaultOpen={true}
      />
      <Section
        label="On Track"
        icon={<CheckCircle size={13} className="text-emerald-600" />}
        color="bg-emerald-50 text-emerald-700"
        clients={onTrack}
        defaultOpen={false}
      />
    </>
  )
}

function BriefingCard({ briefing, clients, navigate, collapsed, setCollapsed }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-[#1D6FDB] to-blue-700 border-b border-blue-600">
        <Bell size={13} className="text-blue-100" />
        <span className="text-sm font-semibold text-white">{briefing.headline}</span>
        <span className="ml-auto text-xs text-blue-200">{briefing.date}</span>
        <button onClick={() => setCollapsed(c => !c)} className="p-1 hover:bg-white/20 rounded transition-colors ml-2">
          <ChevronDown size={16} className={`text-white transition-transform duration-200 ${collapsed ? '-rotate-90' : ''}`} />
        </button>
      </div>

      {!collapsed && (
        <>
          <div className="px-5 py-3 bg-blue-50 border-b border-blue-100">
            <p className="text-sm text-blue-900 leading-relaxed">{briefing.overall_narrative}</p>
          </div>

          {briefing.clients && briefing.clients.length > 0 && (
            <div className="divide-y divide-gray-50">
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
        </>
      )}
    </div>
  )
}
