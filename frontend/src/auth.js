import { getApiClient } from './api/client'

const ADVISOR_KEY = 'aria_advisor_session'
const CLIENT_KEY  = 'aria_client_session'

// ─── Advisor ─────────────────────────────────────────────────────────────────
// V1: validates against backend advisors table (bcrypt).
// Falls back to hardcoded map if backend is unavailable (demo resilience).

const ADVISOR_FALLBACK = {
  'rm_demo':     { password: 'aria2026', role: 'advisor',    displayName: 'Rahul',       city: 'Hyderabad', region: 'Telangana', referral_code: 'RAHUL01' },
  'hamza':       { password: 'aria2026', role: 'advisor',    displayName: 'Hamza',       city: 'Lyari',     region: 'Karachi',   referral_code: 'HAMZA01' },
  'sunny_hayes': { password: 'aria2026', role: 'superadmin', displayName: 'Sunny Hayes', city: 'Hyderabad', region: 'Telangana', referral_code: 'SUNNY01' },
}

export const advisorLogin = async (username, password) => {
  // Try backend first
  try {
    const api = getApiClient()
    const { data } = await api.post('/advisor/login', { username, password })
    const session = {
      username: data.username,
      role: data.role,
      displayName: data.display_name,
      city: data.city,
      region: data.region,
      referral_code: data.referral_code,
      advisor_id: data.id,
    }
    localStorage.setItem(ADVISOR_KEY, JSON.stringify(session))
    return { success: true }
  } catch (err) {
    // 401 from backend = wrong credentials — do NOT fall back
    if (err?.response?.status === 401) return { success: false, error: 'Invalid username or password.' }

    // Network/cold-start failure — fall back to local map
    const account = ADVISOR_FALLBACK[username]
    if (account && account.password === password) {
      localStorage.setItem(ADVISOR_KEY, JSON.stringify({
        username,
        role: account.role,
        displayName: account.displayName,
        city: account.city,
        region: account.region,
        referral_code: account.referral_code,
        advisor_id: null,
      }))
      return { success: true }
    }
    return { success: false, error: 'Invalid username or password.' }
  }
}

export const advisorLogout = () => localStorage.removeItem(ADVISOR_KEY)

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
