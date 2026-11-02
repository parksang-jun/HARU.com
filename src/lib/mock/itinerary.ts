// 결정적(deterministic) 샘플 일정 — 키 없이 UI·e2e 검증용 (국내·해외 공통)
import { getDestination } from '../destinations'
import { addDays, daysBetween, type Itinerary, type ItineraryDay, type Stop, type TripParams } from '../itinerary'
import { genericPlaces, MOCK_PLACES, type MockPlace } from './places'

const TIME_SLOTS = ['09:30', '11:30', '13:00', '15:00', '17:30', '19:30']

function stopsPerDay(pace: TripParams['pace']): number {
  return pace === 'relaxed' ? 4 : pace === 'packed' ? 6 : 5
}

function poolFor(cityId: string): MockPlace[] {
  const curated = MOCK_PLACES[cityId]
  if (curated?.length) return curated
  const dst = getDestination(cityId)
  return dst ? genericPlaces(dst) : []
}

function toStop(p: MockPlace, dayIdx: number, idx: number, currency: string): Stop {
  const stop: Stop = {
    id: `d${dayIdx + 1}s${idx + 1}`,
    time: TIME_SLOTS[idx] ?? '20:30',
    durationMin: p.durationMin,
    category: p.category,
    name: p.name,
    area: p.area,
    lat: p.lat,
    lng: p.lng,
    tip: p.tip,
    transitHint: p.transit,
  }
  if (p.cost !== undefined) {
    stop.estCost = p.cost
    stop.currency = currency
  }
  if (p.booking) stop.booking = { partner: p.booking, query: p.query ?? p.name.en }
  if (p.reserve) stop.reserve = { provider: p.reserve, query: p.reserve === 'google' ? (p.query ?? p.name.en) : p.name.ko }
  return stop
}

function localName(id: string, locale: string): string {
  const dst = getDestination(id)
  if (!dst) return id
  const n = locale === 'ko' ? dst.name.ko : locale === 'ja' ? dst.name.ja : locale === 'zh-TW' ? dst.name.zh : dst.name.en
  return n.replace(/\s*[（(].*[)）]$/, '')
}

function title(params: TripParams, n: number): string {
  const names = params.cities.map((c) => localName(c, params.locale))
  switch (params.locale) {
    case 'ko':
      return `${names.join('·')} ${n}일 여행`
    case 'ja':
      return `${names.join('・')} ${n}日間の旅`
    case 'zh-TW':
      return `${names.join('・')} ${n}天行程`
    default:
      return `${n}-day ${names.join(' & ')} trip`
  }
}

export function buildMockItinerary(params: TripParams): Itinerary {
  const n = Math.max(1, Math.min(14, daysBetween(params.startDate, params.endDate)))
  const per = stopsPerDay(params.pace)
  const days: ItineraryDay[] = []
  const cursor: Record<string, number> = {}

  for (let i = 0; i < n; i++) {
    const city = params.cities[Math.floor((i * params.cities.length) / n)]
    const pool = poolFor(city)
    const currency = getDestination(city)?.currency ?? 'KRW'
    const firstDayInCity = i === 0 || days[days.length - 1]?.city !== city
    const stayIdx = pool.findIndex((p) => p.category === 'stay')
    const picks: MockPlace[] = []
    // 도시 첫날은 숙소 체크인을 포함, 나머지는 순환 (샘플)
    let c = cursor[city] ?? 0
    const start = c
    while (picks.length < per - (firstDayInCity ? 1 : 0)) {
      const p = pool[c % pool.length]
      c++
      if (c - start > pool.length * 2) break
      if (p.category === 'stay') continue
      if (params.interests.length && !params.interests.includes('nightlife') && p.category === 'nightlife') continue
      picks.push(p)
    }
    cursor[city] = c
    if (firstDayInCity && stayIdx >= 0) picks.splice(Math.min(2, picks.length), 0, pool[stayIdx])
    const cityName = localName(city, 'en')
    days.push({
      day: i + 1,
      date: addDays(params.startDate, i),
      city,
      theme: firstDayInCity ? `Arrival and first taste of ${cityName}` : `Highlights of ${cityName}`,
      stops: picks.map((p, j) => toStop(p, i, j, currency)),
    })
  }

  return {
    version: 1,
    title: title(params, n),
    summary: `A ${params.pace} ${n}-day plan for ${params.travelers} travelers focused on ${params.interests.join(', ') || 'the classics'}. Sample itinerary (demo mode).`,
    days,
  }
}
