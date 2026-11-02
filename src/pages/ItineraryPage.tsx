import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Share } from '@capacitor/share'
import { CouponCard } from '../components/CouponCard'
import { LAST_TRIP_KEY } from '../components/Layout'
import { StopCard } from '../components/StopCard'
import { useI18n } from '../i18n/context'
import { pickName } from '../i18n'
import { AiError, generateItinerary } from '../lib/ai'
import { airportDestination, bestAirportFor, domesticOrigin, getAirport, HOME_AIRPORT_KEY } from '../lib/airports'
import { listCoupons, nearbyCoupons, type Coupon } from '../lib/coupons'
import { defaultHomeAirport, destName, getDestination } from '../lib/destinations'
import { distanceKm } from '../lib/geo'
import { adultsFor, type Trip } from '../lib/itinerary'
import { getRepo } from '../lib/repo'
import { loadPref, savePref } from '../lib/storage'
import { staySegments, type StaySegment } from '../lib/plan'



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

  const day = trip?.itinerary?.days[dayIdx]
  const deals = useMemo(() => (day ? nearbyCoupons(coupons, day.city, day.stops) : []), [coupons, day])
  const segments = useMemo(() => (trip?.itinerary ? staySegments(trip) : []), [trip])

  // 항공권: 홈 공항 → 첫 도시 대표 공항 (같은 도시이거나 너무 가까우면 생략, 국내선은 김포 출발)
  const flight = useMemo(() => {
    if (!trip) return null
    const first = trip.params.cities[0]
    const to = bestAirportFor(first, home)
    const homeCity = airportDestination(home)
    const dst = getDestination(first)
    if (!to || !homeCity || !dst) return null
    if (homeCity.id === dst.id || distanceKm(homeCity.lat, homeCity.lng, dst.lat, dst.lng) < 180) return null
    return { from: domesticOrigin(home, to), to }
  }, [trip, home])

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

  return (
    <>
      <div>
        <h1 data-testid="itin-title">{trip.itinerary.title}</h1>
        {trip.itinerary.summary && <p className="muted small">{trip.itinerary.summary}</p>}
      </div>

      <section className="card plan" data-testid="plan-card">
        <p className="small" style={{ fontWeight: 700 }}>
          {t('itin.planTitle')}
        </p>
        {flight && (
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
        )}
        {segments.map((seg) => (
          <button key={`${seg.city}-${seg.checkIn}`} type="button" className="plan__row" onClick={() => goHotels(seg)} data-testid="plan-hotels">
            <span className="plan__icon" aria-hidden="true">
              ⌂
            </span>
            <span className="plan__text">
              <strong>{t('itin.hotelsIn', { city: destName(seg.city, locale) })}</strong>
              <span className="xs muted">
                {formatDate(seg.checkIn)} – {formatDate(seg.checkOut)} · {t('hotels.nights', { n: seg.nights })}
              </span>
            </span>
            <span className="plan__go" aria-hidden="true">
              ›
            </span>
          </button>
        ))}
      </section>

      <div className="day-tabs" role="tablist" data-testid="day-tabs">
        {trip.itinerary.days.map((d, i) => (
          <button key={d.day} type="button" role="tab" aria-selected={i === dayIdx} className={`day-tab${i === dayIdx ? ' is-active' : ''}`} onClick={() => setDayIdx(i)} data-testid="day-tab">
            <span className="day-tab__n">{t('common.day', { n: d.day })}</span>
            <span className="day-tab__d">{formatDate(d.date)}</span>
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
      <button type="button" className="btn btn--sm btn--ghost" onClick={remove} style={{ alignSelf: 'flex-start' }}>
        {t('common.delete')}
      </button>
    </>
  )
}
