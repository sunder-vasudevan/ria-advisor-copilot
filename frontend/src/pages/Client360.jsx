import ARiALogo from '../components/ARiALogo'
import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getClient, createPortfolio, archiveClient, getAdvisorNotifications, markNotificationRead } from '../api/client'
import { getClientInvoices, createInvoice, collectInvoice, getClientFeeConfig, setClientFeeConfig, getFeeConfig } from '../api/billing'
import { createLifeEvent, updateLifeEvent, deleteLifeEvent } from '../api/client'
import { ArrowLeft, AlertTriangle, Clock, CheckCircle, CalendarCheck, Sparkles, Pencil, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Plus, X, Loader2, Trash2, Archive, Bell, BellRing } from 'lucide-react'
import PortfolioChart from '../components/PortfolioChart'
import HoldingsTable from '../components/HoldingsTable'
import GoalsPanel from '../components/GoalsPanel'
import CopilotChat from '../components/CopilotChat'
import SituationSummary from '../components/SituationSummary'
import MeetingPrepPanel from '../components/MeetingPrepPanel'
import InteractionsPanel from '../components/InteractionsPanel'
import TradesPanel from '../components/TradesPanel'
import KycPanel, { KycStatusBadge } from '../components/KycPanel'
import { fmt } from '../api/client'

const INPUT_CLS = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-300'
const FUND_CATEGORIES = [
  'Large Cap', 'Mid Cap', 'Small Cap', 'Flexi Cap',
  'Debt', 'Liquid', 'Gold', 'International',
]

const LIFE_EVENT_TYPES = [
  { value: 'job_change',   label: '💼 Job Change' },
  { value: 'new_child',    label: '👶 New Child' },
  { value: 'marriage',     label: '💍 Marriage' },
  { value: 'divorce',      label: '📋 Divorce' },
  { value: 'retirement',   label: '🌅 Retirement' },
  { value: 'inheritance',  label: '🏦 Inheritance' },
  { value: 'illness',      label: '🏥 Illness' },
]

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

function LifeEventTag({ event, onEdit, onDelete, pendingDeleteId, setPendingDeleteId }) {
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
  const isPending = pendingDeleteId === event.id

  return (
    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
      <span className="text-base flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-amber-900">
          {event.event_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
          <span className="text-amber-600 font-normal ml-1">({days}d ago)</span>
        </div>
        {event.notes && <div className="text-xs text-amber-800 mt-0.5 leading-snug">{event.notes}</div>}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {isPending ? (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-red-600">Delete?</span>
            <button onClick={() => onDelete(event.id)} className="text-red-600 font-medium hover:underline">Yes</button>
            <button onClick={() => setPendingDeleteId(null)} className="text-gray-500 hover:underline">No</button>
          </div>
        ) : (
          <>
            <button onClick={() => onEdit(event)}
              className="p-1 text-amber-400 hover:text-amber-700 hover:bg-amber-100 rounded-lg transition-colors"
              aria-label="Edit life event">
              <Pencil size={11} />
            </button>
            <button onClick={() => setPendingDeleteId(event.id)}
              className="p-1 text-amber-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              aria-label="Delete life event">
              <Trash2 size={11} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function LifeEventModal({ initial, onSave, onClose, saving, error }) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState(initial || { event_type: 'job_change', event_date: today, notes: '' })
  const set = (f, v) => setForm(s => ({ ...s, [f]: v }))

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[92vh] overflow-y-auto shadow-modal">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white z-10 rounded-t-2xl">
          <span className="text-sm font-semibold text-gray-900">{initial ? 'Edit Life Event' : 'Log Life Event'}</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Event Type</label>
            <div className="grid grid-cols-2 gap-2">
              {LIFE_EVENT_TYPES.map(({ value, label }) => (
                <button key={value} type="button"
                  onClick={() => set('event_type', value)}
                  className={`text-left px-3 py-2 rounded-xl border text-sm transition-colors ${
                    form.event_type === value
                      ? 'bg-amber-50 border-amber-400 text-amber-900 font-medium'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Event Date</label>
            <input type="date" value={form.event_date} onChange={e => set('event_date', e.target.value)}
              className={INPUT_CLS} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea rows={3} placeholder="Any context about this event…"
              value={form.notes || ''} onChange={e => set('notes', e.target.value)}
              className={`${INPUT_CLS} resize-none`} />
          </div>
          {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</div>}
          <div className="flex gap-2 pt-1 pb-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-medium">
              Cancel
            </button>
            <button type="button" disabled={saving} onClick={() => onSave(form)}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-navy-950 rounded-xl hover:bg-navy-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <><Loader2 size={14} className="animate-spin" />Saving…</> : (initial ? 'Save Changes' : 'Log Event')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Holdings edit form extracted for inline use in Client360
function HoldingsEditForm({ portfolio, onSave, onCancel, saving, error }) {
  const [holdings, setHoldings] = useState(
    portfolio?.holdings?.length
      ? portfolio.holdings.map(h => ({
          fund_name: h.fund_name || '',
          fund_category: h.fund_category || 'Large Cap',
          fund_house: h.fund_house || '',
          current_value: h.current_value ?? '',
          target_pct: h.target_pct ?? '',
        }))
      : [{ fund_name: '', fund_category: 'Large Cap', fund_house: '', current_value: '', target_pct: '' }]
  )
  const [allocation, setAllocation] = useState({
    equity_pct: portfolio?.equity_pct ?? '',
    debt_pct: portfolio?.debt_pct ?? '',
    cash_pct: portfolio?.cash_pct ?? '',
    target_equity_pct: portfolio?.target_equity_pct ?? '',
    target_debt_pct: portfolio?.target_debt_pct ?? '',
    target_cash_pct: portfolio?.target_cash_pct ?? '',
  })

  const setHolding = (idx, field, value) => setHoldings(hs => hs.map((h, i) => i === idx ? { ...h, [field]: value } : h))
  const addHolding = () => setHoldings(hs => [...hs, { fund_name: '', fund_category: 'Large Cap', fund_house: '', current_value: '', target_pct: '' }])
  const removeHolding = (idx) => setHoldings(hs => hs.filter((_, i) => i !== idx))

  const handleSave = () => {
    const validHoldings = holdings.filter(h => h.fund_name.trim() && h.current_value !== '')
    onSave({
      holdings: validHoldings.map(h => ({
        fund_name: h.fund_name.trim(),
        fund_category: h.fund_category,
        fund_house: h.fund_house.trim(),
        current_value: Number(h.current_value),
        target_pct: Number(h.target_pct) || 0,
      })),
      equity_pct: Number(allocation.equity_pct) || 0,
      debt_pct: Number(allocation.debt_pct) || 0,
      cash_pct: Number(allocation.cash_pct) || 0,
      target_equity_pct: Number(allocation.target_equity_pct) || 0,
      target_debt_pct: Number(allocation.target_debt_pct) || 0,
      target_cash_pct: Number(allocation.target_cash_pct) || 0,
    })
  }

  return (
    <div className="space-y-5">
      {/* Asset allocation */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Asset Allocation</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { field: 'equity_pct', label: 'Equity %' },
            { field: 'debt_pct', label: 'Debt %' },
            { field: 'cash_pct', label: 'Cash %' },
          ].map(({ field, label }) => (
            <div key={field}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
              <input type="number" min="0" max="100" value={allocation[field]}
                onChange={e => setAllocation(a => ({ ...a, [field]: e.target.value }))}
                placeholder="0" className={INPUT_CLS} />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { field: 'target_equity_pct', label: 'Target Equity %' },
            { field: 'target_debt_pct', label: 'Target Debt %' },
            { field: 'target_cash_pct', label: 'Target Cash %' },
          ].map(({ field, label }) => (
            <div key={field}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
              <input type="number" min="0" max="100" value={allocation[field]}
                onChange={e => setAllocation(a => ({ ...a, [field]: e.target.value }))}
                placeholder="0" className={INPUT_CLS} />
            </div>
          ))}
        </div>
      </div>

      {/* Holdings */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Fund Holdings</h3>
          <button type="button" onClick={addHolding}
            className="flex items-center gap-1 text-xs text-navy-700 hover:text-navy-950 font-medium">
            <Plus size={12} /> Add Fund
          </button>
        </div>
        <div className="space-y-3">
          {holdings.map((h, idx) => (
            <div key={idx} className="border border-gray-100 rounded-lg p-3 space-y-2 bg-gray-50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">Fund {idx + 1}</span>
                {holdings.length > 1 && (
                  <button type="button" onClick={() => removeHolding(idx)}
                    className="text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Fund Name *</label>
                <input type="text" value={h.fund_name} onChange={e => setHolding(idx, 'fund_name', e.target.value)}
                  placeholder="e.g. Axis Bluechip Fund" className={INPUT_CLS} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                  <select value={h.fund_category} onChange={e => setHolding(idx, 'fund_category', e.target.value)}
                    className={INPUT_CLS}>
                    {FUND_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Fund House</label>
                  <input type="text" value={h.fund_house} onChange={e => setHolding(idx, 'fund_house', e.target.value)}
                    placeholder="e.g. Axis MF" className={INPUT_CLS} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Current Value (₹) *</label>
                  <input type="number" min="0" value={h.current_value} onChange={e => setHolding(idx, 'current_value', e.target.value)}
                    placeholder="e.g. 500000" className={INPUT_CLS} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Target %</label>
                  <input type="number" min="0" max="100" value={h.target_pct} onChange={e => setHolding(idx, 'target_pct', e.target.value)}
                    placeholder="e.g. 25" className={INPUT_CLS} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

      <div className="flex gap-3">
        <button type="button" onClick={onCancel}
          className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
          Cancel
        </button>
        <button type="button" onClick={handleSave} disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-navy-950 text-white rounded-lg text-sm font-semibold hover:bg-navy-800 disabled:opacity-60 transition-colors">
          {saving ? <><Loader2 size={14} className="animate-spin" />Saving…</> : 'Save Holdings'}
        </button>
      </div>
    </div>
  )
}

function NotificationBell360() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const panelRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    getAdvisorNotifications(20).then(r => {
      setNotifications(r.notifications || [])
      setUnreadCount(r.unread_count || 0)
    }).catch(() => {})
    const iv = setInterval(() => {
      getAdvisorNotifications(20).then(r => {
        setNotifications(r.notifications || [])
        setUnreadCount(r.unread_count || 0)
      }).catch(() => {})
    }, 60000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    if (!open) return
    const h = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const handleOpen = async () => {
    setOpen(true)
    if (unreadCount > 0) {
      const unread = notifications.filter(n => !n.read)
      await Promise.allSettled(unread.map(n => markNotificationRead(n.id)))
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    }
  }

  const badge = unreadCount > 9 ? '9+' : String(unreadCount)
  return (
    <div className="relative" ref={panelRef}>
      <button onClick={handleOpen} className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors" aria-label="Notifications">
        {unreadCount > 0 ? <BellRing size={18} className="text-[#1D6FDB]" /> : <Bell size={18} />}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">{badge}</span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[340px] bg-white border border-gray-200 rounded-xl shadow-lg z-50 flex flex-col max-h-[400px]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
            <span className="text-sm font-semibold text-gray-900">Notifications</span>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
          </div>
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <CheckCircle size={28} className="text-gray-200 mb-2" />
                <p className="text-sm text-gray-400">All caught up</p>
              </div>
            ) : notifications.map(n => (
              <button key={n.id} onClick={() => { if (n.client_id) navigate(`/clients/${n.client_id}`); setOpen(false) }}
                className={`w-full text-left px-4 py-3 flex items-start gap-3 border-b border-gray-50 ${!n.read ? 'bg-blue-50' : 'bg-white'} hover:bg-gray-50 transition-colors`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 leading-snug">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{n.created_at?.slice(0, 10)}</p>
                </div>
                {!n.read && <span className="w-2 h-2 rounded-full bg-[#1D6FDB] flex-shrink-0 mt-1.5" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const FEE_TYPE_LABELS = { aum: 'AUM %', retainer: 'Fixed Retainer', per_trade: 'Per-Trade', onboarding: 'Onboarding' }
const INVOICE_STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  waived: 'bg-gray-100 text-gray-500',
}

function ClientBillingTab({ clientId, portfolio }) {
  const [invoices, setInvoices] = useState([])
  const [feeConfig, setFeeConfigState] = useState(null)
  const [advisorDefault, setAdvisorDefault] = useState(null)
  const [loading, setLoading] = useState(true)
  const [configEdit, setConfigEdit] = useState(false)
  const [configForm, setConfigForm] = useState({ fee_type: 'aum', rate: 1.0, billing_period: 'monthly' })
  const [savingConfig, setSavingConfig] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [collectingId, setCollectingId] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const loadBillingData = async () => {
    setLoading(true)
    try {
      const [invRes, cfgRes, defRes] = await Promise.all([
        getClientInvoices(clientId),
        getClientFeeConfig(clientId),
        getFeeConfig(),
      ])
      setInvoices(invRes.data || [])
      setFeeConfigState(cfgRes.data)
      setAdvisorDefault(defRes.data)
      const active = cfgRes.data || defRes.data
      if (active) setConfigForm({ fee_type: active.fee_type, rate: active.rate, billing_period: active.billing_period })
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadBillingData() }, [clientId])

  const handleSaveConfig = async () => {
    setSavingConfig(true)
    try {
      const res = await setClientFeeConfig(clientId, configForm)
      setFeeConfigState(res.data)
      setConfigEdit(false)
      showToast('Fee config saved')
    } catch { showToast('Failed to save', 'error') }
    finally { setSavingConfig(false) }
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      await createInvoice(clientId, {})
      showToast('Invoice generated')
      await loadBillingData()
    } catch (e) {
      showToast(e?.response?.data?.detail || 'Failed to generate invoice', 'error')
    } finally { setGenerating(false) }
  }

  const handleCollect = async (inv) => {
    setCollectingId(inv.id)
    try {
      await collectInvoice(inv.id)
      showToast(`Collected ${fmt.inr(inv.amount)}`)
      await loadBillingData()
    } catch (e) {
      showToast(e?.response?.data?.detail || 'Collection failed', 'error')
    } finally { setCollectingId(null) }
  }

  const activeConfig = feeConfig || advisorDefault
  const cashBalance = portfolio?.cash_balance || 0

  return (
    <div className="space-y-4">
      {toast && (
        <div className={`fixed top-16 right-4 z-50 px-4 py-2 rounded-lg text-sm font-medium shadow-lg ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
          {toast.msg}
        </div>
      )}

      {/* Fee Config */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Fee Configuration</div>
            {!feeConfig && advisorDefault && <div className="text-xs text-gray-400 mt-0.5">Using advisor default</div>}
            {feeConfig && <div className="text-xs text-blue-500 mt-0.5">Client override active</div>}
          </div>
          <button onClick={() => setConfigEdit(!configEdit)} className="text-xs text-[#1D6FDB] hover:underline">
            {configEdit ? 'Cancel' : 'Edit Override'}
          </button>
        </div>
        {configEdit ? (
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Fee Type</label>
              <select value={configForm.fee_type} onChange={e => setConfigForm(f => ({ ...f, fee_type: e.target.value }))} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
                {Object.entries(FEE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">{configForm.fee_type === 'aum' ? 'Rate (%)' : 'Rate (₹)'}</label>
              <input type="number" step="0.01" value={configForm.rate} onChange={e => setConfigForm(f => ({ ...f, rate: parseFloat(e.target.value) }))}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-24" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Period</label>
              <select value={configForm.billing_period} onChange={e => setConfigForm(f => ({ ...f, billing_period: e.target.value }))} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </select>
            </div>
            <button onClick={handleSaveConfig} disabled={savingConfig} className="px-4 py-1.5 bg-[#1D6FDB] text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {savingConfig ? 'Saving…' : 'Save'}
            </button>
          </div>
        ) : activeConfig ? (
          <div className="flex flex-wrap gap-6 text-sm">
            <div><span className="text-gray-500">Type: </span><span className="font-medium">{FEE_TYPE_LABELS[activeConfig.fee_type]}</span></div>
            <div><span className="text-gray-500">Rate: </span><span className="font-medium">{activeConfig.fee_type === 'aum' ? `${activeConfig.rate}%` : fmt.inr(activeConfig.rate)}</span></div>
            <div><span className="text-gray-500">Period: </span><span className="font-medium capitalize">{activeConfig.billing_period}</span></div>
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">No fee config. Set one in Billing page or add a client override.</p>
        )}
      </div>

      {/* Cash balance + Generate */}
      <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-200 px-5 py-4">
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wider">Cash Balance</div>
          <div className={`text-lg font-bold ${cashBalance < 5000 ? 'text-red-600' : 'text-gray-900'}`}>{fmt.inr(cashBalance)}</div>
          <div className="text-xs text-gray-400">Available for collection</div>
        </div>
        <button onClick={handleGenerate} disabled={generating}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#1D6FDB] text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {generating ? '…' : '+ Generate Invoice'}
        </button>
      </div>

      {/* Invoice list */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Invoices</span>
        </div>
        {loading ? (
          <div className="p-6 text-center text-sm text-gray-400">Loading…</div>
        ) : invoices.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-400">No invoices yet. Generate one above.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {invoices.map(inv => (
              <div key={inv.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50">
                <div>
                  <div className="text-sm font-medium text-gray-900">{inv.description}</div>
                  <div className="text-xs text-gray-400">{inv.period_start} → {inv.period_end} · {FEE_TYPE_LABELS[inv.fee_type]}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">{fmt.inr(inv.amount)}</div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${INVOICE_STATUS_STYLES[inv.status] || INVOICE_STATUS_STYLES.pending}`}>
                      {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                    </span>
                  </div>
                  {inv.status === 'pending' && (
                    <button onClick={() => handleCollect(inv)} disabled={collectingId === inv.id || cashBalance < inv.amount}
                      className="px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 disabled:opacity-50 whitespace-nowrap"
                      title={cashBalance < inv.amount ? 'Insufficient cash balance' : 'Collect fee'}>
                      {collectingId === inv.id ? '…' : 'Collect'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
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
  const [showMeetingPrep, setShowMeetingPrep] = useState(false)
  const [lifecycleStage, setLifecycleStage] = useState('lead')
  const [lifecycleError, setLifecycleError] = useState(null)
  const [copilotMessages, setCopilotMessages] = useState(undefined)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const everActiveRef = useRef({ portfolio: true })

  // Life events state
  const [lifeEvents, setLifeEvents] = useState(null) // null = use client data
  const [showEventModal, setShowEventModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [eventSaving, setEventSaving] = useState(false)
  const [eventError, setEventError] = useState(null)
  const [pendingDeleteEventId, setPendingDeleteEventId] = useState(null)

  // Archive state
  const [archiveConfirm, setArchiveConfirm] = useState(false)
  const [archiving, setArchiving] = useState(false)

  // Holdings edit state
  const [holdingsOpen, setHoldingsOpen] = useState(false)
  const [editingHoldings, setEditingHoldings] = useState(false)
  const [holdingsSaving, setHoldingsSaving] = useState(false)
  const [holdingsError, setHoldingsError] = useState(null)

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    everActiveRef.current[tab] = true
  }

  const refetchClient = () => {
    getClient(id)
      .then(data => {
        setClient(data)
        setLifecycleStage(data.lifecycle_stage || 'lead')
        window.__ariaClientCache = window.__ariaClientCache || {}
        window.__ariaClientCache[id] = data
        setLifeEvents(null) // reset local overrides
      })
      .catch(() => {})
  }

  const updateLifecycle = (stage) => {
    const prev = lifecycleStage
    setLifecycleStage(stage)
    setLifecycleError(null)
    const BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'
    fetch(`${BASE}/clients/${id}/lifecycle`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage }),
    }).then(async res => {
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setLifecycleStage(prev)
        setLifecycleError(body.detail || 'Failed to update lifecycle stage.')
      }
    }).catch(() => {
      setLifecycleStage(prev)
      setLifecycleError('Network error — lifecycle stage not saved.')
    })
  }

  useEffect(() => {
    setLoading(true)
    const cached = window.__ariaClientCache?.[id]
    if (cached) {
      setClient(cached)
      setLifecycleStage(cached.lifecycle_stage || 'lead')
      setLoading(false)
    }
    getClient(id)
      .then(data => {
        setClient(data)
        setLifecycleStage(data.lifecycle_stage || 'lead')
        window.__ariaClientCache = window.__ariaClientCache || {}
        window.__ariaClientCache[id] = data
      })
      .catch(() => { if (!cached) setError('Failed to load client') })
      .finally(() => setLoading(false))
  }, [id])

  // Life events helpers
  const displayEvents = lifeEvents !== null ? lifeEvents : (client?.life_events || [])

  const handleSaveEvent = async (form) => {
    setEventSaving(true); setEventError(null)
    try {
      if (editingEvent) {
        const updated = await updateLifeEvent(id, editingEvent.id, {
          event_type: form.event_type,
          event_date: form.event_date,
          notes: form.notes || null,
        })
        setLifeEvents(prev => (prev || client.life_events).map(e => e.id === updated.id ? updated : e))
      } else {
        const created = await createLifeEvent(id, {
          event_type: form.event_type,
          event_date: form.event_date,
          notes: form.notes || null,
        })
        setLifeEvents(prev => [created, ...(prev || client.life_events)])
      }
      setShowEventModal(false)
      setEditingEvent(null)
    } catch {
      setEventError('Failed to save event.')
    } finally {
      setEventSaving(false)
    }
  }

  const handleDeleteEvent = async (eventId) => {
    try {
      await deleteLifeEvent(id, eventId)
      setLifeEvents(prev => (prev || client.life_events).filter(e => e.id !== eventId))
      setPendingDeleteEventId(null)
    } catch {
      // silently fail
    }
  }

  const handleSaveHoldings = async (payload) => {
    setHoldingsSaving(true); setHoldingsError(null)
    try {
      await createPortfolio(id, payload)
      setEditingHoldings(false)
      refetchClient()
    } catch (err) {
      setHoldingsError(err?.response?.data?.detail || 'Failed to save holdings.')
    } finally {
      setHoldingsSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <div className="hidden lg:flex w-64 bg-navy-950 flex-col" />
        <div className="flex-1 p-8 space-y-4">
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
          <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
        </div>
        <div className="hidden lg:flex w-80 bg-white border-l border-gray-100" />
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

  async function handleArchive() {
    setArchiving(true)
    try {
      await archiveClient(client.id)
      navigate('/')
    } catch {
      setArchiving(false)
      setArchiveConfirm(false)
    }
  }

  // Tabs shown on desktop (inside center panel); mobile adds Info + Copilot
  const desktopTabs = [
    { key: 'portfolio', label: 'Portfolio & Holdings' },
    { key: 'kyc', label: 'KYC & Docs' },
    { key: 'goals', label: `Goals (${client.goals.length})` },
    { key: 'trades', label: 'Trades' },
    { key: 'events', label: `Life Events (${displayEvents.length})` },
    { key: 'interactions', label: 'Interactions' },
    { key: 'billing', label: 'Billing' },
  ]
  const mobileTabs = [
    { key: 'portfolio', label: 'Portfolio' },
    { key: 'kyc', label: 'KYC' },
    { key: 'goals', label: `Goals` },
    { key: 'trades', label: 'Trades' },
    { key: 'events', label: 'Life Events' },
    { key: 'interactions', label: 'Interactions' },
    { key: 'billing', label: 'Billing' },
    { key: 'info', label: 'Client Info' },
    { key: 'copilot', label: 'AI Copilot' },
  ]

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gray-50">

      {/* ── Mobile top bar (hidden on lg+) ── */}
      <div className="lg:hidden bg-navy-950 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-navy-300 hover:text-white text-sm transition-colors min-h-[44px] flex items-center"
        >
          <ArrowLeft size={14} />
          <span className="text-xs">Back</span>
        </button>
        <div className="text-center">
          <div className="text-white text-sm font-semibold">{client.name}</div>
          <div className="text-navy-400 text-xs flex items-center justify-center gap-1.5">
            {client.segment} · {fmt.inr(client.portfolio?.total_value)}
            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
              lifecycleStage === 'active' ? 'bg-green-900/60 text-green-300' :
              lifecycleStage === 'onboarded' ? 'bg-blue-900/60 text-blue-300' :
              lifecycleStage === 'review_due' ? 'bg-amber-900/60 text-amber-300' :
              lifecycleStage === 'churned' ? 'bg-red-900/60 text-red-300' :
              'bg-violet-900/60 text-violet-300'
            }`}>
              {lifecycleStage === 'review_due' ? 'Review Due' : lifecycleStage.charAt(0).toUpperCase() + lifecycleStage.slice(1)}
            </span>
          </div>
        </div>
        <button
          onClick={() => setShowMeetingPrep(true)}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-navy-800 text-white text-xs font-medium rounded-lg hover:bg-navy-700 transition-colors"
        >
          <CalendarCheck size={12} />
          Prep
        </button>
      </div>

      {/* ── Desktop left sidebar (hidden on mobile) ── */}
      <div className={`hidden lg:flex flex-col bg-navy-950 flex-shrink-0 transition-all duration-200 overflow-hidden ${sidebarCollapsed ? 'w-12' : 'w-64'}`}>
        {sidebarCollapsed ? (
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="p-3 hover:bg-navy-800 w-full flex justify-center"
            aria-label="Expand sidebar"
          >
            <ChevronRight size={16} className="text-gray-400" />
          </button>
        ) : (
          <>
            {/* collapse button at top */}
            <div className="flex justify-end p-2 border-b border-navy-800">
              <button
                onClick={() => setSidebarCollapsed(true)}
                className="p-1 hover:bg-navy-800 rounded"
                aria-label="Collapse sidebar"
              >
                <ChevronLeft size={16} className="text-gray-400" />
              </button>
            </div>

            <div className="p-6 border-b border-navy-800">
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 text-navy-300 hover:text-white text-sm mb-4 transition-colors"
                aria-label="Back to Client Book"
              >
                <ArrowLeft size={14} />
                Back to Client Book
              </button>
              <ARiALogo className="text-white font-bold text-lg tracking-tight" />
              <div className="text-navy-300 text-xs mt-0.5">Advisor Relationship Intelligence Assistant</div>
            </div>

            {/* Client profile in sidebar */}
            <div className="p-5 border-b border-navy-800">
              <div className="w-12 h-12 bg-navy-700 rounded-full flex items-center justify-center mb-3">
                {(() => {
                  const initials = client.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                  return <span className="text-white font-semibold text-sm tracking-wide">{initials}</span>
                })()}
              </div>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-white font-semibold text-base">{client.name}</div>
                  <div className="text-navy-300 text-xs mt-0.5">Age {client.age}</div>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => navigate(`/clients/${client.id}/edit`)}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-navy-800 text-navy-200 text-xs rounded-lg hover:bg-navy-700 transition-colors"
                    aria-label="Edit client"
                  >
                    <Pencil size={11} />
                    Edit
                  </button>
                  <button
                    onClick={() => setArchiveConfirm(true)}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-navy-800 text-amber-400 text-xs rounded-lg hover:bg-navy-700 transition-colors"
                    aria-label="Archive client"
                  >
                    <Archive size={11} />
                    Archive
                  </button>
                </div>
              </div>
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

            {/* Lifecycle Stage — FEAT-2004 */}
            <div className="p-5 border-b border-navy-800">
              <div className="text-navy-400 text-xs font-semibold uppercase tracking-wider mb-3">Lifecycle Stage</div>
              <div className="flex flex-col gap-1">
                {[
                  { key: 'lead', label: 'Lead', color: 'text-violet-300 bg-violet-900/40 border-violet-700' },
                  { key: 'onboarded', label: 'Onboarded', color: 'text-blue-300 bg-blue-900/40 border-blue-700' },
                  { key: 'active', label: 'Active', color: 'text-green-300 bg-green-900/40 border-green-700' },
                  { key: 'review_due', label: 'Review Due', color: 'text-amber-300 bg-amber-900/40 border-amber-700' },
                  { key: 'churned', label: 'Churned', color: 'text-red-300 bg-red-900/40 border-red-700' },
                ].map(({ key, label, color }) => (
                  <button
                    key={key}
                    onClick={() => updateLifecycle(key)}
                    className={`text-xs px-2.5 py-1.5 rounded-lg border text-left font-medium transition-all ${
                      lifecycleStage === key
                        ? color
                        : 'text-navy-400 bg-transparent border-navy-800 hover:border-navy-600 hover:text-navy-300'
                    }`}
                  >
                    {lifecycleStage === key ? '● ' : '○ '}{label}
                  </button>
                ))}
              </div>
              {lifecycleError && (
                <div className="mt-2 text-xs text-red-400 bg-red-900/30 border border-red-800 rounded-lg px-2.5 py-2 leading-snug">
                  {lifecycleError}
                </div>
              )}
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

            {/* Compliance Snapshot — desktop sidebar */}
            <div className="p-5 border-b border-navy-800">
              <div className="text-navy-400 text-xs font-semibold uppercase tracking-wider mb-3">Compliance</div>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs text-navy-400">KYC Status</span>
                <KycStatusBadge status={client.kyc_status || 'not_started'} />
              </div>
              <div className="space-y-2">
                {[
                  { label: 'KYC', ok: !!client.pan_number, detail: client.pan_number ? `PAN ${client.pan_number}` : 'PAN not on file', status: client.pan_number ? 'Verified' : 'Pending' },
                  { label: 'Suitability', ok: !!client.risk_score, detail: client.risk_score ? `Score ${client.risk_score}/10` : 'Assessment pending', status: client.risk_score ? 'Confirmed' : 'Pending' },
                ].map(({ label, ok, detail, status }) => (
                  <div key={label} className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-medium text-navy-200">{label}</div>
                      <div className="text-xs text-navy-500">{detail}</div>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${ok ? 'bg-emerald-900/50 text-emerald-300' : 'bg-amber-900/30 text-amber-300'}`}>
                      {ok ? <CheckCircle size={10} /> : <Clock size={10} />}
                      {status}
                    </span>
                  </div>
                ))}
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

            {/* Activity Timeline — desktop sidebar */}
            {(client.interactions || []).length > 0 && (
              <div className="p-5 border-t border-navy-800">
                <div className="text-navy-400 text-xs font-semibold uppercase tracking-wider mb-3">Activity Timeline</div>
                <div className="space-y-2">
                  {(client.interactions || []).slice(0, 3).map((interaction, i) => (
                    <div key={i} className="flex gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-navy-500 flex-shrink-0 mt-1.5" />
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-navy-200 capitalize">{interaction.interaction_type?.replace(/_/g, ' ') || 'Interaction'}</div>
                        <div className="text-xs text-navy-500 truncate">{interaction.notes?.slice(0, 60) || '—'}</div>
                        <div className="text-xs text-navy-600 mt-0.5">{interaction.interaction_date?.slice(0, 10)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Center panel ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Desktop topbar (hidden on mobile) */}
        <div className="hidden lg:block bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-bold text-gray-900">{client.name}</h1>
              <div className="text-sm text-gray-500">
                {client.segment} Client · {client.risk_category} ·{' '}
                <span className="font-semibold text-gray-900">{fmt.inr(client.portfolio?.total_value)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell360 />
              <button
                onClick={() => setShowMeetingPrep(true)}
                className="flex items-center gap-2 px-4 py-2 bg-navy-950 text-white text-sm font-medium rounded-lg hover:bg-navy-800 transition-colors active:scale-[0.96]"
              >
                <CalendarCheck size={14} />
                Start Review Cycle
              </button>
            </div>
          </div>
          {/* 6-metric bar */}
          <div className="grid grid-cols-6 gap-2">
            {[
              { label: 'AUM', value: fmt.inr(client.portfolio?.total_value), color: 'text-[#1D6FDB]' },
              { label: 'Open Tasks', value: (client.trades || []).filter(t => t.status === 'pending_approval').length, color: 'text-amber-600' },
              { label: 'Reviews YTD', value: (client.interactions || []).filter(i => new Date(i.interaction_date).getFullYear() === new Date().getFullYear()).length, color: 'text-gray-900' },
              { label: 'Net Flows', value: null, color: 'text-gray-400' },
              { label: 'Portal Actions', value: null, color: 'text-gray-400' },
              { label: 'Risk Drift', value: client.risk_score ? `${client.risk_score}/10` : '—', color: client.risk_score > 7 ? 'text-red-600' : client.risk_score > 4 ? 'text-amber-600' : 'text-emerald-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-gray-50 rounded-lg px-3 py-2 text-center">
                <div className="text-xs text-gray-400 truncate">{label}</div>
                {value === null
                  ? <div className="text-xs font-medium text-gray-300 mt-0.5">Coming Soon</div>
                  : <div className={`text-sm font-bold mt-0.5 tabular-nums ${color}`}>{value}</div>
                }
              </div>
            ))}
          </div>
        </div>

        {/* Mobile 6-metric bar */}
        <div className="lg:hidden px-4 pt-3 flex-shrink-0">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'AUM', value: fmt.inr(client.portfolio?.total_value), color: 'text-[#1D6FDB]' },
              { label: 'Open Tasks', value: (client.trades || []).filter(t => t.status === 'pending_approval').length, color: 'text-amber-600' },
              { label: 'Reviews YTD', value: (client.interactions || []).filter(i => new Date(i.interaction_date).getFullYear() === new Date().getFullYear()).length, color: 'text-gray-900' },
              { label: 'Net Flows', value: null, color: 'text-gray-400' },
              { label: 'Portal Actions', value: null, color: 'text-gray-400' },
              { label: 'Risk Drift', value: client.risk_score ? `${client.risk_score}/10` : '—', color: client.risk_score > 7 ? 'text-red-600' : client.risk_score > 4 ? 'text-amber-600' : 'text-emerald-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white rounded-lg border border-gray-100 px-2 py-1.5 text-center">
                <div className="text-xs text-gray-400 truncate">{label}</div>
                {value === null
                  ? <div className="text-[10px] font-medium text-gray-300 mt-0.5">Soon</div>
                  : <div className={`text-xs font-bold mt-0.5 tabular-nums ${color}`}>{value}</div>
                }
              </div>
            ))}
          </div>
        </div>

        {/* Situation Summary */}
        <div className="px-4 lg:px-6 pt-4 flex-shrink-0">
          <SituationSummary clientId={id} />
        </div>

        {/* ── Workflow Monitor ── */}
        {(() => {
          const trades = client.trades || []
          const stages = [
            { label: 'Draft', status: 'draft' },
            { label: 'Pending', status: 'pending_approval' },
            { label: 'Approved', status: 'approved' },
            { label: 'Compliance', status: 'compliance_check' },
            { label: 'Settled', status: 'settled' },
            { label: 'Rejected', status: 'rejected' },
          ]
          const activeStage = stages.findIndex(s => trades.some(t => t.status === s.status))
          return (
            <div className="px-4 lg:px-6 pt-4 flex-shrink-0">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
                <div className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-2">Workflow Monitor</div>
                <div className="flex items-center gap-1 overflow-x-auto">
                  {stages.map((s, i) => {
                    const count = trades.filter(t => t.status === s.status).length
                    const isActive = i === activeStage
                    const isDone = s.status === 'settled'
                    const isRejected = s.status === 'rejected'
                    return (
                      <div key={s.status} className="flex items-center gap-1 flex-shrink-0">
                        <div className={`text-center px-2 py-1 rounded-lg text-xs font-medium ${
                          isRejected && count > 0 ? 'bg-red-50 text-red-600 border border-red-200' :
                          isActive ? 'bg-blue-50 text-[#1D6FDB] border border-blue-200' :
                          isDone && count > 0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                          'bg-gray-50 text-gray-400'
                        }`}>
                          <div>{s.label}</div>
                          <div className="font-bold">{count}</div>
                        </div>
                        {i < stages.length - 1 && <ChevronRight size={10} className="text-gray-300 flex-shrink-0" />}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })()}

        {/* ── Desktop tabs ── */}
        <div className="hidden lg:block px-6 pt-4 flex-shrink-0">
          <div className="flex gap-1 border-b border-gray-200">
            {desktopTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all -mb-px rounded-t-lg active:scale-[0.96] ${
                  activeTab === tab.key
                    ? 'border-navy-950 text-navy-950 bg-navy-50/60'
                    : 'border-transparent text-gray-400 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Mobile tabs (scrollable) ── */}
        <div className="lg:hidden px-4 pt-3 flex-shrink-0">
          <div className="flex gap-0 border-b border-gray-200 overflow-x-auto scrollbar-none">
            {mobileTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`px-3 py-3 text-xs font-semibold border-b-2 transition-colors -mb-px whitespace-nowrap min-h-[44px] flex items-center ${
                  activeTab === tab.key
                    ? 'border-navy-950 text-navy-950'
                    : 'border-transparent text-gray-400'
                }`}
              >
                {tab.label === 'AI Copilot'
                  ? <span className="flex items-center gap-1"><Sparkles size={11} />AI</span>
                  : tab.label
                }
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-5">
          <div className={activeTab === 'portfolio' ? '' : 'hidden'}>
            <div className="space-y-5">
              {/* Client Basics grid */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-card">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Client Basics</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {[
                    { label: 'Name', value: client.name },
                    { label: 'Email', value: client.email },
                    { label: 'Phone', value: client.phone },
                    { label: 'PAN', value: client.pan_number },
                    { label: 'Risk Score', value: client.risk_score ? `${client.risk_score}/10` : null },
                    { label: 'Segment', value: client.segment },
                    { label: 'City', value: client.city },
                    { label: 'Date of Birth', value: client.date_of_birth?.slice(0, 10) },
                    { label: 'Occupation', value: client.occupation },
                    { label: 'Annual Income', value: client.annual_income ? fmt.inr(client.annual_income) : null },
                    { label: 'AUM', value: client.total_value ? fmt.inr(client.total_value) : null },
                  ].filter(f => f.value).map(({ label, value }) => (
                    <div key={label} className="bg-gray-50 rounded-lg p-2.5">
                      <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</div>
                      <div className="text-sm font-medium text-gray-900 truncate">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-card">
                <PortfolioChart portfolio={client.portfolio} clientName={client.name} />
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 shadow-card">
                <button
                  onClick={() => setHoldingsOpen(o => !o)}
                  className="w-full flex items-center justify-between p-5 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-bold text-gray-800">Holdings</div>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      {client.portfolio?.holdings?.length || 0} funds
                    </span>
                  </div>
                  {holdingsOpen ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
                </button>
                {holdingsOpen && (
                  <div className="px-5 pb-5">
                    {!editingHoldings && (
                      <div className="flex justify-end mb-3">
                        <button
                          onClick={() => { setEditingHoldings(true); setHoldingsError(null) }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-navy-700 border border-navy-200 rounded-lg hover:bg-navy-50 transition-colors"
                        >
                          <Pencil size={11} />
                          Edit Holdings
                        </button>
                      </div>
                    )}
                    {editingHoldings ? (
                      <HoldingsEditForm
                        portfolio={client.portfolio}
                        onSave={handleSaveHoldings}
                        onCancel={() => { setEditingHoldings(false); setHoldingsError(null) }}
                        saving={holdingsSaving}
                        error={holdingsError}
                      />
                    ) : (
                      <HoldingsTable holdings={client.portfolio?.holdings} />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {everActiveRef.current.goals && (
            <div className={activeTab === 'goals' ? '' : 'hidden'}>
              <GoalsPanel clientId={id} goals={client.goals} onGoalsChange={refetchClient} />
            </div>
          )}

          {everActiveRef.current.events && (
            <div className={activeTab === 'events' ? '' : 'hidden'}>
              <div className="space-y-3">
                {/* Header with Log Event button */}
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-gray-700">
                    {displayEvents.length > 0
                      ? `${displayEvents.length} life event${displayEvents.length !== 1 ? 's' : ''}`
                      : 'Life Events'
                    }
                  </div>
                  <button
                    onClick={() => { setShowEventModal(true); setEditingEvent(null); setEventError(null) }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-950 text-white text-xs font-semibold rounded-xl hover:bg-navy-800 transition-colors shadow-sm active:scale-[0.96]"
                  >
                    <Plus size={12} />
                    Log Event
                  </button>
                </div>

                {displayEvents.length === 0 ? (
                  <div className="flex flex-col items-center py-16 text-center">
                    <div className="text-3xl mb-3">📅</div>
                    <div className="text-sm font-semibold text-gray-600 mb-1">No life events recorded</div>
                    <div className="text-xs text-gray-400">Life events like job changes, marriages, and new children will appear here.</div>
                  </div>
                ) : (
                  [...displayEvents]
                    .sort((a, b) => new Date(b.event_date) - new Date(a.event_date))
                    .map(e => (
                      <LifeEventTag
                        key={e.id}
                        event={e}
                        onEdit={(ev) => { setEditingEvent(ev); setShowEventModal(true); setEventError(null) }}
                        onDelete={handleDeleteEvent}
                        pendingDeleteId={pendingDeleteEventId}
                        setPendingDeleteId={setPendingDeleteEventId}
                      />
                    ))
                )}
              </div>
            </div>
          )}

          {everActiveRef.current.trades && (
            <div className={activeTab === 'trades' ? '' : 'hidden'}>
              <TradesPanel clientId={id} />
            </div>
          )}

          {everActiveRef.current.interactions && (
            <div className={activeTab === 'interactions' ? '' : 'hidden'}>
              <InteractionsPanel clientId={id} />
            </div>
          )}

          {everActiveRef.current.billing && (
            <div className={activeTab === 'billing' ? '' : 'hidden'}>
              <ClientBillingTab clientId={id} portfolio={client.portfolio} />
            </div>
          )}

          {everActiveRef.current.kyc && (
            <div className={activeTab === 'kyc' ? '' : 'hidden'}>
              <KycPanel clientId={id} client={client} onStatusChange={refetchClient} />
            </div>
          )}

          {/* Mobile-only: Client Info tab */}
          {everActiveRef.current.info && (
            <div className={activeTab === 'info' ? '' : 'hidden'}>
              <div className="lg:hidden space-y-4">
                {/* Profile */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-navy-950 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-sm tracking-wide">{client.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}</span>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{client.name}</div>
                      <div className="text-sm text-gray-500">Age {client.age}</div>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium mt-1 inline-block ${
                        client.segment === 'HNI' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                      }`}>{client.segment}</span>
                    </div>
                  </div>
                  <RiskMeter score={client.risk_score} category={client.risk_category} />
                </div>

                {/* Flags */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    Active Flags ({client.urgency_flags.length})
                  </div>
                  {client.urgency_flags.length === 0 ? (
                    <div className="flex items-center gap-2 text-green-600 text-sm">
                      <CheckCircle size={14} /> All clear — no active flags
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {client.urgency_flags.map((f, i) => <UrgencyBadge key={i} flag={f} />)}
                    </div>
                  )}
                </div>

                {/* Compliance Snapshot */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Compliance Snapshot</div>
                  <div className="space-y-2">
                    {[
                      {
                        label: 'KYC',
                        status: client.pan_number ? 'Verified' : 'Pending',
                        ok: !!client.pan_number,
                        detail: client.pan_number ? `PAN ${client.pan_number}` : 'PAN not on file',
                      },
                      {
                        label: 'Suitability',
                        status: client.risk_score ? 'Confirmed' : 'Pending',
                        ok: !!client.risk_score,
                        detail: client.risk_score ? `Risk score ${client.risk_score}/10` : 'Risk assessment pending',
                      },
                    ].map(({ label, status, ok, detail }) => (
                      <div key={label} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                        <div>
                          <div className="text-sm font-medium text-gray-800">{label}</div>
                          <div className="text-xs text-gray-400">{detail}</div>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${ok ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {ok ? <CheckCircle size={11} /> : <Clock size={11} />}
                          {status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Mobile-only: AI Copilot tab */}
          {everActiveRef.current.copilot && (
            <div className={activeTab === 'copilot' ? '' : 'hidden'}>
              <div className="lg:hidden -mx-4 -my-5 h-[calc(100vh-280px)] min-h-[400px]">
                <CopilotChat clientId={id} clientName={client.name} messages={copilotMessages} onMessagesChange={setCopilotMessages} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Desktop right panel — Copilot (hidden on mobile) ── */}
      <div className="hidden lg:flex w-96 bg-white border-l border-gray-200 flex-col flex-shrink-0">
        <CopilotChat clientId={id} clientName={client.name} messages={copilotMessages} onMessagesChange={setCopilotMessages} />
      </div>

      {/* Meeting Prep slide-over */}
      {showMeetingPrep && (
        <div className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm" onClick={() => setShowMeetingPrep(false)} />
      )}
      <div className={`fixed inset-y-0 right-0 z-50 transition-transform duration-300 ease-out ${showMeetingPrep ? 'translate-x-0' : 'translate-x-full'}`}>
        <MeetingPrepPanel
          clientId={id}
          clientName={client.name}
          onClose={() => setShowMeetingPrep(false)}
        />
      </div>

      {/* Life Event modal */}
      {showEventModal && (
        <LifeEventModal
          initial={editingEvent ? {
            event_type: editingEvent.event_type,
            event_date: editingEvent.event_date,
            notes: editingEvent.notes || '',
          } : null}
          onSave={handleSaveEvent}
          onClose={() => { setShowEventModal(false); setEditingEvent(null); setEventError(null) }}
          saving={eventSaving}
          error={eventError}
        />
      )}

      {/* Archive confirmation modal */}
      {archiveConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-3">
              <Archive size={20} className="text-amber-500" />
              <h3 className="font-semibold text-gray-900">Archive {client.name}?</h3>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              This client will be hidden from your client book. No data is deleted — you can restore them anytime.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setArchiveConfirm(false)}
                disabled={archiving}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleArchive}
                disabled={archiving}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {archiving ? <Loader2 size={14} className="animate-spin" /> : <Archive size={14} />}
                {archiving ? 'Archiving…' : 'Archive Client'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
