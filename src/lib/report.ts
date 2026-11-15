// 여행 보고서 — 일정·준비 현황·날씨·예상 비용·준비물을 한 장으로 묶는다 (화면과 복사·공유용 글이 같은 자료를 쓴다)
import { recommendGear, type GearItem } from './gear'
import { adultsFor, daysBetween, MEAL_SLOTS, type LocalizedName, type MealOption, type MealSlot, type RequestNote, type StopCategory, type Trip } from './itinerary'
import { chosenMeal, type MealPicks } from './meals'
import { flightRoute, hotelKey, isAbroad, isPrepDone, prepKeys, staySegments, type StaySegment } from './plan'
import { packingList, weatherKey, type DayWeather, type Tip, type TripWeather } from './weather'

export interface ReportStop {
  time: string
  name: LocalizedName
  area: string
  category: StopCategory
  cost?: number
  currency?: string
}

export interface ReportDay {
  day: number
  date: string
  city: string
  theme: string
  weather?: DayWeather
  stops: ReportStop[]
  /** 끼니별: 고른 식당(없으면 undefined)과 후보 수 */
  meals: { slot: MealSlot; chosen?: MealOption; options: number }[]
}

export interface ReportPrep {
  key: string
  kind: 'itinerary' | 'flight' | 'hotel' | 'weather' | 'gear' | 'deals' | 'airport' | 'essentials'
  done: boolean
  /** 숙소 항목일 때의 구간 */
  stay?: StaySegment
}

export interface ReportCost {
  currency: string
  /** 1인 합계 (일정에 적힌 비용만) */
  perPerson: number
  total: number
}

export interface TripReport {
  title: string
  summary: string
  startDate: string
  endDate: string
  nDays: number
  cities: string[]
  travelers: Trip['params']['travelers']
  adults: number
  interests: Trip['params']['interests']
  budget: Trip['params']['budget']
  pace: Trip['params']['pace']
  notes?: string
  requests: RequestNote[]
  flight: { from: string; to: string } | null
  stays: StaySegment[]
  prep: ReportPrep[]
  prepDone: number
  days: ReportDay[]
  costs: ReportCost[]
  packing: Tip[]
  /** 추천 여행 제품 종류 */
  gear: GearItem[]
  abroad: boolean
  /** 샘플 날씨가 섞여 있는지 */
  sampleWeather: boolean
}

function kindOf(key: string): ReportPrep['kind'] {
  return key.startsWith('hotel:') ? 'hotel' : (key as ReportPrep['kind'])
}

export function buildReport(trip: Trip, weather: TripWeather, done: string[], home: string, picks: MealPicks = {}): TripReport | null {
  const it = trip.itinerary
  if (!it?.days.length) return null
  const p = trip.params
  const adults = adultsFor(p.travelers)
  const stays = staySegments(trip)
  const prep: ReportPrep[] = prepKeys(trip, home).map((key) => ({ key, kind: kindOf(key), done: isPrepDone(key, done), stay: stays.find((s) => hotelKey(s) === key) }))

  const sums = new Map<string, number>()
  const days: ReportDay[] = it.days.map((d) => ({
    day: d.day,
    date: d.date,
    city: d.city,
    theme: d.theme,
    weather: weather[weatherKey(d.city, d.date)],
    meals: MEAL_SLOTS.filter((slot) => (d.meals?.[slot].length ?? 0) > 0).map((slot) => {
      const chosen = chosenMeal(d, slot, picks)
      // 고른 식당의 비용은 예상 비용에 더한다
      if (chosen?.estCost && chosen.currency) sums.set(chosen.currency, (sums.get(chosen.currency) ?? 0) + chosen.estCost)
      return { slot, chosen, options: d.meals?.[slot].length ?? 0 }
    }),
    stops: d.stops.map((s) => {
      const cost = s.estCost ?? s.estCostKrw
      const currency = s.estCost !== undefined ? (s.currency ?? 'KRW') : s.estCostKrw !== undefined ? 'KRW' : undefined
      if (cost !== undefined && cost > 0 && currency) sums.set(currency, (sums.get(currency) ?? 0) + cost)
      return { time: s.time, name: s.name, area: s.area, category: s.category, cost: cost && cost > 0 ? cost : undefined, currency }
    }),
  }))
  const used = days.map((d) => d.weather).filter((w): w is DayWeather => Boolean(w))

  return {
    title: it.title,
    summary: it.summary,
    startDate: p.startDate,
    endDate: p.endDate,
    nDays: daysBetween(p.startDate, p.endDate),
    cities: p.cities,
    travelers: p.travelers,
    adults,
    interests: p.interests,
    budget: p.budget,
    pace: p.pace,
    notes: p.notes,
    requests: it.requests ?? [],
    flight: flightRoute(trip, home),
    stays,
    prep,
    prepDone: prep.filter((x) => x.done).length,
    days,
    costs: [...sums.entries()].map(([currency, perPerson]) => ({ currency, perPerson, total: perPerson * adults })),
    packing: packingList(used),
    gear: recommendGear(trip, used, home),
    abroad: isAbroad(trip, home),
    sampleWeather: used.some((w) => w.sample),
  }
}

/** 화면 문구·형식 도우미 (i18n 컨텍스트에서 넘겨받는다) */
export interface ReportFormat {
  t: (key: string, vars?: Record<string, string | number>) => string
  locale: string
  formatDate: (iso: string) => string
  formatMoney: (amount: number, currency: string) => string
  cityName: (id: string) => string
  placeName: (name: LocalizedName) => string
  temps: (w: DayWeather) => string
}

export function prepLabel(x: ReportPrep, r: TripReport, f: ReportFormat): string {
  switch (x.kind) {
    case 'itinerary':
      return f.t('prep.itinerary')
    case 'flight':
      return r.flight ? `${f.t('itin.flightsTo', { city: f.cityName(r.cities[0]) })} (${r.flight.from} ⇄ ${r.flight.to})` : f.t('nav.flights')
    case 'hotel':
      return x.stay ? `${f.t('itin.hotelsIn', { city: f.cityName(x.stay.city) })}${x.stay.area ? ` · ${x.stay.area}` : ''} (${f.formatDate(x.stay.checkIn)} – ${f.formatDate(x.stay.checkOut)})` : f.t('nav.hotels')
    case 'weather':
      return f.t('prep.weather')
    case 'gear':
      return f.t('gear.open')
    case 'deals':
      return f.t('prep.deals')
    case 'airport':
      return f.t('airport.open')
    default:
      return f.t('prep.essentials')
  }
}

export function weatherLine(w: DayWeather | undefined, f: ReportFormat): string {
  if (!w) return f.t('report.weatherNone')
  const rain = w.rainPct === null ? '' : ` · ${f.t(w.source === 'forecast' ? 'weather.rainForecast' : 'weather.rainNormal', { n: w.rainPct })}`
  return `${f.t(`weather.cond.${w.condition}`)} ${f.temps(w)}${rain} (${f.t(`weather.src.${w.source}`)}${w.sample ? ` · ${f.t('common.sample')}` : ''})`
}

export function mealLine(m: ReportDay['meals'][number], f: ReportFormat): string {
  if (!m.chosen) return f.t('meals.undecided', { n: m.options })
  const cost = m.chosen.estCost && m.chosen.currency ? ` (${f.t('itin.estCost', { cost: f.formatMoney(m.chosen.estCost, m.chosen.currency) })})` : ''
  return `${f.placeName(m.chosen.name)}${m.chosen.area ? ` · ${m.chosen.area}` : ''}${cost}`
}

/** 복사·공유용 글 보고서 */
export function reportText(r: TripReport, f: ReportFormat, today: string): string {
  const L: string[] = []
  const h = (s: string) => L.push('', `■ ${s}`)
  L.push(`${r.title} — ${f.t('report.title')}`)

  h(f.t('report.overview'))
  L.push(`${f.t('report.dates')}: ${f.formatDate(r.startDate)} – ${f.formatDate(r.endDate)} (${f.t('common.days', { n: r.nDays })})`)
  L.push(`${f.t('report.cities')}: ${r.cities.map(f.cityName).join(' → ')}`)
  L.push(`${f.t('report.party')}: ${f.t('report.partyValue', { who: f.t(`setup.travelersOpt.${r.travelers}`), n: r.adults })}`)
  L.push(`${f.t('report.style')}: ${f.t(`setup.budgetOpt.${r.budget}`)} · ${f.t(`setup.paceOpt.${r.pace}`)}`)
  if (r.interests.length) L.push(`${f.t('report.interests')}: ${r.interests.map((i) => f.t(`setup.interest.${i}`)).join(', ')}`)

  h(`${f.t('report.prep')} (${f.t('prep.progress', { done: r.prepDone, total: r.prep.length })})`)
  for (const x of r.prep) L.push(`[${x.done ? 'v' : ' '}] ${prepLabel(x, r, f)}`)

  if (r.notes) {
    h(f.t('report.requests'))
    L.push(`"${r.notes}"`)
    for (const q of r.requests) L.push(`- ${q.request}: ${q.handled} (${f.t(q.applied ? 'report.applied' : 'report.notApplied')})`)
  }

  h(f.t('report.days'))
  for (const d of r.days) {
    L.push('', `${f.t('common.day', { n: d.day })} · ${f.formatDate(d.date)} · ${f.cityName(d.city)}`)
    L.push(`  ${weatherLine(d.weather, f)}`)
    for (const s of d.stops) L.push(`  ${s.time} ${f.placeName(s.name)}${s.cost && s.currency ? ` (${f.t('itin.estCost', { cost: f.formatMoney(s.cost, s.currency) })})` : ''}`)
    for (const m of d.meals) L.push(`  ${f.t(`meals.${m.slot}`)}: ${mealLine(m, f)}`)
  }

  h(f.t('report.costs'))
  if (r.costs.length) for (const c of r.costs) L.push(`${f.t('report.perPerson')} ${f.formatMoney(c.perPerson, c.currency)} · ${f.t('report.total', { n: r.adults })} ${f.formatMoney(c.total, c.currency)}`)
  else L.push(f.t('report.noCost'))
  L.push(f.t('report.costNote'))

  h(f.t('report.packing'))
  L.push(r.packing.length ? r.packing.map((p) => f.t(`weather.tip.${p}`)).join(', ') : f.t('weather.noTips'))
  if (r.gear.length) L.push(`${f.t('gear.title')}: ${r.gear.map((g) => f.t(`gear.item.${g.id}`)).join(', ')}`)
  if (r.abroad) L.push(f.t('prep.essentialsSub'))

  L.push('', f.t('itin.aiNotice'), f.t(r.sampleWeather ? 'weather.noticeSample' : 'weather.notice'), f.t('report.generated', { date: f.formatDate(today) }))
  return L.join('\n').trim()
}
