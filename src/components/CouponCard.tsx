// 스폰서 쿠폰 카드 — 노출/클릭 로깅, '광고' 라벨 필수
import { useEffect, useRef } from 'react'
import { useI18n } from '../i18n/context'
import { couponTitle, type Coupon } from '../lib/coupons'
import { logAdClick, logAdImpression } from '../lib/logger'
import { openExternal } from '../lib/openUrl'

interface Props {
  coupon: Coupon
  placement: 'itinerary' | 'deals'
  tripId?: string
}

export function CouponCard({ coupon, placement, tripId }: Props) {
  const { t, locale, formatDate } = useI18n()
  const ref = useRef<HTMLDivElement>(null)

  // 화면에 실제로 보일 때 1회 노출 기록
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      void logAdImpression({ couponId: coupon.id, placement, tripId, locale })
      return
    }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        void logAdImpression({ couponId: coupon.id, placement, tripId, locale })
        io.disconnect()
      }
    }, { threshold: 0.5 })
    io.observe(el)
    return () => io.disconnect()
  }, [coupon.id, placement, tripId, locale])

  const onClick = async () => {
    await logAdClick({ couponId: coupon.id, placement, tripId, locale })
    await openExternal(coupon.link)
  }

  return (
    <div className={`coupon${coupon.sponsored ? ' coupon--sponsored' : ''}`} ref={ref} data-testid="coupon-card" data-sponsored={coupon.sponsored ? '1' : '0'}>
      <div className="coupon__art" aria-hidden="true">
        {coupon.discount}
      </div>
      <div className="coupon__body">
        <div className="row" style={{ justifyContent: 'flex-start', gap: 6 }}>
          {coupon.sponsored && <span className="badge badge--sponsored">{t('common.sponsored')}</span>}
          {coupon.isSample && <span className="badge badge--cat">{t('common.sample')}</span>}
          <span className="coupon__meta">{coupon.merchant}</span>
        </div>
        <div className="coupon__title">{couponTitle(coupon, locale)}</div>
        <div className="coupon__meta">
          {coupon.area}
          {coupon.validTo ? ` · ${t('deals.valid', { date: formatDate(coupon.validTo) })}` : ''}
        </div>
        <div>
          <button type="button" className="btn btn--sm btn--ghost" onClick={onClick}>
            {t('deals.open')}
          </button>
        </div>
      </div>
    </div>
  )
}
