import { useEffect, useState } from 'react'
import { getInteractions, createInteraction, deleteInteraction } from '../api/client'
import {
  Phone, Mail, Users, ArrowRight, Plus, X, Loader2, Trash2,
  CalendarDays, Clock, CheckCircle2, AlertCircle, MessageSquarePlus
} from 'lucide-react'

const TYPE_META = {
  call:      { label: 'Call',      icon: Phone,              bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',   dot: 'bg-blue-400' },
  email:     { label: 'Email',     icon: Mail,               bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200', dot: 'bg-purple-400' },
  meeting:   { label: 'Meeting',   icon: Users,              bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200',dot: 'bg-emerald-400' },
  follow_up: { label: 'Follow-up', icon: ArrowRight,         bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',  dot: 'bg-amber-400' },
}

function TypeBadge({ type }) {
  const m = TYPE_META[type] || TYPE_META.call
  const Icon = m.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${m.bg} ${m.text} border ${m.border}`}>
      <Icon size={10} />
      {m.label}
    </span>
  )
}

function StatChip({ label, value, color = 'text-gray-700' }) {
  return (
    <div className="flex flex-col items-center px-4 py-2 bg-gray-50 rounded-xl border border-gray-100">
      <span className={`text-lg font-bold ${color}`}>{value}</span>
      <span className="text-xs text-gray-400 mt-0.5">{label}</span>
    </div>
  )
}

function InteractionCard({ interaction, onDelete, pendingDeleteId, setPendingDeleteId }) {
  const today = new Date()
  const due = interaction.next_action_due ? new Date(interaction.next_action_due) : null
  const isOverdue = due && due < today
  const daysOverdue = due ? Math.floor((today - due) / 86400000) : 0
  const m = TYPE_META[interaction.interaction_type] || TYPE_META.call
  const isPending = pendingDeleteId === interaction.id

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-card hover:shadow-card-hover transition-shadow space-y-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <TypeBadge type={interaction.interaction_type} />
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <CalendarDays size={10} />
            {new Date(interaction.interaction_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          {interaction.duration_minutes && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Clock size={10} />
              {interaction.duration_minutes}m
            </span>
          )}
        </div>
        {isPending ? (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-red-600">Delete this interaction?</span>
            <button onClick={() => { onDelete(interaction.id); setPendingDeleteId(null) }} className="text-red-600 font-medium hover:underline">Yes, delete</button>
            <button onClick={() => setPendingDeleteId(null)} className="text-gray-500 hover:underline">Cancel</button>
          </div>
        ) : (
          <button
            onClick={() => setPendingDeleteId(interaction.id)}
            className="text-gray-200 hover:text-red-400 transition-colors flex-shrink-0 p-1 rounded-lg hover:bg-red-50"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {/* Subject */}
      <div className="text-sm font-semibold text-gray-900 leading-snug">{interaction.subject}</div>

      {/* Notes */}
      {interaction.notes && (
        <p className="text-xs text-gray-500 leading-relaxed border-l-2 pl-3" style={{ borderColor: m.dot.replace('bg-', '#').replace('bg-', '') }}>
          {interaction.notes}
        </p>
      )}

      {/* Outcome */}
      {interaction.outcome && (
        <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
          <CheckCircle2 size={13} className="text-emerald-500 mt-0.5 flex-shrink-0" />
          <span className="text-xs text-emerald-800 leading-snug">
            <span className="font-semibold">Outcome: </span>{interaction.outcome}
          </span>
        </div>
      )}

      {/* Next action */}
      {interaction.next_action && (
        <div className={`flex items-start gap-2 rounded-xl px-3 py-2 border ${
          isOverdue
            ? 'bg-red-50 border-red-200'
            : 'bg-amber-50 border-amber-100'
        }`}>
          {isOverdue
            ? <AlertCircle size={13} className="text-red-500 mt-0.5 flex-shrink-0" />
            : <ArrowRight size={13} className="text-amber-500 mt-0.5 flex-shrink-0" />
          }
          <div className="text-xs leading-snug">
            <span className={`font-semibold ${isOverdue ? 'text-red-700' : 'text-amber-800'}`}>Next action: </span>
            <span className={isOverdue ? 'text-red-700' : 'text-amber-800'}>{interaction.next_action}</span>
            {due && (
              <span className={`ml-1.5 font-medium ${isOverdue ? 'text-red-600' : 'text-amber-600'}`}>
                {isOverdue
                  ? `· ${daysOverdue}d overdue`
                  : `· by ${due.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
                }
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function EmptyState({ onAdd }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-navy-50 border border-navy-100 flex items-center justify-center mb-4">
        <MessageSquarePlus size={24} className="text-navy-400" />
      </div>
      <div className="text-sm font-semibold text-gray-700 mb-1">No interactions yet</div>
      <div className="text-xs text-gray-400 mb-5 max-w-xs">
        Log your first call, email, or meeting to build this client's interaction history.
      </div>
      <button
        onClick={onAdd}
        className="flex items-center gap-1.5 px-4 py-2 bg-navy-950 text-white text-sm font-medium rounded-xl hover:bg-navy-800 transition-colors"
      >
        <Plus size={14} />
        Log First Interaction
      </button>
    </div>
  )
}

function LogInteractionModal({ clientId, onSave, onClose }) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    interaction_type: 'call',
    interaction_date: today,
    duration_minutes: '',
    subject: '',
    notes: '',
    outcome: '',
    next_action: '',
    next_action_due: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))
  const showDuration = ['call', 'meeting'].includes(form.interaction_type)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.subject.trim()) { setError('Subject is required'); return }
    setSaving(true)
    setError(null)
    try {
      const payload = {
        ...form,
        duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
        notes: form.notes || null,
        outcome: form.outcome || null,
        next_action: form.next_action || null,
        next_action_due: form.next_action_due || null,
      }
      const saved = await createInteraction(clientId, payload)
      onSave(saved)
    } catch {
      setError('Failed to save interaction')
      setSaving(false)
    }
  }

  const m = TYPE_META[form.interaction_type]

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-modal">

        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white z-10 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${m.bg} ${m.border} border`}>
              <m.icon size={14} className={m.text} />
            </div>
            <span className="text-sm font-semibold text-gray-900">Log Interaction</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">

          {/* Type selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Type</label>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(TYPE_META).map(([key, meta]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => set('interaction_type', key)}
                  className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border text-xs font-medium transition-all ${
                    form.interaction_type === key
                      ? `${meta.bg} ${meta.border} ${meta.text} shadow-sm`
                      : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <meta.icon size={14} />
                  {meta.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date + duration */}
          <div className={`grid gap-3 ${showDuration ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
              <input type="date" value={form.interaction_date}
                onChange={e => set('interaction_date', e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy-300" required />
            </div>
            {showDuration && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Duration (mins)</label>
                <input type="number" min="1" placeholder="e.g. 30" value={form.duration_minutes}
                  onChange={e => set('duration_minutes', e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy-300" />
              </div>
            )}
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Subject <span className="text-red-400">*</span></label>
            <input type="text" placeholder="e.g. Discussed rebalancing plan, reviewed equity drift"
              value={form.subject} onChange={e => set('subject', e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy-300" required />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea rows={3} placeholder="Key discussion points, client sentiment, concerns raised…"
              value={form.notes} onChange={e => set('notes', e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy-300 resize-none" />
          </div>

          {/* Outcome */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Outcome</label>
            <input type="text" placeholder="e.g. Client agreed to increase SIP by ₹10,000"
              value={form.outcome} onChange={e => set('outcome', e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy-300" />
          </div>

          {/* Next action */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Next Action</label>
              <input type="text" placeholder="e.g. Send rebalancing proposal"
                value={form.next_action} onChange={e => set('next_action', e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy-300" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Due Date</label>
              <input type="date" value={form.next_action_due}
                onChange={e => set('next_action_due', e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy-300" />
            </div>
          </div>

          {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</div>}

          <div className="flex gap-2 pt-1 pb-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-medium">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-navy-950 rounded-xl hover:bg-navy-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <><Loader2 size={14} className="animate-spin" />Saving…</> : 'Save Interaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function InteractionsPanel({ clientId }) {
  const [interactions, setInteractions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filter, setFilter] = useState('all')
  const [pendingDeleteId, setPendingDeleteId] = useState(null)

  useEffect(() => {
    getInteractions(clientId).then(setInteractions).finally(() => setLoading(false))
  }, [clientId])

  useEffect(() => {
    if (!pendingDeleteId) return
    const t = setTimeout(() => setPendingDeleteId(null), 4000)
    return () => clearTimeout(t)
  }, [pendingDeleteId])

  const handleSave = (saved) => { setInteractions(prev => [saved, ...prev]); setShowModal(false) }
  const handleDelete = async (id) => {
    await deleteInteraction(clientId, id)
    setInteractions(prev => prev.filter(i => i.id !== id))
  }

  const filtered = filter === 'all' ? interactions : interactions.filter(i => i.interaction_type === filter)

  const overdueCount = interactions.filter(i => i.next_action_due && new Date(i.next_action_due) < new Date()).length
  const pendingActions = interactions.filter(i => i.next_action && (!i.next_action_due || new Date(i.next_action_due) >= new Date())).length

  if (loading) return <div className="text-sm text-gray-400 py-12 text-center animate-pulse">Loading interactions…</div>

  return (
    <div className="space-y-4">

      {/* Stats row */}
      {interactions.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <StatChip label="Total" value={interactions.length} />
          <StatChip label="Pending actions" value={pendingActions} color="text-amber-600" />
          <StatChip label="Overdue" value={overdueCount} color={overdueCount > 0 ? 'text-red-600' : 'text-gray-700'} />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-gray-700">
          {interactions.length > 0 ? `${filtered.length} interaction${filtered.length !== 1 ? 's' : ''}` : 'Interaction Log'}
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-950 text-white text-xs font-semibold rounded-xl hover:bg-navy-800 transition-colors shadow-sm active:scale-[0.96] transition-transform">
          <Plus size={12} />
          Log Interaction
        </button>
      </div>

      {/* Filter pills */}
      {interactions.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          <button onClick={() => setFilter('all')}
            className={`px-3 py-1 text-xs rounded-full font-medium transition-colors border active:scale-[0.96] transition-transform ${
              filter === 'all' ? 'bg-navy-950 text-white border-navy-950' : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-white'
            }`}>
            All ({interactions.length})
          </button>
          {Object.entries(TYPE_META).map(([key, m]) => {
            const count = interactions.filter(i => i.interaction_type === key).length
            if (!count) return null
            return (
              <button key={key} onClick={() => setFilter(key)}
                className={`px-3 py-1 text-xs rounded-full font-medium transition-colors border active:scale-[0.96] transition-transform ${
                  filter === key ? `${m.bg} ${m.text} ${m.border}` : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-white'
                }`}>
                {m.label} ({count})
              </button>
            )
          })}
        </div>
      )}

      {/* List or empty state */}
      {interactions.length === 0 ? (
        <EmptyState onAdd={() => setShowModal(true)} />
      ) : filtered.length === 0 ? (
        <div className="text-sm text-gray-400 py-10 text-center">No {TYPE_META[filter]?.label.toLowerCase()} interactions recorded.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(i => <InteractionCard key={i.id} interaction={i} onDelete={handleDelete} pendingDeleteId={pendingDeleteId} setPendingDeleteId={setPendingDeleteId} />)}
        </div>
      )}

      {showModal && <LogInteractionModal clientId={clientId} onSave={handleSave} onClose={() => setShowModal(false)} />}
    </div>
  )
}
