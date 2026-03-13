import { useEffect, useState } from 'react'
import { getSituation } from '../api/client'
import { Sparkles, AlertTriangle, CheckCircle, Clock } from 'lucide-react'

export default function SituationSummary({ clientId }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getSituation(clientId)
      .then(setData)
      .catch(() => setError('Situation summary unavailable'))
      .finally(() => setLoading(false))
  }, [clientId])

  const urgencyConfig = {
    high:   { bg: 'bg-red-50 border-red-200',    icon: <AlertTriangle size={14} className="text-red-500" />, label: 'High Urgency' },
    medium: { bg: 'bg-amber-50 border-amber-200', icon: <Clock size={14} className="text-amber-500" />,         label: 'Needs Attention' },
    low:    { bg: 'bg-green-50 border-green-200', icon: <CheckCircle size={14} className="text-green-500" />,   label: 'On Track' },
  }

  if (loading) {
    return (
      <div className="p-4 rounded-xl border border-gray-100 bg-gray-50 animate-pulse">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={14} className="text-navy-400" />
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">AI Situation Summary</span>
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 rounded w-full" />
          <div className="h-3 bg-gray-200 rounded w-4/5" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 rounded-xl border border-gray-100 bg-gray-50">
        <div className="text-xs text-gray-400">{error}</div>
      </div>
    )
  }

  const cfg = urgencyConfig[data?.urgency_level] || urgencyConfig.low

  return (
    <div className={`p-4 rounded-xl border ${cfg.bg}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-navy-600" />
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">AI Situation Summary</span>
        </div>
        <div className="flex items-center gap-1">
          {cfg.icon}
          <span className="text-xs font-medium text-gray-600">{cfg.label}</span>
        </div>
      </div>
      <p className="text-sm text-gray-800 leading-relaxed">{data?.summary}</p>
    </div>
  )
}
