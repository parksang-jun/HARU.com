// 항공권 검색 — 출발·도착 공항, 날짜, 인원, 좌석 → 결과 목록 + 제휴 파트너 비교 링크
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BookTabs } from '../components/BookTabs'
import { SearchSelect, type SelectItem } from '../components/SearchSelect'
import { Stepper } from '../components/Stepper'
import { useI18n } from '../i18n/context'
import { airlineName, airportLabel, airportName, getAirport, HOME_AIRPORT_KEY, searchAirports } from '../lib/airports'
import { defaultHomeAirport, destName } from '../lib/destinations'
import { ENV } from '../lib/env'
import {
  CABINS,
  FlightSearchError,
  flightPartnersFor,
  flightPartnerUrl,
  searchFlights,
  sortFlights,
  validateFlightQuery,
  type Cabin,
  type FlightLeg,
  type FlightOffer,
  type FlightPartner,
  type FlightQuery,
  type FlightSort,
} from '../lib/flights'
import { addDays } from '../lib/itinerary'
import { logAffiliateClick } from '../lib/logger'
import { openExternal } from '../lib/openUrl'
import { loadPref, savePref } from '../lib/storage'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function FlightsPage() {
  const { t, locale, formatMoney, formatDate } = useI18n()
  const [params] = useSearchParams()
  const tripId = params.get('trip') ?? undefined

  const [from, setFrom] = useState<string>(params.get('from') ?? '')
  const [to, setTo] = useState<string>(params.get('to') ?? '')
  const [depart, setDepart] = useState(params.get('depart') ?? addDays(today(), 21))
  const [roundTrip, setRoundTrip] = useState(params.get('oneway') !== '1')
  const [ret, setRet] = useState(params.get('return') ?? addDays(params.get('depart') ?? addDays(today(), 21), 4))
  const [adults, setAdults] = useState(Math.min(9, Math.max(1, Number(params.get('adults')) || 1)))
  const [cabin, setCabin] = useState<Cabin>(CABINS.includes(params.get('cabin') as Cabin) ? (params.get('cabin') as Cabin) : 'economy')
  const [results, setResults] = useState<FlightOffer[] | null>(null)
  const [lastQuery, setLastQuery] = useState<FlightQuery | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sort, setSort] = useState<FlightSort>('price')
  const [nonstopOnly, setNonstopOnly] = useState(false)

  // 출발 공항 기본값: 저장된 홈 공항 → 로케일 기본
  useEffect(() => {
    if (from) return
    loadPref(HOME_AIRPORT_KEY).then((saved) => setFrom(getAirport(saved) ? (saved as string) : defaultHomeAirport(locale)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const airportItems = useCallback(
    (q: string): SelectItem[] =>
      searchAirports(q, locale).map((a) => ({ value: a.code, label: airportLabel(a.code, locale), sub: airportName(a.code, 'en') })),
    [locale],
  )

  const run = useCallback(
    async (q: FlightQuery) => {
      const invalid = validateFlightQuery(q)
      if (invalid) {
        setError(t(`flights.${invalid}`))
        return
      }
      setError(null)
      setBusy(true)
      setResults(null)
      try {
        const list = await searchFlights(q, locale)
        setResults(list)
        setLastQuery(q)
        void savePref(HOME_AIRPORT_KEY, q.from)
      } catch (e) {
        setError(e instanceof FlightSearchError && e.code === 'limit' ? t('flights.limit') : t('flights.error'))
      } finally {
        setBusy(false)
      }
    },
    [locale, t],
  )

  const currentQuery = (): FlightQuery => ({ from, to, depart, return: roundTrip ? ret : undefined, adults, cabin })

  // 일정 화면 등에서 조건을 넘겨받으면 바로 검색
  useEffect(() => {
    if (params.get('to') && params.get('from')) void run(currentQuery())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const shown = useMemo(() => {
    const list = (results ?? []).filter((o) => !nonstopOnly || (o.outbound.stops === 0 && (!o.inbound || o.inbound.stops === 0)))
    return sortFlights(list, sort)
  }, [results, sort, nonstopOnly])

  const swap = () => {
    setFrom(to)
    setTo(from)
  }

  const openPartner = async (partner: FlightPartner, q: FlightQuery, url?: string, offer?: FlightOffer) => {
    const target = url ?? flightPartnerUrl(partner, q, locale)
    await logAffiliateClick({
      clickKind: 'flight',
      partner,
      tripId,
      stopId: offer ? `${offer.airline}${offer.flightNo}` : undefined,
      query: `${q.from}-${q.to} ${q.depart}${q.return ? `~${q.return}` : ''} x${q.adults} ${q.cabin}`,
      url: target,
      locale,
    })
    await openExternal(target)
  }

  return (
    <>
      <BookTabs />
      <div>
        <h1>{t('flights.title')}</h1>
        <p className="muted small">{t('flights.sub')}</p>
      </div>
      <Link to="/flights/deals" className="deal-banner" data-testid="deals-link">
        <span className="deal-banner__tag">BUSINESS</span>
        <span className="deal-banner__text">
          <strong>{t('deals2.banner')}</strong>
          <span className="xs">{t('deals2.bannerSub')}</span>
        </span>
        <span aria-hidden="true">›</span>
      </Link>

      <section className="card list">
        <div className="seg seg--sm" role="radiogroup">
          <button type="button" role="radio" aria-checked={roundTrip} className={`seg__item${roundTrip ? ' is-on' : ''}`} onClick={() => setRoundTrip(true)}>
            {t('flights.roundTrip')}
          </button>
          <button type="button" role="radio" aria-checked={!roundTrip} className={`seg__item${!roundTrip ? ' is-on' : ''}`} onClick={() => setRoundTrip(false)} data-testid="oneway">
            {t('flights.oneWay')}
          </button>
        </div>

        <div className="od">
          <SearchSelect
            label={t('flights.from')}
            value={from || null}
            display={from ? airportLabel(from, locale) : ''}
            placeholder={t('flights.pickAirport')}
            searchPlaceholder={t('flights.searchAirport')}
            emptyText={t('common.noMatch')}
            search={airportItems}
            onChange={setFrom}
            testId="from"
          />
          <button type="button" className="od__swap" onClick={swap} aria-label={t('flights.swap')}>
            ⇅
          </button>
          <SearchSelect
            label={t('flights.to')}
            value={to || null}
            display={to ? airportLabel(to, locale) : ''}
            placeholder={t('flights.pickAirport')}
            searchPlaceholder={t('flights.searchAirport')}
            emptyText={t('common.noMatch')}
            search={airportItems}
            onChange={setTo}
            testId="to"
          />
        </div>

        <div className="grid-2">
          <label className="field">
            <span className="field__label">{t('flights.depart')}</span>
            <input className="input" type="date" value={depart} min={today()} onChange={(e) => setDepart(e.target.value)} data-testid="depart" />
          </label>
          {roundTrip && (
            <label className="field">
              <span className="field__label">{t('flights.return')}</span>
              <input className="input" type="date" value={ret} min={depart} onChange={(e) => setRet(e.target.value)} data-testid="return" />
            </label>
          )}
        </div>

        <div className="grid-2">
          <Stepper label={t('flights.adults')} value={adults} min={1} max={9} onChange={setAdults} />
          <label className="field">
            <span className="field__label">{t('flights.cabin')}</span>
            <select className="select" value={cabin} onChange={(e) => setCabin(e.target.value as Cabin)}>
              {CABINS.map((c) => (
                <option key={c} value={c}>
                  {t(`flights.cabinOpt.${c}`)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error && (
          <div className="alert" role="alert">
            {error}
          </div>
        )}
        <button type="button" className="btn btn--primary btn--block" onClick={() => run(currentQuery())} disabled={busy} data-testid="search-flights">
          {busy ? t('flights.searching') : t('flights.search')}
        </button>
      </section>

      {busy && <div className="skeleton" />}

      {results && lastQuery && (
        <section className="list" data-testid="flight-results">
          <div className="row">
            <h2>
              {destName(getAirport(lastQuery.from)?.cityId ?? '', locale)} → {destName(getAirport(lastQuery.to)?.cityId ?? '', locale)}
            </h2>
            <span className="xs muted">{t('flights.count', { n: shown.length })}</span>
          </div>
          <p className="xs muted">
            {formatDate(lastQuery.depart)}
            {lastQuery.return ? ` – ${formatDate(lastQuery.return)}` : ''} · {t('flights.paxCabin', { n: lastQuery.adults, cabin: t(`flights.cabinOpt.${lastQuery.cabin}`) })}
          </p>
          <div className="chips">
            {(['price', 'duration', 'depart'] as FlightSort[]).map((s) => (
              <button key={s} type="button" className={`chip chip--sm${sort === s ? ' is-on' : ''}`} onClick={() => setSort(s)}>
                {t(`flights.sort.${s}`)}
              </button>
            ))}
            <button type="button" className={`chip chip--sm${nonstopOnly ? ' is-on' : ''}`} onClick={() => setNonstopOnly((v) => !v)} data-testid="nonstop">
              {t('flights.nonstopOnly')}
            </button>
          </div>

          {shown.length === 0 && <p className="muted small">{t('flights.empty')}</p>}
          {shown.map((o) => (
            <article key={o.id} className="card flight" data-testid="flight-offer">
              <div className="row">
                <div className="flight__airline">
                  <span className="flight__logo" aria-hidden="true">
                    {o.airline}
                  </span>
                  <div>
                    <div className="small" style={{ fontWeight: 700 }}>
                      {airlineName(o.airline, locale)}
                    </div>
                    <div className="xs muted">
                      {o.flightNo}
                      {o.baggage ? ` · ${t('flights.baggage')}` : ''}
                    </div>
                  </div>
                </div>
                {o.source === 'sample' && <span className="badge">{t('common.sample')}</span>}
              </div>
              <Leg leg={o.outbound} from={lastQuery.from} to={lastQuery.to} />
              {o.inbound && <Leg leg={o.inbound} from={lastQuery.to} to={lastQuery.from} />}
              <div className="row">
                <div>
                  <div className="price">{formatMoney(o.price, o.currency)}</div>
                  <div className="xs muted">{t(lastQuery.return ? 'flights.totalRt' : 'flights.totalOw', { n: lastQuery.adults })}</div>
                </div>
                <button type="button" className="btn btn--primary btn--sm" onClick={() => openPartner(o.bookUrl ? 'aviasales' : 'trip', lastQuery, o.bookUrl, o)} data-testid="flight-book">
                  {t('flights.book')} · {t(`flightPartner.${o.bookUrl ? 'aviasales' : 'trip'}`)}
                </button>
              </div>
            </article>
          ))}

          <div className="card card--flat list">
            <p className="small" style={{ fontWeight: 700 }}>
              {t('flights.compare')}
            </p>
            <div className="btn-row">
              {flightPartnersFor(locale).map((p) => (
                <button key={p} type="button" className="btn btn--sm" onClick={() => openPartner(p, lastQuery)} data-testid={`compare-${p}`}>
                  {t(`flightPartner.${p}`)}
                </button>
              ))}
            </div>
          </div>
          <p className="notice">{ENV.mockAi ? t('flights.noticeSample') : t('flights.noticeLive')}</p>
          <p className="notice">{t('itin.affiliateDisclosure')}</p>
        </section>
      )}
    </>
  )
}

function Leg({ leg, from, to }: { leg: FlightLeg; from: string; to: string }) {
  const { t } = useI18n()
  const h = Math.floor(leg.durationMin / 60)
  const m = leg.durationMin % 60
  return (
    <div className="leg">
      <div className="leg__end">
        <div className="leg__time">{leg.depart}</div>
        <div className="xs muted">{from}</div>
      </div>
      <div className="leg__mid">
        <div className="xs muted">{t('flights.duration', { h, m })}</div>
        <div className="leg__line" aria-hidden="true" />
        <div className={`xs ${leg.stops ? 'leg__stops' : 'leg__direct'}`}>{leg.stops ? (leg.via ? t('flights.stopsVia', { n: leg.stops, via: leg.via }) : t('flights.stops', { n: leg.stops })) : t('flights.nonstop')}</div>
      </div>
      <div className="leg__end leg__end--r">
        <div className="leg__time">
          {leg.arrive}
          {leg.dayOffset !== 0 && <sup className="leg__plus">{leg.dayOffset > 0 ? `+${leg.dayOffset}` : leg.dayOffset}</sup>}
        </div>
        <div className="xs muted">{to}</div>
      </div>
    </div>
  )
}
