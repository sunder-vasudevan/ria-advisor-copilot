import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({ baseURL: BASE })

api.interceptors.request.use(config => {
  try {
    const session = JSON.parse(localStorage.getItem('aria_advisor_session') || '{}')
    if (session.advisor_id) config.headers['X-Advisor-Id'] = session.advisor_id
    if (session.role) config.headers['X-Advisor-Role'] = session.role
  } catch {}
  return config
})

export const getFeeConfig = () => api.get('/billing/fee-config').then(r => r.data)
export const setFeeConfig = (data) => api.put('/billing/fee-config', data).then(r => r.data)

export const getClientFeeConfig = (id) => api.get(`/billing/clients/${id}/fee-config`).then(r => r.data)
export const setClientFeeConfig = (id, data) => api.put(`/billing/clients/${id}/fee-config`, data).then(r => r.data)

export const getClientInvoices = (id) => api.get(`/billing/clients/${id}/invoices`).then(r => r.data)
export const createInvoice = (id, data) => api.post(`/billing/clients/${id}/invoices`, data).then(r => r.data)

export const collectInvoice = (invoiceId) => api.put(`/billing/invoices/${invoiceId}/collect`).then(r => r.data)

export const getAllInvoices = (status) =>
  api.get('/billing/invoices', status ? { params: { status } } : {}).then(r => r.data)

// Personal portal (uses X-Personal-User-Id via separate axios instance)
const personalApi = axios.create({ baseURL: BASE })
personalApi.interceptors.request.use(config => {
  try {
    const session = JSON.parse(localStorage.getItem('aria_personal_session') || '{}')
    if (session.personal_user_id) config.headers['X-Personal-User-Id'] = session.personal_user_id
  } catch {}
  return config
})
export const getPersonalInvoices = () => personalApi.get('/billing/personal/me/invoices').then(r => r.data)
