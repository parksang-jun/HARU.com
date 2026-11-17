// 일정 날짜별 날씨 — 실서비스: Edge Function `trip-weather`(Open-Meteo 예보·평년) / 목업·실패 시: 위도·지역 기반 평년 추정
import { getDestination, type Region } from './destinations'
import { ENV } from './env'
import type { ItineraryDay, StopCategory, Trip } from './itinerary'
import { seeded } from './rng'
import { loadJson, saveJson } from './storage'
import { ensureSession, getSupabase } from './supabase'

export type Condition = 'clear' | 'partly' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'heavyRain' | 'snow' | 'storm'
/** forecast: 예보 / normal: 지난 3년 같은 시기 실측 평균 / estimate: 위도·지역으로 계산한 평년 추정 */
export type WeatherSource = 'forecast' | 'normal' | 'estimate'

export interface DayWeather {
  city: string
  date: string
  condition: Condition
  /** 최고·최저 (°C) */
  high: number
  low: number
  /** 강수 확률(예보) 또는 비 오는 날 비율(평년) % */
  rainPct: number | null
  source: WeatherSource
  /** 목업 모드에서 만든 샘플 값 */
  sample?: boolean
}

export type TripWeather = Record<string, DayWeather>
export const weatherKey = (city: string, date: string) => `${city}|${date}`

export const FORECAST_DAYS = 16
const DAY_MS = 86_400_000

export const ICONS: Record<Condition, string> = {
  clear: '☀️',
  partly: '⛅',
  cloudy: '☁️',
  fog: '🌫️',
  drizzle: '🌦️',
  rain: '🌧️',
  heavyRain: '🌧️',
  snow: '❄️',
  storm: '⛈️',
}

const WET: Condition[] = ['drizzle', 'rain', 'heavyRain', 'storm']
export const isWet = (w: DayWeather) => WET.includes(w.condition) || (w.rainPct ?? 0) >= 50

/** WMO 날씨 코드 → 앱 상태 */
export function conditionFromCode(code: number): Condition {
  if (code === 0) return 'clear'
  if (code === 1 || code === 2) return 'partly'
  if (code === 3) return 'cloudy'
  if (code === 45 || code === 48) return 'fog'
  if (code >= 51 && code <= 57) return 'drizzle'
  if (code === 65 || code === 66 || code === 67 || code === 82) return 'heavyRain'
  if ((code >= 61 && code <= 64) || code === 80 || code === 81) return 'rain'
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow'
  if (code >= 95) return 'storm'
  return 'cloudy'
}

/** 코드가 없는 평년값: 비 오는 날 비율과 기온으로 대표 상태를 정한다 */
export function conditionFromNormals(rainPct: number | null, high: number): Condition {
  const p = rainPct ?? 0
  if (p >= 50) return high <= 2 ? 'snow' : 'rain'
  if (p >= 35) return 'cloudy'
  if (p >= 20) return 'partly'
  return 'clear'
}

// ---------- 평년 추정 (목업·오프라인·서버 실패 시) ----------

/** 지역별 월별 비 오는 날 비율 % (북반구 기준, 남반구는 6개월 이동) */
const RAIN_BY_REGION: Record<Region, number[]> = {
  korea: [20, 20, 22, 25, 28, 35, 50, 45, 28, 18, 22, 20],
  japan: [25, 28, 35, 35, 35, 45, 40, 35, 42, 32, 26, 22],
  china: [22, 28, 35, 38, 42, 50, 45, 42, 35, 25, 22, 20],
  sea: [15, 12, 15, 25, 45, 50, 50, 52, 58, 55, 38, 22],
  europe: [42, 38, 36, 36, 36, 32, 28, 28, 32, 40, 44, 44],
  americas: [32, 30, 32, 34, 36, 36, 36, 34, 30, 28, 30, 32],
  oceania: [35, 35, 35, 32, 32, 32, 30, 28, 28, 30, 32, 34],
  mea: [12, 12, 10, 8, 4, 1, 1, 1, 2, 5, 10, 12],
}

function dayOfYear(date: string): number {
  const d = Date.parse(`${date}T00:00:00Z`)
  return Math.floor((d - Date.parse(`${date.slice(0, 4)}-01-01T00:00:00Z`)) / DAY_MS) + 1
}

/** 위도·지역·날짜로 평년 기온과 비 오는 날 비율을 추정한다 (실측이 아니라 근사식) */
export function estimateClimate(lat: number, region: Region, date: string): { high: number; low: number; rainPct: number } {
  const abs = Math.abs(lat)
  const south = lat < 0
  const eastAsia = region === 'korea' || region === 'china' || (region === 'japan' && abs > 30)
  const mean = 27.5 - 0.42 * Math.max(0, abs - 12) - (region === 'korea' || region === 'china' ? 3 : 0)
  let amp = Math.min(13, Math.max(1, abs * 0.3))
  if (eastAsia) amp += 2.5
  if (region === 'europe') amp *= 0.75
  const peak = south ? 23 : 205 // 가장 더운 날 (1월 하순 / 7월 하순)
  const t = mean + amp * Math.cos((2 * Math.PI * (dayOfYear(date) - peak)) / 365)
  const month = (Number(date.slice(5, 7)) - 1 + (south ? 6 : 0)) % 12
  return { high: Math.round((t + 4.5) * 10) / 10, low: Math.round((t - 4.5) * 10) / 10, rainPct: RAIN_BY_REGION[region][month] }
}

export function todayIso(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`
}

function withinForecast(date: string, today: string): boolean {
  const diff = Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY_MS)
  return diff >= 0 && diff < FORECAST_DAYS
}

/** 목업·대체 날씨: 16일 안은 날짜마다 달라지는 샘플 예보, 그보다 멀면 평년 추정 */
export function mockDayWeather(city: string, date: string, today: string, sample: boolean): DayWeather | null {
  const dest = getDestination(city)
  if (!dest) return null
  const base = estimateClimate(dest.lat, dest.region, date)
  if (!sample || !withinForecast(date, today)) {
    return { city, date, condition: conditionFromNormals(base.rainPct, base.high), high: base.high, low: base.low, rainPct: base.rainPct, source: 'estimate', sample: sample || undefined }
  }
  // 샘플 예보 (같은 도시·날짜면 항상 같은 값)
  const rand = seeded(`wx:${city}:${date}`)
  const shift = (rand() - 0.5) * 5
  const roll = rand() * 100
  const wet = roll < base.rainPct
  const high = Math.round((base.high + shift - (wet ? 2 : 0)) * 10) / 10
  const low = Math.round((base.low + shift * 0.6) * 10) / 10
  let condition: Condition
  let rainPct: number
  if (wet) {
    rainPct = Math.round(60 + rand() * 35)
    condition = high <= 2 ? 'snow' : rainPct >= 88 ? 'heavyRain' : rainPct >= 70 ? 'rain' : 'drizzle'
  } else {
    rainPct = Math.round(rand() * 30)
    condition = rainPct >= 22 ? 'cloudy' : rainPct >= 10 ? 'partly' : 'clear'
  }
  return { city, date, condition, high, low, rainPct, source: 'forecast', sample: true }
}

// ---------- 서버 응답 정규화 ----------

interface RemoteDay {
  date?: unknown
  code?: unknown
  high?: unknown
  low?: unknown
  rainPct?: unknown
  source?: unknown
}

export function normalizeRemote(results: unknown): TripWeather {
  const out: TripWeather = {}
  if (!Array.isArray(results)) return out
  for (const r of results as { city?: unknown; days?: unknown }[]) {
    if (typeof r?.city !== 'string' || !Array.isArray(r.days)) continue
    for (const d of r.days as RemoteDay[]) {
      if (typeof d.date !== 'string' || typeof d.high !== 'number' || typeof d.low !== 'number') continue
      const rainPct = typeof d.rainPct === 'number' ? Math.max(0, Math.min(100, Math.round(d.rainPct))) : null
      const source: WeatherSource = d.source === 'forecast' ? 'forecast' : 'normal'
      const condition = typeof d.code === 'number' ? conditionFromCode(d.code) : conditionFromNormals(rainPct, d.high)
      out[weatherKey(r.city, d.date)] = { city: r.city, date: d.date, condition, high: d.high, low: d.low, rainPct, source }
    }
  }
  return out
}

// ---------- 조회 ----------

interface Point {
  city: string
  lat: number
  lng: number
  start: string
  end: string
}

/** 일정의 도시별 날짜 범위 (도시당 한 번만 조회) */
export function weatherPoints(days: Pick<ItineraryDay, 'city' | 'date'>[]): Point[] {
  const by = new Map<string, Point>()
  for (const d of days) {
    const dest = getDestination(d.city)
    if (!dest) continue
    const p = by.get(d.city)
    if (!p) by.set(d.city, { city: d.city, lat: dest.lat, lng: dest.lng, start: d.date, end: d.date })
    else {
      if (d.date < p.start) p.start = d.date
      if (d.date > p.end) p.end = d.date
    }
  }
  return [...by.values()]
}

interface Cached {
  on: string
  sig: string
  days: TripWeather
}

/** 여행 일정의 날짜별 날씨. 하루 한 번만 새로 받고, 받지 못한 날짜는 평년 추정으로 채운다 */
export async function getTripWeather(trip: Trip, today: string = todayIso()): Promise<TripWeather> {
  const days = trip.itinerary?.days ?? []
  if (days.length === 0) return {}
  const sig = `${ENV.mockAi ? 'm' : 'l'}:${days.map((d) => `${d.city}@${d.date}`).join(',')}`
  const cacheKey = `wx:${trip.id}`
  const cached = await loadJson<Cached | null>(cacheKey, null)
  if (cached && cached.on === today && cached.sig === sig) return cached.days

  let remote: TripWeather = {}
  if (!ENV.mockAi) {
    try {
      const sb = getSupabase()
      if (sb) {
        await ensureSession()
        const { data, error } = await sb.functions.invoke('trip-weather', { body: { points: weatherPoints(days) } })
        if (error) throw error
        remote = normalizeRemote(data?.results)
      }
    } catch (e) {
      console.warn('[weather] live fetch failed, using estimates', e)
    }
  }

  const out: TripWeather = {}
  for (const d of days) {
    const k = weatherKey(d.city, d.date)
    const w = remote[k] ?? mockDayWeather(d.city, d.date, today, ENV.mockAi)
    if (w) out[k] = w
  }
  await saveJson(cacheKey, { on: today, sig, days: out } satisfies Cached)
  return out
}

// ---------- 옷차림·준비물·우천 대안 ----------

export type Tip = 'umbrella' | 'snow' | 'heavyCoat' | 'coat' | 'jacket' | 'hot' | 'sunscreen' | 'layers'

/** 그날 날씨에 맞는 준비물 (중요한 순서) */
export function tipsFor(w: DayWeather): Tip[] {
  const tips: Tip[] = []
  if (w.condition === 'snow') tips.push('snow')
  else if (isWet(w)) tips.push('umbrella')
  if (w.low <= 0) tips.push('heavyCoat')
  else if (w.high <= 10) tips.push('coat')
  else if (w.low <= 13 || w.high <= 18) tips.push('jacket')
  if (w.high >= 30) tips.push('hot')
  if (w.high >= 24 && (w.condition === 'clear' || w.condition === 'partly')) tips.push('sunscreen')
  if (w.high - w.low >= 12) tips.push('layers')
  return tips
}

/** 여행 전체 준비물 (날짜별 준비물의 합집합, 처음 나온 순서) */
export function packingList(list: DayWeather[]): Tip[] {
  const seen = new Set<Tip>()
  for (const w of list) for (const t of tipsFor(w)) seen.add(t)
  return [...seen]
}

const OUTDOOR: StopCategory[] = ['sight', 'nature', 'activity']

/** 비·눈이 오는 날 야외 일정이 2곳 이상이면 실내 대안을 권한다 */
export function needsRainPlan(w: DayWeather | undefined, day: Pick<ItineraryDay, 'stops'>): boolean {
  if (!w || !(isWet(w) || w.condition === 'snow')) return false
  return day.stops.filter((s) => OUTDOOR.includes(s.category)).length >= 2
}

/** 기온대별 옷차림 (낮 최고기온 기준) */
export type Outfit = 'o28' | 'o23' | 'o20' | 'o17' | 'o12' | 'o9' | 'o5' | 'o0'

export function outfitFor(w: Pick<DayWeather, 'high'>): Outfit {
  const t = w.high
  if (t >= 28) return 'o28'
  if (t >= 23) return 'o23'
  if (t >= 20) return 'o20'
  if (t >= 17) return 'o17'
  if (t >= 12) return 'o12'
  if (t >= 9) return 'o9'
  if (t >= 5) return 'o5'
  return 'o0'
}

/** 아침저녁용 덧옷이 필요한지: 하루 기온 차가 10도 이상일 때 */
export function needsExtraLayer(w: Pick<DayWeather, 'high' | 'low'>): boolean {
  return w.high - w.low >= 10
}

/** 표시용 기온: 영어는 °C 와 °F 를 함께 */
export function formatTemps(w: Pick<DayWeather, 'high' | 'low'>, locale: string): string {
  const c = `${Math.round(w.high)}° / ${Math.round(w.low)}°C`
  if (locale !== 'en') return c
  const f = (x: number) => Math.round((x * 9) / 5 + 32)
  return `${c} (${f(w.high)}° / ${f(w.low)}°F)`
}
