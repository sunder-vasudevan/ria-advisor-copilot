import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({ baseURL: BASE })

export const getApiClient = () => api

export const getClients = () => api.get('/clients').then(r => r.data)

export const getClient = (id) => api.get(`/clients/${id}`).then(r => r.data)

export const getHoldings = (id) => api.get(`/clients/${id}/holdings`).then(r => r.data)

export const getGoals = (id) => api.get(`/clients/${id}/goals`).then(r => r.data)

export const getGoalProjection = (id, params = {}) =>
  api.get(`/clients/${id}/goal-projection`, { params }).then(r => r.data)

export const getSituation = (id) => api.get(`/clients/${id}/situation`).then(r => r.data)

export const sendCopilotMessage = (id, message, conversation_history = []) =>
  api.post(`/clients/${id}/copilot`, { message, conversation_history }).then(r => r.data)

export const getBriefing = (rmId = 'rm_001') =>
  api.get(`/briefing/${rmId}`).then(r => r.data)

export const getMeetingPrep = (id) =>
  api.get(`/clients/${id}/meeting-prep`).then(r => r.data)

export const createClient = (data) =>
  api.post('/clients', data).then(r => r.data)

export const updateClient = (id, data) =>
  api.put(`/clients/${id}`, data).then(r => r.data)

export const createPortfolio = (id, data) =>
  api.post(`/clients/${id}/portfolio`, data).then(r => r.data)

export const createGoal = (id, data) =>
  api.post(`/clients/${id}/goals`, data).then(r => r.data)

export const getInteractions = (id) =>
  api.get(`/clients/${id}/interactions`).then(r => r.data)

export const createInteraction = (id, data) =>
  api.post(`/clients/${id}/interactions`, data).then(r => r.data)

export const deleteInteraction = (clientId, interactionId) =>
  api.delete(`/clients/${clientId}/interactions/${interactionId}`)

export const updateGoal = (clientId, goalId, data) =>
  api.put(`/clients/${clientId}/goals/${goalId}`, data).then(r => r.data)

export const deleteGoal = (clientId, goalId) =>
  api.delete(`/clients/${clientId}/goals/${goalId}`)

export const createLifeEvent = (clientId, data) =>
  api.post(`/clients/${clientId}/life-events`, data).then(r => r.data)

export const updateLifeEvent = (clientId, eventId, data) =>
  api.put(`/clients/${clientId}/life-events/${eventId}`, data).then(r => r.data)

export const deleteLifeEvent = (clientId, eventId) =>
  api.delete(`/clients/${clientId}/life-events/${eventId}`)

export const fmt = {
  inr: (v) => {
    if (!v && v !== 0) return '—'
    if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(2)}Cr`
    if (v >= 100_000)    return `₹${(v / 100_000).toFixed(1)}L`
    return `₹${v.toLocaleString('en-IN')}`
  },
  pct: (v) => `${Number(v).toFixed(1)}%`,
}
