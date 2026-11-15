// 공항 대기 시간 가이드 — 남은 시간에 맞는 할 일과 라운지 찾기 링크.
// 라운지 이름·위치·운영시간은 자주 바뀌어 앱에 넣지 않고, 검색·예약 링크와 컨시어지 질문으로 연결한다.
import { appendQuery } from './affiliate'
import { ENV } from './env'

export type WaitBucket = 'short' | 'mid' | 'long' | 'xlong'
export const WAIT_OPTIONS: { minutes: number; bucket: WaitBucket }[] = [
  { minutes: 60, bucket: 'short' },
  { minutes: 120, bucket: 'mid' },
  { minutes: 240, bucket: 'long' },
  { minutes: 360, bucket: 'xlong' },
]

/** 탑승까지 남은 시간(분) → 구간 */
export function waitBucket(minutes: number): WaitBucket {
  if (minutes < 90) return 'short'
  if (minutes < 180) return 'mid'
  if (minutes < 300) return 'long'
  return 'xlong'
}

/** 구간별 추천 활동 문구 키 (airport.tip.*) — 앞에서부터 중요한 순서 */
export const WAIT_TIPS: Record<WaitBucket, string[]> = {
  short: ['gate', 'water', 'charge'],
  mid: ['meal', 'lounge', 'dutyfree', 'charge'],
  long: ['lounge', 'shower', 'meal', 'walk', 'dutyfree'],
  xlong: ['lounge', 'nap', 'shower', 'transitTour', 'meal'],
}

/** 공항별로 오래 유지돼 온 대표 시설 (문구 키 airport.hl.<코드>.<n>). 운영 여부는 공항 공식 안내에서 확인해야 한다 */
export const AIRPORT_HIGHLIGHTS: Record<string, number> = { ICN: 3, SIN: 3, HND: 2, NRT: 2 }

export function highlightKeys(code: string): string[] {
  const n = AIRPORT_HIGHLIGHTS[code] ?? 0
  return Array.from({ length: n }, (_, i) => `airport.hl.${code}.${i + 1}`)
}

/** 라운지 이용권 검색 (Klook 제휴) */
export function loungePassUrl(code: string): string {
  const base = `https://www.klook.com/search/result/?query=${encodeURIComponent(`${code} airport lounge`)}`
  return appendQuery(base, ENV.affiliate.klook)
}

/** 공항 라운지·시설 웹 검색 (공식 안내를 찾아가기 위한 링크) */
export function loungeSearchUrl(airportName: string, code: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`${airportName} ${code} airport lounge official`)}`
}
