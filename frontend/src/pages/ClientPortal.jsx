import ARiALogo from '../components/ARiALogo'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getClient, fmt } from '../api/client'
import { getClientSession, clientLogout } from '../auth'
import PortfolioChart from '../components/PortfolioChart'
import { getPersonalInvoices } from '../api/billing'

const INVOICE_STATUS_PORTAL = {
  pending: 'bg-amber-100 text-amber-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  waived: 'bg-gray-100 text-gray-500',
}
const FEE_LABELS = { aum: 'AUM %', retainer: 'Retainer', per_trade: 'Per-Trade', onboarding: 'Onboarding' }

function BillingSection() {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPersonalInvoices()
      .then(res => setInvoices(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <h2 className="text-base font-bold text-gray-900 mb-4">Billing & Fees</h2>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-sm text-gray-400">Loading…</div>
        ) : invoices.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-400">No invoices on record.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {invoices.map(inv => (
              <div key={inv.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <div className="text-sm font-medium text-gray-900">{inv.description}</div>
                  <div className="text-xs text-gray-400">{FEE_LABELS[inv.fee_type] || inv.fee_type} · {inv.period_start} → {inv.period_end}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-900">{fmt.inr(inv.amount)}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${INVOICE_STATUS_PORTAL[inv.status] || INVOICE_STATUS_PORTAL.pending}`}>
                    {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function GoalCard({ goal }) {
  const today = new Date()
  const target = new Date(goal.target_date)
  const yearsLeft = ((target - today) / (1000 * 60 * 60 * 24 * 365)).toFixed(1)
  const pct = goal.probability_pct
  const color = pct >= 80 ? '#10b981' : pct >= 70 ? '#f59e0b' : '#ef4444'
  const label = pct >= 80 ? 'On track' : pct >= 70 ? 'Needs attention' : 'At risk'

  const days = goal.last_sip_date
    ? Math.floor((Date.now() - new Date(goal.last_sip_date)) / 86400000)
    : null

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="font-semibold text-gray-900">{goal.goal_name}</div>
          <div className="text-xs text-gray-500 mt-0.5">
            Target: {fmt.inr(goal.target_amount)} · {yearsLeft > 0 ? `${yearsLeft} years` : 'Past due'}
          </div>
        </div>
        <span
          className="text-xs font-medium px-2 py-1 rounded-full"
          style={{ backgroundColor: `${color}20`, color }}
        >
          {label}
        </span>
      </div>

      {/* Probability bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-500">Goal probability</span>
          <span className="font-semibold" style={{ color }}>{pct.toFixed(0)}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
        </div>
      </div>

      <div className="text-xs text-gray-500">
        Monthly SIP: <span className="font-medium text-gray-700">{fmt.inr(goal.monthly_sip)}</span>
        {days !== null && (
          <span className={`ml-3 ${days > 35 ? 'text-red-600' : days > 25 ? 'text-amber-600' : 'text-green-600'}`}>
            Last SIP: {days}d ago
          </span>
        )}
      </div>
    </div>
  )
}

export default function ClientPortal() {
  const navigate = useNavigate()
  const session = getClientSession()
  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!session) return
    getClient(session.clientId)
      .then(setClient)
      .catch(() => setError('Failed to load your portfolio'))
      .finally(() => setLoading(false))
  }, [])

  const handleLogout = () => {
    clientLogout()
    navigate('/client-portal/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="text-white animate-pulse">Loading your portfolio…</div>
      </div>
    )
  }

  if (error || !client) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">{error || 'Something went wrong'}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-navy-950 px-4 sm:px-6 py-3 sm:py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <ARiALogo className="text-white font-bold text-lg tracking-tight" />
            <div className="text-navy-300 text-xs">Client Portal</div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-white text-sm font-medium">Welcome, {client.name.split(' ')[0]}</div>
              <div className="text-navy-300 text-xs">{fmt.inr(client.portfolio?.total_value)} portfolio</div>
            </div>
            <button
              onClick={handleLogout}
              className="text-navy-300 text-xs hover:text-white transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">

        {/* Portfolio Overview */}
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-4">Portfolio Overview</h2>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <PortfolioChart portfolio={client.portfolio} />
          </div>
        </div>

        {/* Goals */}
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-4">
            Your Goals ({client.goals.length})
          </h2>
          <div className="space-y-4">
            {client.goals.length === 0 ? (
              <div className="text-sm text-gray-400 text-center py-8">No goals recorded</div>
            ) : (
              client.goals.map(g => <GoalCard key={g.id} goal={g} />)
            )}
          </div>
        </div>

        {/* Billing */}
        <BillingSection />

        {/* Your Advisor */}
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-4">Your Advisor</h2>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="font-semibold text-gray-900">Rahul Agarwal, RM</div>
            <div className="text-sm text-gray-500 mt-0.5">Mumbai Branch</div>
            <div className="text-xs text-gray-400 mt-3">
              For questions or changes to your portfolio, please contact your branch.
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
