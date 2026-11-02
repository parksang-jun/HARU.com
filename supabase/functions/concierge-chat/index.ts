// Edge Function: 컨시어지 Q&A (여행 컨텍스트 포함, 일일 한도)
import { AnthropicError, callMessages, textOf, type AnthropicMessage } from '../_shared/anthropic.ts'
import { bumpUsage, getUser, underCap } from '../_shared/auth.ts'
import { corsHeaders, json } from '../_shared/cors.ts'

const MODEL = Deno.env.get('ANTHROPIC_MODEL_CHAT') ?? 'claude-haiku-5-5'
const CAP = Number(Deno.env.get('CHAT_DAILY_CAP') ?? '40')

const LOCALE_NAME: Record<string, string> = { en: 'English', ja: 'Japanese', 'zh-TW': 'Traditional Chinese (Taiwan)', ko: 'Korean' }

interface Body {
  tripParams?: { cities?: string[]; startDate?: string; endDate?: string; travelers?: string; interests?: string[]; budget?: string } | null
  destinations?: { name?: string; country?: string }[]
  messages?: { role: 'user' | 'assistant'; content: string }[]
  question?: string
  locale?: string
}

function systemPrompt(lang: string, trip: Body['tripParams'], dests: Body['destinations']): string {
  const places = (dests ?? [])
    .filter((d) => typeof d?.name === 'string')
    .map((d) => `${String(d.name).slice(0, 60)} (${String(d.country ?? '').slice(0, 2)})`)
    .join(', ')
  const ctx = trip
    ? `The traveler's trip: ${places || trip.cities?.join(', ')}, ${trip.startDate} to ${trip.endDate}, ${trip.travelers}, interests ${trip.interests?.join(', ')}, budget ${trip.budget}.`
    : 'No trip context is available.'
  return [
    'You are Haru, a friendly, precise travel concierge for trips in Korea and around the world.',
    `Answer in ${lang}. Keep answers under 120 words unless the user asks for detail. Use short paragraphs or bullets.`,
    ctx,
    'Cover local transport, airports and transfers, food and ordering, etiquette, shopping and tax refunds, money and cards, connectivity, safety, and useful local phrases with romanization. For South Korea include specifics like T-money, KTX and Kakao T.',
    'For flights and hotels, you may point to the app’s Book tab (Flights / Hotels) where the user can compare partner offers.',
    'Never state exact prices, opening hours or availability as certain; say "around" or advise to check. Do not give medical, legal or visa advice beyond pointing to official government sources.',
    'Do not include advertisements or recommend specific booking sites unless asked.',
  ].join('\n')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const user = await getUser(req)
  if (!user) return json({ error: 'unauthorized' }, 401)

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return json({ error: 'bad_request' }, 400)
  }
  const question = (body.question ?? '').trim().slice(0, 500)
  if (!question) return json({ error: 'empty_question' }, 400)

  if (!(await underCap(user.id, 'chat', CAP))) return json({ error: 'daily_limit' }, 429)

  const history: AnthropicMessage[] = (body.messages ?? [])
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 1500) }))
  // 연속 같은 role 방지: 마지막이 user 면 제거 후 질문으로 대체
  if (history.length && history[history.length - 1].role === 'user') history.pop()

  try {
    const blocks = await callMessages({
      model: MODEL,
      max_tokens: 600,
      temperature: 0.5,
      system: systemPrompt(LOCALE_NAME[body.locale ?? 'en'] ?? 'English', body.tripParams ?? null, body.destinations ?? []),
      messages: [...history, { role: 'user', content: question }],
    })
    const answer = textOf(blocks)
    if (!answer) return json({ error: 'empty_result' }, 502)
    await bumpUsage(user.id, 'chat')
    return json({ answer, model: MODEL })
  } catch (e) {
    const status = e instanceof AnthropicError ? (e.status === 429 ? 503 : 502) : 500
    console.error('concierge-chat failed', e)
    return json({ error: 'chat_failed' }, status)
  }
})
