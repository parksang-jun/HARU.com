import { HomeDeals } from '../components/HomeDeals'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n/context'
import { destName, POPULAR } from '../lib/destinations'
import { daysBetween, type Trip } from '../lib/itinerary'
import { getRepo } from '../lib/repo'
import { decodeTrip } from '../lib/share'

export function HomePage() {
  const { t, locale, formatDate } = useI18n()
  const [trips, setTrips] = useState<Trip[] | null>(null)
  const nav = useNavigate()
  const [importOpen, setImportOpen] = useState(false)
  const [code, setCode] = useState('')
  const [bad, setBad] = useState(false)
  const importTrip = async () => {
    const got = decodeTrip(code)
    if (!got) return setBad(true)
    const repo = getRepo()
    const trip = await repo.createTrip({ ...got.params, locale })
    await repo.saveItinerary(trip.id, got.itinerary)
    nav(`/trip/${trip.id}`)
  }

  useEffect(() => {
    getRepo()
      .listTrips()
      .then(setTrips)
      .catch(() => setTrips([]))
  }, [])

  return (
    <>
      <section className="hero">
        <h1>{t('home.heroTitle')}</h1>
        <p>{t('home.heroSub')}</p>
        <Link to="/setup" className="btn btn--primary btn--block" data-testid="start-trip">
          {t('home.start')}
        </Link>
      </section>

      <section className="quick">
        <Link to="/flights" className="quick__item" data-testid="quick-flights">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M2.5 19h19M3 13.5l5.5 1.6L18.8 9a2 2 0 0 1 2.4 3.1l-12 5.6L4 15.8z" />
          </svg>
          <span>
            <strong>{t('book.flights')}</strong>
            <span className="xs muted">{t('home.flightsSub')}</span>
          </span>
        </Link>
        <Link to="/hotels" className="quick__item" data-testid="quick-hotels">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 20V6M3 14h18v6M21 14v-3a3 3 0 0 0-3-3h-7v6M7 11.5a1.5 1.5 0 1 0 0-.01" />
          </svg>
          <span>
            <strong>{t('book.hotels')}</strong>
            <span className="xs muted">{t('home.hotelsSub')}</span>
          </span>
        </Link>
      </section>

      <HomeDeals />

      <section className="list">
        <h2>{t('home.popular')}</h2>
        <div className="chips">
          {POPULAR[locale].map((id) => (
            <Link key={id} to={`/setup?dest=${id}`} className="chip" data-testid={`popular-${id}`}>
              {destName(id, locale)}
            </Link>
          ))}
        </div>
      </section>

      <section className="list">
        <h2>{t('home.yourTrips')}</h2>
        {trips === null && <div className="skeleton" />}
        {trips?.length === 0 && <p className="muted small">{t('home.noTrips')}</p>}
        {trips?.map((trip) => (
          <Link key={trip.id} to={`/trip/${trip.id}`} className="card row" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div>
              <h3>{trip.itinerary?.title ?? trip.params.cities.map((c) => destName(c, locale)).join(' · ')}</h3>
              <p className="muted small">
                {formatDate(trip.params.startDate)} – {formatDate(trip.params.endDate)} · {t('common.days', { n: daysBetween(trip.params.startDate, trip.params.endDate) })}
              </p>
              <p className="xs muted">{t('home.lastUpdated', { date: formatDate(trip.updatedAt) })}</p>
            </div>
            <span className="btn btn--sm">{t('home.open')}</span>
          </Link>
        ))}
        <button type="button" className="btn btn--sm btn--ghost" onClick={() => setImportOpen((v) => !v)} aria-expanded={importOpen} data-testid="import-open">
          {t('share.import_')}
        </button>
        {importOpen && (
          <div className="card card--flat">
            <textarea
              className="input"
              rows={3}
              value={code}
              onChange={(e) => {
                setCode(e.target.value)
                setBad(false)
              }}
              placeholder={t('share.importPh')}
              data-testid="import-code"
            />
            {bad && (
              <p className="alert small" role="alert" data-testid="import-bad">
                {t('share.bad')}
              </p>
            )}
            <button type="button" className="btn btn--primary btn--sm" onClick={importTrip} data-testid="import-go">
              {t('share.importBtn')}
            </button>
          </div>
        )}
      </section>
    </>
  )
}
