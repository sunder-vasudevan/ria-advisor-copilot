import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import {
  Users, ChevronRight, Pencil, Check, X, UserPlus, UserMinus,
  Eye, EyeOff, Target, Home, Trash2,
} from 'lucide-react'
import {
  getHousehold, updateHousehold, deleteHousehold,
  addHouseholdMember, removeHouseholdMember, toggleMemberPrivacy,
  getClients, fmt,
} from '../api/client'
import { advisorLogout } from '../auth'
import ARiALogo from '../components/ARiALogo'

const PIE_COLORS = ['#1D6FDB', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#84cc16']

export default function HouseholdPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [data, setData] = useState(null)
  const [allClients, setAllClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [showAddMember, setShowAddMember] = useState(false)
  const [removeConfirm, setRemoveConfirm] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [saving, setSaving] = useState(false)

  function load() {
    Promise.all([getHousehold(Number(id)), getClients()])
      .then(([h, c]) => {
        setData(h)
        setAllClients(c.filter(cl => !cl.is_archived))
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  async function saveName() {
    if (!nameInput.trim()) return
    setSaving(true)
    try {
      await updateHousehold(Number(id), { name: nameInput.trim() })
      setData(prev => ({ ...prev, name: nameInput.trim() }))
      setEditingName(false)
    } catch (e) {
      alert(e?.response?.data?.detail || 'Failed to rename')
    } finally {
      setSaving(false)
    }
  }

  async function handleAddMember(clientId) {
    try {
      await addHouseholdMember(Number(id), clientId)
      load()
      setShowAddMember(false)
    } catch (e) {
      alert(e?.response?.data?.detail || 'Failed to add member')
    }
  }

  async function handleRemoveMember(clientId) {
    try {
      await removeHouseholdMember(Number(id), clientId)
      load()
      setRemoveConfirm(null)
    } catch (e) {
      alert(e?.response?.data?.detail || 'Failed to remove member')
    }
  }

  async function handlePrivacyToggle(clientId, current) {
    try {
      await toggleMemberPrivacy(Number(id), clientId, !current)
      setData(prev => ({
        ...prev,
        members: prev.members.map(m =>
          m.client_id === clientId ? { ...m, show_individual_values: !current } : m
        ),
      }))
    } catch (e) {
      alert('Failed to update privacy setting')
    }
  }

  async function handleDelete() {
    try {
      await deleteHousehold(Number(id))
      navigate('/households')
    } catch (e) {
      alert(e?.response?.data?.detail || 'Failed to delete')
    }
  }

  const memberClientIds = data?.members?.map(m => m.client_id) || []
  const addableClients = allClients.filter(c => !memberClientIds.includes(c.id) && !c.household_id)

  const pieData = data
    ? Object.entries(data.aggregated?.holdings_by_category || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, value]) => ({ name, value: Math.round(value) }))
    : []

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
    </div>
  )

  if (!data) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500">Household not found.</p>
    </div>
  )

  const agg = data.aggregated || {}

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate('/')} className="flex-shrink-0">
            <ARiALogo className="h-7 w-auto" />
          </button>
          <span className="text-gray-300">/</span>
          <button onClick={() => navigate('/households')} className="text-sm text-gray-500 hover:text-blue-600 flex items-center gap-1">
            <Home size={13} /> Households
          </button>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-semibold text-gray-800 truncate max-w-[160px]">{data.name}</span>
          <div className="flex-1" />
          <button
            onClick={() => { advisorLogout(); navigate('/login') }}
            className="text-xs text-gray-400 hover:text-gray-600 px-2"
          >Sign out</button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* Title + actions */}
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Users size={22} className="text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  className="border border-blue-300 rounded-lg px-3 py-1.5 text-lg font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300 w-64"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false) }}
                  autoFocus
                />
                <button onClick={saveName} disabled={saving} className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                  <Check size={14} />
                </button>
                <button onClick={() => setEditingName(false)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900">{data.name}</h1>
                <button onClick={() => { setNameInput(data.name); setEditingName(true) }} className="p-1 rounded hover:bg-gray-100 text-gray-400">
                  <Pencil size={13} />
                </button>
              </div>
            )}
            <p className="text-sm text-gray-500 mt-0.5">{data.members?.length || 0} members · Total AUM {fmt.inr(agg.total_aum)}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowAddMember(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-sm font-medium rounded-lg hover:bg-blue-100 transition-colors"
            >
              <UserPlus size={14} /> Add Member
            </button>
            <button
              onClick={() => setDeleteConfirm(true)}
              className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        {/* AUM KPI bar */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total AUM', value: fmt.inr(agg.total_aum) },
            { label: 'Equity', value: `${agg.equity_pct || 0}%` },
            { label: 'Debt', value: `${agg.debt_pct || 0}%` },
          ].map(kpi => (
            <div key={kpi.label} className="bg-white rounded-xl border border-gray-100 px-4 py-3">
              <p className="text-xs text-gray-500">{kpi.label}</p>
              <p className="text-lg font-bold text-gray-900 mt-0.5">{kpi.value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Members */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <h2 className="font-semibold text-gray-800 text-sm">Members</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {data.members?.map(m => (
                <div key={m.client_id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 group">
                  <div
                    className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 cursor-pointer flex-shrink-0"
                    onClick={() => navigate(`/clients/${m.client_id}`)}
                  >
                    {m.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/clients/${m.client_id}`)}>
                    <p className="text-sm font-medium text-gray-900 truncate">{m.name}</p>
                    <p className="text-xs text-gray-400">{m.segment} · KYC: {m.kyc_status}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {m.show_individual_values
                      ? <span className="text-sm font-semibold text-blue-700">{fmt.inr(m.portfolio_value)}</span>
                      : <span className="text-xs text-gray-400">Value hidden</span>
                    }
                    <button
                      title={m.show_individual_values ? 'Hide value from other members' : 'Show value to other members'}
                      onClick={() => handlePrivacyToggle(m.client_id, m.show_individual_values)}
                      className="p-1 rounded hover:bg-gray-100 text-gray-400"
                    >
                      {m.show_individual_values ? <Eye size={13} /> : <EyeOff size={13} />}
                    </button>
                    <button
                      onClick={() => navigate(`/clients/${m.client_id}`)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-100 text-gray-400 transition-opacity"
                    >
                      <ChevronRight size={14} />
                    </button>
                    <button
                      onClick={() => setRemoveConfirm(m.client_id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-opacity"
                    >
                      <UserMinus size={13} />
                    </button>
                  </div>
                </div>
              ))}
              {(!data.members || data.members.length === 0) && (
                <p className="text-sm text-gray-400 px-5 py-6 text-center">No members yet.</p>
              )}
            </div>
          </div>

          {/* Holdings pie chart */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <h2 className="font-semibold text-gray-800 text-sm">Combined Holdings</h2>
            </div>
            {pieData.length > 0 ? (
              <div className="p-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={45}>
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={v => fmt.inr(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-1.5 mt-2">
                  {pieData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="truncate">{d.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 px-5 py-6 text-center">No holdings data yet.</p>
            )}
          </div>
        </div>

        {/* Goals */}
        {data.goals?.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <h2 className="font-semibold text-gray-800 text-sm flex items-center gap-1.5">
                <Target size={14} className="text-blue-500" /> Goals across household
              </h2>
            </div>
            <div className="divide-y divide-gray-50">
              {data.goals.map((g, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{g.goal_name}</p>
                    <p className="text-xs text-gray-400">{g.client_name} · Target {fmt.inr(g.target_amount)}</p>
                  </div>
                  <div className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    g.probability_pct >= 75 ? 'bg-green-50 text-green-700' :
                    g.probability_pct >= 50 ? 'bg-amber-50 text-amber-700' :
                    'bg-red-50 text-red-600'
                  }`}>
                    {g.probability_pct?.toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Add member modal */}
      {showAddMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Add Member</h2>
              <button onClick={() => setShowAddMember(false)} className="p-1 rounded hover:bg-gray-100 text-gray-400">
                <X size={16} />
              </button>
            </div>
            <div className="p-4 max-h-72 overflow-y-auto">
              {addableClients.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No available clients to add.</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {addableClients.map(c => (
                    <button
                      key={c.id}
                      onClick={() => handleAddMember(c.id)}
                      className="w-full flex items-center gap-3 px-2 py-2.5 hover:bg-blue-50 rounded-lg text-left transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                        {c.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{c.name}</p>
                        <p className="text-xs text-gray-400">{c.segment}</p>
                      </div>
                      <ChevronRight size={14} className="ml-auto text-gray-300" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Remove confirm */}
      {removeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <p className="font-semibold text-gray-900">Remove from household?</p>
            <p className="text-sm text-gray-500 mt-1 mb-5">The client record will not be deleted.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setRemoveConfirm(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={() => handleRemoveMember(removeConfirm)} className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600">Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <p className="font-semibold text-gray-900">Delete household?</p>
            <p className="text-sm text-gray-500 mt-1 mb-5">All members will be unlinked. Clients are not affected.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setDeleteConfirm(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
