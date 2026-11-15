// 나라별 여행 꿀팁 — 여행지 나라의 콘센트·팁 문화·결제·교통·수돗물·긴급 전화
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useI18n } from '../i18n/context'
import { airportDestination, getAirport, HOME_AIRPORT_KEY } from '../lib/airports'
import { factsFor, plugCompatible, voltageDiffers } from '../lib/countryTips'
import { defaultHomeAirport, destName, getDestination } from '../lib/destinations'
import type { Trip } from '../lib/itinerary'
import { getRepo } from '../lib/repo'
import { loadPref } from '../lib/storage'

export function TipsPage() {
  const { id } = useParams<{ id: string }>()
  const { t, locale } = useI18n()
  const [trip, setTrip] = useState<Trip | null | undefined>(undefined)
  const [home, setHome] = useState(defaultHomeAirport(locale))

  useEffect(() => {
    loadPref(HOME_AIRPORT_KEY).then((v) => {
      if (getAirport(v)) setHome(v as string)
    })
  }, [])
  useEffect(() => {
    if (!id) return
    getRepo()
      .getTrip(id)
      .then(setTrip)
      .catch(() => setTrip(null))
  }, [id])

  // 나라별로 묶는다 (같은 나라의 도시는 한 카드)
  const groups = useMemo(() => {
    const by = new Map<string, string[]>()
    for (const c of trip?.params.cities ?? []) {
      const country = getDestination(c)?.country ?? ''
      by.set(country, [...(by.get(country) ?? []), c])
    }
    return [...by.entries()]
  }, [trip])

  if (trip === undefined) return <p className="muted">{t('common.loading')}</p>
  if (!trip) return <p className="alert">{t('itin.error')}</p>
  const homeCountry = airportDestination(home)?.country ?? ''

  return (
    <>
      <div>
        <h1>{t('tips.title')}</h1>
        <p className="muted small">{t('tips.sub')}</p>
      </div>
      {groups.map(([country, cities]) => {
        const facts = factsFor(country)
        const abroad = country !== homeCountry
        const fits = plugCompatible(homeCountry, country)
        return (
          <section key={country} className="card report__sec" data-testid="country-tips" data-country={country}>
            <h2>
              {cities.map((c) => destName(c, locale)).join(' · ')} {!abroad && <span className="xs muted">{t('tips.home')}</span>}
            </h2>
            {!facts ? (
              <p className="small muted">{t('tips.unknown')}</p>
            ) : (
              <ul className="airport__tips">
                <li data-tip="plug">
                  {t('tips.plug', { types: facts.plugs.join('·'), v: facts.volt })}
                  {abroad && fits !== undefined && <> — {t(fits ? 'tips.adapterOk' : 'tips.adapterNeed')}</>}
                  {abroad && voltageDiffers(homeCountry, country) && <> {t('tips.voltNote')}</>}
                </li>
                {facts.tipping && (
                  <li data-tip="tipping">
                    <strong>{t('tips.tipping.label')}</strong> {t(`tips.tipping.${facts.tipping}`)}
                  </li>
                )}
                {facts.pay && (
                  <li data-tip="pay">
                    <strong>{t('tips.pay.label')}</strong> {t(`tips.pay.${facts.pay}`)}
                  </li>
                )}
                {facts.transit && <li data-tip="transit">{t('tips.transit', { name: facts.transit })}</li>}
                {facts.tapWater !== undefined && (
                  <li data-tip="water">
                    <strong>{t('tips.water.label')}</strong> {t(facts.tapWater ? 'tips.water.yes' : 'tips.water.no')}
                  </li>
                )}
                {facts.police && <li data-tip="emergency">{facts.police === facts.ambulance || !facts.ambulance ? t('tips.emergencyOne', { p: facts.police }) : t('tips.emergency', { p: facts.police, a: facts.ambulance })}</li>}
              </ul>
            )}
          </section>
        )
      })}
      {groups.some(([c]) => c !== homeCountry) && (
        <section className="card report__sec">
          <h2>{t('tips.checklist')}</h2>
          <p className="small">{t('prep.essentialsSub')}</p>
        </section>
      )}
      <p className="notice">{t('tips.note')}</p>
      <Link to={`/trip/${trip.id}/chat`} className="btn btn--block">
        {t('tips.ask')}
      </Link>
      <Link to={`/trip/${trip.id}`} className="btn btn--block btn--ghost">
        {t('report.back')}
      </Link>
    </>
  )
}
