import { useState } from 'react'
import { fmt } from '../api/client'
import { X } from 'lucide-react'

const CATEGORY_COLORS = {
  'Large Cap':     'bg-blue-50 text-blue-700 border-blue-100',
  'Flexi Cap':     'bg-violet-50 text-violet-700 border-violet-100',
  'Small Cap':     'bg-rose-50 text-rose-700 border-rose-100',
  'Mid Cap':       'bg-orange-50 text-orange-700 border-orange-100',
  'Corporate Bond':'bg-teal-50 text-teal-700 border-teal-100',
  'Liquid':        'bg-gray-100 text-gray-600 border-gray-200',
  'ELSS':          'bg-emerald-50 text-emerald-700 border-emerald-100',
}

function AllocationBar({ current, target }) {
  const drift = current - target
  const absDrift = Math.abs(drift)
  const isDrifted = absDrift > 2
  const barColor = isDrifted ? (drift > 0 ? 'bg-red-400' : 'bg-green-400') : 'bg-navy-400'

  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(current, 100)}%` }} />
      </div>
      <span className={`text-xs font-semibold tabular-nums w-8 text-right ${
        isDrifted ? (drift > 0 ? 'text-red-600' : 'text-green-600') : 'text-gray-700'
      }`}>
        {current.toFixed(1)}%
      </span>
    </div>
  )
}

function HoldingDrawer({ holding, totalValue, onClose }) {
  const drift = holding.current_pct - holding.target_pct
  const absDrift = Math.abs(drift)
  const isDrifted = absDrift > 2
  const catColor = CATEGORY_COLORS[holding.fund_category] || 'bg-gray-100 text-gray-600 border-gray-200'
  const portfolioPct = totalValue > 0 ? ((holding.current_value / totalValue) * 100).toFixed(1) : 0

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer: bottom sheet on mobile, centered modal on desktop */}
      <div className="fixed inset-x-0 bottom-0 z-50 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-4">
        <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-modal max-h-[85vh] overflow-y-auto">

          {/* Header */}
          <div className="flex items-start justify-between p-5 border-b border-gray-100">
            <div className="flex-1 min-w-0 pr-3">
              <div className="text-base font-bold text-gray-900 leading-tight">{holding.fund_name}</div>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-xs text-gray-500">{holding.fund_house}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full border font-medium ${catColor}`}>
                  {holding.fund_category}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              aria-label="Close holding detail"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">

            {/* Current value — hero */}
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{fmt.inr(holding.current_value)}</div>
              <div className="text-xs text-gray-500 mt-1">Current Value</div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="text-xs text-gray-500 mb-1">% of Portfolio</div>
                <div className="text-base font-bold text-gray-900">{portfolioPct}%</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="text-xs text-gray-500 mb-1">Target %</div>
                <div className="text-base font-bold text-gray-900">{holding.target_pct}%</div>
              </div>
              <div className={`rounded-xl p-3 ${isDrifted ? (drift > 0 ? 'bg-red-50' : 'bg-green-50') : 'bg-emerald-50'}`}>
                <div className="text-xs text-gray-500 mb-1">Drift</div>
                <div className={`text-base font-bold ${isDrifted ? (drift > 0 ? 'text-red-600' : 'text-green-600') : 'text-emerald-600'}`}>
                  {isDrifted
                    ? `${drift > 0 ? '+' : ''}${drift.toFixed(1)}%`
                    : 'On target'
                  }
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="text-xs text-gray-500 mb-1">Current %</div>
                <div className="text-base font-bold text-gray-900">{holding.current_pct.toFixed(1)}%</div>
              </div>
            </div>

            {/* NAV detail */}
            {holding.nav_per_unit != null && holding.units_held != null && (
              <div className="border border-gray-100 rounded-xl p-4">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">NAV Detail</div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">NAV per unit</span>
                  <span className="text-sm font-bold text-gray-900">₹{holding.nav_per_unit.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-600">Units held</span>
                  <span className="text-sm font-bold text-gray-900">{holding.units_held.toFixed(3)}</span>
                </div>
                <div className="bg-navy-50 rounded-lg px-3 py-2 text-xs text-navy-700 font-medium text-center">
                  ₹{holding.nav_per_unit.toFixed(2)} / unit · {holding.units_held.toFixed(3)} units
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default function HoldingsTable({ holdings }) {
  const [selectedHolding, setSelectedHolding] = useState(null)

  if (!holdings || holdings.length === 0) {
    return <div className="text-sm text-gray-400 py-6 text-center">No holdings data</div>
  }

  const totalValue = holdings.reduce((sum, h) => sum + h.current_value, 0)

  return (
    <>
      <div className="space-y-2">
        {holdings.map(h => {
          const drift = h.current_pct - h.target_pct
          const absDrift = Math.abs(drift)
          const isDrifted = absDrift > 2
          const catColor = CATEGORY_COLORS[h.fund_category] || 'bg-gray-100 text-gray-600 border-gray-200'

          return (
            <div
              key={h.id}
              onClick={() => setSelectedHolding(h)}
              className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all cursor-pointer active:scale-[0.98]"
            >
              {/* Fund info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-gray-900 leading-tight truncate">{h.fund_name}</span>
                  {isDrifted && (
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                      drift > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                    }`}>
                      {drift > 0 ? `+${drift.toFixed(1)}%` : `${drift.toFixed(1)}%`} drift
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-400">{h.fund_house}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full border font-medium ${catColor}`}>
                    {h.fund_category}
                  </span>
                </div>
              </div>

              {/* Value */}
              <div className="text-right flex-shrink-0">
                <div className="text-xs font-bold text-gray-900">{fmt.inr(h.current_value)}</div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {totalValue > 0 ? ((h.current_value / totalValue) * 100).toFixed(1) : 0}% of portfolio
                </div>
              </div>

              {/* Allocation bar — hidden on very small screens */}
              <div className="hidden sm:block w-28 flex-shrink-0">
                <AllocationBar current={h.current_pct} target={h.target_pct} />
                <div className="text-xs text-gray-400 mt-0.5 text-right">target {h.target_pct}%</div>
              </div>
            </div>
          )
        })}
      </div>

      {selectedHolding && (
        <HoldingDrawer
          holding={selectedHolding}
          totalValue={totalValue}
          onClose={() => setSelectedHolding(null)}
        />
      )}
    </>
  )
}
