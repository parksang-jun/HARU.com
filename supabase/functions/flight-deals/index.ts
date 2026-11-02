// Edge Function: 비즈니스석 특가·땡처리 — Travelpayouts `get_latest_prices` (trip_class=1, 목적지 생략 = 출발지의 전 노선)
// 이번 달 + 다음 달 출발분을 받아 앱에서 출발 45일 이내·할인율(노선 거리 기반 추정 정가 대비)로 정렬
// 비밀값: TRAVELPAYOUTS_TOKEN, SEARCH_DAILY_CAP
import { bumpUsage, getUser, underCap } from '../_shared/auth.ts'
import { corsHeaders, json } from '../_shared/cors.ts'

const TOKEN = Deno.env.get('TRAVELPAYOUTS_TOKEN') ?? ''
const CAP = Number(Deno.env.get('SEARCH_DAILY_CAP') ?? '60')
const ENDPOINT = 'https://api.travelpayouts.com/aviasales/v3/get_latest_prices'
const CURRENCIES = new Set(['krw', 'jpy', 'twd', 'usd', 'eur', 'hkd'])
const MARKET: Record<string, string> = { ko: 'kr', ja: 'jp', 'zh-TW': 'tw', en: 'us' }

function monthStart(offset: number): string {
  const d = new Date()
  d.setUTCDate(1)
  d.setUTCMonth(d.getUTCMonth() + offset)
  return d.toISOString().slice(0, 10)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  if (!TOKEN) return json({ error: 'not_configured' }, 503)

  const user = await getUser(req)
  if (!user) return json({ error: 'unauthorized' }, 401)

  let body: { from?: string; currency?: string; locale?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'bad_request' }, 400)
  }
  const from = String(body.from ?? '')
  if (!/^[A-Z]{3}$/.test(from)) return json({ error: 'invalid_origin' }, 400)
  const currency = CURRENCIES.has(String(body.currency).toLowerCase()) ? String(body.currency).toLowerCase() : 'usd'
  const market = MARKET[body.locale ?? 'en'] ?? 'us'

  if (!(await underCap(user.id, 'search', CAP))) return json({ error: 'daily_limit' }, 429)

  try {
    const results = await Promise.all(
      [0, 1].map(async (offset) => {
        const params = new URLSearchParams({
          origin: from,
          currency,
          market,
          trip_class: '1',
          period_type: 'month',
          beginning_of_period: monthStart(offset),
          sorting: 'price',
          limit: '1000',
          show_to_affiliates: 'true',
        })
        const res = await fetch(`${ENDPOINT}?${params}`, { headers: { 'X-Access-Token': TOKEN, 'Accept-Encoding': 'gzip, deflate' } })
        if (!res.ok) throw new Error(`travelpayouts ${res.status}`)
        const data = (await res.json()) as { data?: unknown[] }
        return Array.isArray(data.data) ? data.data : []
      }),
    )
    await bumpUsage(user.id, 'search')
    return json({ deals: results.flat(), currency: currency.toUpperCase(), source: 'travelpayouts' })
  } catch (e) {
    console.error('flight-deals failed', e)
    return json({ error: 'upstream_error' }, 502)
  }
})
