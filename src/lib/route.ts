// 동선 — 장소 사이 거리·이동 시간 추정과 "무리한 일정" 점검.
// 지도 타일 없이 좌표만으로 계산하므로 인터넷이 없어도 동작한다. 이동 시간은 직선거리 기반 추정이다.
import { distanceKm } from './geo'
import type { Itinerary, ItineraryDay, Pace, Stop } from './itinerary'

export interface Leg {
  from: Stop
  to: Stop
  km: number
  /** 추정 이동 시간(분) */
  minutes: number
  mode: 'walk' | 'ride'
}

export const WALK_LIMIT_KM = 1.2

/** 직선거리 → 이동 수단과 시간 추정: 1.2km 이하는 도보(직선의 1.3배 거리, 시속 4.5km), 그 이상은 대중교통·택시(대기 8분 + km당 3.5분) */
export function estimateLeg(km: number): { minutes: number; mode: Leg['mode'] } {
  if (km <= WALK_LIMIT_KM) return { minutes: Math.max(2, Math.round(((km * 1.3) / 4.5) * 60)), mode: 'walk' }
  return { minutes: Math.round(8 + km * 3.5), mode: 'ride' }
}

/** 좌표가 있는 장소만 (직접 추가한 장소는 좌표가 없다) */
export const geoStops = (d: Pick<ItineraryDay, 'stops'>): Stop[] => d.stops.filter((s) => !s.custom)

export function dayLegs(d: Pick<ItineraryDay, 'stops'>): Leg[] {
  const stops = geoStops(d)
  const legs: Leg[] = []
  for (let i = 1; i < stops.length; i++) {
    const km = Math.round(distanceKm(stops[i - 1].lat, stops[i - 1].lng, stops[i].lat, stops[i].lng) * 10) / 10
    legs.push({ from: stops[i - 1], to: stops[i], km, ...estimateLeg(km) })
  }
  return legs
}

export type IssueKind = 'tooMany' | 'longLeg' | 'longDay' | 'overlap' | 'late' | 'backtrack'
export interface PlanIssue {
  day: number
  kind: IssueKind
  /** 문구에 넣을 값 */
  vars: Record<string, string | number>
}

const MAX_STOPS: Record<Pace, number> = { relaxed: 5, balanced: 6, packed: 8 }
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))

/** 무리한 일정 점검: 장소 수, 긴 이동, 하루 총 이동, 시간 겹침, 너무 늦은 마무리, 왔다 갔다 하는 동선 */
export function checkPlan(it: Itinerary, pace: Pace, placeName: (s: Stop) => string): PlanIssue[] {
  const issues: PlanIssue[] = []
  for (const d of it.days) {
    const visits = d.stops.filter((s) => s.category !== 'stay')
    if (visits.length > MAX_STOPS[pace]) issues.push({ day: d.day, kind: 'tooMany', vars: { n: visits.length, max: MAX_STOPS[pace] } })

    const legs = dayLegs(d)
    for (const l of legs) if (l.km >= 25) issues.push({ day: d.day, kind: 'longLeg', vars: { from: placeName(l.from), to: placeName(l.to), km: l.km, min: l.minutes } })
    const total = legs.reduce((a, l) => a + l.minutes, 0)
    if (total >= 180) issues.push({ day: d.day, kind: 'longDay', vars: { min: total, km: Math.round(legs.reduce((a, l) => a + l.km, 0)) } })

    // 앞 일정이 끝나고 이동할 시간이 모자란 경우
    for (let i = 1; i < d.stops.length; i++) {
      const prev = d.stops[i - 1]
      const cur = d.stops[i]
      const leg = legs.find((l) => l.from.id === prev.id && l.to.id === cur.id)
      const need = toMin(prev.time) + prev.durationMin + (leg?.minutes ?? 0)
      if (need - toMin(cur.time) > 20) issues.push({ day: d.day, kind: 'overlap', vars: { from: placeName(prev), to: placeName(cur), min: need - toMin(cur.time) } })
    }
    const last = d.stops[d.stops.length - 1]
    if (last && toMin(last.time) + last.durationMin > 23 * 60) issues.push({ day: d.day, kind: 'late', vars: { name: placeName(last) } })

    // 같은 지역을 떠났다가 다시 돌아오는 동선
    const areas = geoStops(d).map((s) => s.area).filter(Boolean)
    const seen = new Set<string>()
    for (let i = 0; i < areas.length; i++) {
      if (i > 0 && areas[i] !== areas[i - 1] && seen.has(areas[i])) {
        issues.push({ day: d.day, kind: 'backtrack', vars: { area: areas[i] } })
        break
      }
      seen.add(areas[i])
    }
  }
  return issues
}

export interface MapPoint {
  x: number
  y: number
  stop: Stop
  n: number
}

/** 그날 장소들을 w×h 그림 좌표로 옮긴다 (경도는 위도에 맞춰 보정, 여백 pad). 점이 하나면 가운데 */
export function projectDay(d: Pick<ItineraryDay, 'stops'>, w: number, h: number, pad = 28): MapPoint[] {
  const stops = geoStops(d)
  if (!stops.length) return []
  const lat0 = stops.reduce((a, s) => a + s.lat, 0) / stops.length
  const kx = Math.cos((lat0 * Math.PI) / 180)
  const xs = stops.map((s) => s.lng * kx)
  const ys = stops.map((s) => s.lat)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const span = Math.max(maxX - minX, maxY - minY, 1e-6)
  const scale = Math.min((w - pad * 2) / span, (h - pad * 2) / span)
  const offX = (w - (maxX - minX) * scale) / 2
  const offY = (h - (maxY - minY) * scale) / 2
  return stops.map((stop, i) => ({ stop, n: i + 1, x: Math.round(offX + (xs[i] - minX) * scale), y: Math.round(h - (offY + (ys[i] - minY) * scale)) }))
}

const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

/** 시간 자동 맞춤: 앞 일정이 끝나고 이동할 시간이 모자란 곳만 뒤로 민다 (5분 단위, 23:30 까지) */
export function retime(it: Itinerary, day?: number): Itinerary {
  return {
    ...it,
    days: it.days.map((d) => {
      if (day !== undefined && d.day !== day) return d
      const legs = dayLegs(d)
      const stops = d.stops.map((s) => ({ ...s }))
      for (let i = 1; i < stops.length; i++) {
        const prev = stops[i - 1]
        const leg = legs.find((l) => l.from.id === prev.id && l.to.id === stops[i].id)
        const need = Math.ceil((toMin(prev.time) + prev.durationMin + (leg?.minutes ?? 10)) / 5) * 5
        if (toMin(stops[i].time) < need) stops[i].time = fmt(Math.min(need, 23 * 60 + 30))
      }
      return { ...d, stops }
    }),
  }
}
