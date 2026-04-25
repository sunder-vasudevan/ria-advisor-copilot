import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, BarChart3, DollarSign, Users, TrendingUp, ChevronDown } from 'lucide-react'
import { getClients, fmt } from '../api/client'

const CARD = 'bg-white rounded-xl border border-gray-100 shadow-card p-4 md:p-6'
const INPUT_CLS = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-300'

const FEE_TYPES = [
    { value: 'aum', label: 'AUM % Fee', description: 'Annual % of portfolio value' },
    { value: 'retainer', label: 'Fixed Retainer', description: 'Flat fee per client' },
    { value: 'per_trade', label: 'Per-Trade Commission', description: 'Fee per executed trade' },
    { value: 'onboarding', label: 'One-Time Onboarding', description: 'Single fee at signup' },
]

function getSession() {
    try { return JSON.parse(localStorage.getItem('aria_advisor_session') || '{}') } catch { return {} }
}

function computeFee(client, feeConfig) {
    const { type, rate, period } = feeConfig
    if (type === 'aum') {
        const annual = (client.total_value || 0) * (parseFloat(rate) / 100)
        return { monthly: annual / 12, annual }
    }
    if (type === 'retainer') {
        const monthly = period === 'monthly' ? parseFloat(rate) : parseFloat(rate) / 12
        return { monthly, annual: monthly * 12 }
    }
    if (type === 'per_trade') {
        // assume avg 2 trades/month per client for projection
        const monthly = parseFloat(rate) * 2
        return { monthly, annual: monthly * 12 }
    }
    if (type === 'onboarding') {
        return { monthly: 0, annual: parseFloat(rate) }
    }
    return { monthly: 0, annual: 0 }
}

function KpiCard({ icon: Icon, label, value, sub, accent }) {
    return (
        <div className={`${CARD} flex items-start gap-3`}>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${accent}`}>
                <Icon size={16} />
            </div>
            <div className="min-w-0">
                <div className="text-xs text-gray-500 font-medium">{label}</div>
                <div className="text-lg font-bold text-gray-900 mt-0.5 truncate">{value}</div>
                {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
            </div>
        </div>
    )
}

export default function AdvisorBillingPreview() {
    const session = getSession()
    const advisorName = session.displayName || session.username || 'Advisor'

    const [clients, setClients] = useState([])
    const [loading, setLoading] = useState(true)
    const [feeConfig, setFeeConfig] = useState({ type: 'aum', rate: '0.5', period: 'annual' })
    const [applied, setApplied] = useState(false)
    const [clientFees, setClientFees] = useState({}) // per-client overrides

    useEffect(() => {
        getClients()
            .then(data => setClients(Array.isArray(data) ? data : []))
            .catch(() => setClients([]))
            .finally(() => setLoading(false))
    }, [])

    const globalFee = useMemo(() => {
        if (!applied) return null
        return feeConfig
    }, [applied, feeConfig])

    const rows = useMemo(() => {
        return clients.map(c => {
            const cfg = clientFees[c.id] || globalFee || { type: 'aum', rate: '0', period: 'annual' }
            const fee = computeFee(c, cfg)
            return { ...c, feeType: cfg.type, monthly: fee.monthly, annual: fee.annual }
        })
    }, [clients, clientFees, globalFee])

    const totals = useMemo(() => {
        const totalAum = rows.reduce((s, r) => s + (r.total_value || 0), 0)
        const totalMonthly = rows.reduce((s, r) => s + r.monthly, 0)
        const totalAnnual = rows.reduce((s, r) => s + r.annual, 0)
        const byType = FEE_TYPES.map(ft => ({
            ...ft,
            count: rows.filter(r => r.feeType === ft.value).length,
        }))
        return { totalAum, totalMonthly, totalAnnual, byType }
    }, [rows])

    const feeLabel = FEE_TYPES.find(f => f.value === feeConfig.type)?.label || ''

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Sticky header */}
            <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 md:px-8 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Link to="/" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
                        <ArrowLeft size={16} />
                    </Link>
                    <div>
                        <div className="text-sm font-semibold text-gray-900">Advisor Billing</div>
                        <div className="text-xs text-gray-400">{advisorName} · Preview</div>
                    </div>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-violet-100 text-violet-700">Mock data · no save</span>
            </header>

            <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6">

                {/* KPI row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <KpiCard icon={Users} label="Clients" value={clients.length} sub="under management" accent="bg-blue-50 text-[#1D6FDB]" />
                    <KpiCard icon={BarChart3} label="Total AUM" value={fmt.inr(totals.totalAum)} sub="all clients" accent="bg-emerald-50 text-emerald-600" />
                    <KpiCard icon={DollarSign} label="Est. Monthly" value={fmt.inr(totals.totalMonthly)} sub="projected revenue" accent="bg-amber-50 text-amber-600" />
                    <KpiCard icon={TrendingUp} label="Est. Annual" value={fmt.inr(totals.totalAnnual)} sub="projected revenue" accent="bg-violet-50 text-violet-600" />
                </div>

                {/* Fee configuration */}
                <div className={CARD}>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Fee Configuration</div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        {/* Fee type */}
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Fee Type</label>
                            <div className="relative">
                                <select
                                    className={INPUT_CLS + ' appearance-none pr-8'}
                                    value={feeConfig.type}
                                    onChange={e => { setFeeConfig(p => ({ ...p, type: e.target.value })); setApplied(false) }}
                                >
                                    {FEE_TYPES.map(f => (
                                        <option key={f.value} value={f.value}>{f.label}</option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                            <div className="text-xs text-gray-400 mt-1">{FEE_TYPES.find(f => f.value === feeConfig.type)?.description}</div>
                        </div>

                        {/* Rate */}
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">
                                {feeConfig.type === 'aum' ? 'Rate (% per annum)' :
                                    feeConfig.type === 'per_trade' ? 'Commission per trade (₹)' :
                                        feeConfig.type === 'onboarding' ? 'Onboarding fee (₹)' : 'Amount (₹)'}
                            </label>
                            <input
                                type="number"
                                min="0"
                                step={feeConfig.type === 'aum' ? '0.05' : '100'}
                                max={feeConfig.type === 'aum' ? '5' : undefined}
                                className={INPUT_CLS}
                                value={feeConfig.rate}
                                onChange={e => { setFeeConfig(p => ({ ...p, rate: e.target.value })); setApplied(false) }}
                            />
                        </div>

                        {/* Period (retainer only) */}
                        <div>
                            {feeConfig.type === 'retainer' ? (
                                <>
                                    <label className="text-xs text-gray-500 mb-1 block">Billing Period</label>
                                    <div className="relative">
                                        <select
                                            className={INPUT_CLS + ' appearance-none pr-8'}
                                            value={feeConfig.period}
                                            onChange={e => { setFeeConfig(p => ({ ...p, period: e.target.value })); setApplied(false) }}
                                        >
                                            <option value="monthly">Monthly</option>
                                            <option value="annual">Annual</option>
                                        </select>
                                        <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    </div>
                                </>
                            ) : (
                                <div className="text-xs text-gray-400 mt-5 leading-relaxed">
                                    {feeConfig.type === 'per_trade' && 'Projection assumes 2 trades/month per client.'}
                                    {feeConfig.type === 'onboarding' && 'One-time fee shown in annual column only.'}
                                    {feeConfig.type === 'aum' && 'Annual fee divided by 12 for monthly projection.'}
                                </div>
                            )}
                        </div>

                        {/* Apply button */}
                        <div>
                            <button
                                onClick={() => setApplied(true)}
                                className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-[#1D6FDB] text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Apply to all clients
                            </button>
                            {applied && (
                                <div className="text-xs text-emerald-600 mt-1 text-center">
                                    Applied: {feeLabel} @ {feeConfig.type === 'aum' ? `${feeConfig.rate}%` : fmt.inr(parseFloat(feeConfig.rate))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Fee type breakdown pills */}
                    {applied && (
                        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
                            {totals.byType.map(ft => (
                                <span key={ft.value} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                    {ft.label}
                                    <span className="font-semibold text-gray-900">{ft.count}</span>
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Billing summary table */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
                    <div className="px-4 md:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Billing Summary</div>
                        {!applied && (
                            <span className="text-xs text-amber-600 font-medium">Configure fee above and apply to see projections</span>
                        )}
                    </div>
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-5 h-5 border-2 border-[#1D6FDB] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100">
                                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
                                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Segment</th>
                                        <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">AUM</th>
                                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fee Type</th>
                                        <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Est. Monthly</th>
                                        <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Est. Annual</th>
                                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {rows.map(r => (
                                        <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-full bg-blue-100 text-[#1D6FDB] flex items-center justify-center text-xs font-bold flex-shrink-0">
                                                        {r.name.charAt(0)}
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-900">{r.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${r.segment === 'HNI' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                                                    {r.segment}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right text-sm text-gray-700 font-medium">{fmt.inr(r.total_value)}</td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs text-gray-500">
                                                    {FEE_TYPES.find(f => f.value === r.feeType)?.label || '—'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                                                {r.monthly > 0 ? fmt.inr(r.monthly) : <span className="text-gray-300">—</span>}
                                            </td>
                                            <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                                                {r.annual > 0 ? fmt.inr(r.annual) : <span className="text-gray-300">—</span>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${applied ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                                    {applied ? 'Active' : 'Pending setup'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {rows.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-400">No clients found</td>
                                        </tr>
                                    )}
                                </tbody>
                                {rows.length > 0 && applied && (
                                    <tfoot>
                                        <tr className="bg-gray-50 border-t border-gray-200">
                                            <td colSpan={4} className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</td>
                                            <td className="px-6 py-3 text-right text-sm font-bold text-gray-900">{fmt.inr(totals.totalMonthly)}</td>
                                            <td className="px-6 py-3 text-right text-sm font-bold text-gray-900">{fmt.inr(totals.totalAnnual)}</td>
                                            <td />
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    )}
                </div>

            </div>
        </div>
    )
}
