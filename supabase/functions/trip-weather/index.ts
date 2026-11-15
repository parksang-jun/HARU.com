// Edge Function: 여행 일정 날짜별 날씨 — Open-Meteo
//  - 오늘부터 16일 안: 예보 (forecast API)
//  - 그보다 먼 날짜: 평년값 (archive API, 지난 3년 같은 날짜 ±3일 평균과 비 온 날 비율)
// 비밀값(선택): WEATHER_API_KEY — Open-Meteo 유료 플랜 키. 있으면 customer-* 호스트로 호출한다.
//   무료 호스트는 비상업적 이용만 허용되므로, 수익이 나는 정식 출시 전에 유료 플랜 키를 넣어야 한다.
import { getUser } from '../_shared/auth.ts'
import { corsHeaders, json } from '../_shared/cors.ts'
import { computeNormals, datesBetween, normalRange, NORMAL_YEARS, parseForecast, splitDates, type OpenMeteoDaily, type RawDay } from '../_shared/weather-core.ts'

const KEY = Deno.env.get('WEATHER_API_KEY') ?? ''
const FORECAST_URL = KEY ? 'https://customer-api.open-meteo.com/v1/forecast' : 'https://api.open-meteo.com/v1/forecast'
const ARCHIVE_URL = KEY ? 'https://customer-archive-api.open-meteo.com/v1/archive' : 'https://archive-api.open-meteo.com/v1/archive'
const MAX_POINTS = 5
const MAX_DAYS = 21

interface Point {
  city: string
  lat: number
  lng: number
  start: string
  end: string
}

const isDate = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)

async function daily(url: string, params: Record<string, string>): Promise<OpenMeteoDaily | undefined> {
  const qs = new URLSearchParams({ ...params, timezone: 'auto' })
  if (KEY) qs.set('apikey', KEY)
  const res = await fetch(`${url}?${qs}`)
  if (!res.ok) throw new Error(`open-meteo ${res.status}`)
  return ((await res.json()) as { daily?: OpenMeteoDaily }).daily
}

async function weatherFor(p: Point, today: string): Promise<RawDay[]> {
  const dates = datesBetween(p.start, p.end).slice(0, MAX_DAYS)
  const { forecast, normal } = splitDates(dates, today)
  const loc = { latitude: String(p.lat), longitude: String(p.lng) }
  const out: RawDay[] = []

  if (forecast.length) {
    try {
      const d = await daily(FORECAST_URL, {
        ...loc,
        daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum',
        start_date: forecast[0],
        end_date: forecast[forecast.length - 1],
      })
      out.push(...parseForecast(d, forecast))
    } catch (e) {
      console.error('forecast failed', p.city, e)
    }
  }

  // 예보가 비어 있는 날짜는 평년으로 채운다
  const have = new Set(out.map((d) => d.date))
  const needNormal = [...normal, ...forecast.filter((d) => !have.has(d))]
  if (needNormal.length) {
    const archives = await Promise.all(
      Array.from({ length: NORMAL_YEARS }, (_, i) => i + 1).map(async (yearsBack) => {
        try {
          const r = normalRange(needNormal, yearsBack)
          const d = await daily(ARCHIVE_URL, { ...loc, daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum', start_date: r.start, end_date: r.end })
          return { yearsBack, daily: d }
        } catch (e) {
          console.error('archive failed', p.city, yearsBack, e)
          return { yearsBack, daily: undefined }
        }
      }),
    )
    out.push(...computeNormals(needNormal, archives))
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : 1))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const user = await getUser(req)
  if (!user) return json({ error: 'unauthorized' }, 401)

  let body: { points?: unknown }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'bad_request' }, 400)
  }
  const points = (Array.isArray(body.points) ? body.points : [])
    .filter((p): p is Point => {
      const q = p as Partial<Point>
      return typeof q?.city === 'string' && Number.isFinite(q.lat) && Number.isFinite(q.lng) && Math.abs(q.lat as number) <= 90 && Math.abs(q.lng as number) <= 180 && isDate(q.start) && isDate(q.end) && q.start <= q.end
    })
    .slice(0, MAX_POINTS)
  if (points.length === 0) return json({ error: 'invalid_points' }, 400)

  const today = new Date().toISOString().slice(0, 10)
  try {
    const results = await Promise.all(points.map(async (p) => ({ city: p.city, days: await weatherFor(p, today) })))
    return json({ results, source: 'open-meteo', fetchedAt: new Date().toISOString() })
  } catch (e) {
    console.error('trip-weather failed', e)
    return json({ error: 'upstream_error' }, 502)
  }
})
