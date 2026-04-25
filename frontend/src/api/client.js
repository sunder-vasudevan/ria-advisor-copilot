import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({ baseURL: BASE, withCredentials: true })

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

export const updateAdvisorProfile = (data) =>
  api.put('/advisor/me', data).then(r => r.data)

// Trade Management
export const createTradeDraft = (clientId, data) =>
  api.post(`/trades/clients/${clientId}/trades`, data).then(r => r.data)

export const submitTrade = (tradeId, data) =>
  api.put(`/trades/${tradeId}`, data).then(r => r.data)

export const getTrades = (clientId) =>
  api.get(`/trades/clients/${clientId}/trades`).then(r => r.data)

export const approveTrade = (tradeId, data) =>
  api.put(`/trades/${tradeId}/approve`, data).then(r => r.data)

export const rejectTrade = (tradeId, data) =>
  api.put(`/trades/${tradeId}/reject`, data).then(r => r.data)

export const updateCryptoTxHash = (tradeId, data) =>
  api.put(`/trades/${tradeId}/tx-hash`, data).then(r => r.data)

export const archiveClient = (clientId) =>
  api.patch(`/clients/${clientId}/archive`).then(r => r.data)

export const delinkClient = (clientId) =>
  api.patch(`/clients/${clientId}/delink`).then(r => r.data)

// Notifications (FEAT-1004)
export const getAdvisorNotifications = (limit = 20) =>
  api.get(`/notifications/advisor/me?limit=${limit}`).then(r => r.data)

export const markNotificationRead = (notificationId) =>
  api.put(`/notifications/${notificationId}/read`).then(r => r.data)

export const deleteNotification = (notificationId) =>
  api.delete(`/notifications/${notificationId}`).then(r => r.data)

// Prospects (FEAT-2001)
export const getProspects = () => api.get('/prospects').then(r => r.data)
export const createProspect = (data) => api.post('/prospects', data).then(r => r.data)
export const updateProspect = (id, data) => api.put(`/prospects/${id}`, data).then(r => r.data)
export const updateProspectStage = (id, stage) => api.patch(`/prospects/${id}/stage`, { stage }).then(r => r.data)
export const convertProspect = (id) => api.patch(`/prospects/${id}/convert`).then(r => r.data)
export const deleteProspect = (id) => api.delete(`/prospects/${id}`)

// Tasks (FEAT-2002)
export const getTasks = (params = {}) => api.get('/tasks', { params }).then(r => r.data)
export const getTaskSummary = () => api.get('/tasks/summary').then(r => r.data)
export const createTask = (data) => api.post('/tasks', data).then(r => r.data)
export const updateTask = (id, data) => api.put(`/tasks/${id}`, data).then(r => r.data)
export const markTaskDone = (id) => api.patch(`/tasks/${id}/done`).then(r => r.data)
export const deleteTask = (id) => api.delete(`/tasks/${id}`)

// Price refresh
export const refreshClientPrices = (clientId) => api.post(`/prices/refresh/client/${clientId}`).then(r => r.data)

// KYC (FEAT-KYC)
export const getKycDocuments = (clientId) =>
  api.get(`/clients/${clientId}/kyc/documents`).then(r => r.data)

export const uploadKycDocument = (clientId, file, docType) => {
  const form = new FormData()
  form.append('file', file)
  form.append('doc_type', docType)
  return api.post(`/clients/${clientId}/kyc/documents`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data)
}

export const deleteKycDocument = (clientId, docId) =>
  api.delete(`/clients/${clientId}/kyc/documents/${docId}`)

export const verifyKycDocument = (clientId, docId) =>
  api.patch(`/clients/${clientId}/kyc/documents/${docId}/verify`).then(r => r.data)

export const rejectKycDocument = (clientId, docId, reason) =>
  api.patch(`/clients/${clientId}/kyc/documents/${docId}/reject`, { reason }).then(r => r.data)

export const updateKycStatus = (clientId, kyc_status) =>
  api.patch(`/clients/${clientId}/kyc/status`, { kyc_status }).then(r => r.data)

export const updateNominee = (clientId, data) =>
  api.patch(`/clients/${clientId}/kyc/nominee`, data).then(r => r.data)

export const updateFatca = (clientId, declared) =>
  api.patch(`/clients/${clientId}/kyc/fatca`, { declared }).then(r => r.data)

export const downloadRiskPdf = async (clientId) => {
  const response = await api.get(`/clients/${clientId}/kyc/risk-pdf`, { responseType: 'blob' })
  const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', `risk_profile_${clientId}.pdf`)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export const sendInvite = (clientEmail, clientName) =>
  api.post('/invites', { client_email: clientEmail, client_name: clientName }).then(r => r.data)

// Households (FEAT-HOUSEHOLD)
export const getHouseholds = () => api.get('/households').then(r => r.data)
export const createHousehold = (data) => api.post('/households', data).then(r => r.data)
export const getHousehold = (id) => api.get(`/households/${id}`).then(r => r.data)
export const updateHousehold = (id, data) => api.put(`/households/${id}`, data).then(r => r.data)
export const deleteHousehold = (id) => api.delete(`/households/${id}`)
export const addHouseholdMember = (id, clientId) => api.post(`/households/${id}/members`, { client_id: clientId }).then(r => r.data)
export const removeHouseholdMember = (id, clientId) => api.delete(`/households/${id}/members/${clientId}`)
export const toggleMemberPrivacy = (id, clientId, showIndividualValues) =>
  api.patch(`/households/${id}/members/${clientId}/privacy`, { show_individual_values: showIndividualValues }).then(r => r.data)

export const fmt = {
  inr: (v) => {
    if (!v && v !== 0) return '—'
    if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(2)}Cr`
    if (v >= 100_000)    return `₹${(v / 100_000).toFixed(1)}L`
    return `₹${v.toLocaleString('en-IN')}`
  },
  pct: (v) => `${Number(v).toFixed(1)}%`,
}
