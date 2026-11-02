// AI 호출 — Supabase Edge Function 경유(키는 서버에만) 또는 목업
import { getDestination } from './destinations'
import { ENV } from './env'
import { normalizeItinerary, type Itinerary, type TripParams } from './itinerary'
import { buildMockItinerary } from './mock/itinerary'
import { mockChatAnswer } from './mock/chat'
import type { ChatMessage } from './repo'
import { ensureSession, getSupabase } from './supabase'

export class AiError extends Error {
  code: 'limit' | 'unavailable' | 'invalid'
  constructor(code: 'limit' | 'unavailable' | 'invalid', message?: string) {
    super(message ?? code)
    this.code = code
  }
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

/** Edge Function 에 넘기는 여행지 정보 (서버는 카탈로그를 갖고 있지 않음) */
export function destinationContext(cities: string[]) {
  return cities
    .map((id) => getDestination(id))
    .filter((d) => d !== undefined)
    .map((d) => ({ id: d.id, name: d.name.en, nameKo: d.name.ko, country: d.country, currency: d.currency, lat: d.lat, lng: d.lng }))
}

export async function generateItinerary(params: TripParams): Promise<Itinerary> {
  if (ENV.mockAi) {
    await delay(600)
    const it = normalizeItinerary(buildMockItinerary(params), params)
    if (!it) throw new AiError('invalid')
    return it
  }
  const sb = getSupabase()
  if (!sb) throw new AiError('unavailable')
  await ensureSession()
  const { data, error } = await sb.functions.invoke('generate-itinerary', { body: { params, destinations: destinationContext(params.cities) } })
  if (error) throw new AiError(await classify(error), error.message)
  const it = normalizeItinerary(data?.itinerary, params)
  if (!it) throw new AiError('invalid')
  return it
}

export async function askConcierge(tripParams: TripParams | null, history: ChatMessage[], question: string, locale: string): Promise<string> {
  if (ENV.mockAi) {
    await delay(400)
    return mockChatAnswer(question)
  }
  const sb = getSupabase()
  if (!sb) throw new AiError('unavailable')
  await ensureSession()
  const messages = history.slice(-12).map((m) => ({ role: m.role, content: m.content }))
  const { data, error } = await sb.functions.invoke('concierge-chat', {
    body: { tripParams, destinations: tripParams ? destinationContext(tripParams.cities) : [], messages, question, locale },
  })
  if (error) throw new AiError(await classify(error), error.message)
  const answer = typeof data?.answer === 'string' ? data.answer.trim() : ''
  if (!answer) throw new AiError('invalid')
  return answer
}

/** Edge Function 오류를 사용자 메시지 코드로 분류 (429 → limit) */
async function classify(err: unknown): Promise<'limit' | 'unavailable'> {
  const ctx = (err as { context?: Response }).context
  if (ctx && typeof ctx.status === 'number' && ctx.status === 429) return 'limit'
  return 'unavailable'
}
