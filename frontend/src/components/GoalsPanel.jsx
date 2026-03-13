import { fmt } from '../api/client'
import { Target, AlertCircle } from 'lucide-react'

function ProbabilityBar({ pct }) {
  const color = pct >= 80 ? 'bg-green-500' : pct >= 70 ? 'bg-amber-500' : 'bg-red-500'
  const textColor = pct >= 80 ? 'text-green-700' : pct >= 70 ? 'text-amber-700' : 'text-red-700'
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-500">Probability</span>
        <span className={`font-semibold ${textColor}`}>{pct.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function sipStatus(lastSipDate) {
  if (!lastSipDate) return { label: 'No SIP recorded', color: 'text-gray-400' }
  const days = Math.floor((Date.now() - new Date(lastSipDate)) / 86400000)
  if (days > 35) return { label: `SIP missed — ${days}d ago`, color: 'text-red-600' }
  if (days > 25) return { label: `SIP ${days}d ago`, color: 'text-amber-600' }
  return { label: `SIP ${days}d ago`, color: 'text-green-600' }
}

export default function GoalsPanel({ goals }) {
  if (!goals || goals.length === 0) {
    return <div className="text-sm text-gray-400 py-4 text-center">No goals on record</div>
  }

  return (
    <div className="space-y-4">
      {goals.map(g => {
        const sip = sipStatus(g.last_sip_date)
        const daysToTarget = Math.floor((new Date(g.target_date) - Date.now()) / 86400000)
        const yearsToTarget = (daysToTarget / 365).toFixed(1)
        const urgent = g.probability_pct < 70

        return (
          <div key={g.id} className={`p-4 rounded-xl border ${urgent ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-white'}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                {urgent
                  ? <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                  : <Target size={14} className="text-navy-600 flex-shrink-0 mt-0.5" />
                }
                <div>
                  <div className="font-semibold text-gray-900 text-sm">{g.goal_name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Target: {fmt.inr(g.target_amount)} in {yearsToTarget}y
                    ({new Date(g.target_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })})
                  </div>
                </div>
              </div>
            </div>

            <ProbabilityBar pct={g.probability_pct} />

            <div className="mt-3 flex items-center justify-between text-xs">
              <div className="text-gray-500">
                Monthly SIP: <span className="font-medium text-gray-800">{fmt.inr(g.monthly_sip)}</span>
              </div>
              <div className={`font-medium ${sip.color}`}>{sip.label}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
