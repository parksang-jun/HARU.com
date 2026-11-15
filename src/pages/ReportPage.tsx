// 여행 보고서 — 계획이 끝난 여행을 한 장으로 정리해 보여 주고 복사·공유·인쇄한다
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { Share } from '@capacitor/share'
import { useI18n } from '../i18n/context'
import { pickName } from '../i18n'
import { getAirport, HOME_AIRPORT_KEY } from '../lib/airports'
import { defaultHomeAirport, destName } from '../lib/destinations'
import type { Trip } from '../lib/itinerary'
import { loadMealPicks, type MealPicks } from '../lib/meals'
import { buildReport, mealLine, prepLabel, reportText, weatherLine, type ReportFormat } from '../lib/report'
import { getRepo } from '../lib/repo'
import { loadJson, loadPref } from '../lib/storage'
import { formatTemps, getTripWeather, ICONS, todayIso, type TripWeather } from '../lib/weather'

/** 인쇄 창을 쓸 수 있는 환경인지 (앱 안·미리보기 틀 안에서는 인쇄가 막혀 있다) */
function canPrint(): boolean {
  try {
    return !Capacitor.isNativePlatform() && window.self === window.top && typeof window.print === 'function'
  } catch {
    return false
  }
}

export function ReportPage() {
  const { id } = useParams<{ id: string }>()
  const { t, locale, formatDate, formatMoney } = useI18n()
  const [trip, setTrip] = useState<Trip | null | undefined>(undefined)
  const [weather, setWeather] = useState<TripWeather>({})
  const [done, setDone] = useState<string[]>([])
  const [picks, setPicks] = useState<MealPicks>({})
  const [home, setHome] = useState(defaultHomeAirport(locale))
  const [copied, setCopied] = useState(false)

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
    loadJson<string[]>(`prep:${id}`, []).then((d) => alive && setDone(d))
    loadMealPicks(id).then((m) => alive && setPicks(m))
    return () => {
      alive = false
    }
  }, [id])

  const report = useMemo(() => (trip ? buildReport(trip, weather, done, home, picks) : null), [trip, weather, done, home, picks])
  const fmt: ReportFormat = useMemo(
    () => ({ t, locale, formatDate, formatMoney, cityName: (c) => destName(c, locale), placeName: (n) => pickName(n, locale), temps: (w) => formatTemps(w, locale) }),
    [t, locale, formatDate, formatMoney],
  )

  if (trip === undefined) return <p className="muted">{t('common.loading')}</p>
  if (!trip || !report) return <p className="alert">{t('itin.error')}</p>

  const text = () => reportText(report, fmt, todayIso())
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text())
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      setCopied(false)
    }
  }
  const share = async () => {
    try {
      await Share.share({ title: report.title, text: text() })
    } catch {
      await copy()
    }
  }
  const left = report.prep.length - report.prepDone

  return (
    <article className="report" data-testid="report">
      <header>
        <p className="xs muted">{t('report.title')}</p>
        <h1 data-testid="report-title">{report.title}</h1>
        <p className="muted small">
          {formatDate(report.startDate)} – {formatDate(report.endDate)} · {t('common.days', { n: report.nDays })}
        </p>
      </header>

      <div className="btn-row report__actions">
        <button type="button" className="btn btn--primary btn--sm" onClick={copy} data-testid="report-copy">
          {copied ? t('report.copied') : t('report.copy')}
        </button>
        <button type="button" className="btn btn--sm" onClick={share}>
          {t('report.share')}
        </button>
        {canPrint() && (
          <button type="button" className="btn btn--sm" onClick={() => window.print()}>
            {t('report.print')}
          </button>
        )}
      </div>

      <section className="card report__sec">
        <h2>{t('report.overview')}</h2>
        <dl className="report__dl">
          <dt>{t('report.cities')}</dt>
          <dd>{report.cities.map(fmt.cityName).join(' → ')}</dd>
          <dt>{t('report.party')}</dt>
          <dd>{t('report.partyValue', { who: t(`setup.travelersOpt.${report.travelers}`), n: report.adults })}</dd>
          <dt>{t('report.style')}</dt>
          <dd>
            {t(`setup.budgetOpt.${report.budget}`)} · {t(`setup.paceOpt.${report.pace}`)}
          </dd>
          {report.interests.length > 0 && (
            <>
              <dt>{t('report.interests')}</dt>
              <dd>{report.interests.map((i) => t(`setup.interest.${i}`)).join(', ')}</dd>
            </>
          )}
        </dl>
      </section>

      <section className="card report__sec" data-testid="report-prep">
        <h2>
          {t('report.prep')} <span className="xs muted">{t('prep.progress', { done: report.prepDone, total: report.prep.length })}</span>
        </h2>
        <p className={`small ${left ? 'report__warn' : 'prep__done'}`}>{left ? t('report.prepLeft', { n: left }) : t('report.prepAll')}</p>
        <ul className="report__list">
          {report.prep.map((x) => (
            <li key={x.key}>
              <span className={`prep__check${x.done ? ' is-on' : ''}`} aria-hidden="true">
                ✓
              </span>
              <span>{prepLabel(x, report, fmt)}</span>
              <span className="xs muted report__state">{t(x.done ? 'report.done' : 'report.todo')}</span>
            </li>
          ))}
        </ul>
      </section>

      {report.notes && (
        <section className="card report__sec">
          <h2>{t('report.requests')}</h2>
          <p className="xs muted req__text">“{report.notes}”</p>
          {report.requests.length > 0 && (
            <ul className="req__list">
              {report.requests.map((r, i) => (
                <li key={i} className={r.applied ? 'is-ok' : 'is-no'}>
                  <span className="req__mark" aria-hidden="true">
                    {r.applied ? '✓' : '!'}
                  </span>
                  <span>
                    <strong>{r.request}</strong> — {r.handled}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="card report__sec">
        <h2>{t('report.days')}</h2>
        {report.days.map((d) => (
          <div key={d.day} className="report__day" data-testid="report-day">
            <h3>
              {t('common.day', { n: d.day })} · {formatDate(d.date)} · {fmt.cityName(d.city)}
            </h3>
            <p className="xs muted">
              {d.weather && <span aria-hidden="true">{ICONS[d.weather.condition]} </span>}
              {weatherLine(d.weather, fmt)}
            </p>
            <ol className="report__stops">
              {d.stops.map((s, i) => (
                <li key={i}>
                  <span className="report__time">{s.time}</span>
                  <span>
                    {fmt.placeName(s.name)}
                    {s.area && <span className="xs muted"> · {s.area}</span>}
                  </span>
                  {s.cost && s.currency && <span className="xs muted report__cost">{formatMoney(s.cost, s.currency)}</span>}
                </li>
              ))}
            </ol>
            {d.meals.map((m) => (
              <p key={m.slot} className="small report__meal" data-testid="report-meal" data-chosen={Boolean(m.chosen)}>
                <span className="muted">{t(`meals.${m.slot}`)}</span> {mealLine(m, fmt)}
              </p>
            ))}
          </div>
        ))}
      </section>

      <section className="card report__sec" data-testid="report-costs">
        <h2>{t('report.costs')}</h2>
        {report.costs.length ? (
          <ul className="report__list">
            {report.costs.map((c) => (
              <li key={c.currency}>
                <span>
                  {t('report.perPerson')} <strong>{formatMoney(c.perPerson, c.currency)}</strong>
                </span>
                <span className="report__state">
                  {t('report.total', { n: report.adults })} <strong>{formatMoney(c.total, c.currency)}</strong>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="small muted">{t('report.noCost')}</p>
        )}
        <p className="xs muted">{t('report.costNote')}</p>
      </section>

      <section className="card report__sec">
        <h2>{t('report.packing')}</h2>
        <p className="small">{report.packing.length ? report.packing.map((p) => t(`weather.tip.${p}`)).join(' · ') : t('weather.noTips')}</p>
        {report.gear.length > 0 && (
          <p className="small" data-testid="report-gear">
            <span className="muted">{t('gear.title')}: </span>
            {report.gear.map((g) => t(`gear.item.${g.id}`)).join(' · ')}{' '}
            <Link to={`/trip/${trip.id}/gear`}>›</Link>
          </p>
        )}
        {report.abroad && <p className="xs muted">{t('prep.essentialsSub')}</p>}
      </section>

      <p className="notice">{t('itin.aiNotice')}</p>
      <p className="notice">{t(report.sampleWeather ? 'weather.noticeSample' : 'weather.notice')}</p>

      <Link to={`/trip/${trip.id}`} className="btn btn--block report__actions">
        {t('report.back')}
      </Link>
    </article>
  )
}
