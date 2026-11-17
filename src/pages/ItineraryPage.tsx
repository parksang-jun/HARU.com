import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Share } from '@capacitor/share'
import { CouponCard } from '../components/CouponCard'
import { LAST_TRIP_KEY } from '../components/Layout'
import { MealPicker } from '../components/MealPicker'
import { StopCard } from '../components/StopCard'
import { useI18n } from '../i18n/context'
import { pickName } from '../i18n'
import { AiError, generateItinerary } from '../lib/ai'
import { getAirport, HOME_AIRPORT_KEY } from '../lib/airports'
import { listCoupons, nearbyCoupons, type Coupon } from '../lib/coupons'
import { defaultHomeAirport, destName, getDestination } from '../lib/destinations'
import { adultsFor, daysBetween, type Trip } from '../lib/itinerary'
import { ENV } from '../lib/env'
import { recommendGear } from '../lib/gear'
import { hasMeals, loadMealPicks, saveMealPicks, togglePick, type MealPicks } from '../lib/meals'
import { getRepo } from '../lib/repo'
import { loadJson, loadPref, saveJson, savePref } from '../lib/storage'
import { formatTemps, getTripWeather, ICONS, needsExtraLayer, needsRainPlan, outfitFor, packingList, tipsFor, weatherKey, type DayWeather, type TripWeather } from '../lib/weather'
import { flightRoute, hotelKey, isAbroad, isPrepDone, prepKeys as prepKeysFor, staySegments, type StaySegment } from '../lib/plan'



export function ItineraryPage() {
  const { id } = useParams<{ id: string }>()
  const { t, locale, formatDate } = useI18n()
  const navigate = useNavigate()
  const [trip, setTrip] = useState<Trip | null | undefined>(undefined)
  const [dayIdx, setDayIdx] = useState(0)
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [home, setHome] = useState(defaultHomeAirport(locale))
  const [weather, setWeather] = useState<TripWeather>({})
  const [done, setDone] = useState<string[]>([])
  const [mealPicks, setMealPicks] = useState<MealPicks>({})

  useEffect(() => {
    loadPref(HOME_AIRPORT_KEY).then((v) => {
      if (getAirport(v)) setHome(v as string)
    })
  }, [])

  useEffect(() => {
    if (!id) return
    getRepo()
      .getTrip(id)
      .then((tr) => {
        setTrip(tr)
        if (tr) void savePref(LAST_TRIP_KEY, tr.id)
      })
      .catch(() => setTrip(null))
    listCoupons().then(setCoupons)
  }, [id])

  // 날씨: 일정이 바뀌면 다시 받는다 (하루 한 번 캐시)
  const itinerary = trip?.itinerary
  useEffect(() => {
    if (!trip || !itinerary) return
    let alive = true
    getTripWeather(trip)
      .then((w) => alive && setWeather(w))
      .catch(() => alive && setWeather({}))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip?.id, itinerary])

  // 준비 체크리스트 완료 표시 (여행별 저장)
  useEffect(() => {
    if (!id) return
    loadJson<string[]>(`prep:${id}`, []).then(setDone)
    loadMealPicks(id).then(setMealPicks)
  }, [id])
  const toggle = (key: string) => {
    setDone((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
      if (id) void saveJson(`prep:${id}`, next)
      return next
    })
  }

  const day = trip?.itinerary?.days[dayIdx]
  const wx: DayWeather | undefined = day ? weather[weatherKey(day.city, day.date)] : undefined
  const packing = useMemo(() => packingList(Object.values(weather)), [weather])
  const gearCount = useMemo(() => (trip ? recommendGear(trip, Object.values(weather), home).length : 0), [trip, weather, home])
  const deals = useMemo(() => (day ? nearbyCoupons(coupons, day.city, day.stops) : []), [coupons, day])
  const segments = useMemo(() => (trip?.itinerary ? staySegments(trip) : []), [trip])

  const flight = useMemo(() => (trip ? flightRoute(trip, home) : null), [trip, home])
  // 해외 일정이 있으면 출국 준비 항목을 보여 준다
  const abroad = useMemo(() => (trip ? isAbroad(trip, home) : false), [trip, home])

  const adults = trip ? adultsFor(trip.params.travelers) : 1
  const goFlights = () => {
    if (!trip || !flight) return
    navigate(`/flights?from=${flight.from}&to=${flight.to}&depart=${trip.params.startDate}&return=${trip.params.endDate}&adults=${adults}&trip=${trip.id}`)
  }
  const goHotels = (seg: StaySegment) => {
    if (!trip) return
    navigate(`/hotels?dest=${seg.city}&in=${seg.checkIn}&out=${seg.checkOut}&adults=${adults}&rooms=${Math.max(1, Math.ceil(adults / 2))}&trip=${trip.id}`)
  }
  const segmentFor = (city: string, date: string) => segments.find((s) => s.city === city && s.checkIn <= date && date < s.checkOut) ?? segments.find((s) => s.city === city)

  const regenerate = async () => {
    if (!trip) return
    setBusy(true)
    setError(null)
    try {
      const it = await generateItinerary(trip.params)
      await getRepo().saveItinerary(trip.id, it)
      // 일정이 바뀌면 식사 선택도 처음부터
      setMealPicks({})
      void saveMealPicks(trip.id, {})
      setTrip({ ...trip, itinerary: it })
      setDayIdx(0)
    } catch (e) {
      setError(e instanceof AiError && e.code === 'limit' ? t('chat.limit') : t('setup.errGeneric'))
    } finally {
      setBusy(false)
    }
  }

  const share = async () => {
    if (!trip?.itinerary || !day) return
    const lines = day.stops.map((s) => `${s.time} ${pickName(s.name, locale)}`).join('\n')
    const text = `${trip.itinerary.title} — ${t('common.day', { n: day.day })}\n${lines}`
    try {
      await Share.share({ title: trip.itinerary.title, text })
    } catch {
      await navigator.clipboard?.writeText(text)
    }
  }

  const remove = async () => {
    if (!trip) return
    await getRepo().deleteTrip(trip.id)
    navigate('/', { replace: true })
  }

  if (trip === undefined) return <div className="skeleton" />
  if (trip === null) return <p className="alert">{t('itin.error')}</p>
  if (!trip.itinerary || !day) {
    return (
      <>
        <p className="alert">{t('itin.error')}</p>
        <button type="button" className="btn btn--primary" onClick={regenerate} disabled={busy}>
          {busy ? t('setup.generating') : t('itin.regenerate')}
        </button>
      </>
    )
  }

  // 준비 항목: 일정(자동 완료) + 항공권 + 숙소 구간 + 날씨·준비물 + 현지 혜택 (+ 해외면 출국 준비)
  const prepKeys = prepKeysFor(trip, home)
  const prepDone = prepKeys.filter((k) => isPrepDone(k, done)).length
  const check = (key: string) => (
    <button type="button" className={`prep__check${done.includes(key) ? ' is-on' : ''}`} aria-pressed={done.includes(key)} aria-label={t('prep.check')} onClick={() => toggle(key)} data-testid="prep-check">
      ✓
    </button>
  )

  return (
    <>
      <div>
        <h1 data-testid="itin-title">{trip.itinerary.title}</h1>
        {trip.itinerary.summary && <p className="muted small">{trip.itinerary.summary}</p>}
      </div>

      {trip.params.notes && (
        <section className="card card--flat req" data-testid="requests">
          <p className="small" style={{ fontWeight: 700 }}>
            {t('req.title')}
          </p>
          <p className="xs muted req__text">“{trip.params.notes}”</p>
          {trip.itinerary.requests?.length ? (
            <ul className="req__list">
              {trip.itinerary.requests.map((r, i) => (
                <li key={i} className={r.applied ? 'is-ok' : 'is-no'} data-testid="request-item" data-applied={r.applied}>
                  <span className="req__mark" aria-hidden="true">
                    {r.applied ? '✓' : '!'}
                  </span>
                  <span>
                    <strong>{r.request}</strong> — {r.handled}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="xs muted">{t('req.noDetail')}</p>
          )}
          {ENV.mockAi && <p className="xs muted">{t('req.sampleNote')}</p>}
        </section>
      )}

      <section className="card plan" data-testid="plan-card">
        <div className="row">
          <p className="small" style={{ fontWeight: 700 }}>
            {t('prep.title')}
          </p>
          <span className="xs muted" data-testid="prep-progress">
            {t('prep.progress', { done: prepDone, total: prepKeys.length })}
          </span>
        </div>
        <div className="prep__bar" aria-hidden="true">
          <span style={{ width: `${(prepDone / prepKeys.length) * 100}%` }} />
        </div>
        {prepDone === prepKeys.length && <p className="small prep__done">{t('prep.allDone')}</p>}

        <div className="prep__row">
          <span className="prep__check is-on" aria-hidden="true">
            ✓
          </span>
          <div className="plan__row plan__row--static">
            <span className="plan__text">
              <strong>{t('prep.itinerary')}</strong>
              <span className="xs muted">{t('prep.itinerarySub', { n: daysBetween(trip.params.startDate, trip.params.endDate) })}</span>
            </span>
          </div>
        </div>

        {flight && (
          <div className="prep__row">
            {check('flight')}
            <button type="button" className="plan__row" onClick={goFlights} data-testid="plan-flights">
              <span className="plan__icon" aria-hidden="true">
                ✈
              </span>
              <span className="plan__text">
                <strong>{t('itin.flightsTo', { city: destName(trip.params.cities[0], locale) })}</strong>
                <span className="xs muted">
                  {flight.from} ⇄ {flight.to} · {formatDate(trip.params.startDate)} – {formatDate(trip.params.endDate)}
                </span>
              </span>
              <span className="plan__go" aria-hidden="true">
                ›
              </span>
            </button>
          </div>
        )}
        {segments.map((seg) => (
          <div key={`${seg.city}-${seg.checkIn}`} className="prep__row">
            {check(hotelKey(seg))}
            <button type="button" className="plan__row" onClick={() => goHotels(seg)} data-testid="plan-hotels">
              <span className="plan__icon" aria-hidden="true">
                ⌂
              </span>
              <span className="plan__text">
                <strong>
                  {t('itin.hotelsIn', { city: destName(seg.city, locale) })}
                  {seg.area ? ` · ${seg.area}` : ''}
                </strong>
                <span className="xs muted">
                  {formatDate(seg.checkIn)} – {formatDate(seg.checkOut)} · {t('hotels.nights', { n: seg.nights })}
                </span>
              </span>
              <span className="plan__go" aria-hidden="true">
                ›
              </span>
            </button>
          </div>
        ))}

        <div className="prep__row">
          {check('weather')}
          <button type="button" className="plan__row" onClick={() => toggle('weather')} data-testid="prep-weather">
            <span className="plan__icon" aria-hidden="true">
              ☂
            </span>
            <span className="plan__text">
              <strong>{t('prep.weather')}</strong>
              <span className="xs muted" data-testid="packing-list">
                {packing.length ? packing.map((p) => t(`weather.tip.${p}`)).join(' · ') : t('weather.noTips')}
              </span>
            </span>
          </button>
        </div>

        <div className="prep__row">
          {check('gear')}
          <Link to={`/trip/${trip.id}/gear`} className="plan__row" data-testid="prep-gear">
            <span className="plan__icon" aria-hidden="true">
              ▣
            </span>
            <span className="plan__text">
              <strong>{t('gear.open')}</strong>
              <span className="xs muted">{t('gear.openSub', { n: gearCount })}</span>
            </span>
            <span className="plan__go" aria-hidden="true">
              ›
            </span>
          </Link>
        </div>

        <div className="prep__row">
          {check('deals')}
          <Link to="/deals" className="plan__row" data-testid="prep-deals">
            <span className="plan__icon" aria-hidden="true">
              %
            </span>
            <span className="plan__text">
              <strong>{t('prep.deals')}</strong>
              <span className="xs muted">{t('prep.dealsSub')}</span>
            </span>
            <span className="plan__go" aria-hidden="true">
              ›
            </span>
          </Link>
        </div>

        {flight && (
          <div className="prep__row">
            {check('airport')}
            <Link to={`/trip/${trip.id}/airport`} className="plan__row" data-testid="prep-airport">
              <span className="plan__icon" aria-hidden="true">
                ◷
              </span>
              <span className="plan__text">
                <strong>{t('airport.open')}</strong>
                <span className="xs muted">{t('airport.openSub', { from: flight.from })}</span>
              </span>
              <span className="plan__go" aria-hidden="true">
                ›
              </span>
            </Link>
          </div>
        )}

        <div className="prep__row">
          {check('tips')}
          <Link to={`/trip/${trip.id}/tips`} className="plan__row" data-testid="prep-tips">
            <span className="plan__icon" aria-hidden="true">
              ✦
            </span>
            <span className="plan__text">
              <strong>{t('tips.open')}</strong>
              <span className="xs muted">{t('tips.openSub')}</span>
            </span>
            <span className="plan__go" aria-hidden="true">
              ›
            </span>
          </Link>
        </div>

        {abroad && (
          <div className="prep__row">
            {check('essentials')}
            <button type="button" className="plan__row" onClick={() => toggle('essentials')} data-testid="prep-essentials">
              <span className="plan__icon" aria-hidden="true">
                ✓
              </span>
              <span className="plan__text">
                <strong>{t('prep.essentials')}</strong>
                <span className="xs muted">{t('prep.essentialsSub')}</span>
              </span>
            </button>
          </div>
        )}
        <Link to={`/trip/${trip.id}/report`} className="btn btn--primary btn--block" data-testid="report-open">
          {t('report.open')}
        </Link>
      </section>

      <nav className="tools" aria-label={t('tools.title')} data-testid="tools">
        {(['map', 'edit', 'packing', 'budget', 'talk'] as const).map((k) => (
          <Link key={k} to={`/trip/${trip.id}/${k}`} className="tools__item" data-testid={`tool-${k}`}>
            <span aria-hidden="true">{{ map: '🗺️', edit: '✏️', packing: '🧳', budget: '💰', talk: '💬' }[k]}</span>
            {t(`tools.${k === 'budget' ? 'ledger' : k}`)}
          </Link>
        ))}
      </nav>

      <div className="day-tabs" role="tablist" data-testid="day-tabs">
        {trip.itinerary.days.map((d, i) => (
          <button key={d.day} type="button" role="tab" aria-selected={i === dayIdx} className={`day-tab${i === dayIdx ? ' is-active' : ''}`} onClick={() => setDayIdx(i)} data-testid="day-tab">
            <span className="day-tab__n">{t('common.day', { n: d.day })}</span>
            <span className="day-tab__d">{formatDate(d.date)}</span>
            {weather[weatherKey(d.city, d.date)] && (
              <span className="day-tab__w" data-testid="day-tab-weather">
                <span aria-hidden="true">{ICONS[weather[weatherKey(d.city, d.date)].condition]}</span> {Math.round(weather[weatherKey(d.city, d.date)].high)}°
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="row">
        <div>
          <h3>{destName(day.city, locale)}</h3>
          {day.theme && <p className="muted small">{day.theme}</p>}
        </div>
        <div className="btn-row">
          <button type="button" className="btn btn--sm btn--ghost" onClick={share}>
            {t('itin.share')}
          </button>
          <button type="button" className="btn btn--sm btn--ghost" onClick={regenerate} disabled={busy}>
            {busy ? '…' : t('itin.regenerate')}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}

      {wx && (
        <section className="card card--flat wx" data-testid="day-weather" data-source={wx.source}>
          <span className="wx__icon" aria-hidden="true">
            {ICONS[wx.condition]}
          </span>
          <div className="wx__body">
            <p className="wx__main">
              <strong>{t(`weather.cond.${wx.condition}`)}</strong> <span data-testid="day-weather-temp">{formatTemps(wx, locale)}</span>
            </p>
            {wx.rainPct !== null && <p className="xs muted">{t(wx.source === 'forecast' ? 'weather.rainForecast' : 'weather.rainNormal', { n: wx.rainPct })}</p>}
            <p className="small wx__outfit" data-testid="day-outfit">
              <span className="muted">{t('outfit.label')}</span> {t(`outfit.${outfitFor(wx)}`)}
              {needsExtraLayer(wx) && <span className="xs muted"> · {t('outfit.extra')}</span>}
            </p>
            {tipsFor(wx).length > 0 && (
              <div className="chips wx__tips">
                {tipsFor(wx).map((tip) => (
                  <span key={tip} className="chip chip--sm" data-testid="weather-tip">
                    {t(`weather.tip.${tip}`)}
                  </span>
                ))}
              </div>
            )}
          </div>
          <span className="wx__src">
            <span className="badge">{t(`weather.src.${wx.source}`)}</span>
            {wx.sample && <span className="badge">{t('common.sample')}</span>}
          </span>
        </section>
      )}
      {needsRainPlan(wx, day) && (
        <div className="wx__alt" data-testid="rain-plan">
          <span>{t('weather.rainPlan')}</span>
          <Link to={`/trip/${trip.id}/chat`} className="btn btn--sm">
            {t('weather.rainPlanCta')}
          </Link>
        </div>
      )}

      {hasMeals(day.meals) && (
        <MealPicker
          meals={day.meals}
          picked={mealPicks[day.day] ?? {}}
          country={getDestination(day.city)?.country ?? ''}
          region={getDestination(day.city)?.region ?? 'korea'}
          onPick={(slot, idx) => {
            const next = togglePick(mealPicks, day.day, slot, idx)
            setMealPicks(next)
            void saveMealPicks(trip.id, next)
          }}
        />
      )}

      <div className="timeline">
        {day.stops.map((stop, i) => (
          <div key={stop.id} className="timeline">
            <StopCard
              stop={stop}
              tripId={trip.id}
              country={getDestination(day.city)?.country}
              onFindHotels={() => {
                const seg = segmentFor(day.city, day.date)
                if (seg) goHotels(seg)
              }}
            />
            {i === 1 && deals.length > 0 && (
              <section className="list" data-testid="nearby-deals">
                <p className="small" style={{ fontWeight: 700 }}>
                  {t('itin.nearbyDeals')}
                </p>
                {deals.map((c) => (
                  <CouponCard key={c.id} coupon={c} placement="itinerary" tripId={trip.id} />
                ))}
              </section>
            )}
          </div>
        ))}
      </div>

      <Link to={`/trip/${trip.id}/chat`} className="btn btn--accent btn--block">
        {t('itin.chatCta')}
      </Link>

      <p className="notice">{t('itin.affiliateDisclosure')}</p>
      <p className="notice">{t('itin.aiNotice')}</p>
      {wx && <p className="notice">{t(wx.sample ? 'weather.noticeSample' : 'weather.notice')}</p>}
      <button type="button" className="btn btn--sm btn--ghost" onClick={remove} style={{ alignSelf: 'flex-start' }}>
        {t('common.delete')}
      </button>
    </>
  )
}
