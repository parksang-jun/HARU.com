import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { DestinationPicker } from '../components/DestinationPicker'
import { LAST_TRIP_KEY } from '../components/Layout'
import { useI18n } from '../i18n/context'
import { AiError, generateItinerary } from '../lib/ai'
import { getDestination, isDestination } from '../lib/destinations'
import { addDays, INTERESTS, MAX_STAYS, splitNights, totalNights, validateTripParams, type Budget, type CityId, type Interest, type Pace, type StayPlan, type Travelers, type TripParams } from '../lib/itinerary'
import { getRepo } from '../lib/repo'
import { savePref } from '../lib/storage'

const TRAVELERS: Travelers[] = ['solo', 'couple', 'family', 'friends']
const BUDGETS: Budget[] = ['saver', 'standard', 'premium']
const PACES: Pace[] = ['relaxed', 'balanced', 'packed']

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

/** 추가 요청에 바로 넣을 수 있는 키워드 (샘플 모드와 AI 가 모두 이해하는 표현) */
const NOTE_KEYWORDS = ['veg', 'kids', 'easy', 'slow', 'late', 'early', 'noshop', 'nonight'] as const

export function TripSetupPage() {
  const { t, locale } = useI18n()
  const navigate = useNavigate()
  const [search] = useSearchParams()
  const preset = search.get('dest')
  // 기본 선택: 홈에서 고른 여행지 → (한국어 외) 서울 → (한국어) 없음
  const [cities, setCities] = useState<CityId[]>(isDestination(preset) ? [preset] : locale === 'ko' ? [] : ['seoul'])
  const initialRegion = getDestination(preset)?.region ?? (locale === 'ko' ? 'japan' : 'korea')
  const [startDate, setStartDate] = useState(addDays(today(), 14))
  const [endDate, setEndDate] = useState(addDays(today(), 17))
  const [travelers, setTravelers] = useState<Travelers>('couple')
  const [interests, setInterests] = useState<Interest[]>(['food', 'history'])
  const [budget, setBudget] = useState<Budget>('standard')
  const [pace, setPace] = useState<Pace>('balanced')
  const [notes, setNotes] = useState('')
  // 숙소 나누기: 1곳이면 묻지 않은 것과 같다
  const [stays, setStays] = useState<StayPlan[]>([])
  const nights = totalNights({ startDate, endDate })
  const stayCount = stays.length || 1
  const assigned = stays.reduce((a, x) => a + x.nights, 0)
  const setStayCount = (k: number) => setStays(k <= 1 ? [] : splitNights(nights, k).map((n, i) => ({ nights: n, area: stays[i]?.area })))
  const changeNights = (i: number, delta: number) => setStays((prev) => prev.map((x, j) => (j === i ? { ...x, nights: Math.max(1, x.nights + delta) } : x)))
  // 날짜가 바뀌어 박 수가 달라지면 다시 고르게 나눈다
  useEffect(() => {
    setStays((prev) => (prev.length < 2 ? prev : nights < prev.length ? [] : prev.reduce((a, x) => a + x.nights, 0) === nights ? prev : splitNights(nights, prev.length).map((n, i) => ({ nights: n, area: prev[i]?.area }))))
  }, [nights])
  // 키워드 칩: 누르면 쉼표로 이어 붙이고, 다시 누르면 뺀다
  const toggleKeyword = (word: string) => {
    const parts = notes.split(/[,、，]/).map((x) => x.trim()).filter(Boolean)
    const next = parts.includes(word) ? parts.filter((x) => x !== word) : [...parts, word]
    setNotes(next.join(', ').slice(0, 500))
  }
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const toggle = <T,>(list: T[], v: T, set: (l: T[]) => void) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

  const submit = async () => {
    const params: TripParams = { cities, startDate, endDate, travelers, interests, budget, pace, notes: notes.trim() || undefined, stays: stays.length >= 2 ? stays.map((x) => ({ nights: x.nights, ...(x.area?.trim() ? { area: x.area.trim() } : {}) })) : undefined, locale }
    const invalid = validateTripParams(params)
    if (invalid) {
      setError(t(`setup.${invalid}`))
      return
    }
    setError(null)
    setBusy(true)
    try {
      const repo = getRepo()
      const trip = await repo.createTrip(params)
      const itinerary = await generateItinerary(params)
      await repo.saveItinerary(trip.id, itinerary)
      await savePref(LAST_TRIP_KEY, trip.id)
      navigate(`/trip/${trip.id}`, { replace: true })
    } catch (e) {
      const code = e instanceof AiError ? e.code : 'unavailable'
      setError(code === 'limit' ? t('chat.limit') : t('setup.errGeneric'))
      setBusy(false)
    }
  }

  return (
    <>
      <h1>{t('setup.title')}</h1>

      <DestinationPicker value={cities} onChange={setCities} initialRegion={initialRegion} />

      <section className="field">
        <span className="field__label">{t('setup.dates')}</span>
        <div className="grid-2">
          <label className="field">
            <span className="xs muted">{t('setup.start')}</span>
            <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} data-testid="start-date" />
          </label>
          <label className="field">
            <span className="xs muted">{t('setup.end')}</span>
            <input className="input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} data-testid="end-date" />
          </label>
        </div>
      </section>

      <section className="field card card--flat stayplan" data-testid="stay-plan">
        <span className="field__label">{t('setup.stay')}</span>
        <p className="small">{nights >= 2 ? t('setup.stayQ') : t('setup.stayNeed')}</p>
        {nights >= 2 && (
          <div className="chips">
            {Array.from({ length: Math.min(MAX_STAYS, nights) }, (_, i) => i + 1).map((k) => (
              <button key={k} type="button" className={`chip${stayCount === k ? ' is-on' : ''}`} aria-pressed={stayCount === k} onClick={() => setStayCount(k)} data-testid="stay-count">
                {t(`setup.stayOpt.${k}`)}
              </button>
            ))}
          </div>
        )}
        {stays.length >= 2 && (
          <>
            {stays.map((x, i) => (
              <div key={i} className="stayrow" data-testid="stay-row">
                <span className="small stayrow__label">{t('setup.stayN', { n: i + 1 })}</span>
                <div className="stayrow__nights">
                  <button type="button" className="btn btn--sm" aria-label={t('setup.stayLess')} onClick={() => changeNights(i, -1)} disabled={x.nights <= 1}>
                    −
                  </button>
                  <strong data-testid="stay-nights">{t('setup.stayNights', { n: x.nights })}</strong>
                  <button type="button" className="btn btn--sm" aria-label={t('setup.stayMore')} onClick={() => changeNights(i, 1)} disabled={assigned >= nights}>
                    +
                  </button>
                </div>
                <input className="input" value={x.area ?? ''} maxLength={40} placeholder={t('setup.stayAreaPh')} onChange={(e) => setStays((prev) => prev.map((y, j) => (j === i ? { ...y, area: e.target.value } : y)))} data-testid="stay-area" />
              </div>
            ))}
            <p className={`xs ${assigned === nights ? 'muted' : 'report__warn'}`} data-testid="stay-total">
              {t('setup.stayTotal', { n: nights, m: assigned })}
            </p>
          </>
        )}
      </section>

      <section className="field">
        <span className="field__label">{t('setup.travelers')}</span>
        <div className="chips">
          {TRAVELERS.map((v) => (
            <button key={v} type="button" className={`chip${travelers === v ? ' is-on' : ''}`} onClick={() => setTravelers(v)}>
              {t(`setup.travelersOpt.${v}`)}
            </button>
          ))}
        </div>
      </section>

      <section className="field">
        <span className="field__label">
          {t('setup.interests')} <span className="xs muted">{t('setup.interestsHint')}</span>
        </span>
        <div className="chips">
          {INTERESTS.map((v) => (
            <button key={v} type="button" className={`chip${interests.includes(v) ? ' is-on' : ''}`} aria-pressed={interests.includes(v)} onClick={() => toggle(interests, v, setInterests)} data-testid="interest-chip">
              {t(`setup.interest.${v}`)}
            </button>
          ))}
        </div>
      </section>

      <div className="grid-2">
        <section className="field">
          <span className="field__label">{t('setup.budget')}</span>
          <select className="select" value={budget} onChange={(e) => setBudget(e.target.value as Budget)}>
            {BUDGETS.map((v) => (
              <option key={v} value={v}>
                {t(`setup.budgetOpt.${v}`)}
              </option>
            ))}
          </select>
        </section>
        <section className="field">
          <span className="field__label">{t('setup.pace')}</span>
          <select className="select" value={pace} onChange={(e) => setPace(e.target.value as Pace)}>
            {PACES.map((v) => (
              <option key={v} value={v}>
                {t(`setup.paceOpt.${v}`)}
              </option>
            ))}
          </select>
        </section>
      </div>

      <section className="field">
        <span className="field__label">{t('setup.notes')}</span>
        <p className="xs muted" data-testid="notes-help">
          {t('setup.notesHelp')}
        </p>
        <div className="chips">
          {NOTE_KEYWORDS.map((k) => {
            const word = t(`setup.kw.${k}`)
            const on = notes.split(/[,、，]/).some((x) => x.trim() === word)
            return (
              <button key={k} type="button" className={`chip chip--sm${on ? ' is-on' : ''}`} aria-pressed={on} onClick={() => toggleKeyword(word)} data-testid="note-keyword">
                {word}
              </button>
            )
          })}
        </div>
        <textarea className="textarea" data-testid="setup-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('setup.notesPh')} maxLength={500} />
      </section>

      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}

      <button type="button" className="btn btn--primary btn--block" onClick={submit} disabled={busy} data-testid="generate">
        {busy ? t('setup.generating') : t('setup.generate')}
      </button>
      <p className="notice">{t('itin.aiNotice')}</p>
    </>
  )
}
