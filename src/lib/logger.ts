// 수익 이벤트 로깅 — 제휴 클릭(affiliate_clicks), 스폰서 노출/클릭(ad_events)
// Supabase 미설정(목업) 시 메모리 버퍼 + window.__haruLog 로 노출 (e2e 검증용)
import type { FlightPartner } from './flights'
import type { HotelPartner } from './hotels'
import type { PartnerId } from './itinerary'

/** 클릭 종류 — 일정 정류지(액티비티·숙소) / 항공권 / 호텔 검색 */
export type ClickKind = 'activity' | 'flight' | 'hotel'
import { getSupabase } from './supabase'

export interface AffiliateClickEvent {
  kind: 'affiliate_click'
  clickKind: ClickKind
  partner: PartnerId | FlightPartner | HotelPartner
  tripId?: string
  stopId?: string
  query: string
  url: string
  locale: string
  at: string
}

export interface AdEvent {
  kind: 'ad_impression' | 'ad_click'
  couponId: string
  placement: 'itinerary' | 'deals'
  tripId?: string
  locale: string
  at: string
}

export type HaruEvent = AffiliateClickEvent | AdEvent

declare global {
  interface Window {
    __haruLog?: HaruEvent[]
  }
}

const seenImpressions = new Set<string>()

function pushLocal(ev: HaruEvent) {
  if (typeof window === 'undefined') return
  window.__haruLog = window.__haruLog ?? []
  window.__haruLog.push(ev)
  if (import.meta.env.DEV) console.debug('[event]', ev)
}

async function currentUserId(): Promise<string | null> {
  const sb = getSupabase()
  if (!sb) return null
  const { data } = await sb.auth.getSession()
  return data.session?.user.id ?? null
}

export async function logAffiliateClick(ev: Omit<AffiliateClickEvent, 'kind' | 'at' | 'clickKind'> & { clickKind?: ClickKind }): Promise<void> {
  const full: AffiliateClickEvent = { kind: 'affiliate_click', at: new Date().toISOString(), ...ev, clickKind: ev.clickKind ?? 'activity' }
  pushLocal(full)
  const sb = getSupabase()
  if (!sb) return
  const uid = await currentUserId()
  await sb.from('affiliate_clicks').insert({
    user_id: uid,
    partner: ev.partner,
    kind: full.clickKind,
    trip_id: ev.tripId ?? null,
    stop_id: ev.stopId ?? null,
    query: ev.query,
    url: ev.url,
    locale: ev.locale,
  })
}

/** 노출은 세션당 쿠폰·지면 조합별 1회만 기록 */
export async function logAdImpression(ev: Omit<AdEvent, 'kind' | 'at'>): Promise<void> {
  const key = `${ev.couponId}:${ev.placement}`
  if (seenImpressions.has(key)) return
  seenImpressions.add(key)
  await logAd({ kind: 'ad_impression', at: new Date().toISOString(), ...ev })
}

export async function logAdClick(ev: Omit<AdEvent, 'kind' | 'at'>): Promise<void> {
  await logAd({ kind: 'ad_click', at: new Date().toISOString(), ...ev })
}

async function logAd(full: AdEvent): Promise<void> {
  pushLocal(full)
  const sb = getSupabase()
  if (!sb) return
  const uid = await currentUserId()
  // 샘플 쿠폰(sample-*)은 DB에 없으므로 기록 생략
  if (full.couponId.startsWith('sample-')) return
  await sb.from('ad_events').insert({
    user_id: uid,
    coupon_id: full.couponId,
    event: full.kind === 'ad_impression' ? 'impression' : 'click',
    placement: full.placement,
    trip_id: full.tripId ?? null,
    locale: full.locale,
  })
}
