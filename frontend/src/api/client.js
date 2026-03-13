import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({ baseURL: BASE })

export const getClients = () => api.get('/clients').then(r => r.data)

export const getClient = (id) => api.get(`/clients/${id}`).then(r => r.data)

export const getHoldings = (id) => api.get(`/clients/${id}/holdings`).then(r => r.data)

export const getGoals = (id) => api.get(`/clients/${id}/goals`).then(r => r.data)

export const getSituation = (id) => api.get(`/clients/${id}/situation`).then(r => r.data)

export const sendCopilotMessage = (id, message, conversation_history = []) =>
  api.post(`/clients/${id}/copilot`, { message, conversation_history }).then(r => r.data)

export const getBriefing = (rmId = 'rm_001') =>
  api.get(`/briefing/${rmId}`).then(r => r.data)

export const fmt = {
  inr: (v) => {
    if (!v && v !== 0) return '—'
    if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(2)}Cr`
    if (v >= 100_000)    return `₹${(v / 100_000).toFixed(1)}L`
    return `₹${v.toLocaleString('en-IN')}`
  },
  pct: (v) => `${Number(v).toFixed(1)}%`,
}
