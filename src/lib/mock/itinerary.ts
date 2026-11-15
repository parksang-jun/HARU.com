// 결정적(deterministic) 샘플 일정 — 키 없이 UI·e2e 검증용 (국내·해외 공통)
import { getDestination } from '../destinations'
import { addDays, daysBetween, type Itinerary, type ItineraryDay, type Stop, type TripParams } from '../itinerary'
import { genericPlaces, MOCK_PLACES, type MockPlace } from './places'
import { INTEREST_CATEGORIES, parseRequests, START_SLOTS, vegTip } from './requests'

function stopsPerDay(pace: TripParams['pace']): number {
  return pace === 'relaxed' ? 4 : pace === 'packed' ? 6 : 5
}

function poolFor(cityId: string): MockPlace[] {
  const curated = MOCK_PLACES[cityId]
  if (curated?.length) return curated
  const dst = getDestination(cityId)
  return dst ? genericPlaces(dst) : []
}

function toStop(p: MockPlace, dayIdx: number, idx: number, currency: string, slots: string[], extraTip = ''): Stop {
  const stop: Stop = {
    id: `d${dayIdx + 1}s${idx + 1}`,
    time: slots[idx] ?? '20:30',
    durationMin: p.durationMin,
    category: p.category,
    name: p.name,
    area: p.area,
    lat: p.lat,
    lng: p.lng,
    tip: extraTip && (p.category === 'food' || p.category === 'cafe') ? `${extraTip} ${p.tip}` : p.tip,
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

/** 관심사·추가 요청에 맞춰 장소 순서를 정한다: 꼭 넣을 장소 → 선호 종류 → 나머지 (원래 순서 유지, 제외 종류는 뺀다) */
function orderPool(pool: MockPlace[], prefer: Set<string>, exclude: Set<string>, must: string[]): MockPlace[] {
  const usable = pool.filter((p) => p.category !== 'stay' && !exclude.has(p.category))
  const first = usable.filter((p) => must.includes(p.name.en))
  const liked = usable.filter((p) => !first.includes(p) && prefer.has(p.category))
  const rest = usable.filter((p) => !first.includes(p) && !liked.includes(p))
  // 선호 장소만 몰리지 않게 선호 2곳마다 나머지 1곳을 섞는다
  const mixed: MockPlace[] = []
  let r = 0
  liked.forEach((p, i) => {
    mixed.push(p)
    if (i % 2 === 1 && r < rest.length) mixed.push(rest[r++])
  })
  return [...first, ...mixed, ...rest.slice(r)]
}

export function buildMockItinerary(params: TripParams): Itinerary {
  const n = Math.max(1, Math.min(14, daysBetween(params.startDate, params.endDate)))
  const allPools = params.cities.flatMap((c) => poolFor(c))
  const req = parseRequests(params.notes, params.locale, allPools)
  const per = Math.max(3, stopsPerDay(params.pace) + req.perDelta)
  const slots = START_SLOTS[req.start]
  const veg = req.vegetarian ? vegTip(params.locale) : ''
  const prefer = new Set<string>([...params.interests.flatMap((i) => INTEREST_CATEGORIES[i] ?? []), ...req.prefer])
  const exclude = new Set<string>(req.exclude)
  // 밤 일정은 관심사로 고르거나 따로 요청했을 때만 넣는다
  if (params.interests.length && !prefer.has('nightlife')) exclude.add('nightlife')
  const days: ItineraryDay[] = []
  const cursor: Record<string, number> = {}
  const ordered: Record<string, MockPlace[]> = {}
  const usedMeals = new Set<MockPlace>()

  for (let i = 0; i < n; i++) {
    const city = params.cities[Math.floor((i * params.cities.length) / n)]
    const pool = poolFor(city)
    const list = (ordered[city] ??= orderPool(pool, prefer, exclude, req.mustPlaces))
    const currency = getDestination(city)?.currency ?? 'KRW'
    const firstDayInCity = i === 0 || days[days.length - 1]?.city !== city
    const stay = pool.find((p) => p.category === 'stay')
    const picks: MockPlace[] = []
    // 도시 첫날은 숙소 체크인을 포함, 나머지는 순환 (샘플)
    let c = cursor[city] ?? 0
    const want = per - (firstDayInCity && stay ? 1 : 0)
    while (list.length && picks.length < want && picks.length < list.length) {
      picks.push(list[c % list.length])
      c++
    }
    // 하루에 식사 한 곳은 들어가게 한다
    if (!exclude.has('food') && picks.length > 1 && !picks.some((p) => p.category === 'food')) {
      // 앞선 날에 쓰지 않은 식당을 먼저 고른다
      const meal = list.find((p) => p.category === 'food' && !usedMeals.has(p)) ?? list.find((p) => p.category === 'food' && !picks.includes(p)) ?? list.find((p) => p.category === 'food')
      if (meal) picks[picks.length - 1] = meal
    }
    for (const p of picks) if (p.category === 'food') usedMeals.add(p)
    cursor[city] = c
    if (firstDayInCity && stay) picks.splice(Math.min(2, picks.length), 0, stay)
    const cityName = localName(city, 'en')
    days.push({
      day: i + 1,
      date: addDays(params.startDate, i),
      city,
      theme: firstDayInCity ? `Arrival and first taste of ${cityName}` : `Highlights of ${cityName}`,
      stops: picks.map((p, j) => toStop(p, i, j, currency, slots, veg)),
    })
  }

  const out: Itinerary = {
    version: 1,
    title: title(params, n),
    summary: `A ${params.pace} ${n}-day plan for ${params.travelers} travelers focused on ${params.interests.join(', ') || 'the classics'}. Sample itinerary (demo mode).`,
    days,
  }
  if (req.notes.length) out.requests = req.notes
  return out
}
