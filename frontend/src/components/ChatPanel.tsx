import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChatMessage } from '../hooks/usePartyRoom'
import './ChatPanel.css'

type Props = {
  messages: ChatMessage[]
  onSend: (text: string) => void
}

export function ChatPanel({ messages, onSend }: Props) {
  const [draft, setDraft] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const submit = useCallback(() => {
    const t = draft.trim()
    if (!t) return
    onSend(t)
    setDraft('')
  }, [draft, onSend])

  return (
    <aside className="chat">
      <h2 className="chat__title">Chat</h2>
      <ul className="chat__list" aria-live="polite">
        {messages.map((m, i) => (
          <li
            key={`${m.at}-${m.fromId}-${i}`}
            className="chat__msg"
          >
            <span className="chat__who">{m.fromName}</span>
            <p className="chat__text">{m.text}</p>
          </li>
        ))}
        <div ref={endRef} />
      </ul>
      <div className="chat__compose">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Message the room…"
          rows={2}
          maxLength={2000}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
        />
        <button type="button" className="btn primary chat__send" onClick={submit}>
          Send
        </button>
      </div>
    </aside>
  )
}
