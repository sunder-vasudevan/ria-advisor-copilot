import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { fmt } from '../api/client'

const COLORS = {
  equity: '#1e4fff',
  debt:   '#f59e0b',
  cash:   '#10b981',
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

export default function PortfolioChart({ portfolio }) {
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
    if (drift > 2) return <span className="text-red-600 text-xs font-medium">+{abs}% ↑</span>
    if (drift < -2) return <span className="text-green-600 text-xs font-medium">-{abs}% ↓</span>
    return <span className="text-green-600 text-xs">On target</span>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="text-sm font-semibold text-gray-700">Asset Allocation</div>
        <div className="text-sm font-bold text-gray-900">{fmt.inr(portfolio.total_value)}</div>
      </div>

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
  )
}
