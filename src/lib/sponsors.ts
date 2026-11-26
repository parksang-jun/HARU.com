// 스폰서 칸 — 준비 단계·도구 화면에 들어가는 여행지 맞춤 광고 자리.
// 실서비스: Supabase sponsor_slots (0004_sponsor_slots.sql). 광고주가 없으면 아무것도 보여 주지 않는다.
// 테스트 베드: 자리가 어떻게 보이는지 알 수 있게 "예시" 카드를 보여 준다 (실제 광고주 아님).
import { ENV } from './env'
import { ensureSession, getSupabase } from './supabase'

export type SlotId = 'essentials' | 'gear' | 'packing' | 'airport'
export const SLOTS: SlotId[] = ['essentials', 'gear', 'packing', 'airport']

export interface Sponsor {
  id: string
  slot: SlotId
  advertiser: string
  title: string
  body: string
  cta: string
  link: string
  /** 비어 있으면 모든 여행지 */
  countries: string[]
  /** 테스트 베드용 예시 (실제 광고주 아님) */
  sample?: boolean
}

/** 여행지에 맞는 광고 하나를 고른다: 나라가 지정된 광고를 우선, 없으면 전체 대상 광고 */
export function pickSponsor(list: Sponsor[], slot: SlotId, countries: string[]): Sponsor | null {
  const inSlot = list.filter((s) => s.slot === slot)
  return inSlot.find((s) => s.countries.some((c) => countries.includes(c))) ?? inSlot.find((s) => s.countries.length === 0) ?? null
}

const sample = (slot: SlotId): Sponsor => ({ id: `sample-${slot}`, slot, advertiser: '', title: '', body: '', cta: '', link: '', countries: [], sample: true })

export async function loadSponsor(slot: SlotId, countries: string[], locale: string): Promise<Sponsor | null> {
  if (ENV.mockAi) return ENV.admobEnabled ? sample(slot) : null
  const sb = getSupabase()
  if (!sb) return null
  const { data, error } = await sb.from('sponsor_slots').select('id, slot, advertiser, title, body, cta, link, countries, locale').eq('slot', slot).eq('active', true).in('locale', [locale, 'all']).limit(20)
  if (error || !data) return null
  const list = data.filter((r) => /^https:\/\//.test(String(r.link))).map((r): Sponsor => ({ id: r.id as string, slot, advertiser: r.advertiser as string, title: r.title as string, body: (r.body as string) ?? '', cta: (r.cta as string) ?? '', link: r.link as string, countries: (r.countries as string[]) ?? [] }))
  return pickSponsor(list, slot, countries)
}

const seen = new Set<string>()
/** 노출·클릭 기록 (예시 카드는 기록하지 않는다). 노출은 세션당 한 번 */
export async function logSponsor(s: Sponsor, event: 'impression' | 'click', tripId?: string): Promise<void> {
  if (s.sample) return
  if (event === 'impression') {
    if (seen.has(s.id)) return
    seen.add(s.id)
  }
  const sb = getSupabase()
  if (!sb) return
  await ensureSession()
  await sb.from('sponsor_events').insert({ sponsor_id: s.id, event, trip_id: tripId ?? null })
}
