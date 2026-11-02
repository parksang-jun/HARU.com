// 일정 → 숙박 구간(호텔 검색 기본값) 계산
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
