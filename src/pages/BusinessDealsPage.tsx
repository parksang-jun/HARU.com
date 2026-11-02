// 비즈니스석 특가·땡처리 — 출발 공항 기준, 출발 임박 순·할인율 순 목록
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookTabs } from '../components/BookTabs'
import { SearchSelect, type SelectItem } from '../components/SearchSelect'
import { useI18n } from '../i18n/context'
import { airlineName, airportLabel, airportName, getAirport, HOME_AIRPORT_KEY, searchAirports } from '../lib/airports'
import { defaultHomeAirport, destName, REGIONS, type Region } from '../lib/destinations'
import { ENV } from '../lib/env'
import { dealBookUrl, fetchBusinessDeals, type FlightDeal } from '../lib/flightDeals'
import { logAffiliateClick } from '../lib/logger'
import { openExternal } from '../lib/openUrl'
import { loadPref, savePref } from '../lib/storage'

type DealSort = 'discount' | 'price' | 'soonest'
const WINDOWS = [7, 14, 30, 45]

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function daysLeft(iso: string): number {
  return Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${today()}T00:00:00Z`)) / 86_400_000)
}

export function BusinessDealsPage() {
  const { t, locale, formatMoney, formatDate } = useI18n()
  const navigate = useNavigate()
  const [from, setFrom] = useState('')
  const [deals, setDeals] = useState<FlightDeal[] | null>(null)
  const [error, setError] = useState(false)
  const [windowDays, setWindowDays] = useState(30)
  const [region, setRegion] = useState<Region | 'all'>('all')
  const [sort, setSort] = useState<DealSort>('discount')

  useEffect(() => {
    loadPref(HOME_AIRPORT_KEY).then((v) => setFrom(getAirport(v) ? (v as string) : defaultHomeAirport(locale)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!from) return
    setDeals(null)
    setError(false)
    fetchBusinessDeals(from, locale)
      .then(setDeals)
      .catch(() => {
        setDeals([])
        setError(true)
      })
  }, [from, locale])

  const airportItems = useCallback(
    (q: string): SelectItem[] => searchAirports(q, locale).map((a) => ({ value: a.code, label: airportLabel(a.code, locale), sub: airportName(a.code, 'en') })),
    [locale],
  )

  const regions = useMemo(() => REGIONS.filter((r) => deals?.some((d) => d.region === r)), [deals])
  const shown = useMemo(() => {
    const list = (deals ?? []).filter((d) => daysLeft(d.depart) <= windowDays && (region === 'all' || d.region === region))
    return [...list].sort((a, b) => (sort === 'price' ? a.price - b.price : sort === 'soonest' ? a.depart.localeCompare(b.depart) : b.discountPct - a.discountPct))
  }, [deals, windowDays, region, sort])

  const book = async (d: FlightDeal) => {
    const url = dealBookUrl(d)
    await logAffiliateClick({ clickKind: 'flight', partner: 'aviasales', stopId: `deal-${d.to}`, query: `BUSINESS DEAL ${d.from}-${d.to} ${d.depart}${d.return ? `~${d.return}` : ''} -${d.discountPct}%`, url, locale })
    await openExternal(url)
  }

  const compare = (d: FlightDeal) => {
    navigate(`/flights?from=${d.from}&to=${d.to}&depart=${d.depart}${d.return ? `&return=${d.return}` : '&oneway=1'}&adults=1&cabin=business`)
  }

  return (
    <>
      <BookTabs />
      <div>
        <h1>{t('deals2.title')}</h1>
        <p className="muted small">{t('deals2.sub')}</p>
      </div>

      <section className="card list">
        <SearchSelect
          label={t('flights.from')}
          value={from || null}
          display={from ? airportLabel(from, locale) : ''}
          placeholder={t('flights.pickAirport')}
          searchPlaceholder={t('flights.searchAirport')}
          emptyText={t('common.noMatch')}
          search={airportItems}
          onChange={(v) => {
            setFrom(v)
            void savePref(HOME_AIRPORT_KEY, v)
          }}
          testId="deal-from"
        />
        <div className="field">
          <span className="field__label">{t('deals2.window')}</span>
          <div className="chips">
            {WINDOWS.map((w) => (
              <button key={w} type="button" className={`chip chip--sm${windowDays === w ? ' is-on' : ''}`} onClick={() => setWindowDays(w)} data-testid={`window-${w}`}>
                {t('deals2.withinDays', { n: w })}
              </button>
            ))}
          </div>
        </div>
      </section>

      {deals === null && <div className="skeleton" />}
      {error && <p className="alert">{t('flights.error')}</p>}

      {deals && (
        <section className="list" data-testid="deal-results">
          <div className="region-tabs">
            <button type="button" className={`region-tab${region === 'all' ? ' is-on' : ''}`} onClick={() => setRegion('all')}>
              {t('deals.filterAll')}
            </button>
            {regions.map((r) => (
              <button key={r} type="button" className={`region-tab${region === r ? ' is-on' : ''}`} onClick={() => setRegion(r)}>
                {t(`region.${r}`)}
              </button>
            ))}
          </div>
          <div className="row">
            <div className="chips">
              {(['discount', 'price', 'soonest'] as DealSort[]).map((s) => (
                <button key={s} type="button" className={`chip chip--sm${sort === s ? ' is-on' : ''}`} onClick={() => setSort(s)} data-testid={`deal-sort-${s}`}>
                  {t(`deals2.sort.${s}`)}
                </button>
              ))}
            </div>
            <span className="xs muted">{t('flights.count', { n: shown.length })}</span>
          </div>

          {shown.length === 0 && !error && <p className="muted small">{t('deals2.empty')}</p>}
          {shown.map((d) => {
            const left = daysLeft(d.depart)
            return (
              <article key={d.id} className="card deal" data-testid="deal-card">
                <div className="row">
                  <div style={{ minWidth: 0 }}>
                    <div className="deal__city">{destName(d.cityId, locale)}</div>
                    <div className="xs muted">
                      {d.from} → {d.to} · {formatDate(d.depart)}
                      {d.return ? ` – ${formatDate(d.return)}` : ''}
                    </div>
                  </div>
                  <div className="deal__badges">
                    <span className="deal__off">-{d.discountPct}%</span>
                    <span className={`deal__left${left <= 7 ? ' is-hot' : ''}`}>{left <= 0 ? t('deals2.today') : `D-${left}`}</span>
                  </div>
                </div>
                <div className="xs muted">
                  {t('flights.cabinOpt.business')}
                  {d.airline ? ` · ${airlineName(d.airline, locale)}` : ''} · {d.stops ? t('flights.stops', { n: d.stops }) : t('flights.nonstop')}
                  {d.source === 'sample' && <span className="badge" style={{ marginLeft: 6 }}>{t('common.sample')}</span>}
                </div>
                <div className="row">
                  <div>
                    <div className="xs muted strike">{formatMoney(d.usualPrice, d.currency)}</div>
                    <div className="price">{formatMoney(d.price, d.currency)}</div>
                    <div className="xs muted">{d.return ? t('deals2.perPersonRt') : t('deals2.perPersonOw')}</div>
                  </div>
                  <div className="btn-row">
                    <button type="button" className="btn btn--sm" onClick={() => compare(d)} data-testid="deal-compare">
                      {t('deals2.compare')}
                    </button>
                    <button type="button" className="btn btn--sm btn--primary" onClick={() => book(d)} data-testid="deal-book">
                      {t('flights.book')} · {t('flightPartner.aviasales')}
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
          <p className="notice">{ENV.mockAi ? t('deals2.noticeSample') : t('deals2.noticeLive')}</p>
          <p className="notice">{t('itin.affiliateDisclosure')}</p>
        </section>
      )}
    </>
  )
}
