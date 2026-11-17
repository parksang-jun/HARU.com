// 지도·동선 — 지도 타일 없이 좌표만으로 그리는 경로 그림(오프라인 가능) + 이동 구간 + 일정 점검
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { DayTabs } from '../components/DayTabs'
import { pickName } from '../i18n'
import { useI18n } from '../i18n/context'
import { googleDirectionsUrl } from '../lib/links'
import { openExternal } from '../lib/openUrl'
import { getRepo } from '../lib/repo'
import { checkPlan, dayLegs, projectDay, retime } from '../lib/route'
import { useTrip } from '../lib/useTrip'

const W = 320
const H = 220

export function MapPage() {
  const { id } = useParams<{ id: string }>()
  const { t, locale } = useI18n()
  const [trip, setTrip] = useTrip(id)
  const [dayIdx, setDayIdx] = useState(0)
  const it = trip?.itinerary
  const issues = useMemo(() => (it && trip ? checkPlan(it, trip.params.pace, (s) => pickName(s.name, locale)) : []), [it, trip, locale])

  if (trip === undefined) return <p className="muted">{t('common.loading')}</p>
  if (!trip || !it) return <p className="alert">{t('itin.error')}</p>
  const day = it.days[Math.min(dayIdx, it.days.length - 1)]
  const points = projectDay(day, W, H)
  const legs = dayLegs(day)
  const totalMin = legs.reduce((a, l) => a + l.minutes, 0)
  const totalKm = Math.round(legs.reduce((a, l) => a + l.km, 0) * 10) / 10
  const customN = day.stops.filter((s) => s.custom).length

  return (
    <>
      <div>
        <h1>{t('map.title')}</h1>
        <p className="muted small">{t('map.sub')}</p>
      </div>

      <section className="card report__sec" data-testid="plan-check" data-issues={issues.length}>
        <h2>{t('map.check')}</h2>
        {issues.length === 0 ? (
          <p className="small check__ok">✓ {t('map.checkOk')}</p>
        ) : (
          <ul className="check">
            {issues.map((x, i) => (
              <li key={i} data-testid="plan-issue" data-kind={x.kind}>
                <button type="button" className="check__day" onClick={() => setDayIdx(it.days.findIndex((d) => d.day === x.day))}>
                  {t('common.day', { n: x.day })}
                </button>{' '}
                {t(`issue.${x.kind}`, x.vars)}
              </li>
            ))}
          </ul>
        )}
        {issues.some((x) => x.kind === 'overlap') && (
          <button
            type="button"
            className="btn btn--sm btn--primary"
            onClick={async () => {
              const next = retime(it)
              setTrip({ ...trip, itinerary: next })
              await getRepo().saveItinerary(trip.id, next)
            }}
            data-testid="plan-fix"
          >
            {t('map.fix')}
          </button>
        )}
      </section>

      <DayTabs days={it.days} index={dayIdx} onChange={setDayIdx} />

      {points.length === 0 ? (
        <p className="muted small">{t('map.none')}</p>
      ) : (
        <section className="card routemap" data-testid="route-map">
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t('map.title')}>
            <polyline points={points.map((p) => `${p.x},${p.y}`).join(' ')} className="routemap__line" />
            {points.map((p) => (
              <g key={p.stop.id} data-testid="map-point">
                <circle cx={p.x} cy={p.y} r="11" className="routemap__dot" />
                <text x={p.x} y={p.y + 4} textAnchor="middle" className="routemap__n">
                  {p.n}
                </text>
              </g>
            ))}
          </svg>
          <ol className="routemap__list">
            {points.map((p, i) => (
              <li key={p.stop.id}>
                <strong>{pickName(p.stop.name, locale)}</strong> <span className="xs muted">{p.stop.time}</span>
                {legs[i] && (
                  <div className="xs muted routemap__leg" data-testid="map-leg">
                    ↓ {t(`map.${legs[i].mode}`)} · {t('map.leg', { km: legs[i].km, min: legs[i].minutes })}
                  </div>
                )}
              </li>
            ))}
          </ol>
          {legs.length > 0 && (
            <p className="small" data-testid="map-total">
              {t('map.total', { min: totalMin, km: totalKm })}
            </p>
          )}
          {points.length > 1 && (
            <button type="button" className="btn btn--sm" onClick={() => openExternal(googleDirectionsUrl(points.map((p) => p.stop)))}>
              {t('map.open')}
            </button>
          )}
        </section>
      )}
      {customN > 0 && <p className="xs muted">{t('map.custom', { n: customN })}</p>}
      <p className="notice">{t('map.est')}</p>
      <Link to={`/trip/${trip.id}/edit`} className="btn btn--block">
        {t('tools.edit')}
      </Link>
      <Link to={`/trip/${trip.id}`} className="btn btn--block btn--ghost">
        {t('report.back')}
      </Link>
    </>
  )
}
