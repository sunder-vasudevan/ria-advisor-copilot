import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getClient } from '../api/client'
import { ArrowLeft, AlertTriangle, Clock, CheckCircle, User, CalendarCheck, Sparkles, Pencil } from 'lucide-react'
import PortfolioChart from '../components/PortfolioChart'
import HoldingsTable from '../components/HoldingsTable'
import GoalsPanel from '../components/GoalsPanel'
import CopilotChat from '../components/CopilotChat'
import SituationSummary from '../components/SituationSummary'
import MeetingPrepPanel from '../components/MeetingPrepPanel'
import InteractionsPanel from '../components/InteractionsPanel'
import { fmt } from '../api/client'

function UrgencyBadge({ flag }) {
  const styles = {
    high:   'bg-red-100 text-red-700',
    medium: 'bg-amber-100 text-amber-700',
    low:    'bg-green-100 text-green-700',
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${styles[flag.severity]}`}>
      {flag.severity === 'high' && <AlertTriangle size={10} />}
      {flag.severity === 'medium' && <Clock size={10} />}
      {flag.label}
    </span>
  )
}

function RiskMeter({ score, category }) {
  const pct = (score / 10) * 100
  const color = score <= 3 ? '#10b981' : score <= 6 ? '#f59e0b' : '#ef4444'
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-500">Risk Score</span>
        <span className="font-semibold text-gray-900">{score}/10 · {category}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

function LifeEventTag({ event }) {
  const icons = {
    job_change: '💼',
    new_child: '👶',
    marriage: '💍',
    divorce: '📋',
    retirement: '🌅',
    inheritance: '🏦',
    illness: '🏥',
  }
  const icon = icons[event.event_type] || '📅'
  const days = Math.floor((Date.now() - new Date(event.event_date)) / 86400000)

  return (
    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
      <span className="text-base flex-shrink-0">{icon}</span>
      <div>
        <div className="text-xs font-semibold text-amber-900">
          {event.event_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
          <span className="text-amber-600 font-normal ml-1">({days}d ago)</span>
        </div>
        {event.notes && <div className="text-xs text-amber-800 mt-0.5 leading-snug">{event.notes}</div>}
      </div>
    </div>
  )
}

export default function Client360() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('portfolio')
  const [showMeetingPrep, setShowMeetingPrep] = useState(false)
  const [copilotMessages, setCopilotMessages] = useState(undefined)

  useEffect(() => {
    setLoading(true)
    getClient(id)
      .then(setClient)
      .catch(() => setError('Failed to load client'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <div className="hidden lg:flex w-64 bg-navy-950 flex-col" />
        <div className="flex-1 p-8 space-y-4">
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
          <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
        </div>
        <div className="hidden lg:flex w-80 bg-white border-l border-gray-100" />
      </div>
    )
  }

  if (error || !client) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">{error || 'Client not found'}</div>
      </div>
    )
  }

  // Tabs shown on desktop (inside center panel); mobile adds Info + Copilot
  const desktopTabs = [
    { key: 'portfolio', label: 'Portfolio & Holdings' },
    { key: 'goals', label: `Goals (${client.goals.length})` },
    { key: 'events', label: `Life Events (${client.life_events.length})` },
    { key: 'interactions', label: 'Interactions' },
  ]
  const mobileTabs = [
    { key: 'portfolio', label: 'Portfolio' },
    { key: 'goals', label: `Goals` },
    { key: 'events', label: 'Life Events' },
    { key: 'interactions', label: 'Interactions' },
    { key: 'info', label: 'Client Info' },
    { key: 'copilot', label: 'AI Copilot' },
  ]

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gray-50">

      {/* ── Mobile top bar (hidden on lg+) ── */}
      <div className="lg:hidden bg-navy-950 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-navy-300 hover:text-white text-sm transition-colors min-h-[44px] flex items-center"
        >
          <ArrowLeft size={14} />
          <span className="text-xs">Back</span>
        </button>
        <div className="text-center">
          <div className="text-white text-sm font-semibold">{client.name}</div>
          <div className="text-navy-400 text-xs">{client.segment} · {fmt.inr(client.portfolio?.total_value)}</div>
        </div>
        <button
          onClick={() => setShowMeetingPrep(true)}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-navy-800 text-white text-xs font-medium rounded-lg hover:bg-navy-700 transition-colors"
        >
          <CalendarCheck size={12} />
          Prep
        </button>
      </div>

      {/* ── Desktop left sidebar (hidden on mobile) ── */}
      <div className="hidden lg:flex w-64 bg-navy-950 flex-col flex-shrink-0">
        <div className="p-6 border-b border-navy-800">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-navy-300 hover:text-white text-sm mb-4 transition-colors"
          >
            <ArrowLeft size={14} />
            Back to Client Book
          </button>
          <div className="text-white font-bold text-lg tracking-tight">ARIA</div>
          <div className="text-navy-300 text-xs mt-0.5">Advisor Relationship Intelligence Assistant</div>
        </div>

        {/* Client profile in sidebar */}
        <div className="p-5 border-b border-navy-800">
          <div className="w-12 h-12 bg-navy-700 rounded-full flex items-center justify-center mb-3">
            <User size={20} className="text-white" />
          </div>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-white font-semibold text-base">{client.name}</div>
              <div className="text-navy-300 text-xs mt-0.5">Age {client.age}</div>
            </div>
            <button
              onClick={() => navigate(`/clients/${client.id}/edit`)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-navy-800 text-navy-200 text-xs rounded-lg hover:bg-navy-700 transition-colors"
            >
              <Pencil size={11} />
              Edit
            </button>
          </div>
          <div className="mt-3 flex gap-2">
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${
              client.segment === 'HNI'
                ? 'bg-amber-400 text-amber-900'
                : 'bg-navy-600 text-navy-100'
            }`}>
              {client.segment}
            </span>
          </div>
        </div>

        {/* Risk */}
        <div className="p-5 border-b border-navy-800">
          <div className="text-navy-400 text-xs font-semibold uppercase tracking-wider mb-3">Risk Profile</div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-navy-300">Score</span>
              <span className="text-white font-medium">{client.risk_score}/10</span>
            </div>
            <div className="h-1.5 bg-navy-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${client.risk_score * 10}%`,
                  backgroundColor: client.risk_score <= 3 ? '#10b981' : client.risk_score <= 6 ? '#f59e0b' : '#ef4444'
                }}
              />
            </div>
            <div className="text-navy-400 text-xs">{client.risk_category}</div>
          </div>
        </div>

        {/* Flags */}
        {client.urgency_flags.length > 0 && (
          <div className="p-5 flex-1 overflow-y-auto">
            <div className="text-navy-400 text-xs font-semibold uppercase tracking-wider mb-3">
              Active Flags ({client.urgency_flags.length})
            </div>
            <div className="space-y-2">
              {client.urgency_flags.map((f, i) => (
                <div key={i} className={`text-xs px-2.5 py-1.5 rounded-lg font-medium flex items-center gap-1.5 ${
                  f.severity === 'high'
                    ? 'bg-red-900/50 text-red-300'
                    : 'bg-amber-900/30 text-amber-300'
                }`}>
                  {f.severity === 'high' ? <AlertTriangle size={10} /> : <Clock size={10} />}
                  {f.label}
                </div>
              ))}
            </div>
          </div>
        )}

        {client.urgency_flags.length === 0 && (
          <div className="p-5">
            <div className="flex items-center gap-2 text-green-400 text-xs">
              <CheckCircle size={14} />
              <span>All clear — no flags</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Center panel ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Desktop topbar (hidden on mobile) */}
        <div className="hidden lg:block bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900">{client.name}</h1>
              <div className="text-sm text-gray-500">
                {client.segment} Client · {client.risk_category} ·{' '}
                <span className="font-semibold text-gray-900">{fmt.inr(client.portfolio?.total_value)}</span>
              </div>
            </div>
            <button
              onClick={() => setShowMeetingPrep(true)}
              className="flex items-center gap-2 px-4 py-2 bg-navy-950 text-white text-sm font-medium rounded-lg hover:bg-navy-800 transition-colors active:scale-[0.96] transition-transform"
            >
              <CalendarCheck size={14} />
              Prep for Meeting
            </button>
          </div>
        </div>

        {/* Situation Summary */}
        <div className="px-4 lg:px-6 pt-4 flex-shrink-0">
          <SituationSummary clientId={id} />
        </div>

        {/* ── Desktop tabs ── */}
        <div className="hidden lg:block px-6 pt-4 flex-shrink-0">
          <div className="flex gap-1 border-b border-gray-200">
            {desktopTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all -mb-px rounded-t-lg active:scale-[0.96] ${
                  activeTab === tab.key
                    ? 'border-navy-950 text-navy-950 bg-navy-50/60'
                    : 'border-transparent text-gray-400 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Mobile tabs (scrollable) ── */}
        <div className="lg:hidden px-4 pt-3 flex-shrink-0">
          <div className="flex gap-0 border-b border-gray-200 overflow-x-auto scrollbar-none">
            {mobileTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-3 text-xs font-semibold border-b-2 transition-colors -mb-px whitespace-nowrap min-h-[44px] flex items-center ${
                  activeTab === tab.key
                    ? 'border-navy-950 text-navy-950'
                    : 'border-transparent text-gray-400'
                }`}
              >
                {tab.label === 'AI Copilot'
                  ? <span className="flex items-center gap-1"><Sparkles size={11} />AI</span>
                  : tab.label
                }
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-5">
          {activeTab === 'portfolio' && (
            <div className="space-y-5">
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <PortfolioChart portfolio={client.portfolio} />
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-bold text-gray-800">Holdings</div>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {client.portfolio?.holdings?.length || 0} funds
                  </span>
                </div>
                <HoldingsTable holdings={client.portfolio?.holdings} />
              </div>
            </div>
          )}

          {activeTab === 'goals' && (
            <GoalsPanel clientId={id} goals={client.goals} />
          )}

          {activeTab === 'events' && (
            <div className="space-y-3">
              {client.life_events.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-center">
                  <div className="text-3xl mb-3">📅</div>
                  <div className="text-sm font-semibold text-gray-600 mb-1">No life events recorded</div>
                  <div className="text-xs text-gray-400">Life events like job changes, marriages, and new children will appear here.</div>
                </div>
              ) : (
                client.life_events.map(e => <LifeEventTag key={e.id} event={e} />)
              )}
            </div>
          )}

          {activeTab === 'interactions' && (
            <InteractionsPanel clientId={id} />
          )}

          {/* Mobile-only: Client Info tab */}
          {activeTab === 'info' && (
            <div className="lg:hidden space-y-4">
              {/* Profile */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-navy-950 rounded-full flex items-center justify-center">
                    <User size={20} className="text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{client.name}</div>
                    <div className="text-sm text-gray-500">Age {client.age}</div>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium mt-1 inline-block ${
                      client.segment === 'HNI' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                    }`}>{client.segment}</span>
                  </div>
                </div>
                <RiskMeter score={client.risk_score} category={client.risk_category} />
              </div>

              {/* Flags */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Active Flags ({client.urgency_flags.length})
                </div>
                {client.urgency_flags.length === 0 ? (
                  <div className="flex items-center gap-2 text-green-600 text-sm">
                    <CheckCircle size={14} /> All clear — no active flags
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {client.urgency_flags.map((f, i) => <UrgencyBadge key={i} flag={f} />)}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mobile-only: AI Copilot tab */}
          {activeTab === 'copilot' && (
            <div className="lg:hidden -mx-4 -my-5 h-[calc(100vh-280px)] min-h-[400px]">
              <CopilotChat clientId={id} clientName={client.name} messages={copilotMessages} onMessagesChange={setCopilotMessages} />
            </div>
          )}
        </div>
      </div>

      {/* ── Desktop right panel — Copilot (hidden on mobile) ── */}
      <div className="hidden lg:flex w-96 bg-white border-l border-gray-200 flex-col flex-shrink-0">
        <CopilotChat clientId={id} clientName={client.name} messages={copilotMessages} onMessagesChange={setCopilotMessages} />
      </div>

      {/* Meeting Prep slide-over */}
      {showMeetingPrep && (
        <MeetingPrepPanel
          clientId={id}
          clientName={client.name}
          onClose={() => setShowMeetingPrep(false)}
        />
      )}
    </div>
  )
}
