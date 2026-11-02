// 예약 탭 상단 세그먼트 — 항공권 / 호텔 / 혜택
import { NavLink } from 'react-router-dom'
import { useI18n } from '../i18n/context'

export function BookTabs() {
  const { t } = useI18n()
  const cls = ({ isActive }: { isActive: boolean }) => `seg__item${isActive ? ' is-on' : ''}`
  return (
    <nav className="seg" aria-label={t('nav.book')}>
      <NavLink to="/flights" className={cls} data-testid="seg-flights">
        {t('book.flights')}
      </NavLink>
      <NavLink to="/hotels" className={cls} data-testid="seg-hotels">
        {t('book.hotels')}
      </NavLink>
      <NavLink to="/deals" className={cls} data-testid="seg-deals">
        {t('book.deals')}
      </NavLink>
    </nav>
  )
}
