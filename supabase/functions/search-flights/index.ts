// Edge Function: 항공권 운임 검색 — Travelpayouts(Aviasales) Data API `prices_for_dates`
// 데이터는 최근 48시간 내 Aviasales 사용자 검색에서 수집된 운임 캐시(실시간 좌석 아님) → 앱에서 "최근 운임"으로 표기
// 비밀값: TRAVELPAYOUTS_TOKEN (필수), SEARCH_DAILY_CAP (기본 60)
import { bumpUsage, getUser, underCap } from '../_shared/auth.ts'
import { corsHeaders, json } from '../_shared/cors.ts'

const TOKEN = Deno.env.get('TRAVELPAYOUTS_TOKEN') ?? ''
const CAP = Number(Deno.env.get('SEARCH_DAILY_CAP') ?? '60')
const ENDPOINT = 'https://api.travelpayouts.com/aviasales/v3/prices_for_dates'

const IATA = /^[A-Z]{3}$/
const DATE = /^\d{4}-\d{2}-\d{2}$/
const CURRENCIES = new Set(['krw', 'jpy', 'twd', 'usd', 'eur', 'hkd'])
const MARKET: Record<string, string> = { ko: 'kr', ja: 'jp', 'zh-TW': 'tw', en: 'us' }

interface Query {
  from: string
  to: string
  depart: string
  return?: string
  adults: number
  cabin: string
}

function valid(q: unknown): q is Query {
  if (!q || typeof q !== 'object') return false
  const x = q as Record<string, unknown>
  if (typeof x.from !== 'string' || typeof x.to !== 'string' || !IATA.test(x.from) || !IATA.test(x.to) || x.from === x.to) return false
  if (typeof x.depart !== 'string' || !DATE.test(x.depart)) return false
  if (x.return !== undefined && (typeof x.return !== 'string' || !DATE.test(x.return) || x.return < x.depart)) return false
  return true
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  if (!TOKEN) return json({ error: 'not_configured' }, 503)

  const user = await getUser(req)
  if (!user) return json({ error: 'unauthorized' }, 401)

  let body: { query?: unknown; currency?: string; locale?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'bad_request' }, 400)
  }
  if (!valid(body.query)) return json({ error: 'invalid_query' }, 400)
  const q = body.query
  const currency = CURRENCIES.has(String(body.currency).toLowerCase()) ? String(body.currency).toLowerCase() : 'usd'
  const market = MARKET[body.locale ?? 'en'] ?? 'us'

  if (!(await underCap(user.id, 'search', CAP))) return json({ error: 'daily_limit' }, 429)

  const params = new URLSearchParams({
    origin: q.from,
    destination: q.to,
    departure_at: q.depart,
    one_way: q.return ? 'false' : 'true',
    direct: 'false',
    currency,
    market,
    sorting: 'price',
    limit: '30',
    page: '1',
  })
  if (q.return) params.set('return_at', q.return)

  try {
    const res = await fetch(`${ENDPOINT}?${params}`, { headers: { 'X-Access-Token': TOKEN, 'Accept-Encoding': 'gzip, deflate' } })
    if (!res.ok) {
      console.error('travelpayouts error', res.status, await res.text())
      return json({ error: 'upstream_error' }, 502)
    }
    const data = (await res.json()) as { success?: boolean; data?: unknown[] }
    await bumpUsage(user.id, 'search')
    // 특정 날짜와 일치하는 결과만 (API 는 월 단위 날짜도 허용하므로 방어적으로 필터)
    const offers = (Array.isArray(data.data) ? data.data : []).filter((o) => {
      const r = o as { departure_at?: string; return_at?: string }
      return typeof r.departure_at === 'string' && r.departure_at.startsWith(q.depart) && (!q.return || (typeof r.return_at === 'string' && r.return_at.startsWith(q.return)))
    })
    return json({ offers, currency: currency.toUpperCase(), source: 'travelpayouts' })
  } catch (e) {
    console.error('search-flights failed', e)
    return json({ error: 'search_failed' }, 502)
  }
})
