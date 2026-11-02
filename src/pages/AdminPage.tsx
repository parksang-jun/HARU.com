// 관리자 — 스폰서 혜택 CRUD + 성과(노출/클릭) 조회. profiles.role = 'admin' 전용 (RLS 로도 보호)
import { useEffect, useState } from 'react'
import { useI18n } from '../i18n/context'
import { couponToRow, rowToCoupon, type Coupon } from '../lib/coupons'
import { DESTINATIONS, destName } from '../lib/destinations'
import { STOP_CATEGORIES, type CityId, type StopCategory } from '../lib/itinerary'
import { getSupabase, isAdmin } from '../lib/supabase'

interface CouponStat {
  coupon_id: string
  impressions: number
  clicks: number
}

interface PartnerStat {
  partner: string
  kind?: 'activity' | 'flight' | 'hotel'
  clicks: number
}

const EMPTY: Partial<Coupon> = { city: 'seoul', category: 'food', sponsored: true, weight: 5, active: true }

export function AdminPage() {
  const { t, locale } = useI18n()
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [stats, setStats] = useState<CouponStat[]>([])
  const [partners, setPartners] = useState<PartnerStat[]>([])
  const [form, setForm] = useState<Partial<Coupon> | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const load = async () => {
    const sb = getSupabase()
    if (!sb) return
    const [{ data: c }, { data: s }, { data: p }] = await Promise.all([
      sb.from('coupons').select('*').order('created_at', { ascending: false }),
      sb.rpc('coupon_stats'),
      sb.rpc('affiliate_stats_by_kind'),
    ])
    setCoupons(((c ?? []) as Parameters<typeof rowToCoupon>[0][]).map(rowToCoupon))
    setStats((s ?? []) as CouponStat[])
    setPartners((p ?? []) as PartnerStat[])
  }

  useEffect(() => {
    isAdmin().then((ok) => {
      setAllowed(ok)
      if (ok) void load()
    })
  }, [])

  const save = async () => {
    const sb = getSupabase()
    if (!sb || !form) return
    const row = couponToRow(form)
    const res = form.id ? await sb.from('coupons').update(row).eq('id', form.id) : await sb.from('coupons').insert(row)
    setMsg(res.error ? res.error.message : t('common.ok'))
    if (!res.error) {
      setForm(null)
      await load()
    }
  }

  if (allowed === null) return <div className="skeleton" />
  if (!allowed) return <p className="alert">{t('admin.denied')}</p>

  const statOf = (id: string) => stats.find((s) => s.coupon_id === id)
  const set = <K extends keyof Coupon>(k: K, v: Coupon[K]) => setForm((f) => ({ ...(f ?? {}), [k]: v }))

  return (
    <>
      <div className="row">
        <h1>{t('admin.title')}</h1>
        <button type="button" className="btn btn--sm btn--primary" onClick={() => setForm({ ...EMPTY })}>
          {t('admin.newCoupon')}
        </button>
      </div>

      {form && (
        <div className="card list">
          {(
            [
              ['merchant', 'merchant'],
              ['title', 'title'],
              ['titleKo', 'titleKo'],
              ['titleJa', 'titleJa'],
              ['titleZh', 'titleZh'],
              ['discount', 'discount'],
              ['area', 'area'],
              ['link', 'link'],
            ] as [keyof Coupon, string][]
          ).map(([k, label]) => (
            <label key={k} className="field">
              <span className="field__label">{t(`admin.fields.${label}`)}</span>
              <input className="input" value={(form[k] as string | undefined) ?? ''} onChange={(e) => set(k, e.target.value as never)} />
            </label>
          ))}
          <div className="grid-2">
            <label className="field">
              <span className="field__label">{t('admin.fields.city')}</span>
              <select className="select" value={form.city ?? 'seoul'} onChange={(e) => set('city', e.target.value as CityId)}>
                {DESTINATIONS.map((d) => d.id).map((c) => (
                  <option key={c} value={c}>
                    {destName(c, locale)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field__label">{t('admin.fields.category')}</span>
              <select className="select" value={form.category ?? 'food'} onChange={(e) => set('category', e.target.value as StopCategory)}>
                {STOP_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {t(`cat.${c}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field__label">{t('admin.fields.validTo')}</span>
              <input className="input" type="date" value={form.validTo ?? ''} onChange={(e) => set('validTo', e.target.value)} />
            </label>
            <label className="field">
              <span className="field__label">{t('admin.fields.weight')}</span>
              <input className="input" type="number" value={form.weight ?? 5} onChange={(e) => set('weight', Number(e.target.value))} />
            </label>
            <label className="field">
              <span className="field__label">{t('admin.fields.lat')}</span>
              <input className="input" type="number" step="0.0001" value={form.lat ?? ''} onChange={(e) => set('lat', e.target.value === '' ? (undefined as never) : Number(e.target.value))} />
            </label>
            <label className="field">
              <span className="field__label">{t('admin.fields.lng')}</span>
              <input className="input" type="number" step="0.0001" value={form.lng ?? ''} onChange={(e) => set('lng', e.target.value === '' ? (undefined as never) : Number(e.target.value))} />
            </label>
          </div>
          <div className="btn-row">
            <label className="chip">
              <input type="checkbox" checked={form.sponsored ?? false} onChange={(e) => set('sponsored', e.target.checked)} /> {t('admin.fields.sponsored')}
            </label>
            <label className="chip">
              <input type="checkbox" checked={form.active ?? true} onChange={(e) => set('active', e.target.checked)} /> {t('admin.fields.active')}
            </label>
          </div>
          <div className="btn-row">
            <button type="button" className="btn btn--primary" onClick={save}>
              {t('common.save')}
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => setForm(null)}>
              {t('common.cancel')}
            </button>
          </div>
          {msg && <p className="small muted">{msg}</p>}
        </div>
      )}

      <h2>{t('admin.stats')}</h2>
      <div className="card">
        <table className="stats">
          <thead>
            <tr>
              <th>{t('admin.fields.merchant')}</th>
              <th>{t('admin.impressions')}</th>
              <th>{t('admin.clicks')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.id}>
                <td>
                  {c.merchant}
                  {!c.active && <span className="badge badge--cat"> off</span>}
                </td>
                <td>{statOf(c.id)?.impressions ?? 0}</td>
                <td>{statOf(c.id)?.clicks ?? 0}</td>
                <td>
                  <button type="button" className="btn btn--sm btn--ghost" onClick={() => setForm({ ...c })}>
                    {t('admin.edit')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>{t('admin.affiliate')}</h2>
      <div className="card">
        <table className="stats">
          <tbody>
            {partners.map((p) => (
              <tr key={`${p.kind ?? ''}-${p.partner}`}>
                <td>{p.kind ? t(`admin.kind.${p.kind}`) : ''}</td>
                <td>{p.partner}</td>
                <td>{p.clicks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
