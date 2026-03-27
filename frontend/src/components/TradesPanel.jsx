import { useEffect, useState } from 'react'
import { getTrades, createTradeDraft, submitTrade } from '../api/client'
import { Plus, ChevronDown, ChevronUp, Send, AlertCircle } from 'lucide-react'
import { fmt } from '../api/client'

const INPUT_CLS = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-300'

export default function TradesPanel({ clientId }) {
  const [trades, setTrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    asset_type: 'mutual_fund',
    action: 'buy',
    asset_code: '',
    quantity: '',
    estimated_value: '',
    advisor_note: '',
  })
  const [expandedTradeId, setExpandedTradeId] = useState(null)
  const [saving, setSaving] = useState(false)

  // Load trades
  const loadTrades = async () => {
    try {
      setLoading(true)
      const data = await getTrades(clientId)
      setTrades(data || [])
      setError('')
    } catch (err) {
      setError('Failed to load trades')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTrades()
  }, [clientId])

  // Create trade
  const handleSaveDraft = async () => {
    if (!formData.asset_code || !formData.quantity || !formData.estimated_value) {
      setError('Please fill all required fields')
      return
    }

    try {
      setSaving(true)
      const newTrade = await createTradeDraft(clientId, {
        asset_type: formData.asset_type,
        action: formData.action,
        asset_code: formData.asset_code.toUpperCase(),
        quantity: parseFloat(formData.quantity),
        estimated_value: parseFloat(formData.estimated_value),
        advisor_note: formData.advisor_note,
      })
      setTrades([newTrade, ...trades])
      setShowModal(false)
      setFormData({
        asset_type: 'mutual_fund',
        action: 'buy',
        asset_code: '',
        quantity: '',
        estimated_value: '',
        advisor_note: '',
      })
      setError('')
    } catch (err) {
      setError('Failed to create trade')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  // Submit for approval
  const handleSubmit = async (tradeId) => {
    try {
      setSaving(true)
      const updated = await submitTrade(tradeId, {})
      setTrades(trades.map(t => t.id === tradeId ? updated : t))
    } catch (err) {
      setError('Failed to submit trade')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const TradeCard = ({ trade }) => {
    const isExpanded = expandedTradeId === trade.id
    const isDraft = trade.status === 'draft'
    const isPending = trade.status === 'pending_approval'
    const isSettled = trade.status === 'settled'

    const statusColor = {
      draft: 'bg-gray-100 text-gray-700',
      pending_approval: 'bg-amber-100 text-amber-700',
      approved: 'bg-blue-100 text-blue-700',
      settled: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      cancelled: 'bg-gray-200 text-gray-600',
    }

    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setExpandedTradeId(isExpanded ? null : trade.id)}
        >
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${statusColor[trade.status] || 'bg-gray-100'}`}>
                {trade.status.replace(/_/g, ' ').toUpperCase()}
              </span>
              <div className="text-sm font-semibold text-gray-900">
                {trade.action === 'buy' ? '🟢 Buy' : '🔴 Sell'} {trade.asset_code}
              </div>
            </div>
            <div className="text-xs text-gray-600 grid grid-cols-3 gap-4">
              <div>Qty: <span className="font-semibold">{trade.quantity}</span></div>
              <div>Est Value: <span className="font-semibold">{fmt.inr(trade.estimated_value)}</span></div>
              <div>Type: <span className="font-semibold">{trade.asset_type.replace(/_/g, ' ')}</span></div>
            </div>
          </div>
          <div className="text-gray-400">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>

        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
            {/* Audit trail */}
            {trade.audit_logs && trade.audit_logs.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs font-semibold text-gray-600 mb-2">Audit Trail</div>
                <div className="space-y-1">
                  {trade.audit_logs.map((log, i) => (
                    <div key={i} className="text-xs text-gray-600">
                      <span className="font-mono bg-gray-100 px-1 rounded">{log.action}</span>
                      {' '}by {log.actor}
                      {' '}—{' '}
                      {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString()}
                      {log.note && <div className="text-gray-500 mt-0.5">{log.note}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Draft actions */}
            {isDraft && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleSubmit(trade.id)}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-navy-950 text-white text-xs font-semibold rounded-lg hover:bg-navy-800 disabled:opacity-50 transition-colors"
                >
                  <Send size={12} />
                  Submit for Approval
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-gray-700">
          {trades.length > 0 ? `${trades.length} Trade${trades.length !== 1 ? 's' : ''}` : 'Trades'}
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-950 text-white text-xs font-semibold rounded-xl hover:bg-navy-800 transition-colors shadow-sm"
        >
          <Plus size={12} />
          Initiate Trade
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle size={14} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-red-700">{error}</div>
        </div>
      )}

      {/* Empty state */}
      {!loading && trades.length === 0 && (
        <div className="flex flex-col items-center py-12 text-center">
          <div className="text-3xl mb-3">📊</div>
          <div className="text-sm font-semibold text-gray-600 mb-1">No trades yet</div>
          <div className="text-xs text-gray-400">Initiate your first trade to get started</div>
        </div>
      )}

      {/* Trades list */}
      {!loading && trades.length > 0 && (
        <div className="space-y-3">
          {trades.map(trade => (
            <TradeCard key={trade.id} trade={trade} />
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="text-lg font-bold text-gray-900">Initiate Trade</div>

            {/* Asset Type */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Asset Type</label>
              <select
                value={formData.asset_type}
                onChange={(e) => setFormData({ ...formData, asset_type: e.target.value })}
                className={INPUT_CLS}
              >
                <option value="mutual_fund">Mutual Fund</option>
                <option value="crypto">Crypto</option>
              </select>
            </div>

            {/* Action */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Action</label>
              <select
                value={formData.action}
                onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                className={INPUT_CLS}
              >
                <option value="buy">Buy</option>
                <option value="sell">Sell</option>
              </select>
            </div>

            {/* Asset Code */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                {formData.asset_type === 'mutual_fund' ? 'ISIN / Fund Code' : 'Ticker (e.g., BTC)'}
              </label>
              <input
                type="text"
                placeholder={formData.asset_type === 'mutual_fund' ? 'e.g., INF174K01K79' : 'e.g., BTC'}
                value={formData.asset_code}
                onChange={(e) => setFormData({ ...formData, asset_code: e.target.value })}
                className={INPUT_CLS}
              />
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Quantity</label>
              <input
                type="number"
                placeholder="e.g., 5"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className={INPUT_CLS}
              />
            </div>

            {/* Estimated Value */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Estimated Value (₹)</label>
              <input
                type="number"
                placeholder="e.g., 50000"
                value={formData.estimated_value}
                onChange={(e) => setFormData({ ...formData, estimated_value: e.target.value })}
                className={INPUT_CLS}
              />
            </div>

            {/* Advisor Note */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Note (optional)</label>
              <textarea
                placeholder="Add a note..."
                value={formData.advisor_note}
                onChange={(e) => setFormData({ ...formData, advisor_note: e.target.value })}
                className={INPUT_CLS}
                rows="2"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-3 py-2 text-xs font-semibold text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDraft}
                disabled={saving}
                className="flex-1 px-3 py-2 text-xs font-semibold text-white bg-navy-950 rounded-lg hover:bg-navy-800 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : 'Save as Draft'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
