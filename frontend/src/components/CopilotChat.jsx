import { useState, useRef, useEffect } from 'react'
import { sendCopilotMessage } from '../api/client'
import { Send, Sparkles, User } from 'lucide-react'

const SUGGESTED_PROMPTS = [
  'What are the key risks for this client right now?',
  'She just told me she needs the money in 6 months, what changes?',
  'What rebalancing steps should I suggest?',
  'How should I approach the missed SIP conversation?',
  'What talking points should I prepare for our meeting?',
]

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'
  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div className="flex items-start gap-2 max-w-[80%]">
          <div className="bg-navy-950 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm leading-relaxed">
            {msg.content}
          </div>
          <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <User size={14} className="text-gray-600" />
          </div>
        </div>
      </div>
    )
  }

  // Format assistant response — detect markdown bold (**text**)
  const formatResponse = (text) => {
    return text.split('\n').map((line, i) => {
      // Section headers like **SITUATION SUMMARY**
      const headerMatch = line.match(/^\*\*(.+)\*\*$/)
      if (headerMatch) {
        return (
          <div key={i} className="font-bold text-navy-900 text-xs uppercase tracking-wider mt-4 mb-1 first:mt-0">
            {headerMatch[1]}
          </div>
        )
      }
      // Bullet points
      if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
        return (
          <div key={i} className="flex gap-2 my-0.5 ml-2">
            <span className="text-navy-400 mt-0.5 flex-shrink-0">•</span>
            <span>{line.replace(/^[-•]\s*/, '')}</span>
          </div>
        )
      }
      if (line.trim() === '') return <div key={i} className="h-1" />
      return <div key={i} className="my-0.5">{line}</div>
    })
  }

  return (
    <div className="flex justify-start mb-4">
      <div className="flex items-start gap-2 max-w-[90%]">
        <div className="w-7 h-7 bg-navy-950 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
          <Sparkles size={13} className="text-amber-400" />
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed text-gray-800 shadow-sm">
          {formatResponse(msg.content)}
        </div>
      </div>
    </div>
  )
}

export default function CopilotChat({ clientId, clientName }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (text) => {
    const msg = text.trim()
    if (!msg || loading) return

    const userMsg = { role: 'user', content: msg }
    const history = [...messages, userMsg]
    setMessages(history)
    setInput('')
    setLoading(true)

    try {
      const res = await sendCopilotMessage(
        clientId,
        msg,
        messages.map(m => ({ role: m.role, content: m.content }))
      )
      setMessages([...history, { role: 'assistant', content: res.response }])
    } catch (err) {
      setMessages([...history, {
        role: 'assistant',
        content: 'Sorry — I encountered an error. Please check your API key and try again.',
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <Sparkles size={15} className="text-amber-500" />
        <div>
          <div className="text-sm font-semibold text-gray-900">AI Copilot</div>
          <div className="text-xs text-gray-400">Ask anything about {clientName}</div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div>
            <div className="text-xs text-gray-400 text-center mb-4 font-medium uppercase tracking-wider">
              Suggested questions
            </div>
            <div className="space-y-2">
              {SUGGESTED_PROMPTS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => send(p)}
                  className="w-full text-left text-sm text-gray-700 px-3 py-2.5 rounded-xl border border-gray-200 hover:border-navy-300 hover:bg-navy-50 transition-colors leading-snug"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}

        {loading && (
          <div className="flex justify-start mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-navy-950 rounded-full flex items-center justify-center flex-shrink-0">
                <Sparkles size={13} className="text-amber-400" />
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                <div className="flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 bg-navy-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-navy-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-navy-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4 flex-shrink-0 border-t border-gray-100 pt-3">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about this client…"
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300 leading-snug max-h-28 overflow-y-auto"
            style={{ minHeight: '42px' }}
            onInput={e => {
              e.target.style.height = 'auto'
              e.target.style.height = `${Math.min(e.target.scrollHeight, 112)}px`
            }}
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            className="w-10 h-10 bg-navy-950 text-white rounded-xl flex items-center justify-center hover:bg-navy-800 disabled:opacity-40 transition-colors flex-shrink-0"
          >
            <Send size={14} />
          </button>
        </div>
        <div className="text-xs text-gray-400 mt-1.5 text-center">Enter to send · Shift+Enter for new line</div>
      </div>
    </div>
  )
}
