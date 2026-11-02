// 요청 사용자 검증 + 일일 사용량 제한 (service role 로 usage_daily 접근)
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'

export interface AuthedUser {
  id: string
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

export function serviceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
}

/** Authorization: Bearer <user jwt> 검증. 실패 시 null */
export async function getUser(req: Request): Promise<AuthedUser | null> {
  const auth = req.headers.get('Authorization') ?? ''
  const token = auth.replace(/^Bearer\s+/i, '')
  if (!token) return null
  const sb = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } })
  const { data, error } = await sb.auth.getUser(token)
  if (error || !data.user) return null
  return { id: data.user.id }
}

/** 오늘 사용량이 cap 이상이면 false */
export type UsageKind = 'itinerary' | 'chat' | 'search'

export async function underCap(userId: string, kind: UsageKind, cap: number): Promise<boolean> {
  const sb = serviceClient()
  const { data } = await sb.from('usage_daily').select('itineraries, chats, searches').eq('user_id', userId).eq('day', new Date().toISOString().slice(0, 10)).maybeSingle()
  const used = kind === 'itinerary' ? (data?.itineraries ?? 0) : kind === 'chat' ? (data?.chats ?? 0) : (data?.searches ?? 0)
  return used < cap
}

export async function bumpUsage(userId: string, kind: UsageKind): Promise<void> {
  const sb = serviceClient()
  await sb.rpc('increment_usage', { p_user_id: userId, p_kind: kind })
}
