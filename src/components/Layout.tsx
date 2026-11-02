// 공통 레이아웃 — 상단바 + 하단 탭바 + (목록 화면 한정) AdMob 배너
import { useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useI18n } from '../i18n/context'
import { adsAvailable, hideBanner, showBanner } from '../lib/ads'
import { loadPref } from '../lib/storage'
import { LangSwitch } from './LangSwitch'

const LAST_TRIP_KEY = 'lastTripId'

function Icon({ d }: { d: string }) {
  return (
    <svg className="tabbar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}

const ICONS = {
  trips: 'M3 7h18M3 12h18M3 17h12',
  itinerary: 'M8 2v4M16 2v4M3 9h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  chat: 'M21 12a8 8 0 0 1-8 8H7l-4 3V12a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8z',
  book: 'M2.5 19h19M3 13.5l5.5 1.6L18.8 9a2 2 0 0 1 2.4 3.1l-12 5.6L4 15.8z',
  more: 'M4 6h16M4 12h16M4 18h16',
}

/** 배너 광고를 보여줄 목록 화면 */
const BANNER_ROUTES = ['/', '/deals', '/hotels', '/flights', '/flights/deals']
const BOOK_ROUTES = ['/flights', '/hotels', '/deals']

export function Layout() {
  const { t } = useI18n()
  const location = useLocation()

  useEffect(() => {
    if (!adsAvailable()) return
    if (BANNER_ROUTES.includes(location.pathname)) void showBanner()
    else void hideBanner()
  }, [location.pathname])

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="topbar__brand">
          <span className="topbar__logo" aria-hidden="true" />
          <span className="topbar__title">{t('app.name')}</span>
        </Link>
        <LangSwitch />
      </header>
      <main className="page">
        <Outlet />
      </main>
      <nav className="tabbar" aria-label="Main">
        <div className="tabbar__inner">
          <NavLink to="/" end className={({ isActive }) => `tabbar__item${isActive ? ' is-active' : ''}`}>
            <Icon d={ICONS.trips} />
            {t('nav.trips')}
          </NavLink>
          <ItineraryTab label={t('nav.itinerary')} />
          <NavLink to="/flights" className={() => `tabbar__item${BOOK_ROUTES.some((r) => location.pathname.startsWith(r)) ? ' is-active' : ''}`} data-testid="tab-book">
            <Icon d={ICONS.book} />
            {t('nav.book')}
          </NavLink>
          <NavLink to="/chat" className={({ isActive }) => `tabbar__item${isActive ? ' is-active' : ''}`}>
            <Icon d={ICONS.chat} />
            {t('nav.chat')}
          </NavLink>
          <NavLink to="/more" className={({ isActive }) => `tabbar__item${isActive ? ' is-active' : ''}`}>
            <Icon d={ICONS.more} />
            {t('nav.more')}
          </NavLink>
        </div>
      </nav>
    </div>
  )
}

/** 마지막으로 본 여행의 일정으로 가는 탭 — 없으면 홈 */
function ItineraryTab({ label }: { label: string }) {
  const location = useLocation()
  const active = /^\/trip\/[^/]+$/.test(location.pathname)
  return (
    <button
      type="button"
      className={`tabbar__item${active ? ' is-active' : ''}`}
      onClick={async () => {
        const last = await loadPref(LAST_TRIP_KEY)
        window.location.hash = last ? `#/trip/${last}` : '#/'
      }}
    >
      <Icon d={ICONS.itinerary} />
      {label}
    </button>
  )
}

export { LAST_TRIP_KEY }
