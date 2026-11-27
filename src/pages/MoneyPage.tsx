// 환율·예산 — 환율 계산기, 이번 여행 예상 지출, 환전 권장액
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useI18n } from '../i18n/context'
import { cashShare, estimateBudget, type BudgetLine } from '../lib/budget'
import { countryName, getDestination } from '../lib/destinations'
import { displayCurrency } from '../lib/fx'
import { approxRates, convert, loadRates, type Rates } from '../lib/rates'
import { useTrip } from '../lib/useTrip'

const LINES: BudgetLine[] = ['stay', 'food', 'transit', 'activity', 'extra']

export function MoneyPage() {
  const { id } = useParams<{ id: string }>()
  const { t, locale, formatMoney, formatDate } = useI18n()
  const [trip] = useTrip(id)
  const home = displayCurrency(locale)
  const [rates, setRates] = useState<Rates>(() => approxRates('USD'))
  const [loaded, setLoaded] = useState(false)
  const [cur, setCur] = useState('')
  const [amount, setAmount] = useState('100')
  const [reverse, setReverse] = useState(false)

  const dests = useMemo(() => (trip?.params.cities ?? []).map((c) => getDestination(c)).filter((d) => d !== undefined), [trip])
  const currencies = useMemo(() => [...new Set(dests.map((d) => d!.currency))].filter((c) => c !== home), [dests, home])
  const local = cur || currencies[0] || ''

  useEffect(() => {
    if (!trip) return
    let alive = true
    loadRates('USD', [home, ...currencies])
      .then((r) => alive && setRates(r))
      .finally(() => alive && setLoaded(true))
    return () => {
      alive = false
    }
  }, [trip, home, currencies])

  if (trip === undefined) return <p className="muted">{t('common.loading')}</p>
  if (!trip) return <p className="alert">{t('itin.error')}</p>

  const est = estimateBudget(trip)
  const toHome = (usd: number) => convert(usd, 'USD', home, rates)
  const one = local ? convert(1, local, home, rates) : null
  // 단위가 작은 통화는 100·1000 단위로 보여 준다 (예: 100 JPY = …)
  let unit = 1
  if (one !== null) while (one * unit < 1 && unit < 10000) unit *= 10
  const n = Number(amount) || 0
  const converted = local ? (reverse ? convert(n, home, local, rates) : convert(n, local, home, rates)) : null
  const country = dests.find((d) => d!.currency === local)?.country ?? ''
  const cashUsd = est.onTripUsd * cashShare(country)
  const cashLocal = local ? convert(cashUsd, 'USD', local, rates) : null
  const cashHome = toHome(cashUsd)
  // 환전 금액은 보기 쉬운 단위로 올림
  const tidy = (v: number) => {
    const unit = v >= 100000 ? 10000 : v >= 10000 ? 1000 : v >= 1000 ? 100 : v >= 100 ? 10 : 1
    return Math.ceil(v / unit) * unit
  }

  return (
    <>
      <div>
        <h1>{t('money.title')}</h1>
        <p className="muted small">{t('money.sub')}</p>
      </div>

      {local ? (
        <section className="card list" data-testid="fx-card">
          <div className="row">
            <h2>{t('money.rate')}</h2>
            <span className={`badge ${rates.live ? 'badge--cat' : 'badge--sponsored'}`} data-testid="fx-kind" data-live={rates.live ? '1' : '0'}>
              {rates.live ? t('money.live', { date: rates.date ? formatDate(rates.date) : '' }) : t('money.approx')}
            </span>
          </div>
          {currencies.length > 1 && (
            <div className="chips">
              {currencies.map((c) => (
                <button key={c} type="button" className={`chip chip--sm${c === local ? ' is-on' : ''}`} onClick={() => setCur(c)}>
                  {c}
                </button>
              ))}
            </div>
          )}
          {one !== null ? (
            <p className="money__one" data-testid="fx-one">
              {unit.toLocaleString()} {local} = <strong>{formatMoney(one * unit, home)}</strong>
            </p>
          ) : (
            loaded && <p className="alert small">{t('money.noRate', { cur: local })}</p>
          )}
          <div className="inline-form">
            <input className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} aria-label={t('ledger.amount')} data-testid="fx-amount" />
            <button type="button" className="btn btn--sm" onClick={() => setReverse((v) => !v)} aria-label={t('money.swap')} data-testid="fx-swap">
              {reverse ? home : local} ⇄
            </button>
          </div>
          {converted !== null && (
            <p className="price" data-testid="fx-result">
              {formatMoney(converted, reverse ? local : home)}
            </p>
          )}
          <p className="xs muted">{rates.live ? t('money.rateNote') : t('money.approxNote')}</p>
        </section>
      ) : (
        <p className="notice">{t('money.domestic')}</p>
      )}

      <section className="card list" data-testid="budget-card">
        <div className="row">
          <h2>{t('money.budget')}</h2>
          <span className="badge badge--cat">{t('money.estimate')}</span>
        </div>
        <p className="xs muted">{t('money.budgetBasis', { people: est.people, days: est.days, nights: est.nights, rooms: est.rooms, tier: t(`setup.budgetOpt.${trip.params.budget}`) })}</p>
        <ul className="ledger__list">
          {LINES.map((k) => (
            <li key={k} data-testid="budget-line" data-line={k}>
              <span>{t(`money.line.${k}`)}</span>
              <strong>{formatMoney(toHome(est.lines[k]) ?? est.lines[k], toHome(est.lines[k]) === null ? 'USD' : home)}</strong>
            </li>
          ))}
          <li className="money__total" data-testid="budget-total">
            <span>{t('money.total')}</span>
            <strong>{formatMoney(toHome(est.totalUsd) ?? est.totalUsd, toHome(est.totalUsd) === null ? 'USD' : home)}</strong>
          </li>
        </ul>
        <p className="xs muted">{t('money.budgetNote')}</p>
      </section>

      {local && cashLocal !== null && cashHome !== null && (
        <section className="card list" data-testid="cash-card">
          <h2>{t('money.cash')}</h2>
          <p className="price">{formatMoney(tidy(cashLocal), local)}</p>
          <p className="small">{t('money.cashHome', { amount: formatMoney(cashHome, home) })}</p>
          <p className="xs muted">{t(`money.cashWhy.${cashShare(country) >= 0.6 ? 'cash' : cashShare(country) <= 0.2 ? 'card' : 'mixed'}`, { country: countryName(country, locale) })}</p>
        </section>
      )}

      <Link to={`/trip/${trip.id}/budget`} className="btn btn--block" data-testid="money-to-ledger">
        {t('tools.ledger')}
      </Link>
      <Link to={`/trip/${trip.id}`} className="btn btn--block btn--ghost">
        {t('report.back')}
      </Link>
    </>
  )
}
