// Supabase 클라이언트 — 익명 로그인으로 가입 마찰 제거
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { ENV, hasSupabase } from './env'

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient | null {
  if (!hasSupabase) return null
  if (!client) {
    client = createClient(ENV.supabaseUrl, ENV.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  }
  return client
}

/** 세션이 없으면 익명 로그인. 반환: user id 또는 null(미설정) */
export async function ensureSession(): Promise<string | null> {
  const sb = getSupabase()
  if (!sb) return null
  const { data } = await sb.auth.getSession()
  if (data.session?.user) return data.session.user.id
  const { data: anon, error } = await sb.auth.signInAnonymously()
  if (error || !anon.user) {
    console.warn('[auth] anonymous sign-in failed', error?.message)
    return null
  }
  return anon.user.id
}

/** 현재 사용자가 관리자(profiles.role = 'admin')인지 */
export async function isAdmin(): Promise<boolean> {
  const sb = getSupabase()
  if (!sb) return false
  const { data: session } = await sb.auth.getSession()
  const uid = session.session?.user.id
  if (!uid) return false
  const { data } = await sb.from('profiles').select('role').eq('id', uid).maybeSingle()
  return data?.role === 'admin'
}
