// 여행 회화 — 현지 언어 문장을 크게 띄워 보여 주는 화면
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useI18n } from '../i18n/context'
import { countryName, getDestination } from '../lib/destinations'
import { PHRASE_KEYS, PHRASES, phraseLang, type PhraseKey } from '../lib/phrases'
import { useTrip } from '../lib/useTrip'

export function PhrasesPage() {
  const { id } = useParams<{ id: string }>()
  const { t, locale } = useI18n()
  const [trip] = useTrip(id)
  const [pick, setPick] = useState('')
  const [show, setShow] = useState<PhraseKey | null>(null)

  if (trip === undefined) return <p className="muted">{t('common.loading')}</p>
  if (!trip) return <p className="alert">{t('itin.error')}</p>

  const countries = [...new Set(trip.params.cities.map((c) => getDestination(c)?.country ?? '').filter(Boolean))]
  const country = pick || countries[0] || ''
  const { lang, fallback } = phraseLang(country)
  const text = PHRASES[lang]

  return (
    <>
      <div>
        <h1>{t('phrases.title')}</h1>
        <p className="muted small">{t('phrases.sub')}</p>
      </div>
      {countries.length > 1 && (
        <div className="chips">
          {countries.map((c) => (
            <button key={c} type="button" className={`chip chip--sm${c === country ? ' is-on' : ''}`} onClick={() => setPick(c)}>
              {countryName(c, locale)}
            </button>
          ))}
        </div>
      )}
      <h2 data-testid="phrase-lang" data-lang={lang}>
        {countryName(country, locale)} · {t(`phrases.lang.${lang}`)}
      </h2>
      {fallback && <p className="notice">{t('phrases.fallback')}</p>}
      <div className="list">
        {PHRASE_KEYS.map((k) => (
          <button key={k} type="button" className="card card--flat phrase" onClick={() => setShow(k)} data-testid="phrase">
            <span className="xs muted">{t(`phrases.k.${k}`)}</span>
            <strong className="phrase__text" lang={lang}>
              {text[k]}
            </strong>
          </button>
        ))}
      </div>
      <p className="xs muted">{t('phrases.note')}</p>
      <Link to={`/trip/${trip.id}`} className="btn btn--block btn--ghost">
        {t('report.back')}
      </Link>

      {show && (
        <div className="gate" role="dialog" aria-modal="true" onClick={() => setShow(null)} data-testid="phrase-show">
          <div className="gate__box card phrase__big">
            <span className="small muted">{t(`phrases.k.${show}`)}</span>
            <strong lang={lang}>{text[show]}</strong>
            <span className="xs muted">{t('phrases.tapClose')}</span>
          </div>
        </div>
      )}
    </>
  )
}
