// Edge Function: 호텔 검색 — Agoda Affiliate Lite API (도시 검색, lt_v1)
// 응답의 landingURL 에 제휴 추적이 포함되어 있음 → 앱은 그대로 연결
// 비밀값: AGODA_SITE_ID, AGODA_API_KEY (필수), AGODA_API_URL (선택: 계정 매니저에게 받은 HTTPS 엔드포인트), SEARCH_DAILY_CAP
import { bumpUsage, getUser, underCap } from '../_shared/auth.ts'
import { corsHeaders, json } from '../_shared/cors.ts'
import { AGODA_CITY_IDS } from '../_shared/agoda-cities.ts'

const SITE_ID = Deno.env.get('AGODA_SITE_ID') ?? ''
const API_KEY = Deno.env.get('AGODA_API_KEY') ?? ''
const API_URL = Deno.env.get('AGODA_API_URL') ?? 'http://affiliateapi7643.agoda.com/affiliateservice/lt_v1'
const CAP = Number(Deno.env.get('SEARCH_DAILY_CAP') ?? '60')

const DATE = /^\d{4}-\d{2}-\d{2}$/
const CURRENCIES = new Set(['KRW', 'JPY', 'TWD', 'USD', 'EUR', 'HKD'])
const LANG: Record<string, string> = { ko: 'ko-kr', ja: 'ja-jp', 'zh-TW': 'zh-tw', en: 'en-us' }

interface Query {
  destId: string
  checkIn: string
  checkOut: string
  adults: number
  rooms: number
}

function valid(q: unknown): q is Query {
  if (!q || typeof q !== 'object') return false
  const x = q as Record<string, unknown>
  if (typeof x.destId !== 'string' || !/^[a-z]{2,24}$/.test(x.destId)) return false
  if (typeof x.checkIn !== 'string' || typeof x.checkOut !== 'string' || !DATE.test(x.checkIn) || !DATE.test(x.checkOut) || x.checkOut <= x.checkIn) return false
  const a = Number(x.adults)
  const r = Number(x.rooms)
  return Number.isInteger(a) && a >= 1 && a <= 16 && Number.isInteger(r) && r >= 1 && r <= 8
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  if (!SITE_ID || !API_KEY) return json({ error: 'not_configured' }, 503)

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
  const cityId = AGODA_CITY_IDS[q.destId]
  if (!cityId) return json({ error: 'unsupported_city' }, 404) // 앱은 파트너 검색 링크로 대체

  if (!(await underCap(user.id, 'search', CAP))) return json({ error: 'daily_limit' }, 429)

  const currency = CURRENCIES.has(String(body.currency)) ? String(body.currency) : 'USD'
  const payload = {
    criteria: {
      additional: {
        currency,
        discountOnly: false,
        language: LANG[body.locale ?? 'en'] ?? 'en-us',
        maxResult: 20,
        minimumReviewScore: 0,
        minimumStarRating: 0,
        // 객실당 인원 기준 — 여러 객실이면 1객실 기준 인원으로 요청
        occupancy: { numberOfAdult: Math.max(1, Math.ceil(q.adults / q.rooms)), numberOfChildren: 0 },
        sortBy: 'Recommended',
      },
      checkInDate: q.checkIn,
      checkOutDate: q.checkOut,
      cityId,
    },
  }

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept-Encoding': 'gzip,deflate', Authorization: `${SITE_ID}:${API_KEY}` },
      body: JSON.stringify(payload),
    })
    const data = (await res.json().catch(() => ({}))) as { results?: unknown[]; error?: { id?: number; message?: string } }
    if (!res.ok || data.error) {
      console.error('agoda error', res.status, data.error)
      return json({ error: 'upstream_error' }, 502)
    }
    await bumpUsage(user.id, 'search')
    return json({ hotels: Array.isArray(data.results) ? data.results : [], source: 'agoda' })
  } catch (e) {
    console.error('search-hotels failed', e)
    return json({ error: 'search_failed' }, 502)
  }
})
