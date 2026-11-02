// 일정 데이터 모델 + 정규화/검증 (Edge Function 응답과 목업 모두 이 형태로 통일)
import { getDestination, isDestination, nearAnyDestination } from './destinations'

/** 여행지 id (destinations.ts 카탈로그 — 국내·해외) */
export type CityId = string
export const MAX_CITIES = 5

export type Travelers = 'solo' | 'couple' | 'family' | 'friends'
export type Interest = 'food' | 'kpop' | 'shopping' | 'history' | 'nature' | 'cafe' | 'nightlife' | 'wellness'
export const INTERESTS: Interest[] = ['food', 'kpop', 'shopping', 'history', 'nature', 'cafe', 'nightlife', 'wellness']
export type Budget = 'saver' | 'standard' | 'premium'
export type Pace = 'relaxed' | 'balanced' | 'packed'

export type StopCategory = 'sight' | 'nature' | 'food' | 'cafe' | 'shopping' | 'activity' | 'nightlife' | 'wellness' | 'transport' | 'stay'
export const STOP_CATEGORIES: StopCategory[] = ['sight', 'nature', 'food', 'cafe', 'shopping', 'activity', 'nightlife', 'wellness', 'transport', 'stay']

export type PartnerId = 'klook' | 'trip' | 'agoda' | 'booking' | 'expedia' | 'getyourguide' | 'creatrip' | 'trazy' | 'nol'
export const PARTNERS: PartnerId[] = ['klook', 'trip', 'agoda', 'booking', 'expedia', 'getyourguide', 'creatrip', 'trazy', 'nol']

export type ReserveProvider = 'catchtable' | 'naver' | 'google'
export const RESERVE_PROVIDERS: ReserveProvider[] = ['catchtable', 'naver', 'google']

export interface LocalizedName {
  ko: string
  en: string
  ja?: string
  zh?: string
}

export interface TripParams {
  cities: CityId[]
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  travelers: Travelers
  interests: Interest[]
  budget: Budget
  pace: Pace
  notes?: string
  locale: string
}

export interface Stop {
  id: string
  time: string // HH:MM
  durationMin: number
  category: StopCategory
  name: LocalizedName
  area: string
  lat: number
  lng: number
  tip: string
  transitHint: string
  /** 1인 예상 비용 (현지 통화) */
  estCost?: number
  currency?: string
  /** @deprecated v0.1 저장 데이터 호환용 — estCost + 'KRW' 로 해석 */
  estCostKrw?: number
  booking?: { partner: PartnerId; query: string }
  reserve?: { provider: ReserveProvider; query: string }
}

export interface ItineraryDay {
  day: number
  date: string
  city: CityId
  theme: string
  stops: Stop[]
}

export interface Itinerary {
  version: 1
  title: string
  summary: string
  days: ItineraryDay[]
}

export interface Trip {
  id: string
  params: TripParams
  createdAt: string
  updatedAt: string
  itinerary?: Itinerary
}

/** 소수점 없이 쓰는 통화 */
const ZERO_DECIMAL = new Set(['KRW', 'JPY', 'VND', 'IDR', 'TWD', 'HUF', 'ISK', 'LAK', 'MNT', 'CLP'])

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function isObj(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v.trim() : fallback
}

function num(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v)
  return undefined
}

/** 날짜 문자열에 n일 더하기 (UTC 기준 날짜 연산) */
export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export function daysBetween(start: string, end: string): number {
  const a = new Date(`${start}T00:00:00Z`).getTime()
  const b = new Date(`${end}T00:00:00Z`).getTime()
  return Math.round((b - a) / 86_400_000) + 1
}

export function validateTripParams(p: TripParams): 'errCity' | 'errDates' | null {
  if (!p.cities.length || p.cities.length > MAX_CITIES || p.cities.some((c) => !isDestination(c))) return 'errCity'
  if (!DATE_RE.test(p.startDate) || !DATE_RE.test(p.endDate)) return 'errDates'
  const n = daysBetween(p.startDate, p.endDate)
  if (!Number.isFinite(n) || n < 1 || n > 14) return 'errDates'
  return null
}

/** 느슨한 LLM 출력을 안전한 Stop 으로 정규화. 필수값이 없거나 여행 도시와 동떨어진 좌표면 null
 *  cities: 좌표 검증 기준 도시들 (반경 250km). 생략 시 서울 (v0.1 호환) */
export function normalizeStop(raw: unknown, dayIdx: number, stopIdx: number, cities: CityId[] = ['seoul'], fallbackCurrency?: string): Stop | null {
  if (!isObj(raw)) return null
  const nameRaw = isObj(raw.name) ? raw.name : {}
  const en = str(nameRaw.en) || str(raw.name)
  const ko = str(nameRaw.ko) || en
  if (!en && !ko) return null
  const lat = num(raw.lat)
  const lng = num(raw.lng)
  if (lat === undefined || lng === undefined || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  if (!nearAnyDestination(lat, lng, cities)) return null // 여행 도시와 동떨어진 좌표(환각) 거부

  const category = STOP_CATEGORIES.includes(raw.category as StopCategory) ? (raw.category as StopCategory) : 'sight'
  const time = TIME_RE.test(str(raw.time)) ? str(raw.time) : `${String(9 + stopIdx * 2).padStart(2, '0')}:00`

  const stop: Stop = {
    id: str(raw.id) || `d${dayIdx + 1}s${stopIdx + 1}`,
    time,
    durationMin: Math.min(480, Math.max(15, num(raw.durationMin) ?? 90)),
    category,
    name: { ko, en: en || ko, ja: str(nameRaw.ja) || undefined, zh: str(nameRaw.zh) || undefined },
    area: str(raw.area),
    lat,
    lng,
    tip: str(raw.tip),
    transitHint: str(raw.transitHint),
  }
  const legacyKrw = num(raw.estCostKrw)
  const cost = num(raw.estCost) ?? legacyKrw
  if (cost !== undefined && cost >= 0) {
    const cur = str(raw.currency).toUpperCase()
    stop.currency = /^[A-Z]{3}$/.test(cur) ? cur : num(raw.estCost) === undefined && legacyKrw !== undefined ? 'KRW' : (fallbackCurrency ?? 'KRW')
    stop.estCost = ZERO_DECIMAL.has(stop.currency) ? Math.round(cost) : Math.round(cost * 100) / 100
  }

  if (isObj(raw.booking) && PARTNERS.includes(raw.booking.partner as PartnerId)) {
    stop.booking = { partner: raw.booking.partner as PartnerId, query: str(raw.booking.query) || en }
  }
  if (isObj(raw.reserve) && RESERVE_PROVIDERS.includes(raw.reserve.provider as ReserveProvider)) {
    stop.reserve = { provider: raw.reserve.provider as ReserveProvider, query: str(raw.reserve.query) || en }
  }
  return stop
}

/** LLM/목업 출력 전체를 Itinerary 로 정규화. 유효한 날이 하나도 없으면 null */
export function normalizeItinerary(raw: unknown, params: TripParams): Itinerary | null {
  if (!isObj(raw) || !Array.isArray(raw.days)) return null
  const days: ItineraryDay[] = []
  raw.days.forEach((d, i) => {
    if (!isObj(d) || !Array.isArray(d.stops)) return
    const city = params.cities.includes(str(d.city)) ? str(d.city) : params.cities[0]
    const currency = getDestination(city)?.currency
    const stops = d.stops.map((s, j) => normalizeStop(s, i, j, params.cities, currency)).filter((s): s is Stop => s !== null)
    if (!stops.length) return
    stops.sort((a, b) => a.time.localeCompare(b.time))
    days.push({
      day: days.length + 1,
      date: DATE_RE.test(str(d.date)) ? str(d.date) : addDays(params.startDate, days.length),
      city,
      theme: str(d.theme),
      stops,
    })
  })
  if (!days.length) return null
  return {
    version: 1,
    title: str(raw.title) || `${params.cities.join(', ')} trip`,
    summary: str(raw.summary),
    days,
  }
}

/** 여행자 유형 → 성인 수 (항공·호텔 검색 기본값) */
export function adultsFor(t: Travelers): number {
  return t === 'solo' ? 1 : t === 'couple' ? 2 : t === 'friends' ? 3 : 4
}

/** 예약 파트너 자동 선택 — 카테고리별 기본 파트너 */
export function defaultPartnerFor(category: StopCategory): PartnerId | null {
  switch (category) {
    case 'stay':
      return 'agoda'
    case 'activity':
    case 'wellness':
      return 'klook'
    case 'sight':
    case 'nature':
      return 'klook'
    case 'transport':
      return 'klook'
    default:
      return null
  }
}
