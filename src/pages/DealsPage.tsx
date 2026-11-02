import { useEffect, useMemo, useState } from 'react'
import { CouponCard } from '../components/CouponCard'
import { BookTabs } from '../components/BookTabs'
import { useI18n } from '../i18n/context'
import { listCoupons, type Coupon } from '../lib/coupons'
import { DESTINATIONS, destName } from '../lib/destinations'
import type { CityId } from '../lib/itinerary'

export function DealsPage() {
  const { t, locale } = useI18n()
  const [coupons, setCoupons] = useState<Coupon[] | null>(null)
  const [city, setCity] = useState<CityId | 'all'>('all')

  useEffect(() => {
    listCoupons().then(setCoupons)
  }, [])

  const cities = useMemo(() => DESTINATIONS.map((d) => d.id).filter((c) => coupons?.some((k) => k.city === c)), [coupons])
  const shown = useMemo(() => (coupons ?? []).filter((c) => city === 'all' || c.city === city), [coupons, city])

  return (
    <>
      <BookTabs />
      <div>
        <h1>{t('deals.title')}</h1>
        <p className="muted small">{t('deals.sub')}</p>
      </div>
      <div className="chips">
        <button type="button" className={`chip chip--sm${city === 'all' ? ' is-on' : ''}`} onClick={() => setCity('all')}>
          {t('deals.filterAll')}
        </button>
        {cities.map((c) => (
          <button key={c} type="button" className={`chip chip--sm${city === c ? ' is-on' : ''}`} onClick={() => setCity(c)}>
            {destName(c, locale)}
          </button>
        ))}
      </div>
      <div className="list" data-testid="deals-list">
        {coupons === null && <div className="skeleton" />}
        {coupons !== null && shown.length === 0 && <p className="muted small">{t('deals.empty')}</p>}
        {shown.map((c) => (
          <CouponCard key={c.id} coupon={c} placement="deals" />
        ))}
      </div>
    </>
  )
}
