import { useEffect, useState } from 'react'
import { getTrades, createTradeDraft, submitTrade, getHoldings } from '../api/client'
import { Plus, ChevronDown, ChevronUp, Send, AlertCircle, X, ArrowUpDown } from 'lucide-react'
import { fmt } from '../api/client'

const INPUT_CLS = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400'

const INSTRUMENTS = [
  // Stocks — NIFTY 50
  { type: 'stock', category: 'NIFTY 50',              name: 'Reliance Industries Ltd',            nav: 1540,   code: 'RELIANCE' },
  { type: 'stock', category: 'NIFTY 50',              name: 'HDFC Bank Ltd',                      nav: 1420,   code: 'HDFCBANK' },
  { type: 'stock', category: 'NIFTY 50',              name: 'Infosys Ltd',                        nav: 1350,   code: 'INFY' },
  { type: 'stock', category: 'NIFTY 50',              name: 'TCS Ltd',                            nav: 3780,   code: 'TCS' },
  { type: 'stock', category: 'NIFTY 50',              name: 'ICICI Bank Ltd',                     nav: 1080,   code: 'ICICIBANK' },
  // Stocks — NIFTY Next 50
  { type: 'stock', category: 'NIFTY Next 50',         name: 'Zomato Ltd',                         nav: 182,    code: 'ZOMATO' },
  { type: 'stock', category: 'NIFTY Next 50',         name: 'DLF Ltd',                            nav: 780,    code: 'DLF' },
  { type: 'stock', category: 'NIFTY Next 50',         name: 'Trent Ltd',                          nav: 4100,   code: 'TRENT' },
  // Stocks — NIFTY 100
  { type: 'stock', category: 'NIFTY 100',             name: 'Tata Power Ltd',                     nav: 420,    code: 'TATAPOWER' },
  { type: 'stock', category: 'NIFTY 100',             name: 'Larsen & Toubro Ltd',                nav: 3650,   code: 'LT' },
  // Equity MF — Index
  { type: 'mutual_fund', category: 'NIFTY 50 Index',         name: 'HDFC Index Fund – NIFTY 50',           nav: 197.42, code: 'INF179K01BB8' },
  { type: 'mutual_fund', category: 'NIFTY 50 Index',         name: 'UTI Nifty 50 Index Fund',              nav: 182.15, code: 'INF789F1AUV1' },
  { type: 'mutual_fund', category: 'NIFTY Next 50 Index',    name: 'ICICI Nifty Next 50 Index Fund',       nav: 36.18,  code: 'INF109KC1KT4' },
  { type: 'mutual_fund', category: 'NIFTY Next 50 Index',    name: 'Nippon India Nifty Next 50',           nav: 42.77,  code: 'INF204KB14I2' },
  { type: 'mutual_fund', category: 'NIFTY Midcap 150 Index', name: 'Kotak Nifty Midcap 150 Index Fund',    nav: 21.77,  code: 'INF174KA1P60' },
  { type: 'mutual_fund', category: 'NIFTY Midcap 150 Index', name: 'Motilal Oswal Nifty Midcap 150',       nav: 28.12,  code: 'INF247L01BP3' },
  { type: 'mutual_fund', category: 'NIFTY Smallcap 250',     name: 'Nippon India Nifty Smallcap 250',      nav: 18.92,  code: 'INF204KB15I0' },
  { type: 'mutual_fund', category: 'NIFTY Smallcap 250',     name: 'Motilal Oswal Nifty Smallcap 250',     nav: 19.44,  code: 'INF247L01BQ1' },
  { type: 'mutual_fund', category: 'NIFTY 100 Index',        name: 'ICICI Nifty 100 Index Fund',           nav: 32.55,  code: 'INF109KC1KU2' },
  { type: 'mutual_fund', category: 'NIFTY 100 Index',        name: 'HDFC Nifty 100 Index Fund',            nav: 28.91,  code: 'INF179KC1KZ6' },
  // Debt MF
  { type: 'mutual_fund', category: 'Gilt',            name: 'ICICI Prudential Gilt Fund',                  nav: 78.14,  code: 'INF109K01AN8' },
  { type: 'mutual_fund', category: 'Gilt',            name: 'HDFC Gilt Fund',                              nav: 62.77,  code: 'INF179K01BP8' },
  { type: 'mutual_fund', category: 'Banking & PSU',   name: 'SBI Banking & PSU Debt Fund',                 nav: 29.47,  code: 'INF200K01WZ9' },
  { type: 'mutual_fund', category: 'Banking & PSU',   name: 'Nippon India Banking & PSU',                  nav: 32.11,  code: 'INF204K01TN7' },
  { type: 'mutual_fund', category: 'Corporate Bond',  name: 'HDFC Corporate Bond Fund',                    nav: 24.12,  code: 'INF179K01DW3' },
  { type: 'mutual_fund', category: 'Corporate Bond',  name: 'ICICI Corporate Bond Fund',                   nav: 32.88,  code: 'INF109K01ZP4' },
  { type: 'mutual_fund', category: 'Short Duration',  name: 'ICICI Short Term Fund',                       nav: 46.83,  code: 'INF109K01MM2' },
  { type: 'mutual_fund', category: 'Short Duration',  name: 'HDFC Short Term Debt Fund',                   nav: 41.55,  code: 'INF179K01BQ6' },
  { type: 'mutual_fund', category: 'Money Market',    name: 'Aditya Birla Money Manager Fund',             nav: 311.25, code: 'INF209K01VY3' },
  { type: 'mutual_fund', category: 'Money Market',    name: 'Nippon India Money Market Fund',              nav: 4512.1, code: 'INF204K01UQ4' },
]

function TradeInitiateModal({ clientId, holdings, onClose, onSaved }) {
  const [action, setAction] = useState('buy')
  const [search, setSearch] = useState('')
  const [selectedCode, setSelectedCode] = useState('')
  const [inputMode, setInputMode] = useState('amount')
  const [amount, setAmount] = useState('')
  const [units, setUnits] = useState('')
  const [advisorNote, setAdvisorNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const heldCodes = new Set((holdings || []).map(h => (h.asset_code || '').toUpperCase()))

  const filteredInstruments = INSTRUMENTS.filter(ins => {
    if (action === 'sell' && !heldCodes.has(ins.code.toUpperCase())) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return ins.name.toLowerCase().includes(q) || ins.code.toLowerCase().includes(q) || ins.category.toLowerCase().includes(q)
  })

  const selected = INSTRUMENTS.find(i => i.code === selectedCode) || null
  const nav = selected?.nav ?? 0

  const holding = (holdings || []).find(h => (h.asset_code || '').toUpperCase() === selectedCode.toUpperCase())
  const unitsHeld = holding?.units_held ?? 0
  const holdingValue = unitsHeld * nav

  const qty = parseFloat(units) || 0
  const estValue = parseFloat(amount) || 0

  const MIN_QTY = selected?.type === 'crypto' ? 0.0001 : selected?.type === 'stock' ? 1 : 0.0001
  const belowMinQty = qty > 0 && qty < MIN_QTY

  const sellExceedsHolding = action === 'sell' && qty > 0 && qty > unitsHeld
  const sellExceedsValue = action === 'sell' && estValue > 0 && estValue > holdingValue

  const canSubmit = selected && qty > 0 && estValue > 0 && !belowMinQty && !sellExceedsHolding && !saving

  const handleSelectInstrument = (ins) => {
    setSelectedCode(ins.code)
    setSearch('')
    setAmount('')
    setUnits('')
  }

  const handleAmountChange = (val) => {
    setAmount(val)
    const a = parseFloat(val) || 0
    setUnits(nav > 0 && a > 0 ? (a / nav).toFixed(4) : '')
  }

  const handleUnitsChange = (val) => {
    setUnits(val)
    const u = parseFloat(val) || 0
    setAmount(nav > 0 && u > 0 ? (u * nav).toFixed(2) : '')
  }

  const handleActionChange = (a) => {
    setAction(a)
    setSelectedCode('')
    setSearch('')
    setAmount('')
    setUnits('')
  }

  const handleSave = async () => {
    setError('')
    try {
      setSaving(true)
      const newTrade = await createTradeDraft(clientId, {
        asset_type: selected.type,
        action,
        asset_code: selected.code,
        quantity: qty,
        estimated_value: estValue,
        advisor_note: advisorNote.trim() || undefined,
      })
      onSaved(newTrade)
      onClose()
    } catch {
      setError('Failed to create trade draft')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <ArrowUpDown size={15} className="text-blue-600" />
            <span className="text-sm font-bold text-gray-900">Initiate Trade</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={15} /></button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-4 flex-1">
          {/* Buy / Sell toggle */}
          <div className="flex gap-2">
            {['buy', 'sell'].map(a => (
              <button
                key={a}
                onClick={() => handleActionChange(a)}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors capitalize ${
                  action === a
                    ? a === 'buy' ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {a}
              </button>
            ))}
          </div>

          {/* Instrument search */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              {action === 'sell' ? 'Instrument (client holdings only)' : 'Instrument'}
            </label>
            {selected ? (
              <div className="flex items-center justify-between px-3 py-2 border border-gray-200 rounded-lg bg-gray-50">
                <div>
                  <div className="text-sm font-semibold text-gray-900">{selected.name}</div>
                  <div className="text-xs text-gray-500">{selected.code} · NAV ₹{selected.nav.toLocaleString('en-IN')}</div>
                </div>
                <button
                  onClick={() => { setSelectedCode(''); setAmount(''); setUnits('') }}
                  className="text-gray-400 hover:text-red-400"
                >
                  <X size={13} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  className={INPUT_CLS}
                  placeholder="Search by name, code, or category…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  autoFocus
                />
                {(search || action === 'sell') && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 max-h-52 overflow-y-auto">
                    {filteredInstruments.length === 0 ? (
                      <div className="px-3 py-3 text-xs text-gray-400 text-center">
                        {action === 'sell' ? 'No held instruments match' : 'No instruments found'}
                      </div>
                    ) : (
                      filteredInstruments.map(ins => (
                        <button
                          key={ins.code}
                          onClick={() => handleSelectInstrument(ins)}
                          className="w-full text-left px-3 py-2.5 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
                        >
                          <div className="text-xs font-semibold text-gray-900">{ins.name}</div>
                          <div className="text-[10px] text-gray-400">{ins.code} · {ins.category} · NAV ₹{ins.nav.toLocaleString('en-IN')}</div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Holding info for sell */}
          {action === 'sell' && selected && (
            <div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-100 text-xs text-amber-800">
              Client holds <strong>{unitsHeld.toFixed(4)} units</strong>
              {holdingValue > 0 && <> ≈ <strong>{fmt.inr(holdingValue)}</strong></>}
            </div>
          )}

          {/* Input mode toggle */}
          {selected && (
            <div className="flex gap-1.5">
              {[['amount', 'By Amount (₹)'], ['units', 'By Units']].map(([m, label]) => (
                <button
                  key={m}
                  onClick={() => { setInputMode(m); setAmount(''); setUnits('') }}
                  className={`flex-1 text-xs py-1.5 rounded-lg font-medium transition-colors ${
                    inputMode === m ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Amount / Units inputs */}
          {selected && (
            <div className="space-y-3">
              {inputMode === 'amount' ? (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Amount (₹)</label>
                  <input
                    type="number"
                    className={INPUT_CLS}
                    placeholder="e.g. 50000"
                    value={amount}
                    onChange={e => handleAmountChange(e.target.value)}
                  />
                  {units && <p className="text-xs text-gray-400 mt-1">≈ {parseFloat(units).toFixed(4)} units at NAV ₹{nav}</p>}
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Units</label>
                  <input
                    type="number"
                    className={INPUT_CLS}
                    placeholder="e.g. 10"
                    value={units}
                    onChange={e => handleUnitsChange(e.target.value)}
                  />
                  {amount && <p className="text-xs text-gray-400 mt-1">≈ {fmt.inr(parseFloat(amount))} at NAV ₹{nav}</p>}
                </div>
              )}

              {belowMinQty && (
                <div className="flex items-start gap-1.5 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  <AlertCircle size={12} className="shrink-0 mt-0.5" />
                  Minimum is {MIN_QTY} {selected?.type === 'stock' ? 'unit (whole shares only)' : 'units'} for {selected?.type}
                </div>
              )}
              {(sellExceedsHolding || sellExceedsValue) && (
                <div className="flex items-start gap-1.5 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  <AlertCircle size={12} className="shrink-0 mt-0.5" />
                  {sellExceedsHolding
                    ? `Exceeds holding — client holds ${unitsHeld.toFixed(4)} units`
                    : `Exceeds holding value of ${fmt.inr(holdingValue)}`}
                </div>
              )}
            </div>
          )}

          {/* Advisor note */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Advisor Note (optional)</label>
            <textarea
              className={INPUT_CLS}
              placeholder="Rationale or instructions for client…"
              rows={2}
              value={advisorNote}
              onChange={e => setAdvisorNote(e.target.value)}
            />
          </div>

          {error && (
            <div className="flex items-start gap-1.5 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              <AlertCircle size={12} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4 border-t border-gray-100 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 px-3 py-2 text-xs font-semibold text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSubmit}
            className="flex-1 px-3 py-2 text-xs font-semibold text-white bg-navy-950 rounded-lg hover:bg-navy-800 disabled:opacity-40 transition-colors"
          >
            {saving ? 'Saving…' : selected
              ? `${action === 'buy' ? 'Buy' : 'Sell'} ${selected.name.split(' ').slice(0, 2).join(' ')}`
              : 'Save Draft'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TradesPanel({ clientId }) {
  const [trades, setTrades] = useState([])
  const [holdings, setHoldings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [expandedTradeId, setExpandedTradeId] = useState(null)
  const [saving, setSaving] = useState(false)

  const loadTrades = async () => {
    try {
      setLoading(true)
      const [tradesData, holdingsData] = await Promise.all([
        getTrades(clientId),
        getHoldings(clientId).catch(() => []),
      ])
      setTrades(tradesData || [])
      setHoldings(holdingsData || [])
      setError('')
    } catch {
      setError('Failed to load trades')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTrades()
  }, [clientId])

  const handleSubmit = async (tradeId) => {
    try {
      setSaving(true)
      const updated = await submitTrade(tradeId, {})
      setTrades(trades.map(t => t.id === tradeId ? updated : t))
    } catch {
      setError('Failed to submit trade')
    } finally {
      setSaving(false)
    }
  }

  const TradeCard = ({ trade }) => {
    const isExpanded = expandedTradeId === trade.id
    const isDraft = trade.status === 'draft'

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

      {trades.some(t => t.status === 'draft') && (
        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <AlertCircle size={14} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-blue-700">
            <strong>Draft trades are hidden from client.</strong> Click expand and select "Submit for Approval" to make visible.
          </div>
        </div>
      )}

      {!loading && trades.length === 0 && (
        <div className="flex flex-col items-center py-12 text-center">
          <div className="text-3xl mb-3">📊</div>
          <div className="text-sm font-semibold text-gray-600 mb-1">No trades yet</div>
          <div className="text-xs text-gray-400">Initiate your first trade to get started</div>
        </div>
      )}

      {!loading && trades.length > 0 && (
        <div className="space-y-3">
          {trades.map(trade => (
            <TradeCard key={trade.id} trade={trade} />
          ))}
        </div>
      )}

      {showModal && (
        <TradeInitiateModal
          clientId={clientId}
          holdings={holdings}
          onClose={() => setShowModal(false)}
          onSaved={(newTrade) => setTrades(prev => [newTrade, ...prev])}
        />
      )}
    </div>
  )
}
