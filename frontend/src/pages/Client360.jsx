import ARiALogo from '../components/ARiALogo'
import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getClient, createPortfolio, archiveClient } from '../api/client'
import { createLifeEvent, updateLifeEvent, deleteLifeEvent } from '../api/client'
import { ArrowLeft, AlertTriangle, Clock, CheckCircle, CalendarCheck, Sparkles, Pencil, ChevronLeft, ChevronRight, Plus, X, Loader2, Trash2, Archive } from 'lucide-react'
import PortfolioChart from '../components/PortfolioChart'
import HoldingsTable from '../components/HoldingsTable'
import GoalsPanel from '../components/GoalsPanel'
import CopilotChat from '../components/CopilotChat'
import SituationSummary from '../components/SituationSummary'
import MeetingPrepPanel from '../components/MeetingPrepPanel'
import InteractionsPanel from '../components/InteractionsPanel'
import TradesPanel from '../components/TradesPanel'
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

export default function Client360() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('portfolio')
  const [showMeetingPrep, setShowMeetingPrep] = useState(false)
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
        window.__ariaClientCache = window.__ariaClientCache || {}
        window.__ariaClientCache[id] = data
        setLifeEvents(null) // reset local overrides
      })
      .catch(() => {})
  }

  useEffect(() => {
    setLoading(true)
    const cached = window.__ariaClientCache?.[id]
    if (cached) {
      setClient(cached)
      setLoading(false)
    }
    getClient(id)
      .then(data => {
        setClient(data)
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
    { key: 'goals', label: `Goals (${client.goals.length})` },
    { key: 'trades', label: 'Trades' },
    { key: 'events', label: `Life Events (${displayEvents.length})` },
    { key: 'interactions', label: 'Interactions' },
  ]
  const mobileTabs = [
    { key: 'portfolio', label: 'Portfolio' },
    { key: 'goals', label: `Goals` },
    { key: 'trades', label: 'Trades' },
    { key: 'events', label: 'Life Events' },
    { key: 'interactions', label: 'Interactions' },
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
          <div className="text-navy-400 text-xs">{client.segment} · {fmt.inr(client.portfolio?.total_value)}</div>
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

            {/* Compliance Snapshot — desktop sidebar */}
            <div className="p-5 border-t border-navy-800">
              <div className="text-navy-400 text-xs font-semibold uppercase tracking-wider mb-3">Compliance</div>
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
          </>
        )}
      </div>

      {/* ── Center panel ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Desktop topbar (hidden on mobile) */}
        <div className="hidden lg:block bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900">{client.name}</h1>
              <div className="text-sm text-gray-500">
                {client.segment} Client · {client.risk_category} ·{' '}
                <span className="font-semibold text-gray-900">{fmt.inr(client.portfolio?.total_value)}</span>
              </div>
            </div>
            <button
              onClick={() => setShowMeetingPrep(true)}
              className="flex items-center gap-2 px-4 py-2 bg-navy-950 text-white text-sm font-medium rounded-lg hover:bg-navy-800 transition-colors active:scale-[0.96] transition-transform"
            >
              <CalendarCheck size={14} />
              Prep for Meeting
            </button>
          </div>
        </div>

        {/* Situation Summary */}
        <div className="px-4 lg:px-6 pt-4 flex-shrink-0">
          <SituationSummary clientId={id} />
        </div>

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
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-card">
                <PortfolioChart portfolio={client.portfolio} clientName={client.name} />
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-card">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-bold text-gray-800">Holdings</div>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      {client.portfolio?.holdings?.length || 0} funds
                    </span>
                  </div>
                  {!editingHoldings && (
                    <button
                      onClick={() => { setEditingHoldings(true); setHoldingsError(null) }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-navy-700 border border-navy-200 rounded-lg hover:bg-navy-50 transition-colors"
                    >
                      <Pencil size={11} />
                      Edit Holdings
                    </button>
                  )}
                </div>
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
