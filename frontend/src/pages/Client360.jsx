import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getClient } from '../api/client'
import { ArrowLeft, AlertTriangle, Clock, CheckCircle, User, Shield, TrendingUp } from 'lucide-react'
import PortfolioChart from '../components/PortfolioChart'
import HoldingsTable from '../components/HoldingsTable'
import GoalsPanel from '../components/GoalsPanel'
import CopilotChat from '../components/CopilotChat'
import SituationSummary from '../components/SituationSummary'
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

  useEffect(() => {
    setLoading(true)
    getClient(id)
      .then(setClient)
      .catch(() => setError('Failed to load client'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="text-white animate-pulse">Loading client data…</div>
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

  const highFlags = client.urgency_flags.filter(f => f.severity === 'high')
  const otherFlags = client.urgency_flags.filter(f => f.severity !== 'high')

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-navy-950 flex flex-col flex-shrink-0">
        <div className="p-6 border-b border-navy-800">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-navy-300 hover:text-white text-sm mb-4 transition-colors"
          >
            <ArrowLeft size={14} />
            Back to Client Book
          </button>
          <div className="text-white font-bold text-lg tracking-tight">RIA Advisor</div>
          <div className="text-navy-300 text-xs mt-0.5">Copilot Workbench</div>
        </div>

        {/* Client profile in sidebar */}
        <div className="p-5 border-b border-navy-800">
          <div className="w-12 h-12 bg-navy-700 rounded-full flex items-center justify-center mb-3">
            <User size={20} className="text-white" />
          </div>
          <div className="text-white font-semibold text-base">{client.name}</div>
          <div className="text-navy-300 text-xs mt-0.5">Age {client.age}</div>
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

      {/* Center panel */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Topbar */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900">{client.name}</h1>
              <div className="text-sm text-gray-500">
                {client.segment} Client · {client.risk_category} ·{' '}
                <span className="font-semibold text-gray-900">{fmt.inr(client.portfolio?.total_value)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Situation Summary */}
        <div className="px-6 pt-4 flex-shrink-0">
          <SituationSummary clientId={id} />
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 flex-shrink-0">
          <div className="flex gap-0 border-b border-gray-200">
            {[
              { key: 'portfolio', label: 'Portfolio & Holdings' },
              { key: 'goals', label: `Goals (${client.goals.length})` },
              { key: 'events', label: `Life Events (${client.life_events.length})` },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  activeTab === tab.key
                    ? 'border-navy-950 text-navy-950'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {activeTab === 'portfolio' && (
            <div className="space-y-6">
              {/* Chart */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <PortfolioChart portfolio={client.portfolio} />
              </div>

              {/* Holdings */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="text-sm font-semibold text-gray-700 mb-4">
                  Holdings ({client.portfolio?.holdings?.length || 0} funds)
                </div>
                <HoldingsTable holdings={client.portfolio?.holdings} />
              </div>
            </div>
          )}

          {activeTab === 'goals' && (
            <GoalsPanel goals={client.goals} />
          )}

          {activeTab === 'events' && (
            <div className="space-y-3">
              {client.life_events.length === 0 ? (
                <div className="text-sm text-gray-400 py-8 text-center">No life events recorded</div>
              ) : (
                client.life_events.map(e => <LifeEventTag key={e.id} event={e} />)
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right panel — Copilot */}
      <div className="w-96 bg-white border-l border-gray-200 flex flex-col flex-shrink-0">
        <CopilotChat clientId={id} clientName={client.name} />
      </div>
    </div>
  )
}
