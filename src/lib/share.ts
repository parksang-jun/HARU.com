// 일정 공유 코드 — 서버 없이 일행에게 일정을 넘긴다. 받은 쪽은 자기 기기에 사본으로 저장한다.
// (여럿이 동시에 고치는 실시간 공동 편집은 서버 연결 뒤에 가능하다)
import { normalizeItinerary, validateTripParams, type Itinerary, type TripParams } from './itinerary'

export const SHARE_PREFIX = 'HARU1:'

const b64encode = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
function b64decode(s: string): string {
  const pad = s.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(pad + '='.repeat((4 - (pad.length % 4)) % 4))
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
}

export function encodeTrip(params: TripParams, itinerary: Itinerary): string {
  return SHARE_PREFIX + b64encode(JSON.stringify({ v: 1, params, itinerary }))
}

/** 공유 코드 → 여행 조건과 일정. 형식이 틀리거나 검증에 실패하면 null (받은 내용은 처음부터 다시 검증한다) */
export function decodeTrip(code: string): { params: TripParams; itinerary: Itinerary } | null {
  const text = code.trim().replace(/\s+/g, '')
  if (!text.startsWith(SHARE_PREFIX) || text.length > 400_000) return null
  try {
    const data = JSON.parse(b64decode(text.slice(SHARE_PREFIX.length))) as { v?: number; params?: TripParams; itinerary?: unknown }
    const p = data.params
    if (data.v !== 1 || !p || typeof p !== 'object' || !Array.isArray(p.cities) || !Array.isArray(p.interests)) return null
    const params: TripParams = {
      cities: p.cities.filter((c) => typeof c === 'string').slice(0, 5),
      startDate: String(p.startDate),
      endDate: String(p.endDate),
      travelers: p.travelers,
      interests: p.interests.filter((i) => typeof i === 'string').slice(0, 20),
      budget: p.budget,
      pace: p.pace,
      notes: typeof p.notes === 'string' ? p.notes.slice(0, 500) : undefined,
      stays: Array.isArray(p.stays) ? p.stays.slice(0, 3).map((s) => ({ nights: Number(s?.nights), ...(typeof s?.area === 'string' ? { area: s.area.slice(0, 40) } : {}) })) : undefined,
      locale: String(p.locale ?? 'en'),
    }
    if (!['solo', 'couple', 'family', 'friends'].includes(params.travelers) || !['saver', 'standard', 'premium'].includes(params.budget) || !['relaxed', 'balanced', 'packed'].includes(params.pace)) return null
    if (validateTripParams(params)) return null
    const itinerary = normalizeItinerary(data.itinerary, params)
    return itinerary ? { params, itinerary } : null
  } catch {
    return null
  }
}
