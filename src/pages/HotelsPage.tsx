// 호텔 검색 — 여행지·체크인/아웃·인원/객실 → 호텔 목록 + 제휴 파트너 예약/비교
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BookTabs } from '../components/BookTabs'
import { SearchSelect, type SelectItem } from '../components/SearchSelect'
import { Stepper } from '../components/Stepper'
import { useI18n } from '../i18n/context'
import { destName, getDestination, searchDestinations } from '../lib/destinations'
import { ENV } from '../lib/env'
import {
  filterSortHotels,
  HOTEL_PARTNERS,
  hotelPartnerUrl,
  HotelSearchError,
  nightsOf,
  searchHotels,
  validateHotelQuery,
  type Hotel,
  type HotelPartner,
  type HotelQuery,
  type HotelSort,
} from '../lib/hotels'
import { addDays } from '../lib/itinerary'
import { logAffiliateClick } from '../lib/logger'
import { openExternal } from '../lib/openUrl'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function reviewLabelKey(score: number): string {
  if (score >= 9) return 'hotels.review.exceptional'
  if (score >= 8.5) return 'hotels.review.excellent'
  if (score >= 8) return 'hotels.review.veryGood'
  if (score >= 7) return 'hotels.review.good'
  return 'hotels.review.pleasant'
}

export function HotelsPage() {
  const { t, locale, formatMoney, formatDate } = useI18n()
  const [params] = useSearchParams()
  const tripId = params.get('trip') ?? undefined

  const [destId, setDestId] = useState(params.get('dest') ?? '')
  const [checkIn, setCheckIn] = useState(params.get('in') ?? addDays(today(), 21))
  const [checkOut, setCheckOut] = useState(params.get('out') ?? addDays(params.get('in') ?? addDays(today(), 21), 3))
  const [adults, setAdults] = useState(Math.min(16, Math.max(1, Number(params.get('adults')) || 2)))
  const [rooms, setRooms] = useState(Math.min(8, Math.max(1, Number(params.get('rooms')) || 1)))
  const [results, setResults] = useState<Hotel[] | null>(null)
  const [lastQuery, setLastQuery] = useState<HotelQuery | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [unsupported, setUnsupported] = useState(false)
  const [sort, setSort] = useState<HotelSort>('recommended')
  const [minStars, setMinStars] = useState(0)
  const [freeCancelOnly, setFreeCancelOnly] = useState(false)

  const destItems = useCallback(
    (q: string): SelectItem[] =>
      searchDestinations(q).map((d) => ({ value: d.id, label: destName(d.id, locale), sub: d.name.en === destName(d.id, locale) ? d.country : `${d.name.en} · ${d.country}` })),
    [locale],
  )

  const run = useCallback(
    async (q: HotelQuery) => {
      const invalid = validateHotelQuery(q)
      if (invalid) {
        setError(t(`hotels.${invalid}`))
        return
      }
      setError(null)
      setUnsupported(false)
      setBusy(true)
      setResults(null)
      try {
        setResults(await searchHotels(q, locale))
        setLastQuery(q)
      } catch (e) {
        if (e instanceof HotelSearchError && e.code === 'unsupported') {
          setUnsupported(true)
          setResults([])
          setLastQuery(q)
        } else {
          setError(e instanceof HotelSearchError && e.code === 'limit' ? t('flights.limit') : t('hotels.error'))
        }
      } finally {
        setBusy(false)
      }
    },
    [locale, t],
  )

  const currentQuery = (): HotelQuery => ({ destId, checkIn, checkOut, adults, rooms: Math.min(rooms, adults) })

  useEffect(() => {
    if (params.get('dest')) void run(currentQuery())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const shown = useMemo(() => filterSortHotels(results ?? [], { sort, minStars, freeCancelOnly }), [results, sort, minStars, freeCancelOnly])
  const nights = lastQuery ? nightsOf(lastQuery) : 0

  const openPartner = async (partner: HotelPartner, q: HotelQuery, hotel?: Hotel) => {
    const url = hotel?.bookUrl && partner === 'agoda' ? hotel.bookUrl : hotelPartnerUrl(partner, q, locale, hotel && hotel.source !== 'sample' ? hotel.name : undefined)
    await logAffiliateClick({
      clickKind: 'hotel',
      partner,
      tripId,
      stopId: hotel?.id,
      query: `${getDestination(q.destId)?.name.en ?? q.destId} ${q.checkIn}~${q.checkOut} ${q.adults}p/${q.rooms}r${hotel ? ` · ${hotel.name}` : ''}`,
      url,
      locale,
    })
    await openExternal(url)
  }

  return (
    <>
      <BookTabs />
      <div>
        <h1>{t('hotels.title')}</h1>
        <p className="muted small">{t('hotels.sub')}</p>
      </div>

      <section className="card list">
        <SearchSelect
          label={t('hotels.where')}
          value={destId || null}
          display={destId ? destName(destId, locale) : ''}
          placeholder={t('hotels.pickDest')}
          searchPlaceholder={t('hotels.searchDest')}
          emptyText={t('common.noMatch')}
          search={destItems}
          onChange={setDestId}
          testId="hotel-dest"
        />
        <div className="grid-2">
          <label className="field">
            <span className="field__label">{t('hotels.checkIn')}</span>
            <input
              className="input"
              type="date"
              value={checkIn}
              min={today()}
              onChange={(e) => {
                setCheckIn(e.target.value)
                if (e.target.value >= checkOut) setCheckOut(addDays(e.target.value, 1))
              }}
              data-testid="check-in"
            />
          </label>
          <label className="field">
            <span className="field__label">{t('hotels.checkOut')}</span>
            <input className="input" type="date" value={checkOut} min={addDays(checkIn, 1)} onChange={(e) => setCheckOut(e.target.value)} data-testid="check-out" />
          </label>
        </div>
        <div className="grid-2">
          <Stepper label={t('hotels.guests')} value={adults} min={1} max={16} onChange={setAdults} />
          <Stepper label={t('hotels.rooms')} value={rooms} min={1} max={8} onChange={setRooms} />
        </div>
        {error && (
          <div className="alert" role="alert">
            {error}
          </div>
        )}
        <button type="button" className="btn btn--primary btn--block" onClick={() => run(currentQuery())} disabled={busy} data-testid="search-hotels">
          {busy ? t('hotels.searching') : t('hotels.search')}
        </button>
      </section>

      {busy && <div className="skeleton" />}

      {results && lastQuery && (
        <section className="list" data-testid="hotel-results">
          <div className="row">
            <h2>{t('hotels.inCity', { city: destName(lastQuery.destId, locale) })}</h2>
            {!unsupported && <span className="xs muted">{t('hotels.count', { n: shown.length })}</span>}
          </div>
          <p className="xs muted">
            {formatDate(lastQuery.checkIn)} – {formatDate(lastQuery.checkOut)} · {t('hotels.nights', { n: nights })} · {t('hotels.guestsRooms', { g: lastQuery.adults, r: lastQuery.rooms })}
          </p>

          {unsupported ? (
            <p className="muted small">{t('hotels.unsupported')}</p>
          ) : (
            <div className="chips">
              {(['recommended', 'price', 'rating'] as HotelSort[]).map((s) => (
                <button key={s} type="button" className={`chip chip--sm${sort === s ? ' is-on' : ''}`} onClick={() => setSort(s)} data-testid={`hotel-sort-${s}`}>
                  {t(`hotels.sort.${s}`)}
                </button>
              ))}
              {[3, 4, 5].map((n) => (
                <button key={n} type="button" className={`chip chip--sm${minStars === n ? ' is-on' : ''}`} onClick={() => setMinStars(minStars === n ? 0 : n)} data-testid={`stars-${n}`}>
                  {n === 5 ? '★5' : `★${n}+`}
                </button>
              ))}
              <button type="button" className={`chip chip--sm${freeCancelOnly ? ' is-on' : ''}`} onClick={() => setFreeCancelOnly((v) => !v)}>
                {t('hotels.freeCancel')}
              </button>
            </div>
          )}

          {!unsupported && shown.length === 0 && <p className="muted small">{t('hotels.empty')}</p>}
          {shown.map((h) => (
            <article key={h.id} className="card hotel" data-testid="hotel-card">
              <div className="hotel__img" style={h.imageUrl ? { backgroundImage: `url(${h.imageUrl})` } : { background: `linear-gradient(135deg, hsl(${h.hue} 45% 62%), hsl(${(h.hue + 40) % 360} 50% 42%))` }} aria-hidden="true">
                {!h.imageUrl && <span>{h.name.slice(0, 1)}</span>}
                {h.source === 'sample' && <span className="badge hotel__badge">{t('common.sample')}</span>}
              </div>
              <div className="hotel__body">
                <div className="hotel__name">{h.name}</div>
                <div className="xs muted">
                  {h.stars > 0 && <span className="stars">{'★'.repeat(h.stars)}</span>}
                  {h.area ? ` ${h.area}` : ''}
                  {h.distanceKm !== undefined ? ` · ${t('hotels.fromCenter', { km: h.distanceKm })}` : ''}
                </div>
                {h.reviewScore !== undefined && (
                  <div className="hotel__review">
                    <span className="score">{h.reviewScore.toFixed(1)}</span>
                    <span className="xs">{t(reviewLabelKey(h.reviewScore))}</span>
                    {h.reviewCount !== undefined && <span className="xs muted">({h.reviewCount.toLocaleString()})</span>}
                  </div>
                )}
                <div className="hotel__tags">
                  {h.freeCancel && <span className="tag tag--ok">{t('hotels.freeCancel')}</span>}
                  {h.breakfast && <span className="tag">{t('hotels.breakfast')}</span>}
                </div>
                <div className="row hotel__foot">
                  <div>
                    {h.crossedOut && <div className="xs muted strike">{formatMoney(h.crossedOut, h.currency)}</div>}
                    <div className="price">{formatMoney(h.pricePerNight, h.currency)}</div>
                    <div className="xs muted">{t('hotels.perNight')}</div>
                    <div className="xs muted">{t('hotels.total', { total: formatMoney(h.pricePerNight * nights * lastQuery.rooms, h.currency), n: nights })}</div>
                  </div>
                  <button type="button" className="btn btn--primary btn--sm" onClick={() => openPartner('agoda', lastQuery, h)} data-testid="hotel-book">
                    {t('hotels.view')} · {t('partner.agoda')}
                  </button>
                </div>
              </div>
            </article>
          ))}

          <div className="card card--flat list">
            <p className="small" style={{ fontWeight: 700 }}>
              {t('hotels.compare')}
            </p>
            <div className="btn-row">
              {HOTEL_PARTNERS.map((p) => (
                <button key={p} type="button" className="btn btn--sm" onClick={() => openPartner(p, lastQuery)} data-testid={`hotel-compare-${p}`}>
                  {t(`partner.${p}`)}
                </button>
              ))}
            </div>
          </div>
          <p className="notice">{ENV.mockAi ? t('hotels.noticeSample') : t('hotels.noticeLive')}</p>
          <p className="notice">{t('itin.affiliateDisclosure')}</p>
        </section>
      )}
    </>
  )
}
