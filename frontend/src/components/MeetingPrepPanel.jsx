import { useEffect, useState } from 'react'
import { X, Printer, AlertTriangle, Clock, CheckCircle } from 'lucide-react'
import { getMeetingPrep } from '../api/client'

function Section({ title, children }) {
  return (
    <div className="mb-5">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{title}</div>
      {children}
    </div>
  )
}

export default function MeetingPrepPanel({ clientId, clientName, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getMeetingPrep(clientId)
      .then(setData)
      .catch(err => setError(`Failed to generate meeting prep — ${err?.response?.data?.detail || err.message || 'unknown error'}`))
      .finally(() => setLoading(false))
  }, [clientId])

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-white shadow-2xl z-50 flex flex-col meeting-prep-panel">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-navy-950 flex-shrink-0">
          <div>
            <div className="text-white font-semibold text-sm">Meeting Prep</div>
            <div className="text-navy-300 text-xs mt-0.5">{clientName}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="text-navy-300 hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center p-2 active:scale-[0.96] transition-transform"
              title="Print"
            >
              <Printer size={16} />
            </button>
            <button
              onClick={onClose}
              className="text-navy-300 hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center p-2 active:scale-[0.96] transition-transform"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading && (
            <div className="space-y-4 animate-pulse">
              {[...Array(4)].map((_, i) => (
                <div key={i}>
                  <div className="h-3 bg-gray-100 rounded w-24 mb-2" />
                  <div className="h-4 bg-gray-100 rounded w-full mb-1" />
                  <div className="h-4 bg-gray-100 rounded w-3/4" />
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-4">
              {error}
            </div>
          )}

          {data && (
            <>
              {/* Client snapshot */}
              <div className="flex items-center gap-3 mb-5 p-3 bg-gray-50 rounded-xl">
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 text-sm">{data.client_name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {data.segment} · {data.aum} · Risk {data.risk_profile}
                  </div>
                </div>
                <div className="text-xs text-gray-400">{data.generated_at}</div>
              </div>

              {/* Urgency flags */}
              {data.urgency_flags.length > 0 && (
                <Section title="Active Flags">
                  <div className="flex flex-wrap gap-2">
                    {data.urgency_flags.map((f, i) => (
                      <span
                        key={i}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
                          f.severity === 'high'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {f.severity === 'high' ? <AlertTriangle size={10} /> : <Clock size={10} />}
                        {f.label}
                      </span>
                    ))}
                  </div>
                </Section>
              )}

              {data.urgency_flags.length === 0 && (
                <Section title="Active Flags">
                  <div className="flex items-center gap-2 text-green-600 text-xs">
                    <CheckCircle size={12} /> All clear — no active flags
                  </div>
                </Section>
              )}

              {/* Goal status */}
              <Section title="Goal Status">
                <p className="text-sm text-gray-700 leading-relaxed">{data.goal_status_summary}</p>
              </Section>

              {/* Talking points */}
              <Section title="Talking Points">
                <ul className="space-y-2">
                  {data.talking_points.map((pt, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-700">
                      <span className="text-navy-400 font-bold flex-shrink-0">•</span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </Section>

              {/* Suggested questions */}
              <Section title="Questions to Ask">
                <ol className="space-y-2">
                  {data.suggested_questions.map((q, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-700">
                      <span className="text-navy-400 font-bold flex-shrink-0">{i + 1}.</span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ol>
              </Section>

              {/* Life events */}
              {data.life_events_to_reference.length > 0 && (
                <Section title="Life Events to Reference">
                  <div className="space-y-2">
                    {data.life_events_to_reference.map((e, i) => (
                      <div key={i} className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        {e}
                      </div>
                    ))}
                  </div>
                </Section>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
