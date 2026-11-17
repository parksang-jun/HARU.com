// 여행자 톡 — 같은 여행지를 가는 여행자끼리 현지 소식을 나누는 짧은 글 게시판
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useI18n } from '../i18n/context'
import { destName } from '../lib/destinations'
import { ENV } from '../lib/env'
import { addPost, ago, deletePost, listPosts, myNickname, reportPost, TALK_MAX, TALK_TAGS, type TalkPost, type TalkTag } from '../lib/talk'
import { useTrip } from '../lib/useTrip'

export function TalkPage() {
  const { id } = useParams<{ id: string }>()
  const { t, locale } = useI18n()
  const [trip] = useTrip(id)
  const [city, setCity] = useState('')
  const [posts, setPosts] = useState<TalkPost[] | null>(null)
  const [filter, setFilter] = useState<TalkTag | 'all'>('all')
  const [tag, setTag] = useState<TalkTag>('tip')
  const [text, setText] = useState('')
  const [nick, setNick] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const cities = [...new Set(trip?.params.cities ?? [])]
  const cur = city || cities[0] || ''

  const reload = useCallback(() => {
    if (!cur) return
    listPosts(cur, locale)
      .then(setPosts)
      .catch(() => setPosts([]))
  }, [cur, locale])
  useEffect(reload, [reload])
  useEffect(() => {
    void myNickname().then(setNick)
  }, [])

  if (trip === undefined) return <p className="muted">{t('common.loading')}</p>
  if (!trip) return <p className="alert">{t('itin.error')}</p>

  const submit = async () => {
    if (busy) return
    setBusy(true)
    const r = await addPost(cur, tag, text).catch(() => ({ ok: false as const, error: 'failed' as const }))
    setBusy(false)
    if (!r.ok) return setMsg(t(`talk.err.${r.error}`))
    setText('')
    setMsg('')
    reload()
  }
  const shown = (posts ?? []).filter((p) => filter === 'all' || p.tag === filter)
  const when = (p: TalkPost) => {
    const a = ago(p.createdAt)
    return a.unit === 'now' ? t('talk.now') : t(`talk.${a.unit}`, { n: a.n })
  }

  return (
    <>
      <div>
        <h1>{t('talk.title')}</h1>
        <p className="muted small">{t('talk.sub')}</p>
      </div>
      {cities.length > 1 && (
        <div className="chips" data-testid="talk-cities">
          {cities.map((c) => (
            <button key={c} type="button" className={`chip${c === cur ? ' is-active' : ''}`} aria-pressed={c === cur} onClick={() => setCity(c)}>
              {destName(c, locale)}
            </button>
          ))}
        </div>
      )}
      <h2 data-testid="talk-city">{destName(cur, locale)}</h2>

      <section className="card talk__write">
        <div className="chips">
          {TALK_TAGS.map((x) => (
            <button key={x} type="button" className={`chip chip--sm${x === tag ? ' is-active' : ''}`} aria-pressed={x === tag} onClick={() => setTag(x)} data-testid="talk-tag">
              {t(`talk.tag.${x}`)}
            </button>
          ))}
        </div>
        <textarea className="input" rows={3} maxLength={TALK_MAX} value={text} onChange={(e) => setText(e.target.value)} placeholder={t('talk.ph')} data-testid="talk-input" />
        <div className="row">
          <span className="xs muted">
            {t('talk.as', { nick })} · {text.length}/{TALK_MAX}
          </span>
          <button type="button" className="btn btn--primary btn--sm" disabled={busy} onClick={submit} data-testid="talk-post">
            {t('talk.post')}
          </button>
        </div>
        {msg && (
          <p className="alert small" role="alert" data-testid="talk-error">
            {msg}
          </p>
        )}
      </section>

      <div className="chips" data-testid="talk-filter">
        {(['all', ...TALK_TAGS] as const).map((x) => (
          <button key={x} type="button" className={`chip chip--sm${x === filter ? ' is-active' : ''}`} aria-pressed={x === filter} onClick={() => setFilter(x)}>
            {x === 'all' ? t('talk.all') : t(`talk.tag.${x}`)}
          </button>
        ))}
      </div>

      {posts === null && <div className="skeleton" />}
      {posts !== null && shown.length === 0 && <p className="muted small">{t('talk.none')}</p>}
      {shown.map((p) => (
        <article key={p.id} className="card card--flat talk__post" data-testid="talk-item" data-mine={p.mine ? 'true' : 'false'} data-tag={p.tag}>
          <div className="talk__meta">
            <span className="chip chip--sm">{t(`talk.tag.${p.tag}`)}</span>
            <strong className="xs">{p.nickname}</strong>
            <span className="xs muted">{when(p)}</span>
            {p.sample && <span className="xs muted">· {t('talk.sampleTag')}</span>}
            {p.mine && <span className="xs muted">· {t('talk.mine')}</span>}
          </div>
          <p className="small">{p.body}</p>
          <div className="talk__actions">
            {p.mine ? (
              <button type="button" className="btn btn--sm btn--ghost" onClick={() => deletePost(p).then(reload)} data-testid="talk-delete">
                {t('talk.delete')}
              </button>
            ) : (
              <button
                type="button"
                className="btn btn--sm btn--ghost"
                onClick={() =>
                  reportPost(p).then(() => {
                    setMsg(t('talk.reported'))
                    reload()
                  })
                }
                data-testid="talk-report"
              >
                {t('talk.report')}
              </button>
            )}
          </div>
        </article>
      ))}
      <p className="notice">{t('talk.rules')}</p>
      {ENV.mockAi && <p className="xs muted">{t('talk.sampleNote')}</p>}
      <Link to={`/trip/${trip.id}`} className="btn btn--block btn--ghost">
        {t('report.back')}
      </Link>
    </>
  )
}
