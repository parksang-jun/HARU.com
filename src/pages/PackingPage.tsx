// 짐 싸기 체크리스트 — 기본 준비물 + 날씨·여행 맞춤 + 직접 추가
import { SponsorSlot } from '../components/SponsorSlot'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useI18n } from '../i18n/context'
import { getAirport, HOME_AIRPORT_KEY } from '../lib/airports'
import { defaultHomeAirport } from '../lib/destinations'
import { recommendGear } from '../lib/gear'
import { addCustom, EMPTY_PACKING, loadPacking, packingItems, removeCustom, savePacking, toggleItem, type PackingItem, type PackingState } from '../lib/packing'
import { isAbroad } from '../lib/plan'
import { loadPref } from '../lib/storage'
import { useTrip } from '../lib/useTrip'
import { getTripWeather, type TripWeather } from '../lib/weather'

const GROUPS: PackingItem['group'][] = ['base', 'abroad', 'trip', 'custom']

export function PackingPage() {
  const { id } = useParams<{ id: string }>()
  const { t, locale } = useI18n()
  const [trip] = useTrip(id)
  const [weather, setWeather] = useState<TripWeather>({})
  const [home, setHome] = useState(defaultHomeAirport(locale))
  const [state, setState] = useState<PackingState>(EMPTY_PACKING)
  const [name, setName] = useState('')

  useEffect(() => {
    void loadPref(HOME_AIRPORT_KEY).then((v) => {
      if (getAirport(v)) setHome(v as string)
    })
    if (id) void loadPacking(id).then(setState)
  }, [id])
  useEffect(() => {
    if (trip?.itinerary) void getTripWeather(trip).then(setWeather).catch(() => undefined)
  }, [trip])

  const items = useMemo(() => (trip ? packingItems(trip.itinerary ? recommendGear(trip, Object.values(weather), home) : [], isAbroad(trip, home), state.custom) : []), [trip, weather, home, state.custom])

  if (trip === undefined) return <p className="muted">{t('common.loading')}</p>
  if (!trip) return <p className="alert">{t('itin.error')}</p>

  const update = (next: PackingState) => {
    if (next === state) return
    setState(next)
    void savePacking(trip.id, next)
  }
  const done = items.filter((i) => state.checked.includes(i.key)).length

  return (
    <>
      <div>
        <h1>{t('packing.title')}</h1>
        <p className="muted small">{t('packing.sub')}</p>
      </div>
      <p className="small" data-testid="packing-progress">
        <strong>{t('packing.progress', { done, total: items.length })}</strong>
      </p>
      <div className="prep__bar" aria-hidden="true">
        <span style={{ width: `${items.length ? (done / items.length) * 100 : 0}%` }} />
      </div>
      {GROUPS.map((g) => {
        const list = items.filter((i) => i.group === g)
        if (!list.length) return null
        return (
          <section key={g} className="card" data-testid="packing-group" data-group={g}>
            <h2>{t(`packing.group.${g}`)}</h2>
            <ul className="pack">
              {list.map((i) => {
                const on = state.checked.includes(i.key)
                return (
                  <li key={i.key}>
                    <button type="button" className={`pack__item${on ? ' is-on' : ''}`} aria-pressed={on} onClick={() => update(toggleItem(state, i.key))} data-testid="packing-item" data-key={i.key}>
                      <span className="pack__box" aria-hidden="true">
                        {on ? '✓' : ''}
                      </span>
                      {i.i18n ? t(i.i18n) : i.label}
                    </button>
                    {g === 'custom' && i.label && (
                      <button type="button" className="btn btn--sm btn--ghost" onClick={() => update(removeCustom(state, i.label as string))} aria-label={t('packing.remove')}>
                        ✕
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
      <form
        className="inline-form"
        onSubmit={(e) => {
          e.preventDefault()
          update(addCustom(state, name))
          setName('')
        }}
      >
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder={t('packing.addPh')} data-testid="packing-add-name" />
        <button type="submit" className="btn btn--sm btn--primary" data-testid="packing-add">
          {t('packing.addBtn')}
        </button>
      </form>
      <Link to={`/trip/${trip.id}/gear`} className="btn btn--block">
        {t('prep.gear')}
      </Link>
      <SponsorSlot slot="packing" trip={trip} />
      <Link to={`/trip/${trip.id}`} className="btn btn--block btn--ghost">
        {t('report.back')}
      </Link>
    </>
  )
}
