import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Plus, Trash2, ChevronRight, Home } from 'lucide-react'
import { getHouseholds, createHousehold, deleteHousehold, getClients, fmt } from '../api/client'
import { getAdvisorSession, advisorLogout } from '../auth'
import ARiALogo from '../components/ARiALogo'

export default function HouseholdsListPage() {
  const navigate = useNavigate()
  const session = getAdvisorSession()

  const [households, setHouseholds] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('name-first') // 'name-first' | 'select-first'
  const [newName, setNewName] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => {
    Promise.all([getHouseholds(), getClients()])
      .then(([h, c]) => {
        setHouseholds(h)
        setClients(c.filter(cl => !cl.is_archived))
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  function openModal(mode) {
    setModalMode(mode)
    setNewName('')
    setSelectedIds([])
    setShowModal(true)
  }

  async function handleCreate() {
    if (!newName.trim()) return
    setSaving(true)
    try {
      const h = await createHousehold({ name: newName.trim(), client_ids: selectedIds })
      setShowModal(false)
      navigate(`/households/${h.id}`)
    } catch (e) {
      alert(e?.response?.data?.detail || 'Failed to create household')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    try {
      await deleteHousehold(id)
      setHouseholds(prev => prev.filter(h => h.id !== id))
      setDeleteConfirm(null)
    } catch (e) {
      alert(e?.response?.data?.detail || 'Failed to delete household')
    }
  }

  function toggleClient(id) {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const availableClients = clients.filter(c => !c.household_id)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate('/')} className="flex-shrink-0">
            <ARiALogo className="h-7 w-auto" />
          </button>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
            <Home size={14} className="text-blue-600" /> Households
          </span>
          <div className="flex-1" />
          <button
            onClick={() => openModal('name-first')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1D6FDB] text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={14} /> New Household
          </button>
          <button
            onClick={() => { advisorLogout(); navigate('/login') }}
            className="text-xs text-gray-400 hover:text-gray-600 px-2"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse h-28" />
            ))}
          </div>
        ) : households.length === 0 ? (
          <div className="text-center py-20">
            <Users size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No households yet</p>
            <p className="text-sm text-gray-400 mt-1 mb-5">Group family members to see a consolidated view</p>
            <button
              onClick={() => openModal('name-first')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#1D6FDB] text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              <Plus size={14} /> Create your first household
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">{households.length} household{households.length !== 1 ? 's' : ''}</p>
              <button
                onClick={() => openModal('select-first')}
                className="text-sm text-[#1D6FDB] hover:underline flex items-center gap-1"
              >
                <Plus size={13} /> Create from client selection
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {households.map(h => (
                <div
                  key={h.id}
                  className="bg-white rounded-xl border border-gray-100 p-5 hover:border-blue-200 hover:shadow-sm transition-all cursor-pointer group"
                  onClick={() => navigate(`/households/${h.id}`)}
                >
                  <div className="flex items-start justify-between">
                    <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <Users size={16} className="text-blue-600" />
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); setDeleteConfirm(h.id) }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <p className="font-semibold text-gray-900 mt-3">{h.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{h.member_count} member{h.member_count !== 1 ? 's' : ''}</p>
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-sm font-semibold text-blue-700">{fmt.inr(h.total_aum)}</p>
                    <ChevronRight size={14} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Create modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Create Household</h2>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Household Name</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="e.g. Sharma Family"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-2">
                  Add Members <span className="text-gray-400">(optional — can add later)</span>
                </label>
                {availableClients.length === 0 ? (
                  <p className="text-xs text-gray-400">All clients are already in a household.</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-50">
                    {availableClients.map(c => (
                      <label key={c.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(c.id)}
                          onChange={() => toggleClient(c.id)}
                          className="accent-blue-600"
                        />
                        <span className="text-sm text-gray-800">{c.name}</span>
                        <span className="ml-auto text-xs text-gray-400">{c.segment}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 flex gap-2 justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || saving}
                className="px-4 py-2 text-sm bg-[#1D6FDB] text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Creating…' : 'Create Household'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <p className="font-semibold text-gray-900">Delete household?</p>
            <p className="text-sm text-gray-500 mt-1 mb-5">Members will be unlinked but not deleted.</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
