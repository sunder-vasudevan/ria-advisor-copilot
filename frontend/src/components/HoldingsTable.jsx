import { fmt } from '../api/client'

export default function HoldingsTable({ holdings }) {
  if (!holdings || holdings.length === 0) {
    return <div className="text-sm text-gray-400 py-4 text-center">No holdings data</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-2 pr-4 font-semibold text-gray-500 text-xs uppercase">Fund</th>
            <th className="text-left py-2 pr-4 font-semibold text-gray-500 text-xs uppercase">Category</th>
            <th className="text-right py-2 pr-4 font-semibold text-gray-500 text-xs uppercase">Value</th>
            <th className="text-right py-2 pr-2 font-semibold text-gray-500 text-xs uppercase">Current</th>
            <th className="text-right py-2 font-semibold text-gray-500 text-xs uppercase">Target</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {holdings.map(h => {
            const drift = h.current_pct - h.target_pct
            return (
              <tr key={h.id} className="hover:bg-gray-50">
                <td className="py-2.5 pr-4">
                  <div className="font-medium text-gray-900 text-xs leading-tight">{h.fund_name}</div>
                  <div className="text-gray-400 text-xs">{h.fund_house}</div>
                </td>
                <td className="py-2.5 pr-4">
                  <span className="inline-flex px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-medium">
                    {h.fund_category}
                  </span>
                </td>
                <td className="py-2.5 pr-4 text-right font-medium text-gray-900 text-xs">
                  {fmt.inr(h.current_value)}
                </td>
                <td className="py-2.5 pr-2 text-right text-xs font-medium text-gray-900">
                  {h.current_pct.toFixed(1)}%
                </td>
                <td className="py-2.5 text-right text-xs">
                  <span className="text-gray-500">{h.target_pct}%</span>
                  {Math.abs(drift) > 2 && (
                    <span className={`ml-1 font-medium ${drift > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {drift > 0 ? `+${drift.toFixed(1)}` : drift.toFixed(1)}
                    </span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
