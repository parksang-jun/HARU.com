// 여행 제품 추천 — 이번 여행의 날씨·여행지·비행 거리에 맞는 준비물 종류와 쇼핑 링크
import { SponsorSlot } from '../components/SponsorSlot'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useI18n } from '../i18n/context'
import { getAirport, HOME_AIRPORT_KEY } from '../lib/airports'
import { defaultHomeAirport } from '../lib/destinations'
import { recommendGear, shopLinks } from '../lib/gear'
import type { Trip } from '../lib/itinerary'
import { openExternal } from '../lib/openUrl'
import { getRepo } from '../lib/repo'
import { loadPref } from '../lib/storage'
import { getTripWeather, type TripWeather } from '../lib/weather'

export function GearPage() {
  const { id } = useParams<{ id: string }>()
  const { t, locale } = useI18n()
  const [trip, setTrip] = useState<Trip | null | undefined>(undefined)
  const [weather, setWeather] = useState<TripWeather>({})
  const [home, setHome] = useState(defaultHomeAirport(locale))

  useEffect(() => {
    loadPref(HOME_AIRPORT_KEY).then((v) => {
      if (getAirport(v)) setHome(v as string)
    })
  }, [])
  useEffect(() => {
    if (!id) return
    let alive = true
    getRepo()
      .getTrip(id)
      .then(async (tr) => {
        if (!alive) return
        setTrip(tr)
        if (tr?.itinerary) setWeather(await getTripWeather(tr).catch(() => ({})))
      })
      .catch(() => alive && setTrip(null))
    return () => {
      alive = false
    }
  }, [id])

  const items = useMemo(() => (trip ? recommendGear(trip, Object.values(weather), home) : []), [trip, weather, home])

  if (trip === undefined) return <p className="muted">{t('common.loading')}</p>
  if (!trip?.itinerary) return <p className="alert">{t('itin.error')}</p>

  return (
    <>
      <div>
        <h1>{t('gear.title')}</h1>
        <p className="muted small">{t('gear.sub')}</p>
      </div>
      {items.length === 0 && <p className="muted">{t('gear.none')}</p>}
      {items.map((it) => {
        const name = t(`gear.item.${it.id}`)
        return (
          <section key={it.id} className="card gear" data-testid="gear-item" data-gear={it.id}>
            <div className="gear__text">
              <strong>{name}</strong>
              <span className="xs muted">{t(`gear.why.${it.why}`)}</span>
            </div>
            {shopLinks(it.id, name, locale).map((l) => (
              <button key={l.shop} type="button" className="btn btn--sm" onClick={() => openExternal(l.url)} data-testid="gear-link" data-url={l.url}>
                {t('gear.find', { shop: t(`gear.shop.${l.shop}`) })}
              </button>
            ))}
          </section>
        )
      })}
      <p className="notice">{t('gear.disclosure')}</p>
      <SponsorSlot slot="gear" trip={trip} />
      <Link to={`/trip/${trip.id}`} className="btn btn--block">
        {t('report.back')}
      </Link>
    </>
  )
}
