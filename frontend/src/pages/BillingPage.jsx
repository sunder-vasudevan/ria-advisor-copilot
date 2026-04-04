import ARiALogo from '../components/ARiALogo'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, HelpCircle, LogOut, Receipt, RefreshCw, ChevronLeft, CreditCard, Clock, CheckCircle, AlertTriangle } from 'lucide-react'
import { getAllInvoices, getFeeConfig, setFeeConfig, createInvoice, collectInvoice } from '../api/billing'
import { getClients, fmt } from '../api/client'
import { getAdvisorSession, advisorLogout } from '../auth'

const FEE_TYPE_LABELS = { aum: 'AUM %', retainer: 'Fixed Retainer', per_trade: 'Per-Trade', onboarding: 'Onboarding' }
const STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  waived: 'bg-gray-100 text-gray-500',
}

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status] || STATUS_STYLES.pending}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

export default function BillingPage() {
  const navigate = useNavigate()
  const session = getAdvisorSession()

  const [invoices, setInvoices] = useState([])
  const [clients, setClients] = useState([])
  const [feeConfig, setFeeConfigState] = useState(null)
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [configEdit, setConfigEdit] = useState(false)
  const [configForm, setConfigForm] = useState({ fee_type: 'aum', rate: 1.0, billing_period: 'monthly' })
  const [savingConfig, setSavingConfig] = useState(false)
  const [generatingAll, setGeneratingAll] = useState(false)
  const [collectingId, setCollectingId] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const [invRes, clientRes, cfgRes] = await Promise.all([getAllInvoices(), getClients(), getFeeConfig()])
      setInvoices(invRes.data || [])
      setClients(clientRes.clients || clientRes.data || [])
      const cfg = cfgRes.data
      setFeeConfigState(cfg)
      if (cfg) setConfigForm({ fee_type: cfg.fee_type, rate: cfg.rate, billing_period: cfg.billing_period })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const filtered = filter === 'all' ? invoices : invoices.filter(i => i.status === filter)

  const totalReceivables = invoices.filter(i => i.status === 'pending' || i.status === 'overdue').reduce((s, i) => s + i.amount, 0)
  const collectedMonth = invoices.filter(i => {
    if (i.status !== 'paid' || !i.paid_at) return false
    const d = new Date(i.paid_at)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).reduce((s, i) => s + i.amount, 0)
  const overdueCount = invoices.filter(i => i.status === 'overdue').length
  const clientsBilled = new Set(invoices.map(i => i.client_id)).size

  const handleSaveConfig = async () => {
    setSavingConfig(true)
    try {
      const res = await setFeeConfig(configForm)
      setFeeConfigState(res.data)
      setConfigEdit(false)
      showToast('Fee config saved')
    } catch { showToast('Failed to save config', 'error') }
    finally { setSavingConfig(false) }
  }

  const handleGenerateAll = async () => {
    if (!feeConfig) { showToast('Set a default fee config first', 'error'); return }
    setGeneratingAll(true)
    let count = 0
    for (const c of clients) {
      try { await createInvoice(c.id, {}); count++ } catch {}
    }
    showToast(`Generated ${count} invoice${count !== 1 ? 's' : ''}`)
    await loadData()
    setGeneratingAll(false)
  }

  const handleCollect = async (inv) => {
    setCollectingId(inv.id)
    try {
      await collectInvoice(inv.id)
      showToast(`Collected ${fmt.inr(inv.amount)} from ${inv.client_name}`)
      await loadData()
    } catch (e) {
      const msg = e?.response?.data?.detail || 'Collection failed'
      showToast(msg, 'error')
    } finally { setCollectingId(null) }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 md:px-8 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-shrink-0">
          <ARiALogo className="text-[#1D6FDB] font-bold text-base tracking-tight" />
          <span className="hidden md:block text-xs text-gray-400">Advisor Workbench</span>
        </div>
        <nav className="hidden md:flex items-center gap-1">
          <button onClick={() => navigate('/')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-gray-500 hover:bg-gray-100 text-sm font-medium transition-colors">
            <TrendingUp size={14} /> Clients
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-[#1D6FDB] text-sm font-medium">
            <Receipt size={14} /> Billing
          </button>
          <button onClick={() => navigate('/help')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-gray-500 hover:bg-gray-100 text-sm font-medium transition-colors">
            <HelpCircle size={14} /> Help
          </button>
        </nav>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="hidden md:flex items-center gap-2 pl-2 border-l border-gray-200">
            <div className="w-7 h-7 rounded-full bg-blue-100 text-[#1D6FDB] flex items-center justify-center text-xs font-bold">
              {(session?.displayName || 'R')[0]}
            </div>
            <button onClick={() => { advisorLogout(); navigate('/login') }} className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-16 right-4 z-50 px-4 py-2 rounded-lg text-sm font-medium shadow-lg ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex-1 p-4 md:p-8 pb-24 md:pb-8 max-w-7xl mx-auto w-full">
        {/* Page title */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Billing</h1>
            <p className="text-sm text-gray-500 mt-0.5">Fee config, invoices, and collections</p>
          </div>
          <button
            onClick={handleGenerateAll}
            disabled={generatingAll || !feeConfig}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#1D6FDB] text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 shadow-sm transition-colors"
          >
            {generatingAll ? <RefreshCw size={14} className="animate-spin" /> : <Receipt size={14} />}
            Generate All Invoices
          </button>
        </div>

        {/* KPI bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Receivables', value: fmt.inr(totalReceivables), icon: CreditCard, color: 'text-amber-600' },
            { label: 'Collected This Month', value: fmt.inr(collectedMonth), icon: CheckCircle, color: 'text-green-600' },
            { label: 'Overdue', value: overdueCount, icon: AlertTriangle, color: 'text-red-600' },
            { label: 'Clients Billed', value: clientsBilled, icon: TrendingUp, color: 'text-blue-600' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon size={14} className={color} />
                <span className="text-xs text-gray-500">{label}</span>
              </div>
              <div className="text-lg font-bold text-gray-900">{value}</div>
            </div>
          ))}
        </div>

        {/* Fee Config card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-800">Default Fee Configuration</h2>
            <button onClick={() => setConfigEdit(!configEdit)} className="text-xs text-[#1D6FDB] hover:underline">
              {configEdit ? 'Cancel' : 'Edit'}
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
          ) : feeConfig ? (
            <div className="flex flex-wrap gap-6 text-sm">
              <div><span className="text-gray-500">Type: </span><span className="font-medium">{FEE_TYPE_LABELS[feeConfig.fee_type]}</span></div>
              <div><span className="text-gray-500">Rate: </span><span className="font-medium">{feeConfig.fee_type === 'aum' ? `${feeConfig.rate}%` : fmt.inr(feeConfig.rate)}</span></div>
              <div><span className="text-gray-500">Period: </span><span className="font-medium capitalize">{feeConfig.billing_period}</span></div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">No default fee config set. Click Edit to configure.</p>
          )}
        </div>

        {/* Invoice table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-800">Invoices</h2>
            <div className="flex gap-1">
              {['all', 'pending', 'paid', 'overdue', 'waived'].map(s => (
                <button key={s} onClick={() => setFilter(s)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${filter === s ? 'bg-blue-50 text-[#1D6FDB]' : 'text-gray-500 hover:bg-gray-100'}`}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">No invoices{filter !== 'all' ? ` with status "${filter}"` : ''}.</div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium">Client</th>
                      <th className="text-left px-4 py-2 font-medium">Type</th>
                      <th className="text-left px-4 py-2 font-medium">Amount</th>
                      <th className="text-left px-4 py-2 font-medium">Period</th>
                      <th className="text-left px-4 py-2 font-medium">Status</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map(inv => (
                      <tr key={inv.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">
                          <button onClick={() => navigate(`/clients/${inv.client_id}`)} className="hover:text-[#1D6FDB] hover:underline">
                            {inv.client_name}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{FEE_TYPE_LABELS[inv.fee_type] || inv.fee_type}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{fmt.inr(inv.amount)}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{inv.period_start} → {inv.period_end}</td>
                        <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                        <td className="px-4 py-3 text-right">
                          {inv.status === 'pending' && (
                            <button
                              onClick={() => handleCollect(inv)}
                              disabled={collectingId === inv.id}
                              className="px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 disabled:opacity-50"
                            >
                              {collectingId === inv.id ? '…' : 'Collect'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-gray-100">
                {filtered.map(inv => (
                  <div key={inv.id} className="p-4">
                    <div className="flex items-start justify-between mb-1">
                      <button onClick={() => navigate(`/clients/${inv.client_id}`)} className="font-medium text-gray-900 hover:text-[#1D6FDB]">
                        {inv.client_name}
                      </button>
                      <StatusBadge status={inv.status} />
                    </div>
                    <div className="text-xs text-gray-500 mb-2">{FEE_TYPE_LABELS[inv.fee_type]} · {inv.period_start} → {inv.period_end}</div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-900">{fmt.inr(inv.amount)}</span>
                      {inv.status === 'pending' && (
                        <button onClick={() => handleCollect(inv)} disabled={collectingId === inv.id}
                          className="px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 disabled:opacity-50">
                          {collectingId === inv.id ? '…' : 'Collect'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex">
        <button onClick={() => navigate('/')} className="flex-1 flex flex-col items-center justify-center py-3 text-gray-500 text-xs gap-0.5">
          <TrendingUp size={20} className="mb-0.5" />
          Clients
        </button>
        <button className="flex-1 flex flex-col items-center justify-center py-3 text-[#1D6FDB] text-xs gap-0.5">
          <Receipt size={20} className="mb-0.5" />
          Billing
        </button>
        <button onClick={() => navigate('/help')} className="flex-1 flex flex-col items-center justify-center py-3 text-gray-500 text-xs gap-0.5">
          <HelpCircle size={20} className="mb-0.5" />
          Help
        </button>
      </nav>
    </div>
  )
}
