import { getApiClient } from './api/client'

const ADVISOR_KEY = 'aria_advisor_session'
const ADVISOR_TOKEN_KEY = 'aria_advisor_token'
const CLIENT_KEY  = 'aria_client_session'

// ─── Advisor ─────────────────────────────────────────────────────────────────

export const advisorLogin = async (username, password) => {
  try {
    const api = getApiClient()
    // Response shape: { access_token, token_type, advisor: { id, username, display_name, role, ... } }
    // Cookie is set server-side (httpOnly) — we only store display profile in localStorage
    const { data } = await api.post('/advisor/login', { username, password })
    const a = data.advisor
    const session = {
      username: a.username,
      role: a.role,
      displayName: a.display_name,
      city: a.city,
      region: a.region,
      referral_code: a.referral_code,
      advisor_id: a.id,
    }
    localStorage.setItem(ADVISOR_KEY, JSON.stringify(session))
    localStorage.setItem(ADVISOR_TOKEN_KEY, data.access_token)
    return { success: true }
  } catch (err) {
    if (err?.response?.status === 401) return { success: false, error: 'Invalid username or password.' }
    return { success: false, error: 'Unable to connect. Please try again.' }
  }
}

export const advisorLogout = async () => {
  try {
    const api = getApiClient()
    await api.post('/advisor/logout')
  } catch {}
  localStorage.removeItem(ADVISOR_KEY)
  localStorage.removeItem(ADVISOR_TOKEN_KEY)
}

export const getAdvisorToken = () => localStorage.getItem(ADVISOR_TOKEN_KEY)

export const getAdvisorSession = () => {
  try { return JSON.parse(localStorage.getItem(ADVISOR_KEY)) } catch { return null }
}

// ─── Client ──────────────────────────────────────────────────────────────────

const CLIENT_DEMO_MAP = {
  'priya':   { clientId: 1,  clientName: 'Priya Sharma' },
  'rahul':   { clientId: 2,  clientName: 'Rahul Mehta' },
  'anita':   { clientId: 3,  clientName: 'Anita Patel' },
  'vikram':  { clientId: 4,  clientName: 'Vikram Singh' },
  'sunita':  { clientId: 5,  clientName: 'Sunita Reddy' },
  'arjun':   { clientId: 6,  clientName: 'Arjun Kapoor' },
  'meera':   { clientId: 7,  clientName: 'Meera Nair' },
  'rajesh':  { clientId: 8,  clientName: 'Rajesh Kumar' },
  'pooja':   { clientId: 9,  clientName: 'Pooja Gupta' },
  'sanjay':  { clientId: 10, clientName: 'Sanjay Joshi' },
}

const CLIENT_DEMO_PIN = '1234'

export const clientLogin = (identifier, pin) => {
  const key = identifier.toLowerCase().trim()
  if (pin === CLIENT_DEMO_PIN && CLIENT_DEMO_MAP[key]) {
    const { clientId, clientName } = CLIENT_DEMO_MAP[key]
    localStorage.setItem(CLIENT_KEY, JSON.stringify({ clientId, clientName, role: 'client' }))
    return { success: true, clientId }
  }
  return { success: false }
}

export const getClientSession = () => {
  try { return JSON.parse(localStorage.getItem(CLIENT_KEY)) } catch { return null }
}

export const clientLogout = () => localStorage.removeItem(CLIENT_KEY)
