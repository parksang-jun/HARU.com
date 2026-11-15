// 날씨 계산 순수 함수 (Deno·Node 공용, 외부 의존 없음) — Edge Function `trip-weather` 와 단위 테스트가 같이 쓴다
// 예보: Open-Meteo forecast(최대 16일) / 평년: archive API 의 지난 3년 같은 날짜 ±3일 표본

export type WeatherSource = 'forecast' | 'normal'

export interface RawDay {
  date: string // YYYY-MM-DD
  /** WMO 날씨 코드 (평년값은 null — 앱이 강수 확률·기온으로 상태를 정한다) */
  code: number | null
  high: number
  low: number
  /** 강수 확률 % (예보) 또는 비 온 날 비율 % (평년). 없으면 null */
  rainPct: number | null
  precipMm: number | null
  source: WeatherSource
}

/** Open-Meteo daily 응답 블록 */
export interface OpenMeteoDaily {
  time?: string[]
  weather_code?: (number | null)[]
  temperature_2m_max?: (number | null)[]
  temperature_2m_min?: (number | null)[]
  precipitation_probability_max?: (number | null)[]
  precipitation_sum?: (number | null)[]
}

export const FORECAST_DAYS = 16
export const NORMAL_YEARS = 3
export const NORMAL_WINDOW = 3 // ±일
/** 이 이상 내리면 '비 온 날' 로 센다 (mm) */
export const WET_DAY_MM = 1

const DAY_MS = 86_400_000
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10)
const round1 = (n: number) => Math.round(n * 10) / 10

export function addDaysIso(date: string, n: number): string {
  return iso(Date.parse(`${date}T00:00:00Z`) + n * DAY_MS)
}

export function datesBetween(start: string, end: string): string[] {
  const out: string[] = []
  for (let d = start; d <= end && out.length < 60; d = addDaysIso(d, 1)) out.push(d)
  return out
}

/** 같은 월·일을 n년 전으로 (2/29 는 2/28 로) */
export function shiftYears(date: string, years: number): string {
  const [y, m, d] = date.split('-').map(Number)
  const ty = y - years
  const leap = (ty % 4 === 0 && ty % 100 !== 0) || ty % 400 === 0
  const day = m === 2 && d === 29 && !leap ? 28 : d
  return `${ty}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** 여행 날짜를 예보 구간(오늘~오늘+15일)과 평년 구간(그 밖)으로 나눈다 */
export function splitDates(dates: string[], today: string): { forecast: string[]; normal: string[] } {
  const last = addDaysIso(today, FORECAST_DAYS - 1)
  const forecast: string[] = []
  const normal: string[] = []
  for (const d of dates) (d >= today && d <= last ? forecast : normal).push(d)
  return { forecast, normal }
}

/** 예보 응답 → 날짜별 값. 기온이 빠진 날은 버린다(호출 쪽이 평년으로 채움) */
export function parseForecast(daily: OpenMeteoDaily | undefined, wanted: string[]): RawDay[] {
  if (!daily?.time) return []
  const want = new Set(wanted)
  const out: RawDay[] = []
  daily.time.forEach((date, i) => {
    if (!want.has(date)) return
    const high = daily.temperature_2m_max?.[i]
    const low = daily.temperature_2m_min?.[i]
    if (typeof high !== 'number' || typeof low !== 'number') return
    const pct = daily.precipitation_probability_max?.[i]
    const mm = daily.precipitation_sum?.[i]
    const code = daily.weather_code?.[i]
    out.push({
      date,
      code: typeof code === 'number' ? code : null,
      high: round1(high),
      low: round1(low),
      rainPct: typeof pct === 'number' ? Math.round(pct) : null,
      precipMm: typeof mm === 'number' ? round1(mm) : null,
      source: 'forecast',
    })
  })
  return out
}

/** 평년 조회 범위: 대상 날짜들의 n년 전 ±window 일 */
export function normalRange(dates: string[], yearsBack: number): { start: string; end: string } {
  const sorted = [...dates].sort()
  return {
    start: addDaysIso(shiftYears(sorted[0], yearsBack), -NORMAL_WINDOW),
    end: addDaysIso(shiftYears(sorted[sorted.length - 1], yearsBack), NORMAL_WINDOW),
  }
}

/** 지난 여러 해의 archive 응답 → 날짜별 평년값 (최고·최저 평균, 비 온 날 비율) */
export function computeNormals(dates: string[], archives: { yearsBack: number; daily: OpenMeteoDaily | undefined }[]): RawDay[] {
  const out: RawDay[] = []
  for (const date of dates) {
    const highs: number[] = []
    const lows: number[] = []
    const rains: number[] = []
    for (const { yearsBack, daily } of archives) {
      if (!daily?.time) continue
      const center = shiftYears(date, yearsBack)
      const from = addDaysIso(center, -NORMAL_WINDOW)
      const to = addDaysIso(center, NORMAL_WINDOW)
      daily.time.forEach((t, i) => {
        if (t < from || t > to) return
        const h = daily.temperature_2m_max?.[i]
        const l = daily.temperature_2m_min?.[i]
        if (typeof h !== 'number' || typeof l !== 'number') return
        highs.push(h)
        lows.push(l)
        const mm = daily.precipitation_sum?.[i]
        if (typeof mm === 'number') rains.push(mm)
      })
    }
    if (highs.length === 0) continue
    const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
    out.push({
      date,
      code: null,
      high: round1(avg(highs)),
      low: round1(avg(lows)),
      rainPct: rains.length ? Math.round((rains.filter((mm) => mm >= WET_DAY_MM).length / rains.length) * 100) : null,
      precipMm: rains.length ? round1(avg(rains)) : null,
      source: 'normal',
    })
  }
  return out
}
