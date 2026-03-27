import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  HelpCircle,
  ChevronDown,
  ChevronRight,
  LogIn,
  Users,
  Sunrise,
  LayoutDashboard,
  MessageSquare,
  FileText,
  ClipboardList,
  Target,
  Heart,
  Globe,
  Wrench,
  AlertCircle,
  History,
  ArrowLeft,
  Bell,
} from 'lucide-react'

const sections = [
  {
    id: 'getting-started',
    icon: <LogIn size={18} />,
    title: 'Getting Started',
    content: [
      {
        heading: 'Advisor Login',
        text: 'Go to /login. Demo credentials: rm_demo / aria2026. After login you land on the Client Book.',
      },
      {
        heading: 'Client Portal Login',
        text: 'Clients log in at /client-portal/login. Enter first name (e.g. priya) and PIN: 1234.',
      },
    ],
  },
  {
    id: 'client-book',
    icon: <Users size={18} />,
    title: 'Client Book',
    content: [
      {
        heading: 'Urgency Flags',
        text: 'Each client row shows a colour-coded urgency flag — Red (high), Amber (medium), Green (on track). Flags are driven by portfolio drift, overdue follow-ups, and life events.',
      },
      {
        heading: 'Search & Filter',
        text: 'Type in the search bar to filter by name or segment. Use the segment pill filters (HNI / Retail) to narrow the list.',
      },
      {
        heading: 'View Toggle',
        text: 'Switch between Grouped view (Needs Attention / On Track, collapsible) and List view using the toggle in the header.',
      },
      {
        heading: 'Add Client',
        text: 'Click Add Client to open the 4-step onboarding wizard: Identity → Risk Profile → Portfolio → Goals.',
      },
    ],
  },
  {
    id: 'morning-briefing',
    icon: <Sunrise size={18} />,
    title: 'Morning Briefing',
    content: [
      {
        heading: 'What it does',
        text: 'Generates an AI summary of which clients need attention today and why — based on urgency flags, portfolio drift, and recent interactions.',
      },
      {
        heading: 'How to use',
        text: 'Click the Morning Briefing button in the top-right of the Client Book. The card is collapsible — click the header chevron to collapse once read.',
      },
      {
        heading: 'Requirement',
        text: 'Requires ANTHROPIC_API_KEY set in the backend environment. If missing, you will see "Briefing unavailable".',
      },
    ],
  },
  {
    id: 'client-360',
    icon: <LayoutDashboard size={18} />,
    title: 'Client 360° View',
    content: [
      {
        heading: 'Opening a client',
        text: 'Click any client row in the Client Book. The 360° view loads with the Overview tab active.',
      },
      {
        heading: 'Sidebar',
        text: 'Shows client summary (AUM, segment, risk, age), urgency flags, and the Situation Summary narrative. The sidebar is collapsible on desktop.',
      },
      {
        heading: 'Portfolio tab',
        text: 'Donut chart of holdings by category. Click any segment to highlight. Double-click the chart area to expand it full-screen with a sortable holdings table. Click Edit Holdings to update the portfolio inline.',
      },
      {
        heading: 'Holdings cards',
        text: 'Click any holding card to open a detail drawer (mobile: bottom sheet / desktop: modal) showing fund name, NAV, units, allocation, target, and drift.',
      },
      {
        heading: 'Goals tab',
        text: 'Each goal card shows the probability ring (Monte Carlo), target amount (inflation-adjusted), and projected corpus. Add, edit, or delete goals inline.',
      },
      {
        heading: 'Life Events tab',
        text: 'Log life milestones (job change, marriage, inheritance, etc.). Events are sorted newest first. Add, edit, or delete events inline.',
      },
      {
        heading: 'Interactions tab',
        text: 'Log calls, emails, meetings, and follow-ups. Overdue follow-ups surface as urgency flags on the Client Book.',
      },
    ],
  },
  {
    id: 'copilot',
    icon: <MessageSquare size={18} />,
    title: 'ARIA Copilot (Chat)',
    content: [
      {
        heading: 'What it does',
        text: 'AI chat assistant on each client\'s 360° page. It knows the client\'s portfolio, goals, life events, and urgency flags.',
      },
      {
        heading: 'Sample questions',
        text: '"Is this client overweight in equity?" / "What should I discuss given their recent life events?" / "Summarize their goal shortfall risk."',
      },
      {
        heading: 'Chat history',
        text: 'Conversation history is maintained within the session and persists across tab switches on mobile and desktop.',
      },
    ],
  },
  {
    id: 'meeting-prep',
    icon: <ClipboardList size={18} />,
    title: 'Meeting Prep Card',
    content: [
      {
        heading: 'How to use',
        text: 'Click Prep for Meeting on any client\'s 360° page. ARIA generates a structured brief in seconds.',
      },
      {
        heading: 'What\'s included',
        text: 'Client snapshot (AUM, risk, segment), active urgency flags, goal status summary, talking points, suggested questions, and life events to reference.',
      },
      {
        heading: 'Printing',
        text: 'Click the Print button to save or print the card before the meeting. Print styles are optimised for A4.',
      },
    ],
  },
  {
    id: 'what-if',
    icon: <Target size={18} />,
    title: 'What-if Goal Scenario',
    content: [
      {
        heading: 'Where to find it',
        text: 'Goals tab → expand the What-if Scenario panel on any client\'s 360° view.',
      },
      {
        heading: 'Mode 1 — Will I achieve it?',
        text: 'Adjust monthly SIP delta (±₹50k), assumed return (6–18%), timeline shift (-2 to +5 years), and inflation (3–10%). Probabilities update automatically as sliders move (500ms debounce). Each goal shows projected probability, delta vs base, inflation-adjusted target, and median corpus in future ₹ and today\'s ₹.',
      },
      {
        heading: 'Mode 2 — What SIP do I need?',
        text: 'Shows the monthly SIP required for 80% probability of success. Compares required vs current SIP with a gap or surplus display.',
      },
      {
        heading: 'How the simulation works',
        text: '1,000 Monte Carlo paths per goal. Each path simulates monthly growth with ±5% annualised volatility around the assumed return. Target is inflated to future value before counting successes.',
      },
    ],
  },
  {
    id: 'client-portal',
    icon: <Globe size={18} />,
    title: 'Client Portal',
    content: [
      {
        heading: 'What clients see',
        text: 'A read-only summary of their own portfolio (donut chart, holdings), goals (probability rings, targets), and life events. No advisor data is exposed.',
      },
      {
        heading: 'Login',
        text: 'Clients go to /client-portal/login and enter their first name and PIN (1234 for demo clients).',
      },
    ],
  },
  {
    id: 'notifications',
    icon: <Bell size={18} />,
    title: 'Notifications',
    content: [
      {
        heading: 'What triggers a notification',
        text: 'You receive a notification whenever a trade changes status. Three types exist: Trade Submitted (a draft trade has been sent for approval), Trade Approved (a submitted trade has been approved), and Trade Rejected (a submitted trade has been rejected).',
      },
      {
        heading: 'The notification bell',
        text: 'The bell icon in the top-right header shows a red badge with the count of unread notifications (max shown: 9+). Click the bell to open the notification panel. Notifications are fetched automatically every 60 seconds.',
      },
      {
        heading: 'Reading notifications',
        text: 'Opening the notification panel marks all visible notifications as read. You can also click any notification to jump directly to that client\'s 360° page.',
      },
      {
        heading: 'Colour coding',
        text: 'Each notification has a coloured left border: amber for submitted, green for approved, red for rejected — matching the trade status colours used throughout the app.',
      },
    ],
  },
  {
    id: 'setup',
    icon: <Wrench size={18} />,
    title: 'Environment Setup',
    content: [
      {
        heading: 'Backend variables (Render)',
        text: 'DATABASE_URL — Supabase pooler connection string (port 6543). ANTHROPIC_API_KEY — Claude API key. FRONTEND_URL — Vercel frontend URL (for CORS).',
      },
      {
        heading: 'Frontend variables (Vercel)',
        text: 'VITE_API_URL — Render backend URL + /api.',
      },
      {
        heading: 'Local development',
        text: 'Backend: cd backend → source venv/bin/activate → uvicorn app.main:app --reload. Frontend: cd frontend → npm run dev.',
      },
      {
        heading: 'Re-seeding demo data',
        text: 'cd backend && python seed.py — resets all 20 demo clients with holdings, goals, and life events.',
      },
    ],
  },
  {
    id: 'troubleshooting',
    icon: <AlertCircle size={18} />,
    title: 'Troubleshooting',
    content: [
      {
        heading: '"Failed to load clients"',
        text: 'CORS or backend not running. Check FRONTEND_URL on Render and confirm the backend service is awake.',
      },
      {
        heading: '"Failed to generate meeting prep" / "Briefing unavailable"',
        text: 'ANTHROPIC_API_KEY is missing or invalid. Add it to Render environment variables and redeploy.',
      },
      {
        heading: 'Blank portfolio or goals',
        text: 'Database not seeded. Run python seed.py from the backend directory.',
      },
    ],
  },
  {
    id: 'changelog',
    icon: <History size={18} />,
    title: 'Version History',
    content: [
      {
        heading: 'v1.2 (2026-03-16)',
        text: 'Meeting Prep Card, Advisor Login, Client Login + Client Portal, audit logging on AI interactions, version number in UI.',
      },
      {
        heading: 'v1.1 (2026-03)',
        text: 'Situation Summary, Morning Briefing, Goal probability (Monte Carlo), ARIA Copilot chat.',
      },
      {
        heading: 'v1.0 (2026-03)',
        text: 'Initial deploy: Client Book, Client 360°, Portfolio & Holdings, Goals, Life Events. Render + Supabase + Vercel stack.',
      },
    ],
  },
]

function SectionCard({ section }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-card">
      <button
        className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3">
          <span className="text-blue-600">{section.icon}</span>
          <span className="text-sm font-semibold text-gray-900">{section.title}</span>
        </div>
        {open
          ? <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
          : <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
        }
      </button>
      {open && (
        <div className="px-5 pb-5 pt-0 space-y-4 border-t border-gray-100">
          {section.content.map((item) => (
            <div key={item.heading} className="pt-4">
              <p className="text-sm font-semibold text-gray-900 mb-1">{item.heading}</p>
              <p className="text-sm text-gray-500 leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function HelpPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">
        {/* Back */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          Back to Client Book
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <HelpCircle size={20} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Guide</h1>
            <p className="text-sm text-gray-500">ARIA Advisor Workbench — click any section to expand</p>
          </div>
        </div>

        {/* Quick nav */}
        <div className="flex flex-wrap gap-2 mb-6">
          {['Getting Started', 'Client Book', 'Morning Briefing', 'Client 360°', 'Copilot', 'Goals', 'Notifications', 'Setup'].map((label) => (
            <span key={label} className="px-2.5 py-1 rounded-full border border-gray-200 text-xs text-gray-600 bg-white">
              {label}
            </span>
          ))}
        </div>

        {/* Sections */}
        <div className="space-y-3">
          {sections.map((section) => (
            <SectionCard key={section.id} section={section} />
          ))}
        </div>

        <p className="text-xs text-gray-400 text-center mt-8">
          ARIA Advisor Workbench v1.2 · Built with ❤️ from Hyderabad
        </p>
      </div>
    </div>
  )
}
