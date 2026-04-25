import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock3, ShieldCheck, Sparkles, UserCircle2, X } from 'lucide-react'
import { getClient, getClients, getGoals, getTrades, getInteractions, getMeetingPrep, fmt } from '../api/client'

const CARD = 'bg-white rounded-2xl border border-gray-100 shadow-sm p-5'

const SESSION = (() => { try { return JSON.parse(localStorage.getItem('aria_advisor_session') || '{}') } catch { return {} } })()

function StagePill({ status }) {
    const styles = {
        done: 'bg-emerald-100 text-emerald-700',
        active: 'bg-blue-100 text-blue-700',
        blocked: 'bg-rose-100 text-rose-700',
        queued: 'bg-gray-100 text-gray-600',
    }
    return <span className={`px-2 py-1 text-xs rounded-full font-medium ${styles[status] || styles.queued}`}>{status}</span>
}

function SegmentBadge({ segment }) {
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${segment === 'HNI' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'}`}>
            {segment}
        </span>
    )
}

function MeetingPrepModal({ data, onClose }) {
    if (!data) return null
    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[80vh] flex flex-col">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <span className="text-base font-bold text-gray-900">Meeting Prep</span>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                </div>
                <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3 text-sm text-gray-700">
                    {data.summary && <p className="text-gray-600">{data.summary}</p>}
                    {Array.isArray(data.talking_points) && data.talking_points.length > 0 && (
                        <div>
                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Talking Points</div>
                            <ul className="space-y-1.5">
                                {data.talking_points.map((pt, i) => (
                                    <li key={i} className="flex items-start gap-2"><span className="text-[#1D6FDB] mt-0.5">•</span>{pt}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {Array.isArray(data.action_items) && data.action_items.length > 0 && (
                        <div>
                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Action Items</div>
                            <ul className="space-y-1.5">
                                {data.action_items.map((item, i) => (
                                    <li key={i} className="flex items-start gap-2"><span className="text-amber-500 mt-0.5">→</span>{item}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {!data.summary && !data.talking_points && (
                        <pre className="text-xs text-gray-500 whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
                    )}
                </div>
            </div>
        </div>
    )
}

export default function Client360V2Preview() {
    const { id } = useParams()
    const [clientId, setClientId] = useState(id ? Number(id) : null)
    const [client, setClient] = useState(null)
    const [goals, setGoals] = useState([])
    const [trades, setTrades] = useState([])
    const [interactions, setInteractions] = useState([])
    const [loading, setLoading] = useState(true)
    const [meetingPrep, setMeetingPrep] = useState(null)
    const [meetingPrepModal, setMeetingPrepModal] = useState(false)
    const [meetingPrepLoading, setMeetingPrepLoading] = useState(false)

    // If no ID in URL, fall back to first client
    useEffect(() => {
        if (!id) {
            getClients().then(list => {
                if (Array.isArray(list) && list.length > 0) setClientId(list[0].id)
            }).catch(() => {})
        }
    }, [id])

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

    const handleStartReview = async () => {
        if (!clientId) return
        setMeetingPrepLoading(true)
        try {
            const data = await getMeetingPrep(clientId)
            setMeetingPrep(data)
            setMeetingPrepModal(true)
        } catch {
            setMeetingPrep({ summary: 'Meeting prep data unavailable for this client.' })
            setMeetingPrepModal(true)
        } finally {
            setMeetingPrepLoading(false)
        }
    }

    const atRiskGoals = useMemo(() => goals.filter(g => g.probability_pct < 70).length, [goals])
    const pendingTrades = useMemo(() => trades.filter(t => t.status === 'pending_approval').length, [trades])

    const kycStatus = client?.pan_number ? { label: 'Verified', color: 'text-emerald-700' } : { label: 'Pending', color: 'text-amber-700' }
    const suitabilityStatus = client?.risk_score ? { label: 'Confirmed', color: 'text-emerald-700' } : { label: 'Requires review', color: 'text-amber-700' }

    // Derive workflow stages from real trade statuses
    const workflow = useMemo(() => {
        const hasDraft = trades.some(t => t.status === 'draft')
        const hasPending = trades.some(t => t.status === 'pending_approval')
        const hasApproved = trades.some(t => t.status === 'approved')
        const hasSettled = trades.some(t => t.status === 'settled')
        const hasGoals = goals.length > 0
        return [
            { id: 1, label: 'Intake and profile check', status: client ? 'done' : 'queued' },
            { id: 2, label: 'Portfolio drift review', status: hasGoals ? 'active' : 'queued' },
            { id: 3, label: 'Goal projection refresh', status: atRiskGoals > 0 ? 'active' : hasGoals ? 'done' : 'queued' },
            { id: 4, label: 'Recommendation draft', status: hasDraft ? 'active' : hasApproved || hasSettled ? 'done' : 'queued' },
            { id: 5, label: 'Client acknowledgement', status: hasPending ? 'active' : hasSettled ? 'done' : 'queued' },
            { id: 6, label: 'Compliance close-out', status: hasSettled ? 'done' : hasPending ? 'blocked' : 'queued' },
        ]
    }, [trades, goals, client, atRiskGoals])

    // Timeline from real interactions (last 3)
    const timeline = useMemo(() => {
        return interactions.slice(0, 3).map(i => ({
            date: i.interaction_date ? new Date(i.interaction_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : '',
            title: i.summary || i.interaction_type || 'Interaction',
            tone: 'text-blue-700',
        }))
    }, [interactions])

    if (loading) return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-[#1D6FDB] border-t-transparent rounded-full animate-spin" />
        </div>
    )

    if (!client) return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-sm text-gray-500">Client not found. <Link to="/" className="text-[#1D6FDB] hover:underline">Back to list</Link></div>
        </div>
    )

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Sticky header */}
            <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 md:px-8 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link to="/" className="text-gray-400 hover:text-gray-700 transition-colors"><ArrowLeft size={18} /></Link>
                    <span className="text-base font-bold text-gray-900">{client.name}</span>
                    <SegmentBadge segment={client.segment} />
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleStartReview}
                        disabled={meetingPrepLoading}
                        className="px-3 py-1.5 bg-[#1D6FDB] text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        {meetingPrepLoading ? 'Loading…' : 'Start review cycle'}
                    </button>
                    <Link
                        to={`/clients/${clientId}`}
                        className="px-3 py-1.5 border border-gray-200 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Open copilot
                    </Link>
                </div>
            </header>

            {meetingPrepModal && <MeetingPrepModal data={meetingPrep} onClose={() => setMeetingPrepModal(false)} />}

            <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-4">

                {/* KPI cards */}
                <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                        { label: 'AUM', value: fmt.inr(client.portfolio?.total_value ?? 0), accent: 'border-l-[#1D6FDB]', color: 'text-gray-900' },
                        { label: 'Risk Score', value: `${client.risk_score ?? '—'}/10`, accent: client.risk_score > 6 ? 'border-l-rose-500' : client.risk_score > 3 ? 'border-l-amber-500' : 'border-l-emerald-500', color: client.risk_score > 6 ? 'text-rose-700' : client.risk_score > 3 ? 'text-amber-700' : 'text-emerald-700' },
                        { label: 'At-Risk Goals', value: atRiskGoals, accent: atRiskGoals > 0 ? 'border-l-amber-500' : 'border-l-emerald-500', color: atRiskGoals > 0 ? 'text-amber-700' : 'text-emerald-700' },
                        { label: 'Pending Actions', value: pendingTrades, accent: pendingTrades > 0 ? 'border-l-rose-500' : 'border-l-gray-300', color: pendingTrades > 0 ? 'text-rose-700' : 'text-gray-600' },
                    ].map(({ label, value, accent, color }) => (
                        <div key={label} className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 border-l-4 ${accent}`}>
                            <div className="text-xs text-gray-500 mb-1">{label}</div>
                            <div className={`text-2xl font-bold ${color}`}>{value}</div>
                        </div>
                    ))}
                </section>

                <section className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                    <div className="xl:col-span-8 space-y-4">
                        {/* Workflow Monitor */}
                        <div className={CARD}>
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-sm font-semibold text-gray-800">Workflow Monitor</h2>
                                <Clock3 size={16} className="text-gray-400" />
                            </div>
                            <div className="space-y-2">
                                {workflow.map(item => (
                                    <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-100">
                                        <div className="text-sm text-gray-700">{item.label}</div>
                                        <StagePill status={item.status} />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Client Timeline */}
                        <div className={CARD}>
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-sm font-semibold text-gray-800">Client Timeline</h2>
                                <Sparkles size={16} className="text-gray-400" />
                            </div>
                            {timeline.length === 0 ? (
                                <div className="text-xs text-gray-400 text-center py-4">No interactions recorded yet.</div>
                            ) : (
                                <div className="space-y-2">
                                    {timeline.map((event, idx) => (
                                        <div key={idx} className="flex items-center gap-3 p-2 rounded-lg border border-gray-100 bg-white">
                                            <span className="text-xs text-gray-500 w-16 flex-shrink-0">{event.date}</span>
                                            <span className={`text-sm font-medium ${event.tone}`}>{event.title}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <aside className="xl:col-span-4 space-y-4">
                        {/* Advisor Context */}
                        <div className={CARD}>
                            <div className="flex items-center gap-2 mb-3">
                                <UserCircle2 size={16} className="text-gray-500" />
                                <h3 className="text-sm font-semibold text-gray-800">Advisor Context</h3>
                            </div>
                            <div className="space-y-1 text-sm text-gray-600">
                                <div>Primary owner: <span className="font-medium text-gray-900">{SESSION.displayName || SESSION.username || '—'}</span></div>
                                <div>Client age: <span className="font-medium text-gray-900">{client.age || '—'}</span></div>
                                <div>Risk category: <span className="font-medium text-gray-900">{client.risk_category || '—'}</span></div>
                                {client.city && <div>City: <span className="font-medium text-gray-900">{client.city}</span></div>}
                            </div>
                        </div>

                        {/* Compliance Snapshot */}
                        <div className={CARD}>
                            <div className="flex items-center gap-2 mb-3">
                                <ShieldCheck size={16} className="text-gray-500" />
                                <h3 className="text-sm font-semibold text-gray-800">Compliance Snapshot</h3>
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-600">KYC</span>
                                    <span className={`font-medium ${kycStatus.color}`}>{kycStatus.label}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-600">Suitability</span>
                                    <span className={`font-medium ${suitabilityStatus.color}`}>{suitabilityStatus.label}</span>
                                </div>
                                {!client.pan_number && (
                                    <div className="flex items-start gap-2 mt-1 text-xs text-gray-500">
                                        <AlertTriangle size={13} className="text-amber-500 mt-0.5 flex-shrink-0" />
                                        <span>PAN not on file — KYC cannot be verified</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Integration Health (static) */}
                        <div className={CARD}>
                            <h3 className="text-sm font-semibold text-gray-800 mb-3">Integration Health</h3>
                            <div className="space-y-2 text-sm">
                                {[
                                    { label: 'Client record', ok: !!client },
                                    { label: 'Goals data', ok: goals.length > 0 },
                                    { label: 'Trades data', ok: trades.length > 0 },
                                    { label: 'Interactions', ok: interactions.length > 0 },
                                ].map(({ label, ok }) => (
                                    <div key={label} className="flex items-center justify-between">
                                        <span className="text-gray-600">{label}</span>
                                        {ok
                                            ? <CheckCircle2 size={15} className="text-emerald-600" />
                                            : <AlertTriangle size={15} className="text-amber-500" />
                                        }
                                    </div>
                                ))}
                            </div>
                        </div>
                    </aside>
                </section>
            </div>
        </div>
    )
}
