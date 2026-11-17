// 가계부·정산 — 지출 기록과 1/N 정산 (이 기기에만 저장)
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useI18n } from '../i18n/context'
import { getDestination } from '../lib/destinations'
import { addExpense, addMember, EMPTY_LEDGER, loadLedger, removeExpense, removeMember, saveLedger, settle, totals, type Ledger } from '../lib/ledger'
import { useTrip } from '../lib/useTrip'

export function LedgerPage() {
  const { id } = useParams<{ id: string }>()
  const { t, formatMoney } = useI18n()
  const [trip] = useTrip(id)
  const [ledger, setLedger] = useState<Ledger>(EMPTY_LEDGER)
  const [member, setMember] = useState('')
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [payer, setPayer] = useState('')
  const [among, setAmong] = useState<string[]>([])
  const [currency, setCurrency] = useState('KRW')

  const currencies = useMemo(() => [...new Set(['KRW', ...(trip?.params.cities ?? []).map((c) => getDestination(c)?.currency ?? 'KRW')])], [trip])
  useEffect(() => {
    if (id) void loadLedger(id).then(setLedger)
  }, [id])
  useEffect(() => {
    if (currencies.length > 1) setCurrency(currencies[1])
  }, [currencies])

  if (trip === undefined) return <p className="muted">{t('common.loading')}</p>
  if (!trip) return <p className="alert">{t('itin.error')}</p>

  const update = (next: Ledger) => {
    if (next === ledger) return
    setLedger(next)
    void saveLedger(trip.id, next)
  }
  const paidBy = payer && ledger.members.includes(payer) ? payer : (ledger.members[0] ?? '')
  const transfers = settle(ledger)

  return (
    <>
      <div>
        <h1>{t('ledger.title')}</h1>
        <p className="muted small">{t('ledger.sub')}</p>
      </div>

      <section className="card">
        <h2>{t('ledger.members')}</h2>
        <div className="chips">
          {ledger.members.map((m) => (
            <button key={m} type="button" className="chip" onClick={() => update(removeMember(ledger, m))} title={t('ledger.remove')} data-testid="ledger-member">
              {m} ✕
            </button>
          ))}
        </div>
        <form
          className="inline-form"
          onSubmit={(e) => {
            e.preventDefault()
            update(addMember(ledger, member))
            setMember('')
          }}
        >
          <input className="input" value={member} onChange={(e) => setMember(e.target.value)} maxLength={20} placeholder={t('ledger.memberPh')} data-testid="ledger-member-name" />
          <button type="submit" className="btn btn--sm" data-testid="ledger-member-add">
            {t('ledger.addMember')}
          </button>
        </form>
      </section>

      <section className="card">
        <h2>{t('ledger.add')}</h2>
        {ledger.members.length === 0 ? (
          <p className="small muted">{t('ledger.needMembers')}</p>
        ) : (
          <form
            className="ledger__form"
            onSubmit={(e) => {
              e.preventDefault()
              const next = addExpense(ledger, { title, amount: Number(amount), currency, payer: paidBy, among })
              if (next === ledger) return
              update(next)
              setTitle('')
              setAmount('')
            }}
          >
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder={t('ledger.whatPh')} aria-label={t('ledger.what')} data-testid="ledger-title" />
            <div className="inline-form">
              <input className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} placeholder={t('ledger.amount')} aria-label={t('ledger.amount')} data-testid="ledger-amount" />
              <select className="input" value={currency} onChange={(e) => setCurrency(e.target.value)} aria-label="currency">
                {currencies.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <label className="field">
              <span className="field__label">{t('ledger.payer')}</span>
              <select className="input" value={paidBy} onChange={(e) => setPayer(e.target.value)} data-testid="ledger-payer">
                {ledger.members.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </label>
            <div className="field">
              <span className="field__label">{t('ledger.among')}</span>
              <div className="chips">
                <button type="button" className={`chip${among.length === 0 ? ' is-active' : ''}`} aria-pressed={among.length === 0} onClick={() => setAmong([])}>
                  {t('ledger.everyone')}
                </button>
                {ledger.members.map((m) => (
                  <button key={m} type="button" className={`chip${among.includes(m) ? ' is-active' : ''}`} aria-pressed={among.includes(m)} onClick={() => setAmong(among.includes(m) ? among.filter((x) => x !== m) : [...among, m])}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" className="btn btn--primary btn--block" data-testid="ledger-add">
              {t('ledger.addBtn')}
            </button>
          </form>
        )}
      </section>

      <section className="card">
        <h2>{t('ledger.list')}</h2>
        {ledger.expenses.length === 0 && <p className="small muted">{t('ledger.none')}</p>}
        <ul className="ledger__list">
          {ledger.expenses.map((e) => (
            <li key={e.id} data-testid="ledger-expense">
              <span>
                <strong>{e.title}</strong>
                <span className="xs muted"> {t('ledger.paidBy', { payer: e.payer, among: e.among.length ? e.among.join(', ') : t('ledger.everyone') })}</span>
              </span>
              <span className="ledger__amt">
                {formatMoney(e.amount, e.currency)}
                <button type="button" className="btn btn--sm btn--ghost" onClick={() => update(removeExpense(ledger, e.id))} aria-label={t('ledger.remove')}>
                  ✕
                </button>
              </span>
            </li>
          ))}
        </ul>
        {totals(ledger).map((x) => (
          <p key={x.currency} className="small" data-testid="ledger-total">
            {t('ledger.total')}: <strong>{formatMoney(x.total, x.currency)}</strong>
          </p>
        ))}
      </section>

      {ledger.expenses.length > 0 && (
        <section className="card" data-testid="ledger-settle">
          <h2>{t('ledger.settle')}</h2>
          {transfers.length === 0 ? (
            <p className="small muted">{t('ledger.settled')}</p>
          ) : (
            <ul className="ledger__list">
              {transfers.map((x, i) => (
                <li key={i} data-testid="ledger-transfer">
                  <span>{t('ledger.transfer', { from: x.from, to: x.to })}</span>
                  <strong>{formatMoney(x.amount, x.currency)}</strong>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      <p className="notice">{t('ledger.local')}</p>
      <Link to={`/trip/${trip.id}`} className="btn btn--block btn--ghost">
        {t('report.back')}
      </Link>
    </>
  )
}
