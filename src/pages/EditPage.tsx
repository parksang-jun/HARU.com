// 일정 편집 — 순서 바꾸기, 다른 날로 옮기기, 삭제, 메모, 내 장소 추가, 목록 붙여넣기
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { DayTabs } from '../components/DayTabs'
import { pickName } from '../i18n'
import { useI18n } from '../i18n/context'
import { addCustomStop, addPasted, moveStop, moveStopToDay, removeStop, setMemo } from '../lib/edit'
import type { Itinerary } from '../lib/itinerary'
import { getRepo } from '../lib/repo'
import { useTrip } from '../lib/useTrip'

export function EditPage() {
  const { id } = useParams<{ id: string }>()
  const { t, locale } = useI18n()
  const [trip, setTrip] = useTrip(id)
  const [dayIdx, setDayIdx] = useState(0)
  const [name, setName] = useState('')
  const [paste, setPaste] = useState('')
  const [pasteOpen, setPasteOpen] = useState(false)
  const [msg, setMsg] = useState('')

  if (trip === undefined) return <p className="muted">{t('common.loading')}</p>
  if (!trip?.itinerary) return <p className="alert">{t('itin.error')}</p>
  const it = trip.itinerary
  const day = it.days[Math.min(dayIdx, it.days.length - 1)]

  const apply = async (next: Itinerary, note = t('edit.saved')) => {
    if (next === it) return
    setTrip({ ...trip, itinerary: next })
    await getRepo().saveItinerary(trip.id, next)
    setMsg(note)
  }

  return (
    <>
      <div>
        <h1>{t('edit.title')}</h1>
        <p className="muted small">{t('edit.sub')}</p>
      </div>
      <DayTabs days={it.days} index={dayIdx} onChange={setDayIdx} />
      {msg && (
        <p className="xs muted" role="status" data-testid="edit-msg">
          {msg}
        </p>
      )}
      {day.stops.length === 0 && <p className="muted small">{t('edit.empty')}</p>}
      {day.stops.map((s, i) => (
        <section key={s.id} className="card card--flat edit" data-testid="edit-stop">
          <div className="edit__head">
            <span className="edit__time">{s.time}</span>
            <strong className="edit__name">{pickName(s.name, locale)}</strong>
            {s.custom && <span className="chip chip--sm">{t('edit.mine')}</span>}
          </div>
          <div className="btn-row">
            <button type="button" className="btn btn--sm" disabled={i === 0} onClick={() => apply(moveStop(it, day.day, i, -1))} aria-label={t('edit.up')} data-testid="edit-up">
              ▲
            </button>
            <button type="button" className="btn btn--sm" disabled={i === day.stops.length - 1} onClick={() => apply(moveStop(it, day.day, i, 1))} aria-label={t('edit.down')} data-testid="edit-down">
              ▼
            </button>
            {day.day > 1 && (
              <button type="button" className="btn btn--sm" onClick={() => apply(moveStopToDay(it, day.day, i, -1))} data-testid="edit-prev">
                ← {t('edit.prev')}
              </button>
            )}
            {day.day < it.days.length && (
              <button type="button" className="btn btn--sm" onClick={() => apply(moveStopToDay(it, day.day, i, 1))} data-testid="edit-next">
                {t('edit.next')} →
              </button>
            )}
            <button type="button" className="btn btn--sm btn--ghost" onClick={() => apply(removeStop(it, day.day, i))} data-testid="edit-remove">
              {t('edit.remove')}
            </button>
          </div>
          <input
            key={`${s.id}:${s.memo ?? ''}`}
            className="input"
            defaultValue={s.memo ?? ''}
            maxLength={300}
            placeholder={t('edit.memoPh')}
            aria-label={t('edit.memo')}
            onBlur={(e) => e.target.value.trim() !== (s.memo ?? '') && apply(setMemo(it, day.day, i, e.target.value))}
            data-testid="edit-memo"
          />
        </section>
      ))}

      <section className="card">
        <h2>{t('edit.add')}</h2>
        <form
          className="inline-form"
          onSubmit={(e) => {
            e.preventDefault()
            if (!name.trim()) return
            void apply(addCustomStop(it, day.day, { name }), t('edit.added', { n: 1 }))
            setName('')
          }}
        >
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder={t('edit.addPh')} data-testid="edit-add-name" />
          <button type="submit" className="btn btn--primary btn--sm" data-testid="edit-add">
            {t('edit.addBtn')}
          </button>
        </form>
        <button type="button" className="btn btn--sm btn--ghost" onClick={() => setPasteOpen((v) => !v)} aria-expanded={pasteOpen} data-testid="edit-paste-open">
          {t('edit.paste')}
        </button>
        {pasteOpen && (
          <>
            <p className="xs muted">{t('edit.pasteHelp')}</p>
            <textarea className="input" rows={5} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={t('edit.pastePh')} data-testid="edit-paste" />
            <button
              type="button"
              className="btn btn--sm btn--primary"
              onClick={() => {
                const r = addPasted(it, day.day, paste)
                if (!r.added) return
                void apply(r.itinerary, t('edit.added', { n: r.added }))
                setPaste('')
              }}
              data-testid="edit-paste-add"
            >
              {t('edit.pasteBtn')}
            </button>
          </>
        )}
      </section>

      <Link to={`/trip/${trip.id}/map`} className="btn btn--block" data-testid="edit-to-map">
        {t('map.check')}
      </Link>
      <Link to={`/trip/${trip.id}`} className="btn btn--block btn--ghost">
        {t('report.back')}
      </Link>
    </>
  )
}
