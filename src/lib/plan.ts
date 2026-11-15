// 일정 → 숙박 구간(호텔 검색 기본값) 계산
import { airportDestination, bestAirportFor, domesticOrigin } from './airports'
import { getDestination } from './destinations'
import { distanceKm } from './geo'
import { addDays, type Trip } from './itinerary'

export interface StaySegment {
  city: string
  checkIn: string
  checkOut: string
  nights: number
}

/** 연속된 같은 도시 일자를 묶어 숙박 구간 계산 (마지막 구간 체크아웃 = 여행 종료일) */
export function staySegments(trip: Trip): StaySegment[] {
  const days = trip.itinerary?.days ?? []
  const segs: StaySegment[] = []
  days.forEach((d, i) => {
    const prev = segs[segs.length - 1]
    if (prev && prev.city === d.city && days[i - 1]?.city === d.city) return
    segs.push({ city: d.city, checkIn: d.date, checkOut: d.date, nights: 0 })
  })
  segs.forEach((s, i) => {
    const next = segs[i + 1]
    s.checkOut = next ? next.checkIn : trip.params.endDate > s.checkIn ? trip.params.endDate : addDays(s.checkIn, 1)
    s.nights = Math.max(1, Math.round((Date.parse(s.checkOut) - Date.parse(s.checkIn)) / 86_400_000))
  })
  return segs
}

// ---------- 하루 준비 체크리스트 (일정 화면과 여행 보고서가 같이 쓴다) ----------

/** 항공권: 홈 공항 → 첫 도시 대표 공항 (같은 도시이거나 너무 가까우면 null, 국내선은 김포 출발) */
export function flightRoute(trip: Trip, home: string): { from: string; to: string } | null {
  const first = trip.params.cities[0]
  const to = bestAirportFor(first, home)
  const homeCity = airportDestination(home)
  const dst = getDestination(first)
  if (!to || !homeCity || !dst) return null
  if (homeCity.id === dst.id || distanceKm(homeCity.lat, homeCity.lng, dst.lat, dst.lng) < 180) return null
  return { from: domesticOrigin(home, to), to }
}

/** 홈 공항과 다른 나라의 여행지가 하나라도 있으면 해외 여행 */
export function isAbroad(trip: Trip, home: string): boolean {
  const homeCountry = airportDestination(home)?.country
  return trip.params.cities.some((c) => getDestination(c)?.country !== homeCountry)
}

export const hotelKey = (s: StaySegment) => `hotel:${s.city}:${s.checkIn}`

/** 준비 항목 키: 일정(자동 완료) + 항공권 + 숙소 구간 + 날씨·준비물 + 여행 제품 + 현지 혜택 (+ 항공편이 있으면 공항 가이드) (+ 해외면 출국 준비) */
export function prepKeys(trip: Trip, home: string): string[] {
  const flight = flightRoute(trip, home)
  return ['itinerary', ...(flight ? ['flight'] : []), ...staySegments(trip).map(hotelKey), 'weather', 'gear', 'deals', ...(flight ? ['airport'] : []), ...(isAbroad(trip, home) ? ['essentials'] : [])]
}

export const isPrepDone = (key: string, done: string[]) => key === 'itinerary' || done.includes(key)
