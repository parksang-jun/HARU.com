// 홈 화면의 비즈니스 특가 — 내 출발 공항 기준 상위 3건을 바로 보여 준다
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/context'
import { airportLabel, getAirport, HOME_AIRPORT_KEY } from '../lib/airports'
import { defaultHomeAirport, destName } from '../lib/destinations'
import { homeBusinessDeals, type FlightDeal } from '../lib/flightDeals'
import { loadPref } from '../lib/storage'

export function HomeDeals() {
  const { t, locale, formatMoney, formatDate } = useI18n()
  const [from, setFrom] = useState('')
  const [deals, setDeals] = useState<FlightDeal[] | null>(null)

  useEffect(() => {
    let alive = true
    void loadPref(HOME_AIRPORT_KEY).then((saved) => {
      const code = getAirport(saved) ? (saved as string) : defaultHomeAirport(locale)
      if (!alive) return
      setFrom(code)
      homeBusinessDeals(code, locale)
        .then((list) => alive && setDeals(list))
        .catch(() => alive && setDeals([]))
    })
    return () => {
      alive = false
    }
  }, [locale])

  return (
    <section className="list" data-testid="home-deals-section">
      <div className="row">
        <h2>{t('deals2.homeTitle')}</h2>
        <Link to="/flights/deals" className="small" data-testid="home-deals">
          {t('deals2.homeAll')} ›
        </Link>
      </div>
      {from && <p className="xs muted">{t('deals2.homeFrom', { airport: airportLabel(from, locale) })}</p>}
      {deals === null && <div className="skeleton" />}
      {deals?.length === 0 && <p className="muted small">{t('deals2.homeEmpty')}</p>}
      <div className="home-deals">
        {deals?.slice(0, 3).map((d) => (
          <Link key={d.id} to="/flights/deals" className="home-deal" data-testid="home-deal">
            <span className="home-deal__city">{destName(d.cityId, locale)}</span>
            <span className="xs muted">
              {formatDate(d.depart)} · {t(d.return ? 'flights.roundTrip' : 'flights.oneWay')}
            </span>
            <strong className="home-deal__price">{formatMoney(d.price, d.currency)}</strong>
            <span className="home-deal__pct">-{d.discountPct}%</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
