import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { DestinationPicker } from '../components/DestinationPicker'
import { LAST_TRIP_KEY } from '../components/Layout'
import { useI18n } from '../i18n/context'
import { AiError, generateItinerary } from '../lib/ai'
import { getDestination, isDestination } from '../lib/destinations'
import { addDays, INTERESTS, validateTripParams, type Budget, type CityId, type Interest, type Pace, type Travelers, type TripParams } from '../lib/itinerary'
import { getRepo } from '../lib/repo'
import { savePref } from '../lib/storage'

const TRAVELERS: Travelers[] = ['solo', 'couple', 'family', 'friends']
const BUDGETS: Budget[] = ['saver', 'standard', 'premium']
const PACES: Pace[] = ['relaxed', 'balanced', 'packed']

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

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
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const toggle = <T,>(list: T[], v: T, set: (l: T[]) => void) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

  const submit = async () => {
    const params: TripParams = { cities, startDate, endDate, travelers, interests, budget, pace, notes: notes.trim() || undefined, locale }
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
        <span className="field__label">{t('setup.interests')}</span>
        <div className="chips">
          {INTERESTS.map((v) => (
            <button key={v} type="button" className={`chip${interests.includes(v) ? ' is-on' : ''}`} onClick={() => toggle(interests, v, setInterests)}>
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
        <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('setup.notesPh')} maxLength={500} />
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
