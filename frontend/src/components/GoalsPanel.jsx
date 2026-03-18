import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fmt, getGoalProjection, createGoal, updateGoal, deleteGoal } from '../api/client'
import { Target, AlertCircle, TrendingUp, TrendingDown, SlidersHorizontal, Pencil, Trash2, Plus, X, Loader2, Info } from 'lucide-react'

function ProbabilityRing({ pct }) {
  const r = 22
  const circ = 2 * Math.PI * r
  const filled = (pct / 100) * circ
  const color = pct >= 80 ? '#10b981' : pct >= 70 ? '#f59e0b' : '#ef4444'
  const textColor = pct >= 80 ? 'text-emerald-600' : pct >= 70 ? 'text-amber-600' : 'text-red-600'

  return (
    <div className="flex flex-col items-center flex-shrink-0">
      <div className="relative w-14 h-14">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 52 52">
          <circle cx="26" cy="26" r={r} fill="none" stroke="#f3f4f6" strokeWidth="4" />
          <circle cx="26" cy="26" r={r} fill="none" stroke={color} strokeWidth="4"
            strokeDasharray={`${filled} ${circ - filled}`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-xs font-bold ${textColor}`}>{pct.toFixed(0)}%</span>
        </div>
      </div>
      <p className="text-xs text-gray-400 text-center mt-1 leading-tight">chance of<br/>reaching goal</p>
    </div>
  )
}

function SipStatus({ lastSipDate }) {
  if (!lastSipDate) return <span className="text-xs text-gray-400">No SIP recorded</span>
  const days = Math.floor((Date.now() - new Date(lastSipDate)) / 86400000)
  if (days > 35) return <span className="text-xs font-medium text-red-600">SIP missed · {days}d ago</span>
  if (days > 25) return <span className="text-xs font-medium text-amber-600">SIP {days}d ago</span>
  return <span className="text-xs font-medium text-emerald-600">SIP {days}d ago</span>
}

function SliderControl({ label, min, max, step, value, onChange, displayValue, hint }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-gray-700">{label}</div>
          {hint && <div className="text-xs text-gray-400">{hint}</div>}
        </div>
        <span className="text-sm font-bold text-navy-950 tabular-nums">{displayValue}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-navy-950 h-1.5" />
    </div>
  )
}

const INPUT_CLS = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-300'

function GoalForm({ initial, onSave, onCancel, saving, error }) {
  const [form, setForm] = useState(initial || { goal_name: '', target_amount: '', target_date: '', monthly_sip: '' })
  const set = (f, v) => setForm(s => ({ ...s, [f]: v }))

  return (
    <div className="border-t border-gray-100 mt-3 pt-3 space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Goal Name *</label>
        <input type="text" value={form.goal_name} onChange={e => set('goal_name', e.target.value)}
          placeholder="e.g. Child's Education" className={INPUT_CLS} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Target Amount (₹) *</label>
          <input type="number" min="0" value={form.target_amount} onChange={e => set('target_amount', e.target.value)}
            placeholder="e.g. 5000000" className={INPUT_CLS} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Target Date *</label>
          <div className="grid grid-cols-2 gap-1">
          <select
            value={form.target_date ? form.target_date.slice(5, 7) : ''}
            onChange={e => {
              const y = form.target_date ? form.target_date.slice(0, 4) : new Date().getFullYear() + 1
              set('target_date', `${y}-${e.target.value}-01`)
            }}
            className={INPUT_CLS}>
            <option value="">Month</option>
            {['01','02','03','04','05','06','07','08','09','10','11','12'].map((m, i) => (
              <option key={m} value={m}>{['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i]}</option>
            ))}
          </select>
          <select
            value={form.target_date ? form.target_date.slice(0, 4) : ''}
            onChange={e => {
              const mo = form.target_date ? form.target_date.slice(5, 7) : '01'
              set('target_date', `${e.target.value}-${mo}-01`)
            }}
            className={INPUT_CLS}>
            <option value="">Year</option>
            {Array.from({ length: 30 }, (_, i) => new Date().getFullYear() + i + 1).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Monthly SIP (₹)</label>
        <input type="number" min="0" value={form.monthly_sip} onChange={e => set('monthly_sip', e.target.value)}
          placeholder="e.g. 25000" className={INPUT_CLS} />
      </div>
      {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
      <div className="flex gap-2">
        <button type="button" onClick={onCancel}
          className="flex-1 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
          Cancel
        </button>
        <button type="button" disabled={saving}
          onClick={() => onSave(form)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-navy-950 text-white rounded-lg text-sm font-semibold hover:bg-navy-800 disabled:opacity-60 transition-colors">
          {saving ? <><Loader2 size={13} className="animate-spin" />Saving…</> : 'Save Goal'}
        </button>
      </div>
    </div>
  )
}

export default function GoalsPanel({ clientId, goals, onGoalsChange }) {
  const [sipDelta, setSipDelta] = useState(0)
  const [returnRate, setReturnRate] = useState(12)
  const [yearsDelta, setYearsDelta] = useState(0)
  const [inflationRate, setInflationRate] = useState(6)
  const [projections, setProjections] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [scenarioOpen, setScenarioOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('mode1') // 'mode1' | 'mode2'

  const [editingGoalId, setEditingGoalId] = useState(null)
  const [addingGoal, setAddingGoal] = useState(false)
  const [newGoalForm, setNewGoalForm] = useState({ goal_name: '', target_amount: '', target_date: '', monthly_sip: '' })
  const [formSaving, setFormSaving] = useState(false)
  const [formError, setFormError] = useState(null)
  const [pendingDeleteId, setPendingDeleteId] = useState(null)

  const debounceRef = useRef(null)

  const hasActiveScenario = sipDelta !== 0 || returnRate !== 12 || yearsDelta !== 0 || inflationRate !== 6

  const projectionMap = useMemo(
    () => Object.fromEntries(projections.map(p => [p.goal_id, p])),
    [projections]
  )

  const runScenario = useCallback(async (params) => {
    if (!goals || goals.length === 0) return
    setLoading(true)
    setError(null)
    try {
      const data = await getGoalProjection(clientId, params)
      setProjections(data)
    } catch {
      setError('Unable to run scenario right now.')
    } finally {
      setLoading(false)
    }
  }, [clientId, goals])

  // Debounced auto-run whenever any slider changes
  const scheduleRun = useCallback((overrides = {}) => {
    if (!scenarioOpen) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      runScenario({
        sip_delta: overrides.sipDelta ?? sipDelta,
        return_rate: (overrides.returnRate ?? returnRate) / 100,
        years_delta: overrides.yearsDelta ?? yearsDelta,
        inflation_rate: (overrides.inflationRate ?? inflationRate) / 100,
      })
    }, 500)
  }, [scenarioOpen, sipDelta, returnRate, yearsDelta, inflationRate, runScenario])

  // Auto-run on open
  useEffect(() => {
    if (scenarioOpen && goals && goals.length > 0) {
      runScenario({
        sip_delta: sipDelta,
        return_rate: returnRate / 100,
        years_delta: yearsDelta,
        inflation_rate: inflationRate / 100,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioOpen])

  const handleSlider = (setter, key, val) => {
    setter(val)
    scheduleRun({ [key]: val })
  }

  const resetScenario = () => {
    setSipDelta(0); setReturnRate(12); setYearsDelta(0); setInflationRate(6)
    setProjections([]); setError(null)
  }

  const handleSaveEdit = async (form) => {
    if (!form.goal_name?.trim() || !form.target_amount || Number(form.target_amount) <= 0 || !form.target_date) {
      setFormError('Goal name, target amount, and target date are required.')
      return
    }
    setFormSaving(true); setFormError(null)
    try {
      await updateGoal(clientId, editingGoalId, {
        goal_name: form.goal_name.trim(),
        target_amount: Number(form.target_amount),
        target_date: form.target_date,
        monthly_sip: Number(form.monthly_sip) || 0,
      })
      setEditingGoalId(null)
      onGoalsChange?.()
    } catch {
      setFormError('Failed to save goal.')
    } finally {
      setFormSaving(false)
    }
  }

  const handleSaveNew = async () => {
    const form = newGoalForm
if (!form.goal_name?.trim() || !form.target_amount || Number(form.target_amount) <= 0 || !form.target_date) {
      setFormError('Goal name, target amount, and target date are required.')
      return
    }
    setFormSaving(true); setFormError(null)
    try {
      await createGoal(clientId, {
        goal_name: form.goal_name.trim(),
        target_amount: Number(form.target_amount),
        target_date: form.target_date,
        monthly_sip: Number(form.monthly_sip) || 0,
      })
      setAddingGoal(false)
      setNewGoalForm({ goal_name: '', target_amount: '', target_date: '', monthly_sip: '' })
      onGoalsChange?.()
    } catch {
      setFormError('Failed to add goal.')
    } finally {
      setFormSaving(false)
    }
  }

  const handleDelete = async (goalId) => {
    try {
      await deleteGoal(clientId, goalId)
      setPendingDeleteId(null)
      onGoalsChange?.()
    } catch {
      // silently fail — could add toast later
    }
  }

  const isEmpty = !goals || goals.length === 0

  return (
    <div className="space-y-4">

      {/* What-if panel */}
      {!isEmpty && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-card overflow-hidden">
          <button
            onClick={() => setScenarioOpen(o => !o)}
            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={15} className="text-navy-600" />
              <span className="text-sm font-semibold text-gray-900">What-if Scenario</span>
              {hasActiveScenario && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-navy-100 text-navy-700 font-medium">Modified</span>
              )}
              {loading && <Loader2 size={13} className="text-navy-500 animate-spin" />}
            </div>
            <span className="text-xs text-gray-400">{scenarioOpen ? 'Collapse ↑' : 'Expand ↓'}</span>
          </button>

          {scenarioOpen && (
            <div className="px-5 pb-5 border-t border-gray-100">
              {/* Mode tabs */}
              <div className="flex gap-1 pt-4 pb-3">
                <button
                  onClick={() => setActiveTab('mode1')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    activeTab === 'mode1'
                      ? 'bg-navy-950 text-white'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  Will I achieve it?
                </button>
                <button
                  onClick={() => setActiveTab('mode2')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    activeTab === 'mode2'
                      ? 'bg-navy-950 text-white'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  What SIP do I need?
                </button>
              </div>

              {activeTab === 'mode1' && (
                <div className="space-y-4">
                  <p className="text-xs text-gray-500">
                    Adjust inputs below — probabilities update automatically. All targets are
                    inflation-adjusted to future value.
                  </p>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <SliderControl label="Monthly SIP delta" min={-50000} max={50000} step={5000}
                      value={sipDelta}
                      onChange={v => handleSlider(setSipDelta, 'sipDelta', v)}
                      displayValue={`${sipDelta > 0 ? '+' : ''}${fmt.inr(sipDelta)}`}
                      hint="±₹50k/month" />
                    <SliderControl label="Assumed return" min={6} max={18} step={1}
                      value={returnRate}
                      onChange={v => handleSlider(setReturnRate, 'returnRate', v)}
                      displayValue={`${returnRate}%`}
                      hint="6% – 18% annual" />
                    <SliderControl label="Timeline shift" min={-2} max={5} step={1}
                      value={yearsDelta}
                      onChange={v => handleSlider(setYearsDelta, 'yearsDelta', v)}
                      displayValue={`${yearsDelta > 0 ? '+' : ''}${yearsDelta}y`}
                      hint="-2 to +5 years" />
                    <SliderControl label="Inflation rate" min={3} max={10} step={1}
                      value={inflationRate}
                      onChange={v => handleSlider(setInflationRate, 'inflationRate', v)}
                      displayValue={`${inflationRate}%`}
                      hint="3% – 10% annual" />
                  </div>
                  <button onClick={resetScenario}
                    className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                    Reset to defaults
                  </button>
                  {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</div>}
                </div>
              )}

              {activeTab === 'mode2' && (
                <div className="space-y-4">
                  <p className="text-xs text-gray-500">
                    Shows the monthly SIP required to have an 80% chance of reaching each goal,
                    accounting for inflation. Compare with the current SIP to see the gap.
                  </p>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <SliderControl label="Assumed return" min={6} max={18} step={1}
                      value={returnRate}
                      onChange={v => handleSlider(setReturnRate, 'returnRate', v)}
                      displayValue={`${returnRate}%`}
                      hint="6% – 18% annual" />
                    <SliderControl label="Inflation rate" min={3} max={10} step={1}
                      value={inflationRate}
                      onChange={v => handleSlider(setInflationRate, 'inflationRate', v)}
                      displayValue={`${inflationRate}%`}
                      hint="3% – 10% annual" />
                  </div>
                  {error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</div>}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {isEmpty && !addingGoal && (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="text-3xl mb-3">🎯</div>
          <div className="text-sm font-semibold text-gray-600 mb-1">No goals on record</div>
          <div className="text-xs text-gray-400 mb-5">Add financial goals to track progress and probability.</div>
        </div>
      )}

      {/* Goal cards */}
      {(goals || []).map(g => {
        const daysToTarget = Math.floor((new Date(g.target_date) - Date.now()) / 86400000)
        const yearsToTarget = (daysToTarget / 365).toFixed(1)
        const urgent = g.probability_pct < 70
        const projection = projectionMap[g.id]
        const delta = projection ? projection.projected_probability_pct - projection.base_probability_pct : null
        const isEditing = editingGoalId === g.id
        const isPendingDelete = pendingDeleteId === g.id

        return (
          <div key={g.id} className={`bg-white rounded-2xl border shadow-card overflow-hidden ${
            urgent ? 'border-red-200' : 'border-gray-200'
          }`}>
            {urgent && <div className="h-1 bg-gradient-to-r from-red-400 to-red-600" />}
            {!urgent && <div className="h-1 bg-gradient-to-r from-emerald-400 to-navy-500" />}

            <div className="p-4">
              <div className="flex items-start gap-3">
                <ProbabilityRing pct={g.probability_pct} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <div className="flex items-center gap-1.5">
                        {urgent
                          ? <AlertCircle size={13} className="text-red-500 flex-shrink-0" />
                          : <Target size={13} className="text-navy-500 flex-shrink-0" />
                        }
                        <span className="text-sm font-bold text-gray-900">{g.goal_name}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {fmt.inr(g.target_amount)} · {yearsToTarget}y ·{' '}
                        {new Date(g.target_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                      </div>
                    </div>

                    {/* Edit / Delete actions */}
                    {!isEditing && (
                      <div className="flex items-center gap-1">
                        {isPendingDelete ? (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-red-600">Delete?</span>
                            <button onClick={() => handleDelete(g.id)} className="text-red-600 font-medium hover:underline">Yes</button>
                            <button onClick={() => setPendingDeleteId(null)} className="text-gray-500 hover:underline">No</button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => { setEditingGoalId(g.id); setFormError(null) }}
                              className="p-1.5 text-gray-300 hover:text-navy-600 hover:bg-navy-50 rounded-lg transition-colors"
                              aria-label="Edit goal"
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              onClick={() => setPendingDeleteId(g.id)}
                              className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              aria-label="Delete goal"
                            >
                              <Trash2 size={12} />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                    {isEditing && (
                      <button onClick={() => { setEditingGoalId(null); setFormError(null) }}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        aria-label="Cancel edit">
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      <div className="text-xs text-gray-500">
                        SIP: <span className="font-semibold text-gray-800">{fmt.inr(g.monthly_sip)}/mo</span>
                      </div>
                      <SipStatus lastSipDate={g.last_sip_date} />
                    </div>
                  )}
                </div>
              </div>

              {/* Inline edit form */}
              {isEditing && (
                <GoalForm
                  initial={{
                    goal_name: g.goal_name,
                    target_amount: g.target_amount,
                    target_date: g.target_date,
                    monthly_sip: g.monthly_sip,
                  }}
                  onSave={handleSaveEdit}
                  onCancel={() => { setEditingGoalId(null); setFormError(null) }}
                  saving={formSaving}
                  error={formError}
                />
              )}

              {/* Scenario result — Mode 1 */}
              {!isEditing && projection && activeTab === 'mode1' && scenarioOpen && (
                <div className={`mt-3 rounded-xl border overflow-hidden ${
                  delta >= 0 ? 'border-emerald-200' : 'border-red-200'
                }`}>
                  <div className={`px-3 py-2.5 flex items-center justify-between gap-4 flex-wrap ${
                    delta >= 0 ? 'bg-emerald-50' : 'bg-red-50'
                  }`}>
                    <div className="flex items-center gap-1.5">
                      {delta >= 0
                        ? <TrendingUp size={13} className="text-emerald-600" />
                        : <TrendingDown size={13} className="text-red-500" />
                      }
                      <span className="text-xs font-semibold text-gray-700">Scenario</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs flex-wrap justify-end">
                      <span className={`font-bold text-sm ${delta >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        {projection.projected_probability_pct.toFixed(1)}%
                        <span className="text-xs font-medium ml-1">
                          ({delta >= 0 ? '+' : ''}{delta.toFixed(1)} pts)
                        </span>
                      </span>
                      <span className="text-gray-400">
                        SIP {fmt.inr(projection.monthly_sip)} · {(projection.assumed_return_rate * 100).toFixed(0)}% return
                      </span>
                    </div>
                  </div>
                  {/* Corpus breakdown */}
                  <div className="px-3 py-2 bg-white grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <div className="text-gray-500">Target today's ₹</div>
                    <div className="font-semibold text-gray-800 tabular-nums text-right">{fmt.inr(projection.target_amount)}</div>
                    <div className="text-gray-500">Inflation-adj. target ({(projection.inflation_rate * 100).toFixed(0)}%)</div>
                    <div className="font-semibold text-navy-700 tabular-nums text-right">{fmt.inr(projection.real_target)}</div>
                    <div className="text-gray-500">Projected corpus (future ₹)</div>
                    <div className="font-semibold text-gray-800 tabular-nums text-right">{fmt.inr(projection.median_corpus)}</div>
                    <div className="text-gray-500">Projected corpus (today's ₹)</div>
                    <div className="font-semibold text-gray-800 tabular-nums text-right">{fmt.inr(projection.median_corpus_real)}</div>
                  </div>
                </div>
              )}

              {/* Scenario result — Mode 2 (required SIP) */}
              {!isEditing && projection && activeTab === 'mode2' && scenarioOpen && (
                <div className="mt-3 rounded-xl border border-navy-200 overflow-hidden">
                  <div className="px-3 py-2.5 bg-navy-50 flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Info size={13} className="text-navy-600" />
                      <span className="text-xs font-semibold text-navy-900">SIP Required for 80% success</span>
                    </div>
                  </div>
                  <div className="px-3 py-2 bg-white grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <div className="text-gray-500">Current SIP</div>
                    <div className="font-semibold text-gray-800 tabular-nums text-right">{fmt.inr(g.monthly_sip)}/mo</div>
                    <div className="text-gray-500">Required SIP</div>
                    <div className="font-bold text-navy-700 tabular-nums text-right">{fmt.inr(projection.required_sip ?? 0)}/mo</div>
                    {projection.required_sip != null && (
                      <>
                        <div className="text-gray-500">Gap</div>
                        <div className={`font-semibold tabular-nums text-right ${
                          projection.required_sip > g.monthly_sip ? 'text-red-600' : 'text-emerald-600'
                        }`}>
                          {projection.required_sip > g.monthly_sip
                            ? `+${fmt.inr(projection.required_sip - g.monthly_sip)}/mo needed`
                            : `${fmt.inr(g.monthly_sip - projection.required_sip)}/mo surplus`
                          }
                        </div>
                      </>
                    )}
                    <div className="text-gray-500">Inflation-adj. target</div>
                    <div className="font-semibold text-navy-700 tabular-nums text-right">{fmt.inr(projection.real_target)}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })}

      {/* Add Goal inline form */}
      {addingGoal && (
        <div className="bg-white rounded-2xl border border-dashed border-navy-300 shadow-card p-4">
          <div className="text-sm font-semibold text-gray-700 mb-1">New Goal</div>
          <div className="border-t border-gray-100 mt-3 pt-3 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Goal Name *</label>
              <input type="text" value={newGoalForm.goal_name}
                onChange={e => setNewGoalForm(f => ({ ...f, goal_name: e.target.value }))}
                placeholder="e.g. Child's Education" className={INPUT_CLS} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Target Amount (₹) *</label>
                <input type="number" min="0" value={newGoalForm.target_amount}
                  onChange={e => setNewGoalForm(f => ({ ...f, target_amount: e.target.value }))}
                  placeholder="e.g. 5000000" className={INPUT_CLS} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Target Date *</label>
                <div className="grid grid-cols-2 gap-1">
                  <select
                    value={newGoalForm.target_date ? newGoalForm.target_date.slice(5, 7) : ''}
                    onChange={e => {
                      const y = newGoalForm.target_date ? newGoalForm.target_date.slice(0, 4) : new Date().getFullYear() + 1
                      setNewGoalForm(f => ({ ...f, target_date: `${y}-${e.target.value}-01` }))
                    }}
                    className={INPUT_CLS}>
                    <option value="">Month</option>
                    {['01','02','03','04','05','06','07','08','09','10','11','12'].map((m, i) => (
                      <option key={m} value={m}>{['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i]}</option>
                    ))}
                  </select>
                  <select
                    value={newGoalForm.target_date ? newGoalForm.target_date.slice(0, 4) : ''}
                    onChange={e => {
                      const mo = newGoalForm.target_date ? newGoalForm.target_date.slice(5, 7) : '01'
                      setNewGoalForm(f => ({ ...f, target_date: `${e.target.value}-${mo}-01` }))
                    }}
                    className={INPUT_CLS}>
                    <option value="">Year</option>
                    {Array.from({ length: 30 }, (_, i) => new Date().getFullYear() + i + 1).map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Monthly SIP (₹)</label>
              <input type="number" min="0" value={newGoalForm.monthly_sip}
                onChange={e => setNewGoalForm(f => ({ ...f, monthly_sip: e.target.value }))}
                placeholder="e.g. 25000" className={INPUT_CLS} />
            </div>
            {formError && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</div>}
            <div className="flex gap-2">
              <button type="button" onClick={() => { setAddingGoal(false); setFormError(null); setNewGoalForm({ goal_name: '', target_amount: '', target_date: '', monthly_sip: '' }) }}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button type="button" disabled={formSaving} onClick={handleSaveNew}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-navy-950 text-white rounded-lg text-sm font-semibold hover:bg-navy-800 disabled:opacity-60 transition-colors">
                {formSaving ? <><Loader2 size={13} className="animate-spin" />Saving…</> : 'Save Goal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Goal button */}
      {!addingGoal && (
        <button
          onClick={() => { setAddingGoal(true); setFormError(null) }}
          className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-gray-300 rounded-2xl text-sm font-medium text-gray-500 hover:border-navy-400 hover:text-navy-700 hover:bg-navy-50 transition-all"
        >
          <Plus size={14} />
          Add Goal
        </button>
      )}
    </div>
  )
}
