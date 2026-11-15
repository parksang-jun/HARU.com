// 공항 대기 가이드 — 탑승까지 남은 시간에 맞는 할 일, 라운지 찾기, 공항별 대표 시설
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useI18n } from '../i18n/context'
import { highlightKeys, loungePassUrl, loungeSearchUrl, WAIT_OPTIONS, WAIT_TIPS, waitBucket } from '../lib/airportGuide'
import { airportLabel, airportName, getAirport, HOME_AIRPORT_KEY } from '../lib/airports'
import { defaultHomeAirport } from '../lib/destinations'
import type { Trip } from '../lib/itinerary'
import { logAffiliateClick } from '../lib/logger'
import { openExternal } from '../lib/openUrl'
import { flightRoute } from '../lib/plan'
import { getRepo } from '../lib/repo'
import { loadPref } from '../lib/storage'

export function AirportPage() {
  const { id } = useParams<{ id: string }>()
  const { t, locale } = useI18n()
  const [trip, setTrip] = useState<Trip | null | undefined>(undefined)
  const [home, setHome] = useState(defaultHomeAirport(locale))
  const [side, setSide] = useState<'from' | 'to'>('from')
  const [minutes, setMinutes] = useState(120)

  useEffect(() => {
    loadPref(HOME_AIRPORT_KEY).then((v) => {
      if (getAirport(v)) setHome(v as string)
    })
  }, [])
  useEffect(() => {
    if (!id) return
    getRepo()
      .getTrip(id)
      .then(setTrip)
      .catch(() => setTrip(null))
  }, [id])

  const flight = useMemo(() => (trip ? flightRoute(trip, home) : null), [trip, home])

  if (trip === undefined) return <p className="muted">{t('common.loading')}</p>
  if (!trip) return <p className="alert">{t('itin.error')}</p>
  if (!flight) {
    return (
      <>
        <h1>{t('airport.title')}</h1>
        <p className="muted">{t('airport.none')}</p>
        <Link to={`/trip/${trip.id}`} className="btn btn--block">
          {t('report.back')}
        </Link>
      </>
    )
  }

  const code = side === 'from' ? flight.from : flight.to
  const tips = WAIT_TIPS[waitBucket(minutes)]
  const highlights = highlightKeys(code)
  const pass = async () => {
    const url = loungePassUrl(code)
    await logAffiliateClick({ clickKind: 'activity', partner: 'klook', tripId: trip.id, query: `${code} airport lounge`, url, locale })
    await openExternal(url)
  }

  return (
    <>
      <div>
        <h1>{t('airport.title')}</h1>
        <p className="muted small">{t('airport.sub')}</p>
      </div>

      <div className="chips" role="tablist">
        {(['from', 'to'] as const).map((s) => (
          <button key={s} type="button" role="tab" aria-selected={side === s} className={`chip${side === s ? ' is-on' : ''}`} onClick={() => setSide(s)} data-testid="airport-side">
            {t(s === 'from' ? 'airport.depart' : 'airport.arrive')} · {s === 'from' ? flight.from : flight.to}
          </button>
        ))}
      </div>
      <h3 data-testid="airport-name">{airportLabel(code, locale)}</h3>

      <section className="field">
        <span className="field__label">{t('airport.wait')}</span>
        <div className="chips">
          {WAIT_OPTIONS.map((o) => (
            <button key={o.minutes} type="button" className={`chip${minutes === o.minutes ? ' is-on' : ''}`} aria-pressed={minutes === o.minutes} onClick={() => setMinutes(o.minutes)} data-testid="wait-chip">
              {t(`airport.waitOpt.${o.minutes}`)}
            </button>
          ))}
        </div>
      </section>

      <section className="card report__sec" data-testid="wait-tips">
        <h2>{t('airport.todo')}</h2>
        <ol className="airport__tips">
          {tips.map((k) => (
            <li key={k} data-tip={k}>
              {t(`airport.tip.${k}`)}
            </li>
          ))}
        </ol>
      </section>

      <section className="card report__sec">
        <h2>{t('airport.lounge')}</h2>
        <p className="xs muted">{t('airport.loungeNote')}</p>
        <div className="btn-row">
          <button type="button" className="btn btn--sm btn--primary" onClick={pass} data-testid="lounge-pass">
            {t('airport.loungePass')}
          </button>
          <button type="button" className="btn btn--sm" onClick={() => openExternal(loungeSearchUrl(airportName(code, 'en'), code))}>
            {t('airport.loungeSearch')}
          </button>
        </div>
      </section>

      {highlights.length > 0 && (
        <section className="card report__sec" data-testid="airport-highlights">
          <h2>{t('airport.highlights')}</h2>
          <ul className="airport__tips">
            {highlights.map((k) => (
              <li key={k}>{t(k)}</li>
            ))}
          </ul>
          <p className="xs muted">{t('airport.hlNote')}</p>
        </section>
      )}

      <Link to={`/trip/${trip.id}/chat`} className="btn btn--block">
        {t('airport.ask')}
      </Link>
      <p className="notice">{t('itin.affiliateDisclosure')}</p>
      <Link to={`/trip/${trip.id}`} className="btn btn--block btn--ghost">
        {t('report.back')}
      </Link>
    </>
  )
}
