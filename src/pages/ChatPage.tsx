import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useI18n } from '../i18n/context'
import { AiError, askConcierge } from '../lib/ai'
import type { Trip } from '../lib/itinerary'
import { getRepo, type ChatMessage } from '../lib/repo'
import { loadPref } from '../lib/storage'
import { LAST_TRIP_KEY } from '../components/Layout'

export function ChatPage() {
  const { id } = useParams<{ id?: string }>()
  const { t, locale } = useI18n()
  const [lastTripId, setLastTripId] = useState<string | null>(null)
  const tripId = id ?? lastTripId
  const [trip, setTrip] = useState<Trip | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  // 여행 컨텍스트: URL 의 id → 없으면 마지막으로 본 여행
  useEffect(() => {
    if (id) return
    loadPref(LAST_TRIP_KEY).then((last) => setLastTripId(last))
  }, [id])

  useEffect(() => {
    if (!tripId) return
    const repo = getRepo()
    repo.getTrip(tripId).then(setTrip).catch(() => setTrip(null))
    repo.listMessages(tripId).then(setMessages).catch(() => setMessages([]))
  }, [tripId])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages, busy])

  const send = async () => {
    const q = input.trim()
    if (!q || busy) return
    setInput('')
    setError(null)
    setBusy(true)
    const repo = getRepo()
    const userMsg: ChatMessage = tripId
      ? await repo.addMessage(tripId, { role: 'user', content: q })
      : { id: String(Date.now()), role: 'user', content: q, createdAt: new Date().toISOString() }
    setMessages((m) => [...m, userMsg])
    try {
      const answer = await askConcierge(trip?.params ?? null, messages, q, locale)
      const aiMsg: ChatMessage = tripId
        ? await repo.addMessage(tripId, { role: 'assistant', content: answer })
        : { id: `${Date.now()}a`, role: 'assistant', content: answer, createdAt: new Date().toISOString() }
      setMessages((m) => [...m, aiMsg])
    } catch (e) {
      setError(e instanceof AiError && e.code === 'limit' ? t('chat.limit') : t('chat.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div>
        <h1>{t('chat.title')}</h1>
        {trip?.itinerary && <p className="muted small">{trip.itinerary.title}</p>}
      </div>
      <div className="chat" data-testid="chat">
        <div className="msg msg--ai">{t('chat.hello')}</div>
        {messages.map((m) => (
          <div key={m.id} className={`msg ${m.role === 'user' ? 'msg--user' : 'msg--ai'}`} data-testid={`msg-${m.role}`}>
            {m.content}
          </div>
        ))}
        {busy && <div className="msg msg--ai muted">…</div>}
        {error && (
          <div className="alert" role="alert">
            {error}
          </div>
        )}
        <p className="notice">{t('chat.disclosure')}</p>
        <div ref={endRef} style={{ height: 64 }} />
      </div>
      <form
        className="chat-input"
        onSubmit={(e) => {
          e.preventDefault()
          void send()
        }}
      >
        <div className="chat-input__inner">
          <input className="input" value={input} onChange={(e) => setInput(e.target.value)} placeholder={t('chat.placeholder')} maxLength={500} data-testid="chat-input" />
          <button type="submit" className="btn btn--primary" disabled={busy || !input.trim()} data-testid="chat-send">
            {t('chat.send')}
          </button>
        </div>
      </form>
    </>
  )
}
