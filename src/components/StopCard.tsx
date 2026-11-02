// 일정 정류지 카드 — 예약(제휴) / 식당 예약(리드) / 지도 CTA
import { useState } from 'react'
import { useI18n } from '../i18n/context'
import { pickName } from '../i18n'
import { buildAffiliateUrl, reserveUrl } from '../lib/affiliate'
import { ENV } from '../lib/env'
import { defaultPartnerFor, type Stop } from '../lib/itinerary'
import { googleMapsUrl, kakaoMapUrl, naverMapUrl } from '../lib/links'
import { logAffiliateClick } from '../lib/logger'
import { openExternal } from '../lib/openUrl'

interface Props {
  stop: Stop
  tripId: string
  /** 정류지 도시의 국가 (KR 이면 네이버·카카오맵 노출) */
  country?: string
  /** 숙소 정류지: 호텔 검색 화면으로 이동 */
  onFindHotels?: () => void
}

export function StopCard({ stop, tripId, country = 'KR', onFindHotels }: Props) {
  const { t, locale, formatMoney } = useI18n()
  const cost = stop.estCost ?? stop.estCostKrw
  const currency = stop.currency ?? 'KRW'
  const isKr = country === 'KR'
  const [mapsOpen, setMapsOpen] = useState(false)
  const name = pickName(stop.name, locale)
  const partner = stop.booking?.partner ?? defaultPartnerFor(stop.category)
  const bookingQuery = stop.booking?.query ?? stop.name.en

  const onBook = async () => {
    if (!partner) return
    const url = buildAffiliateUrl(partner, bookingQuery, ENV.affiliate)
    await logAffiliateClick({ clickKind: stop.category === 'stay' ? 'hotel' : 'activity', partner, tripId, stopId: stop.id, query: bookingQuery, url, locale })
    await openExternal(url)
  }

  const onReserve = async () => {
    if (!stop.reserve) return
    await openExternal(reserveUrl(stop.reserve.provider, stop.reserve.query))
  }

  return (
    <article className="stop" data-testid="stop">
      <div className="stop__time">{stop.time}</div>
      <div className="card stop__card">
        <div className="stop__head">
          <div>
            <div className="stop__name">{name}</div>
            <div className="stop__sub">
              {stop.area} · {stop.durationMin} {t('common.min')}
              {cost !== undefined && cost > 0 ? ` · ${t('itin.estCost', { cost: formatMoney(cost, currency) })}` : ''}
            </div>
          </div>
          <span className="badge badge--cat">{t(`cat.${stop.category}`)}</span>
        </div>
        {stop.tip && <p className="tip">{stop.tip}</p>}
        {stop.transitHint && <p className="transit">{t('itin.transit', { hint: stop.transitHint })}</p>}
        <div className="btn-row">
          {stop.category === 'stay' && onFindHotels && (
            <button type="button" className="btn btn--sm btn--primary" onClick={onFindHotels} data-testid="find-hotels">
              {t('itin.findHotels')}
            </button>
          )}
          {partner && !(stop.category === 'stay' && onFindHotels) && (
            <button type="button" className="btn btn--sm btn--primary" onClick={onBook} data-testid="book-cta">
              {t('itin.book')} · {t(`partner.${partner}`)}
            </button>
          )}
          {stop.reserve && (
            <button type="button" className="btn btn--sm btn--accent" onClick={onReserve}>
              {t('itin.reserve')} · {t(`partner.${stop.reserve.provider}`)}
            </button>
          )}
          <button type="button" className="btn btn--sm btn--ghost" onClick={() => setMapsOpen((v) => !v)} aria-expanded={mapsOpen}>
            {t('itin.map')}
          </button>
        </div>
        {mapsOpen && (
          <div className="btn-row">
            {isKr && (
              <button type="button" className="btn btn--sm" onClick={() => openExternal(naverMapUrl(stop.name.ko))}>
                {t('itin.naverMap')}
              </button>
            )}
            <button type="button" className="btn btn--sm" onClick={() => openExternal(googleMapsUrl(stop.lat, stop.lng))}>
              {t('itin.googleMaps')}
            </button>
            {isKr && (
              <button type="button" className="btn btn--sm" onClick={() => openExternal(kakaoMapUrl(stop.name.ko, stop.lat, stop.lng))}>
                {t('itin.kakaoMap')}
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
