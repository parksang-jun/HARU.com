// Edge Function: 여행 파라미터 → 구조화된 일정 JSON (Anthropic tool_use 로 스키마 강제)
import { AnthropicError, callMessages, toolInput, type ToolDef } from '../_shared/anthropic.ts'
import { bumpUsage, getUser, underCap } from '../_shared/auth.ts'
import { corsHeaders, json } from '../_shared/cors.ts'

const MODEL = Deno.env.get('ANTHROPIC_MODEL_ITINERARY') ?? 'claude-sonnet-5-5'
const CAP = Number(Deno.env.get('ITINERARY_DAILY_CAP') ?? '3')

const CATEGORIES = ['sight', 'nature', 'food', 'cafe', 'shopping', 'activity', 'nightlife', 'wellness', 'transport', 'stay']
const PARTNERS = ['klook', 'trip', 'agoda', 'booking', 'expedia', 'getyourguide', 'creatrip', 'trazy', 'nol']

interface TripParams {
  cities: string[]
  startDate: string
  endDate: string
  travelers: string
  interests: string[]
  budget: string
  pace: string
  notes?: string
  locale: string
}

const LOCALE_NAME: Record<string, string> = { en: 'English', ja: 'Japanese', 'zh-TW': 'Traditional Chinese (Taiwan)', ko: 'Korean' }

/** 클라이언트 카탈로그에서 온 여행지 정보 (검증 후 사용) */
interface DestinationCtx {
  id: string
  name: string
  nameKo: string
  country: string
  currency: string
  lat: number
  lng: number
}

const ID_RE = /^[a-z]{2,24}$/

function validDestinations(raw: unknown, cities: string[]): DestinationCtx[] | null {
  if (!Array.isArray(raw)) return null
  const out: DestinationCtx[] = []
  for (const id of cities) {
    const d = raw.find((x) => x && typeof x === 'object' && (x as DestinationCtx).id === id) as DestinationCtx | undefined
    if (!d) return null
    const ok =
      typeof d.name === 'string' && d.name.length <= 60 &&
      typeof d.nameKo === 'string' && d.nameKo.length <= 60 &&
      /^[A-Z]{2}$/.test(d.country) && /^[A-Z]{3}$/.test(d.currency) &&
      Number.isFinite(d.lat) && Math.abs(d.lat) <= 90 && Number.isFinite(d.lng) && Math.abs(d.lng) <= 180
    if (!ok) return null
    out.push({ id, name: d.name.replace(/[\n\r]/g, ' '), nameKo: d.nameKo.replace(/[\n\r]/g, ' '), country: d.country, currency: d.currency, lat: d.lat, lng: d.lng })
  }
  return out
}

function buildTool(cities: string[]): ToolDef {
  return {
  name: 'submit_itinerary',
  description: 'Submit the finished day-by-day itinerary.',
  input_schema: {
    type: 'object',
    additionalProperties: false,
    required: ['title', 'summary', 'days'],
    properties: {
      title: { type: 'string', description: 'Short trip title in the user language' },
      summary: { type: 'string', description: '1-2 sentences in the user language' },
      days: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['day', 'date', 'city', 'theme', 'stops'],
          properties: {
            day: { type: 'integer', minimum: 1 },
            date: { type: 'string', description: 'YYYY-MM-DD' },
            city: { type: 'string', enum: cities },
            theme: { type: 'string', description: 'Theme of the day in the user language' },
            stops: {
              type: 'array',
              minItems: 3,
              maxItems: 7,
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['time', 'durationMin', 'category', 'name', 'area', 'lat', 'lng', 'tip', 'transitHint'],
                properties: {
                  time: { type: 'string', description: 'HH:MM 24h' },
                  durationMin: { type: 'integer', minimum: 15, maximum: 480 },
                  category: { type: 'string', enum: CATEGORIES },
                  name: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['ko', 'en'],
                    properties: { ko: { type: 'string' }, en: { type: 'string' }, ja: { type: 'string' }, zh: { type: 'string' } },
                  },
                  area: { type: 'string', description: 'Neighborhood/district in English' },
                  lat: { type: 'number' },
                  lng: { type: 'number' },
                  tip: { type: 'string', description: 'One practical tip in the user language' },
                  transitHint: { type: 'string', description: 'How to get there (station/exit/bus) in the user language' },
                  estCost: { type: 'number', minimum: 0, description: 'Per-person cost in the local currency of that day’s city' },
                  currency: { type: 'string', description: 'ISO 4217 code of estCost (local currency)' },
                  booking: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['partner', 'query'],
                    properties: { partner: { type: 'string', enum: PARTNERS }, query: { type: 'string', description: 'English search query for the partner site' } },
                  },
                  reserve: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['provider', 'query'],
                    properties: { provider: { type: 'string', enum: ['catchtable', 'naver', 'google'] }, query: { type: 'string', description: 'Restaurant name for search (Korean name for catchtable/naver)' } },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  }
}

function systemPrompt(lang: string): string {
  return [
    'You are a travel planner for domestic and international trips (Korea and worldwide). Build realistic day-by-day itineraries.',
    `Write all free-text fields (title, summary, theme, tip, transitHint) in ${lang}. Always include name.ko (Korean) and name.en (English, or the official local name in Latin script); add name.ja and name.zh when known.`,
    'Rules:',
    '- Use only real, well-known, currently operating places with accurate WGS84 coordinates within 150 km of the given city centers. Do not invent venues.',
    '- Cluster each day geographically; order stops by time; 3–7 stops per day; include meals. Respect travelers, interests, budget tier and pace. Plan a hotel check-in (category stay) on the first day in each city.',
    '- For ticketed sights, activities, tours, hotels and transport passes add booking: partner klook for activities/tours/passes, agoda for hotels/stays, getyourguide for guided tours. creatrip, trazy and nol are only for places in South Korea. Omit booking for free places and street food.',
    '- For restaurants that accept reservations add reserve: in South Korea provider catchtable (or naver) with the Korean name; elsewhere provider google with the restaurant name.',
    '- estCost is per person in the local currency of that city (given below) with currency set to that ISO code; omit when free.',
    '- Keep tips concrete (closing days, queues, cash, best time). Never include opening hours you are not sure about.',
    '- No content that targets minors; no alcohol-focused tips for family trips.',
  ].join('\n')
}

function userPrompt(p: TripParams, dests: DestinationCtx[]): string {
  return [
    `Cities (in travel order; use the id in the city field): ${dests.map((d) => `${d.id} = ${d.name} (${d.country}, center ${d.lat.toFixed(3)},${d.lng.toFixed(3)}, currency ${d.currency})`).join('; ')}`,
    `Dates: ${p.startDate} to ${p.endDate} (inclusive). Assign a date to every day and split days across the cities in order.`,
    `Travelers: ${p.travelers}; Interests: ${p.interests.join(', ') || 'general'}; Budget: ${p.budget}; Pace: ${p.pace}`,
    p.notes ? `Special requests: ${p.notes.slice(0, 500)}` : '',
    'Submit the itinerary with the submit_itinerary tool.',
  ]
    .filter(Boolean)
    .join('\n')
}

function validParams(p: unknown): p is TripParams {
  if (!p || typeof p !== 'object') return false
  const x = p as Record<string, unknown>
  if (!Array.isArray(x.cities) || x.cities.length === 0 || x.cities.length > 5 || x.cities.some((c) => !ID_RE.test(String(c)))) return false
  if (typeof x.startDate !== 'string' || typeof x.endDate !== 'string') return false
  const days = (new Date(`${x.endDate}T00:00:00Z`).getTime() - new Date(`${x.startDate}T00:00:00Z`).getTime()) / 86_400_000 + 1
  if (!Number.isFinite(days) || days < 1 || days > 14) return false
  return true
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const user = await getUser(req)
  if (!user) return json({ error: 'unauthorized' }, 401)

  let params: unknown
  let rawDest: unknown
  try {
    const body = await req.json()
    params = body?.params
    rawDest = body?.destinations
  } catch {
    return json({ error: 'bad_request' }, 400)
  }
  if (!validParams(params)) return json({ error: 'invalid_params' }, 400)
  const dests = validDestinations(rawDest, params.cities)
  if (!dests) return json({ error: 'invalid_destinations' }, 400)
  const TOOL = buildTool(params.cities)

  if (!(await underCap(user.id, 'itinerary', CAP))) return json({ error: 'daily_limit' }, 429)

  const lang = LOCALE_NAME[params.locale] ?? 'English'
  try {
    const blocks = await callMessages({
      model: MODEL,
      max_tokens: 8000,
      temperature: 0.4,
      system: systemPrompt(lang),
      messages: [{ role: 'user', content: userPrompt(params, dests) }],
      tools: [TOOL],
      tool_choice: { type: 'tool', name: TOOL.name },
    })
    const itinerary = toolInput(blocks, TOOL.name) as { days?: unknown[] } | null
    if (!itinerary || !Array.isArray(itinerary.days) || itinerary.days.length === 0) return json({ error: 'empty_result' }, 502)
    await bumpUsage(user.id, 'itinerary')
    return json({ itinerary, model: MODEL })
  } catch (e) {
    const status = e instanceof AnthropicError ? (e.status === 429 ? 503 : 502) : 500
    console.error('generate-itinerary failed', e)
    return json({ error: 'generation_failed' }, status)
  }
})
