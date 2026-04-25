import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, MessageSquare, Shield, Sparkles, UploadCloud, ArrowLeft } from 'lucide-react'
import { getClient, getClients, getGoals, getTrades, getInteractions, getMeetingPrep, fmt } from '../api/client'

const CARD = 'bg-white rounded-2xl border border-gray-100 shadow-sm p-5'
const SESSION = (() => { try { return JSON.parse(localStorage.getItem('aria_advisor_session') || '{}') } catch { return {} } })()

function StatusChip({ label, tone = 'default' }) {
    const tones = {
        default: 'bg-gray-100 text-gray-700',
        good: 'bg-emerald-100 text-emerald-700',
        warn: 'bg-amber-100 text-amber-700',
    }
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${tones[tone] || tones.default}`}>{label}</span>
}

function Toast({ message, onClose }) {
    useEffect(() => {
        const t = setTimeout(onClose, 3000)
        return () => clearTimeout(t)
    }, [onClose])
    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg">
            {message}
        </div>
    )
}

export default function AdvisorCollabPortalPreview() {
    const [searchParams] = useSearchParams()
    const [clientId, setClientId] = useState(() => {
        const p = searchParams.get('clientId')
        return p ? Number(p) : null
    })
    const [client, setClient] = useState(null)
    const [goals, setGoals] = useState([])
    const [trades, setTrades] = useState([])
    const [interactions, setInteractions] = useState([])
    const [loading, setLoading] = useState(true)
    const [toast, setToast] = useState('')

    // Fallback to first client if no clientId
    useEffect(() => {
        if (!clientId) {
            getClients().then(list => {
                if (Array.isArray(list) && list.length > 0) setClientId(list[0].id)
            }).catch(() => {})
        }
    }, [clientId])

    useEffect(() => {
        if (!clientId) return
        setLoading(true)
        Promise.allSettled([
            getClient(clientId),
            getGoals(clientId),
            getTrades(clientId),
            getInteractions(clientId),
        ]).then(([c, g, t, i]) => {
            setClient(c.status === 'fulfilled' ? c.value : null)
            setGoals(g.status === 'fulfilled' && Array.isArray(g.value) ? g.value : [])
            setTrades(t.status === 'fulfilled' && Array.isArray(t.value) ? t.value : [])
            setInteractions(i.status === 'fulfilled' && Array.isArray(i.value) ? i.value : [])
        }).finally(() => setLoading(false))
    }, [clientId])

    const advisorName = SESSION.displayName || SESSION.username || 'Your Advisor'

    // Milestones from real goals
    const milestones = useMemo(() => {
        if (goals.length === 0) return []
        return goals.slice(0, 3).map(g => ({
            title: g.goal_name,
            by: 'Advisor + Client',
            state: g.probability_pct >= 70 ? 'good' : 'warn',
        }))
    }, [goals])

    // Action queue from pending trades + meeting prep action items
    const actionQueue = useMemo(() => {
        return trades
            .filter(t => t.status === 'pending_approval')
            .slice(0, 3)
            .map(t => ({
                tradeId: t.id,
                clientId: clientId,
                title: `${t.action === 'buy' ? 'Buy' : 'Sell'} ${t.asset_code} — ${fmt.inr(t.estimated_value)}`,
                due: 'Action required',
                priority: 'High',
            }))
    }, [trades, clientId])

    // Current cycle from most recent interaction
    const currentCycle = useMemo(() => {
        if (interactions.length === 0) return { label: 'No cycle started', detail: 'No interactions recorded' }
        const latest = interactions[0]
        const date = latest.interaction_date
            ? new Date(latest.interaction_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
            : 'Recently'
        return { label: 'Active cycle', detail: `Last interaction: ${date}` }
    }, [interactions])

    // Derive active workflow step from trade pipeline
    const workflowSteps = useMemo(() => {
        const hasDraft = trades.some(t => t.status === 'draft')
        const hasPending = trades.some(t => t.status === 'pending_approval')
        const hasSettled = trades.some(t => t.status === 'settled')
        const stepIdx = hasSettled ? 3 : hasPending ? 2 : hasDraft ? 1 : 0
        return [
            { label: 'Plan generated', icon: <CheckCircle2 size={15} />, activeStyle: 'bg-emerald-50 border-emerald-100 text-emerald-700' },
            { label: 'Advisor recommendations', icon: <Sparkles size={15} />, activeStyle: 'bg-amber-50 border-amber-100 text-amber-700' },
            { label: 'Client acknowledgement', icon: <MessageSquare size={15} />, activeStyle: 'bg-blue-50 border-blue-100 text-blue-700' },
            { label: 'Compliance archive', icon: <Shield size={15} />, activeStyle: 'bg-violet-50 border-violet-100 text-violet-700' },
        ].map((s, i) => ({ ...s, active: i === stepIdx }))
    }, [trades])

    return (
        <div className="min-h-screen bg-gray-50">
            {toast && <Toast message={toast} onClose={() => setToast('')} />}

            {/* Sticky header */}
            <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 md:px-8 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link to="/" className="text-gray-400 hover:text-gray-700 transition-colors"><ArrowLeft size={18} /></Link>
                    <span className="text-base font-bold text-gray-900">
                        {loading ? 'Loading…' : client ? `${client.name} — Collaboration` : 'Collaboration Portal'}
                    </span>
                </div>
                <span className="text-sm text-gray-500 hidden sm:block">{advisorName}</span>
            </header>

            <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-4">

                {/* Top row cards */}
                <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className={CARD}>
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Advisor</div>
                        <div className="text-lg font-semibold text-gray-900">{advisorName}</div>
                        <div className="text-sm text-gray-500">Primary relationship manager</div>
                        <button
                            onClick={() => setToast('Messaging coming soon')}
                            className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1D6FDB] text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
                        >
                            <MessageSquare size={14} /> Message client
                        </button>
                    </div>

                    <div className={CARD}>
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Security</div>
                        <div className="flex items-center gap-2 text-gray-900 font-semibold"><Shield size={16} className="text-[#1D6FDB]" /> Secure exchange enabled</div>
                        <div className="text-sm text-gray-500 mt-1">Documents and approvals stay in auditable workflow.</div>
                        <button
                            onClick={() => setToast('Document upload coming soon')}
                            className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            <UploadCloud size={14} /> Upload document
                        </button>
                    </div>

                    <div className={CARD}>
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Current Cycle</div>
                        <div className="text-lg font-semibold text-gray-900">{currentCycle.label}</div>
                        <div className="text-sm text-gray-500 mt-1">{currentCycle.detail}</div>
                        <button
                            onClick={() => setToast('Recommendations view coming soon')}
                            className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            <Sparkles size={14} /> Open recommendations
                        </button>
                    </div>
                </section>

                <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Milestones */}
                    <div className={CARD}>
                        <h2 className="text-sm font-semibold text-gray-800 mb-3">Milestones</h2>
                        {loading ? (
                            <div className="space-y-2">
                                {[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />)}
                            </div>
                        ) : milestones.length === 0 ? (
                            <div className="text-xs text-gray-400 text-center py-4">No goals found for this client.</div>
                        ) : (
                            <div className="space-y-2">
                                {milestones.map((m, i) => (
                                    <div key={i} className="flex items-center justify-between p-2 rounded-lg border border-gray-100 bg-gray-50">
                                        <div>
                                            <div className="text-sm font-medium text-gray-800">{m.title}</div>
                                            <div className="text-xs text-gray-500">By: {m.by}</div>
                                        </div>
                                        <StatusChip label={m.state === 'good' ? 'On track' : 'At risk'} tone={m.state} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Action Queue */}
                    <div className={CARD}>
                        <h2 className="text-sm font-semibold text-gray-800 mb-3">Action Queue</h2>
                        {loading ? (
                            <div className="space-y-2">
                                {[1,2].map(i => <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />)}
                            </div>
                        ) : actionQueue.length === 0 ? (
                            <div className="text-xs text-gray-400 text-center py-4">No pending approvals.</div>
                        ) : (
                            <div className="space-y-2">
                                {actionQueue.map((task, i) => (
                                    <div key={i} className="flex items-start justify-between p-2 rounded-lg border border-gray-100 bg-white">
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-gray-800 truncate">{task.title}</div>
                                            <div className="text-xs text-gray-500">{task.due}</div>
                                        </div>
                                        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                                            <StatusChip label={task.priority} tone="warn" />
                                            <Link to={`/clients/${task.clientId}`} className="text-xs text-[#1D6FDB] hover:underline font-medium">View</Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                {/* Workflow Steps */}
                <div className={CARD}>
                    <h2 className="text-sm font-semibold text-gray-800 mb-3">Workflow Steps</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {workflowSteps.map((step, i) => (
                            <div
                                key={i}
                                className={`p-3 rounded-lg border text-sm transition-colors ${step.active ? step.activeStyle : 'bg-gray-50 border-gray-100 text-gray-500'}`}
                            >
                                <div className="mb-1">{step.icon}</div>
                                <div className="font-medium">{step.label}</div>
                                {step.active && <div className="text-xs mt-0.5 opacity-70">Active</div>}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
