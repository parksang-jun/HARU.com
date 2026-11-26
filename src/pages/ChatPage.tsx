import { RewardGate } from '../components/RewardGate'
import { loadRewards, remaining, rewardsActive, saveRewards, spend, type RewardState } from '../lib/rewards'
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

  const [gate, setGate] = useState<RewardState | null>(null)
  const [left, setLeft] = useState<number | null>(null)
  useEffect(() => {
    if (rewardsActive()) void loadRewards().then((s) => setLeft(remaining(s, 'chat')))
  }, [])
  const send = async (granted?: RewardState) => {
    const q = input.trim()
    if (!q || busy) return
    const rw = rewardsActive() ? (granted ?? (await loadRewards())) : null
    if (rw && remaining(rw, 'chat') <= 0) {
      setGate(rw)
      return
    }
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
      if (rw) {
        const next = spend(rw, 'chat')
        await saveRewards(next)
        setLeft(remaining(next, 'chat'))
      }
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
        {left !== null && (
          <p className="xs muted" data-testid="chat-left" data-left={left}>
            {t('reward.chatLeft', { n: left })}
          </p>
        )}
        <p className="notice">{t('chat.disclosure')}</p>
        <div ref={endRef} style={{ height: 64 }} />
      </div>
      {gate && (
        <RewardGate
          kind="chat"
          state={gate}
          onClose={() => setGate(null)}
          onGranted={(next) => {
            setGate(null)
            setLeft(remaining(next, 'chat'))
            void send(next)
          }}
        />
      )}
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
