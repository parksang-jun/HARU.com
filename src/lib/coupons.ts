// 스폰서 쿠폰(혜택) 모델 + 조회
import type { CityId, StopCategory } from './itinerary'
import { getSupabase } from './supabase'
import { SAMPLE_COUPONS } from './mock/coupons'
import { distanceKm } from './geo'

export interface Coupon {
  id: string
  merchant: string
  title: string
  titleKo?: string
  titleJa?: string
  titleZh?: string
  discount: string
  city: CityId
  area: string
  category: StopCategory
  validFrom?: string
  validTo?: string
  imageUrl?: string
  link: string
  sponsored: boolean
  weight: number
  lat?: number
  lng?: number
  active: boolean
  isSample?: boolean
}

interface CouponRow {
  id: string
  merchant: string
  title_en: string
  title_ko: string | null
  title_ja: string | null
  title_zh: string | null
  discount: string
  city: CityId
  area: string
  category: StopCategory
  valid_from: string | null
  valid_to: string | null
  image_url: string | null
  link: string
  sponsored: boolean
  weight: number
  lat: number | null
  lng: number | null
  active: boolean
  is_sample: boolean
}

export function rowToCoupon(r: CouponRow): Coupon {
  return {
    id: r.id,
    merchant: r.merchant,
    title: r.title_en,
    titleKo: r.title_ko ?? undefined,
    titleJa: r.title_ja ?? undefined,
    titleZh: r.title_zh ?? undefined,
    discount: r.discount,
    city: r.city,
    area: r.area,
    category: r.category,
    validFrom: r.valid_from ?? undefined,
    validTo: r.valid_to ?? undefined,
    imageUrl: r.image_url ?? undefined,
    link: r.link,
    sponsored: r.sponsored,
    weight: r.weight,
    lat: r.lat ?? undefined,
    lng: r.lng ?? undefined,
    active: r.active,
    isSample: r.is_sample,
  }
}

export function couponToRow(c: Partial<Coupon>): Partial<CouponRow> {
  return {
    merchant: c.merchant,
    title_en: c.title,
    title_ko: c.titleKo ?? null,
    title_ja: c.titleJa ?? null,
    title_zh: c.titleZh ?? null,
    discount: c.discount,
    city: c.city,
    area: c.area,
    category: c.category,
    valid_to: c.validTo || null,
    link: c.link,
    sponsored: c.sponsored ?? false,
    weight: c.weight ?? 1,
    lat: c.lat ?? null,
    lng: c.lng ?? null,
    active: c.active ?? true,
  }
}

/** 활성·유효기간 내 쿠폰 — 스폰서 우선, 가중치 순 */
export async function listCoupons(): Promise<Coupon[]> {
  const sb = getSupabase()
  const today = new Date().toISOString().slice(0, 10)
  if (!sb) return sortCoupons(SAMPLE_COUPONS.filter((c) => c.active && (!c.validTo || c.validTo >= today)))
  const { data, error } = await sb
    .from('coupons')
    .select('*')
    .eq('active', true)
    .or(`valid_to.is.null,valid_to.gte.${today}`)
    .order('sponsored', { ascending: false })
    .order('weight', { ascending: false })
  if (error || !data) return []
  return (data as CouponRow[]).map(rowToCoupon)
}

export function sortCoupons(list: Coupon[]): Coupon[] {
  return [...list].sort((a, b) => Number(b.sponsored) - Number(a.sponsored) || b.weight - a.weight)
}

/** 하루 동선(정류지 좌표) 근처 쿠폰 — 같은 도시 + 3km 이내, 최대 n개 */
export function nearbyCoupons(
  coupons: Coupon[],
  city: CityId,
  stops: { lat: number; lng: number }[],
  max = 2,
): Coupon[] {
  const inCity = coupons.filter((c) => c.city === city)
  const near = inCity.filter((c) => {
    if (c.lat === undefined || c.lng === undefined) return true
    return stops.some((s) => distanceKm(s.lat, s.lng, c.lat as number, c.lng as number) <= 3)
  })
  return sortCoupons(near).slice(0, max)
}

/** 로케일별 쿠폰 제목 (없으면 영어) */
export function couponTitle(c: Coupon, locale: string): string {
  if (locale === 'ko') return c.titleKo || c.title
  if (locale === 'ja') return c.titleJa || c.title
  if (locale === 'zh-TW') return c.titleZh || c.title
  return c.title
}
