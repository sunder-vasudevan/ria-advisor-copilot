import { useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { fmt } from '../api/client'
import { X } from 'lucide-react'

const COLORS = {
  equity: '#1e4fff',
  debt:   '#f59e0b',
  cash:   '#10b981',
}

const CATEGORY_COLORS = {
  'Large Cap':     'bg-blue-50 text-blue-700 border-blue-100',
  'Flexi Cap':     'bg-violet-50 text-violet-700 border-violet-100',
  'Small Cap':     'bg-rose-50 text-rose-700 border-rose-100',
  'Mid Cap':       'bg-orange-50 text-orange-700 border-orange-100',
  'Corporate Bond':'bg-teal-50 text-teal-700 border-teal-100',
  'Liquid':        'bg-gray-100 text-gray-600 border-gray-200',
  'ELSS':          'bg-emerald-50 text-emerald-700 border-emerald-100',
}

const RADIAN = Math.PI / 180
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.06) return null
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
      fontSize={12} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

function ExpandedModal({ portfolio, clientName, onClose }) {
  const holdings = [...(portfolio.holdings || [])].sort((a, b) => b.current_value - a.current_value)
  const totalValue = holdings.reduce((sum, h) => sum + h.current_value, 0)

  const data = [
    { name: 'Equity', value: portfolio.equity_pct, color: COLORS.equity },
    { name: 'Debt',   value: portfolio.debt_pct,   color: COLORS.debt },
    { name: 'Cash',   value: portfolio.cash_pct,   color: COLORS.cash },
  ]

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-modal"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-base font-bold text-gray-900">Portfolio Breakdown</div>
            {clientName && <div className="text-xs text-gray-500 mt-0.5">{clientName}</div>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close portfolio breakdown"
          >
            <X size={16} />
          </button>
        </div>

        {/* Large donut chart */}
        <div className="flex justify-center mb-4">
          <PieChart width={280} height={280}>
            <Pie
              data={data.map(d => ({ name: d.name, value: d.value }))}
              cx={140}
              cy={140}
              innerRadius={80}
              outerRadius={130}
              dataKey="value"
              labelLine={false}
              label={renderCustomLabel}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} stroke="white" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => `${v.toFixed(1)}%`} />
          </PieChart>
        </div>

        {/* Legend row */}
        <div className="flex justify-center gap-6 mb-5">
          {data.map(item => (
            <div key={item.name} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-xs text-gray-600">{item.name} {item.value.toFixed(1)}%</span>
            </div>
          ))}
        </div>

        {/* Holdings table */}
        <div className="border border-gray-100 rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-4 py-2.5 grid grid-cols-12 gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <div className="col-span-4">Fund</div>
            <div className="col-span-2 text-right">Value</div>
            <div className="col-span-1 text-right">%</div>
            <div className="col-span-1 text-right">Target</div>
            <div className="col-span-2 text-right">Drift</div>
            <div className="col-span-2 text-right">NAV</div>
          </div>
          {holdings.map(h => {
            const drift = h.current_pct - h.target_pct
            const isDrifted = Math.abs(drift) > 2
            const catColor = CATEGORY_COLORS[h.fund_category] || 'bg-gray-100 text-gray-600 border-gray-200'
            const pctOfPortfolio = totalValue > 0 ? ((h.current_value / totalValue) * 100).toFixed(1) : 0

            return (
              <div key={h.id} className="px-4 py-3 border-t border-gray-100 grid grid-cols-12 gap-2 items-center hover:bg-gray-50 transition-colors">
                <div className="col-span-4 min-w-0">
                  <div className="text-xs font-semibold text-gray-900 truncate leading-tight">{h.fund_name}</div>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full border font-medium mt-0.5 inline-block ${catColor}`}>
                    {h.fund_category}
                  </span>
                </div>
                <div className="col-span-2 text-xs font-bold text-gray-900 text-right">{fmt.inr(h.current_value)}</div>
                <div className="col-span-1 text-xs text-gray-600 text-right">{pctOfPortfolio}%</div>
                <div className="col-span-1 text-xs text-gray-500 text-right">{h.target_pct}%</div>
                <div className={`col-span-2 text-xs font-semibold text-right ${
                  isDrifted ? (drift > 0 ? 'text-red-600' : 'text-green-600') : 'text-emerald-600'
                }`}>
                  {isDrifted ? `${drift > 0 ? '+' : ''}${drift.toFixed(1)}%` : '✓'}
                </div>
                <div className="col-span-2 text-xs text-gray-500 text-right">
                  {h.nav_per_unit != null ? `₹${h.nav_per_unit.toFixed(2)}` : '—'}
                  {h.units_held != null && (
                    <div className="text-gray-400">{h.units_held.toFixed(1)} u</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-3 text-center text-xs text-gray-400">Double-click the chart to close</div>
      </div>
    </div>
  )
}

export default function PortfolioChart({ portfolio, clientName }) {
  const [expanded, setExpanded] = useState(false)

  if (!portfolio) return null

  const holdings = portfolio.holdings
  const hasData = holdings && holdings.length > 0 && holdings.some(h => h.current_value > 0)

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <svg className="w-10 h-10 mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
        </svg>
        <p className="text-sm font-medium text-gray-500">No portfolio data</p>
        <p className="text-xs text-gray-400 mt-1">Add holdings to see allocation</p>
      </div>
    )
  }

  const data = [
    { name: 'Equity', value: portfolio.equity_pct, target: portfolio.target_equity_pct, color: COLORS.equity },
    { name: 'Debt',   value: portfolio.debt_pct,   target: portfolio.target_debt_pct,   color: COLORS.debt },
    { name: 'Cash',   value: portfolio.cash_pct,   target: portfolio.target_cash_pct,   color: COLORS.cash },
  ]

  const pieData = data.map(d => ({ name: d.name, value: d.value }))

  const driftRow = (item) => {
    const drift = item.value - item.target
    const abs = Math.abs(drift).toFixed(1)
    const tooltip = drift > 2
      ? `Overweight by ${abs}% — consider rebalancing`
      : drift < -2
        ? `Underweight by ${abs}% — consider adding`
        : 'Within target range'
    if (drift > 2) return <span title={tooltip} className="text-red-600 text-xs font-medium cursor-help">+{abs}% ↑</span>
    if (drift < -2) return <span title={tooltip} className="text-green-600 text-xs font-medium cursor-help">-{abs}% ↓</span>
    return <span title={tooltip} className="text-green-600 text-xs cursor-help">On target</span>
  }

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="text-sm font-semibold text-gray-700">Asset Allocation</div>
          <div className="flex items-center gap-2">
            <div className="text-sm font-bold text-gray-900">{fmt.inr(portfolio.total_value)}</div>
            <span className="text-xs text-gray-400 hidden sm:inline">(double-click to expand)</span>
          </div>
        </div>

        <div onDoubleClick={() => setExpanded(true)} className="cursor-pointer" title="Double-click to expand">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                dataKey="value"
                labelLine={false}
                label={renderCustomLabel}
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} stroke="white" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => `${v.toFixed(1)}%`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Drift table */}
        <div className="mt-2 space-y-1.5">
          {data.map(item => (
            <div key={item.name} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: item.color }} />
                <span className="text-gray-700">{item.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-gray-500 text-xs">Target {item.target}%</span>
                <span className="font-medium text-gray-900 w-10 text-right">{item.value.toFixed(1)}%</span>
                <span className="w-20 text-right">{driftRow(item)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {expanded && (
        <ExpandedModal
          portfolio={portfolio}
          clientName={clientName}
          onClose={() => setExpanded(false)}
        />
      )}
    </>
  )
}
