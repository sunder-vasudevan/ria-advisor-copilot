import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Loader, Plus, Trash2 } from 'lucide-react'
import { getClient, createClient, updateClient, createPortfolio, createGoal } from '../api/client'

const SEGMENTS = ['Retail', 'HNI']

const FUND_CATEGORIES = [
  'Large Cap', 'Mid Cap', 'Small Cap', 'Flexi Cap',
  'Debt', 'Liquid', 'Gold', 'International',
]

const RISK_QUESTIONS = [
  {
    id: 'q1',
    text: 'What is your primary investment goal?',
    options: [
      { label: 'Capital preservation', pts: 1 },
      { label: 'Steady income', pts: 2 },
      { label: 'Balanced growth', pts: 3 },
      { label: 'Aggressive growth', pts: 4 },
      { label: 'Maximum returns', pts: 5 },
    ],
  },
  {
    id: 'q2',
    text: 'How long is your investment horizon?',
    options: [
      { label: 'Less than 1 year', pts: 1 },
      { label: '1–3 years', pts: 2 },
      { label: '3–5 years', pts: 3 },
      { label: '5–10 years', pts: 4 },
      { label: '10+ years', pts: 5 },
    ],
  },
  {
    id: 'q3',
    text: 'If your portfolio dropped 20% in a month, you would…',
    options: [
      { label: 'Sell everything', pts: 1 },
      { label: 'Reduce exposure', pts: 2 },
      { label: 'Hold steady', pts: 3 },
      { label: 'Buy a little more', pts: 4 },
      { label: 'Invest significantly more', pts: 5 },
    ],
  },
  {
    id: 'q4',
    text: 'What percentage of your savings are you investing?',
    options: [
      { label: 'Less than 10%', pts: 1 },
      { label: '10–25%', pts: 2 },
      { label: '25–50%', pts: 3 },
      { label: '50–75%', pts: 4 },
      { label: 'More than 75%', pts: 5 },
    ],
  },
  {
    id: 'q5',
    text: 'What best describes your investment experience?',
    options: [
      { label: 'None', pts: 1 },
      { label: 'Basic FDs/RDs', pts: 2 },
      { label: 'Mutual funds', pts: 3 },
      { label: 'Stocks + MFs', pts: 4 },
      { label: 'Active trader', pts: 5 },
    ],
  },
]

function scoreToRisk(total) {
  // total range 5–25
  if (total <= 8)  return { risk_score: total <= 6 ? 1 : 2, risk_category: 'Conservative' }
  if (total <= 12) return { risk_score: total <= 10 ? 3 : 4, risk_category: 'Conservative' }
  if (total <= 16) return { risk_score: total <= 14 ? 5 : 6, risk_category: 'Moderate' }
  if (total <= 20) return { risk_score: total <= 18 ? 7 : 8, risk_category: 'Aggressive' }
  return { risk_score: total <= 23 ? 9 : 10, risk_category: 'Aggressive' }
}

function deriveAge(dob) {
  if (!dob) return ''
  const today = new Date()
  const birth = new Date(dob)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age > 0 ? age : ''
}

const emptyIdentity = {
  name: '',
  date_of_birth: '',
  age: '',
  segment: 'Retail',
  phone: '',
  email: '',
  address: '',
  city: '',
  pincode: '',
  pan_number: '',
}

const emptyAnswers = { q1: null, q2: null, q3: null, q4: null, q5: null }

const emptyHolding = () => ({
  fund_name: '',
  fund_category: 'Large Cap',
  fund_house: '',
  current_value: '',
  target_pct: '',
})

const emptyAllocation = {
  equity_pct: '',
  debt_pct: '',
  cash_pct: '',
  target_equity_pct: '',
  target_debt_pct: '',
  target_cash_pct: '',
}

const emptyGoal = () => ({
  goal_name: '',
  target_amount: '',
  target_date: '',
  monthly_sip: '',
})

const INPUT_CLS = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-300'
const SECTION_CLS = 'bg-white rounded-xl border border-gray-200 p-5 space-y-4'

export default function ClientForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [activeTab, setActiveTab] = useState(0)
  const [savedClientId, setSavedClientId] = useState(isEdit ? Number(id) : null)

  // Tab 1 state
  const [form, setForm] = useState(emptyIdentity)
  const [loadingClient, setLoadingClient] = useState(isEdit)
  const [savingIdentity, setSavingIdentity] = useState(false)
  const [identityError, setIdentityError] = useState(null)

  // Tab 2 state
  const [answers, setAnswers] = useState(emptyAnswers)

  // Tab 3 state
  const [holdings, setHoldings] = useState([emptyHolding()])
  const [allocation, setAllocation] = useState(emptyAllocation)
  const [savingPortfolio, setSavingPortfolio] = useState(false)
  const [portfolioError, setPortfolioError] = useState(null)
  const [portfolioSaved, setPortfolioSaved] = useState(false)

  // Tab 4 state
  const [goals, setGoals] = useState([emptyGoal()])
  const [savingGoals, setSavingGoals] = useState(false)
  const [goalsError, setGoalsError] = useState(null)
  const [goalsSaved, setGoalsSaved] = useState(false)

  useEffect(() => {
    if (!isEdit) return
    getClient(id)
      .then(client => {
        setForm({
          name: client.name || '',
          date_of_birth: client.date_of_birth || '',
          age: client.age || '',
          segment: client.segment || 'Retail',
          phone: client.phone || '',
          email: client.email || '',
          address: client.address || '',
          city: client.city || '',
          pincode: client.pincode || '',
          pan_number: client.pan_number || '',
        })
        // Pre-populate portfolio if exists
        if (client.portfolio) {
          setAllocation({
            equity_pct: client.portfolio.equity_pct ?? '',
            debt_pct: client.portfolio.debt_pct ?? '',
            cash_pct: client.portfolio.cash_pct ?? '',
            target_equity_pct: client.portfolio.target_equity_pct ?? '',
            target_debt_pct: client.portfolio.target_debt_pct ?? '',
            target_cash_pct: client.portfolio.target_cash_pct ?? '',
          })
          if (client.portfolio.holdings?.length) {
            setHoldings(client.portfolio.holdings.map(h => ({
              fund_name: h.fund_name || '',
              fund_category: h.fund_category || 'Large Cap',
              fund_house: h.fund_house || '',
              current_value: h.current_value ?? '',
              target_pct: h.target_pct ?? '',
            })))
          }
        }
        // Pre-populate goals if exist
        if (client.goals?.length) {
          setGoals(client.goals.map(g => ({
            goal_name: g.goal_name || '',
            target_amount: g.target_amount ?? '',
            target_date: g.target_date || '',
            monthly_sip: g.monthly_sip ?? '',
          })))
        }
      })
      .catch(() => setIdentityError('Failed to load client'))
      .finally(() => setLoadingClient(false))
  }, [id, isEdit])

  const setField = (field, value) => setForm(f => {
    const updated = { ...f, [field]: value }
    if (field === 'date_of_birth' && value) {
      const age = deriveAge(value)
      if (age) updated.age = age
    }
    return updated
  })

  // Derived risk from answers
  const answeredCount = Object.values(answers).filter(v => v !== null).length
  const totalPts = Object.values(answers).reduce((sum, v) => sum + (v ?? 0), 0)
  const { risk_score, risk_category } = answeredCount === 5
    ? scoreToRisk(totalPts)
    : { risk_score: null, risk_category: null }

  // ── Tab 1+2 submit (create/update client) ────────────────────────────────
  const handleIdentitySubmit = async (e) => {
    e.preventDefault()
    if (answeredCount < 5) {
      setIdentityError('Please answer all 5 risk questions before saving.')
      setActiveTab(1)
      return
    }
    setIdentityError(null)
    setSavingIdentity(true)

    const payload = {
      name: form.name.trim(),
      age: Number(form.age),
      segment: form.segment,
      risk_score,
      phone: form.phone || null,
      email: form.email || null,
      date_of_birth: form.date_of_birth || null,
      address: form.address || null,
      city: form.city || null,
      pincode: form.pincode || null,
      pan_number: form.pan_number || null,
    }

    try {
      const client = isEdit
        ? await updateClient(id, payload)
        : await createClient(payload)
      setSavedClientId(client.id)
      setActiveTab(2)
    } catch (err) {
      setIdentityError(err?.response?.data?.detail || 'Failed to save client')
    } finally {
      setSavingIdentity(false)
    }
  }

  // ── Tab 3: portfolio save ─────────────────────────────────────────────────
  const handlePortfolioSave = async () => {
    setPortfolioError(null)
    setSavingPortfolio(true)
    setPortfolioSaved(false)

    const validHoldings = holdings.filter(h => h.fund_name.trim() && h.current_value !== '')
    if (!validHoldings.length) {
      setPortfolioError('Add at least one holding with a fund name and value.')
      setSavingPortfolio(false)
      return
    }

    const payload = {
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
    }

    try {
      await createPortfolio(savedClientId, payload)
      setPortfolioSaved(true)
      setTimeout(() => setActiveTab(3), 800)
    } catch (err) {
      setPortfolioError(err?.response?.data?.detail || 'Failed to save portfolio')
    } finally {
      setSavingPortfolio(false)
    }
  }

  // ── Tab 4: goals save ─────────────────────────────────────────────────────
  const handleGoalsSave = async () => {
    setGoalsError(null)
    setSavingGoals(true)
    setGoalsSaved(false)

    const validGoals = goals.filter(g => g.goal_name.trim() && g.target_amount !== '' && g.target_date)
    if (!validGoals.length) {
      setGoalsError('Add at least one goal with a name, target amount, and target date.')
      setSavingGoals(false)
      return
    }

    try {
      for (const g of validGoals) {
        await createGoal(savedClientId, {
          goal_name: g.goal_name.trim(),
          target_amount: Number(g.target_amount),
          target_date: g.target_date,
          monthly_sip: Number(g.monthly_sip) || 0,
        })
      }
      setGoalsSaved(true)
    } catch (err) {
      setGoalsError(err?.response?.data?.detail || 'Failed to save goals')
    } finally {
      setSavingGoals(false)
    }
  }

  // ── Holdings helpers ──────────────────────────────────────────────────────
  const setHolding = (idx, field, value) => {
    setHoldings(hs => hs.map((h, i) => i === idx ? { ...h, [field]: value } : h))
  }
  const addHolding = () => setHoldings(hs => [...hs, emptyHolding()])
  const removeHolding = (idx) => setHoldings(hs => hs.filter((_, i) => i !== idx))

  // ── Goals helpers ─────────────────────────────────────────────────────────
  const setGoalField = (idx, field, value) => {
    setGoals(gs => gs.map((g, i) => i === idx ? { ...g, [field]: value } : g))
  }
  const addGoal = () => setGoals(gs => [...gs, emptyGoal()])
  const removeGoal = (idx) => setGoals(gs => gs.filter((_, i) => i !== idx))

  const clientUnlocked = Boolean(savedClientId)

  const TABS = [
    { label: 'Identity & Contact', short: 'Identity' },
    { label: 'Risk Profile', short: 'Risk' },
    { label: 'Portfolio', short: 'Portfolio', locked: !clientUnlocked },
    { label: 'Goals', short: 'Goals', locked: !clientUnlocked },
  ]

  if (loadingClient) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="text-white animate-pulse">Loading client…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-navy-950 px-4 md:px-8 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate(isEdit ? `/clients/${id}` : '/')}
          className="flex items-center gap-1.5 text-navy-300 hover:text-white text-sm transition-colors"
        >
          <ArrowLeft size={14} />
          <span className="hidden md:inline">{isEdit ? 'Back to Client' : 'Back to Client Book'}</span>
          <span className="md:hidden">Back</span>
        </button>
        <div className="flex-1">
          <div className="text-white font-semibold text-base">
            {isEdit ? 'Edit Client' : 'Add New Client'}
          </div>
          <div className="text-navy-400 text-xs">Client Onboarding</div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-200 px-4 md:px-8">
        <div className="max-w-2xl mx-auto flex gap-0 overflow-x-auto">
          {TABS.map((tab, idx) => (
            <button
              key={idx}
              type="button"
              disabled={tab.locked}
              title={tab.locked ? "Save Identity & Risk Profile first to unlock" : undefined}
              onClick={() => !tab.locked && setActiveTab(idx)}
              className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                ${activeTab === idx
                  ? 'border-navy-950 text-navy-950'
                  : tab.locked
                    ? 'border-transparent text-gray-300 cursor-not-allowed'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.short}</span>
              {tab.locked && <span className="ml-1 text-gray-300 text-xs">🔒</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-2xl mx-auto px-4 md:px-0 py-8 space-y-6">

        {/* ── TAB 1+2: Identity & Risk wrapped in one form ── */}
        {(activeTab === 0 || activeTab === 1) && (
          <form onSubmit={handleIdentitySubmit} className="space-y-6">

            {identityError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {identityError}
              </div>
            )}

            {/* ── TAB 1: Identity & Contact ── */}
            {activeTab === 0 && (
              <>
                <section className={SECTION_CLS}>
                  <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Identity</h2>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                    <input
                      required
                      type="text"
                      value={form.name}
                      onChange={e => setField('name', e.target.value)}
                      placeholder="e.g. Priya Sharma"
                      autoComplete="name"
                      className={INPUT_CLS}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                      <input
                        type="date"
                        value={form.date_of_birth}
                        onChange={e => setField('date_of_birth', e.target.value)}
                        autoComplete="bday"
                        className={INPUT_CLS}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Age *</label>
                      <input
                        required
                        type="number"
                        min="18"
                        max="100"
                        value={form.age}
                        onChange={e => setField('age', e.target.value)}
                        placeholder="Auto-filled from DOB"
                        className={INPUT_CLS}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">PAN Number</label>
                    <input
                      type="text"
                      value={form.pan_number}
                      onChange={e => setField('pan_number', e.target.value.toUpperCase())}
                      placeholder="ABCDE1234F"
                      maxLength={10}
                      autoComplete="off"
                      className={`${INPUT_CLS} uppercase`}
                    />
                  </div>
                </section>

                <section className={SECTION_CLS}>
                  <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Contact</h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={e => setField('phone', e.target.value)}
                        placeholder="+91 98765 43210"
                        autoComplete="tel"
                        className={INPUT_CLS}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={e => setField('email', e.target.value)}
                        placeholder="priya@example.com"
                        autoComplete="email"
                        className={INPUT_CLS}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <input
                      type="text"
                      value={form.address}
                      onChange={e => setField('address', e.target.value)}
                      placeholder="Street / Building / Flat"
                      autoComplete="street-address"
                      className={INPUT_CLS}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                      <input
                        type="text"
                        value={form.city}
                        onChange={e => setField('city', e.target.value)}
                        placeholder="Mumbai"
                        autoComplete="address-level2"
                        className={INPUT_CLS}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
                      <input
                        type="text"
                        value={form.pincode}
                        onChange={e => setField('pincode', e.target.value)}
                        placeholder="400001"
                        maxLength={6}
                        autoComplete="postal-code"
                        className={INPUT_CLS}
                      />
                    </div>
                  </div>
                </section>

                <section className={SECTION_CLS}>
                  <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Segment</h2>
                  <div className="flex gap-3">
                    {SEGMENTS.map(seg => (
                      <button
                        key={seg}
                        type="button"
                        onClick={() => setField('segment', seg)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                          form.segment === seg
                            ? seg === 'HNI'
                              ? 'bg-amber-50 border-amber-400 text-amber-800'
                              : 'bg-navy-50 border-navy-400 text-navy-800'
                            : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        {seg}
                      </button>
                    ))}
                  </div>
                </section>

                <div className="flex gap-3 pb-4">
                  <button
                    type="button"
                    onClick={() => navigate(isEdit ? `/clients/${id}` : '/')}
                    className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab(1)}
                    className="flex-1 py-2.5 bg-navy-950 text-white rounded-lg text-sm font-medium hover:bg-navy-800 transition-colors"
                  >
                    Next: Risk Profile
                  </button>
                </div>
              </>
            )}

            {/* ── TAB 2: Risk Profile ── */}
            {activeTab === 1 && (
              <>
                <section className={SECTION_CLS}>
                  <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Risk Profile Questionnaire</h2>
                  <p className="text-xs text-gray-500">Answer all 5 questions to auto-calculate your risk score.</p>

                  <div className="space-y-6">
                    {RISK_QUESTIONS.map((q, qi) => (
                      <div key={q.id}>
                        <p className="text-sm font-medium text-gray-800 mb-2">
                          {qi + 1}. {q.text}
                        </p>
                        <div className="space-y-2">
                          {q.options.map(opt => (
                            <button
                              key={opt.pts}
                              type="button"
                              onClick={() => setAnswers(a => ({ ...a, [q.id]: opt.pts }))}
                              className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                                answers[q.id] === opt.pts
                                  ? 'bg-navy-50 border-navy-400 text-navy-800 font-medium'
                                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Score preview */}
                {answeredCount === 5 && (
                  <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-1">Derived Risk Score</div>
                      <div className="text-2xl font-bold text-navy-950">{risk_score}<span className="text-base font-normal text-gray-400">/10</span></div>
                    </div>
                    <div className={`px-3 py-1.5 rounded-full text-sm font-semibold ${
                      risk_category === 'Conservative' ? 'bg-green-100 text-green-700' :
                      risk_category === 'Moderate' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {risk_category}
                    </div>
                  </div>
                )}

                {answeredCount < 5 && (
                  <div className="text-xs text-gray-400 text-center">
                    {5 - answeredCount} question{5 - answeredCount !== 1 ? 's' : ''} remaining
                  </div>
                )}

                <div className="flex gap-3 pb-4">
                  <button
                    type="button"
                    onClick={() => setActiveTab(0)}
                    className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={savingIdentity || answeredCount < 5}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-navy-950 text-white rounded-lg text-sm font-medium hover:bg-navy-800 disabled:opacity-60 transition-colors"
                  >
                    {savingIdentity
                      ? <><Loader size={14} className="animate-spin" /> Saving…</>
                      : <><Save size={14} /> {isEdit ? 'Save Changes' : 'Create Client'}</>
                    }
                  </button>
                </div>
              </>
            )}

          </form>
        )}

        {/* ── TAB 3: Portfolio & Holdings ── */}
        {activeTab === 2 && (
          <div className="space-y-6">

            {portfolioError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {portfolioError}
              </div>
            )}
            {portfolioSaved && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                Portfolio saved successfully.
              </div>
            )}

            {/* Asset allocation */}
            <section className={SECTION_CLS}>
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Asset Allocation</h2>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { field: 'equity_pct', label: 'Equity %' },
                  { field: 'debt_pct', label: 'Debt %' },
                  { field: 'cash_pct', label: 'Cash %' },
                ].map(({ field, label }) => (
                  <div key={field}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={allocation[field]}
                      onChange={e => setAllocation(a => ({ ...a, [field]: e.target.value }))}
                      placeholder="0"
                      className={INPUT_CLS}
                    />
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
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={allocation[field]}
                      onChange={e => setAllocation(a => ({ ...a, [field]: e.target.value }))}
                      placeholder="0"
                      className={INPUT_CLS}
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* Holdings */}
            <section className={SECTION_CLS}>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Fund Holdings</h2>
                <button
                  type="button"
                  onClick={addHolding}
                  className="flex items-center gap-1 text-xs text-navy-700 hover:text-navy-950 font-medium"
                >
                  <Plus size={13} /> Add Fund
                </button>
              </div>

              <div className="space-y-4">
                {holdings.map((h, idx) => (
                  <div key={idx} className="border border-gray-100 rounded-lg p-4 space-y-3 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-500">Fund {idx + 1}</span>
                      {holdings.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeHolding(idx)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Fund Name *</label>
                      <input
                        type="text"
                        value={h.fund_name}
                        onChange={e => setHolding(idx, 'fund_name', e.target.value)}
                        placeholder="e.g. Axis Bluechip Fund"
                        className={INPUT_CLS}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                        <select
                          value={h.fund_category}
                          onChange={e => setHolding(idx, 'fund_category', e.target.value)}
                          className={INPUT_CLS}
                        >
                          {FUND_CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Fund House</label>
                        <input
                          type="text"
                          value={h.fund_house}
                          onChange={e => setHolding(idx, 'fund_house', e.target.value)}
                          placeholder="e.g. Axis MF"
                          className={INPUT_CLS}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Current Value (₹) *</label>
                        <input
                          type="number"
                          min="0"
                          value={h.current_value}
                          onChange={e => setHolding(idx, 'current_value', e.target.value)}
                          placeholder="e.g. 500000"
                          className={INPUT_CLS}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Target %</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={h.target_pct}
                          onChange={e => setHolding(idx, 'target_pct', e.target.value)}
                          placeholder="e.g. 25"
                          className={INPUT_CLS}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <div className="flex gap-3 pb-8">
              <button
                type="button"
                onClick={() => setActiveTab(3)}
                className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Skip to Goals
              </button>
              <button
                type="button"
                onClick={handlePortfolioSave}
                disabled={savingPortfolio}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-navy-950 text-white rounded-lg text-sm font-medium hover:bg-navy-800 disabled:opacity-60 transition-colors"
              >
                {savingPortfolio
                  ? <><Loader size={14} className="animate-spin" /> Saving…</>
                  : <><Save size={14} /> Save Portfolio</>
                }
              </button>
            </div>

            {portfolioSaved && (
              <div className="flex gap-3 pb-8">
                <button
                  type="button"
                  onClick={() => setActiveTab(3)}
                  className="w-full py-2.5 bg-navy-950 text-white rounded-lg text-sm font-medium hover:bg-navy-800 transition-colors"
                >
                  Next: Add Goals
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 4: Goals ── */}
        {activeTab === 3 && (
          <div className="space-y-6">

            {goalsError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {goalsError}
              </div>
            )}
            {goalsSaved && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
                <span>Goals saved successfully.</span>
                <button
                  type="button"
                  onClick={() => navigate(`/clients/${savedClientId}`)}
                  className="ml-4 bg-green-700 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-green-800 transition-colors font-medium"
                >
                  View Client →
                </button>
              </div>
            )}

            <section className={SECTION_CLS}>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Investment Goals</h2>
                <button
                  type="button"
                  onClick={addGoal}
                  className="flex items-center gap-1 text-xs text-navy-700 hover:text-navy-950 font-medium"
                >
                  <Plus size={13} /> Add Goal
                </button>
              </div>

              <div className="space-y-4">
                {goals.map((g, idx) => (
                  <div key={idx} className="border border-gray-100 rounded-lg p-4 space-y-3 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-500">Goal {idx + 1}</span>
                      {goals.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeGoal(idx)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Goal Name *</label>
                      <input
                        type="text"
                        value={g.goal_name}
                        onChange={e => setGoalField(idx, 'goal_name', e.target.value)}
                        placeholder="e.g. Child's Education, Retirement"
                        className={INPUT_CLS}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Target Amount (₹) *</label>
                        <input
                          type="number"
                          min="0"
                          value={g.target_amount}
                          onChange={e => setGoalField(idx, 'target_amount', e.target.value)}
                          placeholder="e.g. 5000000"
                          className={INPUT_CLS}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Target Date *</label>
                        <input
                          type="date"
                          value={g.target_date}
                          onChange={e => setGoalField(idx, 'target_date', e.target.value)}
                          className={INPUT_CLS}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Monthly SIP (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={g.monthly_sip}
                        onChange={e => setGoalField(idx, 'monthly_sip', e.target.value)}
                        placeholder="e.g. 25000"
                        className={INPUT_CLS}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <div className="flex gap-3 pb-8">
              <button
                type="button"
                onClick={() => navigate(`/clients/${savedClientId}`)}
                className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Skip to Client
              </button>
              <button
                type="button"
                onClick={handleGoalsSave}
                disabled={savingGoals}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-navy-950 text-white rounded-lg text-sm font-medium hover:bg-navy-800 disabled:opacity-60 transition-colors"
              >
                {savingGoals
                  ? <><Loader size={14} className="animate-spin" /> Saving…</>
                  : <><Save size={14} /> Save Goals</>
                }
              </button>
            </div>

            {goalsSaved && (
              <div className="pb-8">
                <button
                  type="button"
                  onClick={() => navigate(`/clients/${savedClientId}`)}
                  className="w-full py-2.5 bg-navy-950 text-white rounded-lg text-sm font-medium hover:bg-navy-800 transition-colors"
                >
                  View Client 360
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
