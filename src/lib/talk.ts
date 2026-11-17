// 여행자 톡 — 같은 여행지를 가는 여행자끼리 현지 소식을 나누는 짧은 글 게시판.
// 실서비스: Supabase talk_posts (0003_travel_talk.sql). 목업: 예시 글 + 내 글은 내 기기에만 저장.
import { ENV } from './env'
import { loadJson, loadPref, saveJson, savePref } from './storage'
import { ensureSession, getSupabase } from './supabase'

export type TalkTag = 'weather' | 'food' | 'transit' | 'tip' | 'question'
export const TALK_TAGS: TalkTag[] = ['weather', 'food', 'transit', 'tip', 'question']
export const TALK_MAX = 300

export interface TalkPost {
  id: string
  city: string
  tag: TalkTag
  body: string
  nickname: string
  createdAt: string
  mine?: boolean
  /** 화면 확인용 예시 글 (실제 여행자가 쓴 글이 아님) */
  sample?: boolean
}

export type TalkError = 'empty' | 'tooLong' | 'link' | 'contact' | 'rate' | 'failed'

/** 글 검사: 링크와 연락처(전화번호·메신저 아이디 유도)는 받지 않는다 — 광고·사기 글을 줄이기 위해서 */
export function checkBody(text: string): { ok: true; body: string } | { ok: false; error: TalkError } {
  const body = text.replace(/\s+/g, ' ').trim()
  if (body.length < 2) return { ok: false, error: 'empty' }
  if (body.length > TALK_MAX) return { ok: false, error: 'tooLong' }
  if (/https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|kr|io|me|co|org|xyz|link|ly)\b/i.test(body)) return { ok: false, error: 'link' }
  if (/(\d[\s-]?){9,}|카톡\s*(아이디|id)|오픈\s*채팅|텔레그램|telegram|whatsapp|line\s*id|wechat/i.test(body)) return { ok: false, error: 'contact' }
  return { ok: true, body }
}

const NICK_KEY = 'talk:nick'
/** 익명 별명: 처음 한 번 만들어 기기에 저장 */
export async function myNickname(): Promise<string> {
  const saved = await loadPref(NICK_KEY)
  if (saved && /^.{2,20}$/.test(saved)) return saved
  const nick = `Traveler${Math.floor(1000 + Math.random() * 9000)}`
  await savePref(NICK_KEY, nick)
  return nick
}

const HIDDEN_KEY = 'talk:hidden'
export const loadHidden = () => loadJson<string[]>(HIDDEN_KEY, [])

/** 예시 글 (목업 전용): 어떤 글이 오가는지 보여 주기 위한 것 */
const SAMPLES: Record<string, [TalkTag, string][]> = {
  ko: [['weather', '아침저녁으로 생각보다 쌀쌀해요. 얇은 겉옷 하나 챙기세요.'], ['food', '유명한 집은 11시 반 전에 가면 줄이 짧아요.'], ['transit', '공항에서 시내까지는 전철이 제일 빨랐어요.'], ['tip', '현금만 받는 가게가 꽤 있어서 조금 환전해 가세요.'], ['question', '주말 야시장은 몇 시쯤 가는 게 좋을까요?']],
  en: [['weather', 'Mornings and evenings are cooler than expected. Bring a light jacket.'], ['food', 'The famous places have short lines if you arrive before 11:30.'], ['transit', 'The train was the fastest way from the airport to downtown.'], ['tip', 'Quite a few shops are cash only, so carry some local currency.'], ['question', 'What time is best for the weekend night market?']],
  ja: [['weather', '朝晩は思ったより冷えます。薄手の上着があると安心です。'], ['food', '有名店は11時半前に行くと並びが短いです。'], ['transit', '空港から市内までは電車が一番早かったです。'], ['tip', '現金のみの店が意外と多いので少し両替しておくと便利です。'], ['question', '週末のナイトマーケットは何時ごろがおすすめですか？']],
  'zh-TW': [['weather', '早晚比想像中涼，帶件薄外套比較好。'], ['food', '名店在11點半前到的話排隊比較短。'], ['transit', '從機場到市區搭電車最快。'], ['tip', '不少店家只收現金，建議先換一些當地貨幣。'], ['question', '週末夜市大概幾點去比較好？']],
}

function samplePosts(city: string, locale: string, now: number): TalkPost[] {
  const list = SAMPLES[locale] ?? SAMPLES.en
  return list.map(([tag, body], i) => ({ id: `sample-${city}-${i}`, city, tag, body, nickname: `Traveler${1200 + i * 731}`, createdAt: new Date(now - (i + 1) * 3 * 3600_000).toISOString(), sample: true }))
}

const localKey = (city: string) => `talk:${city}`

export async function listPosts(city: string, locale: string, now: number = Date.now()): Promise<TalkPost[]> {
  const hidden = new Set(await loadHidden())
  let posts: TalkPost[]
  const sb = ENV.mockAi ? null : getSupabase()
  if (sb) {
    const uid = await ensureSession()
    const { data, error } = await sb.from('talk_posts').select('id, city, tag, body, nickname, created_at, user_id').eq('city', city).order('created_at', { ascending: false }).limit(100)
    if (error) throw error
    posts = (data ?? []).map((r) => ({ id: r.id as string, city: r.city as string, tag: r.tag as TalkTag, body: r.body as string, nickname: r.nickname as string, createdAt: r.created_at as string, mine: r.user_id === uid }))
  } else {
    const mine = await loadJson<TalkPost[]>(localKey(city), [])
    posts = [...mine, ...samplePosts(city, locale, now)]
  }
  return posts.filter((p) => !hidden.has(p.id)).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

export async function addPost(city: string, tag: TalkTag, text: string): Promise<{ ok: true; post: TalkPost } | { ok: false; error: TalkError }> {
  const checked = checkBody(text)
  if (!checked.ok) return checked
  const nickname = await myNickname()
  const sb = ENV.mockAi ? null : getSupabase()
  if (sb) {
    await ensureSession()
    const { data, error } = await sb.from('talk_posts').insert({ city, tag, body: checked.body, nickname }).select('id, created_at').single()
    if (error || !data) return { ok: false, error: /row-level security/i.test(error?.message ?? '') ? 'rate' : 'failed' }
    return { ok: true, post: { id: data.id as string, city, tag, body: checked.body, nickname, createdAt: data.created_at as string, mine: true } }
  }
  const mine = await loadJson<TalkPost[]>(localKey(city), [])
  // 도배 방지: 1분에 3건까지
  if (mine.filter((p) => Date.now() - Date.parse(p.createdAt) < 60_000).length >= 3) return { ok: false, error: 'rate' }
  const post: TalkPost = { id: `local-${Date.now().toString(36)}`, city, tag, body: checked.body, nickname, createdAt: new Date().toISOString(), mine: true }
  await saveJson(localKey(city), [post, ...mine].slice(0, 100))
  return { ok: true, post }
}

export async function deletePost(post: TalkPost): Promise<void> {
  const sb = ENV.mockAi ? null : getSupabase()
  if (sb) await sb.from('talk_posts').delete().eq('id', post.id)
  else await saveJson(localKey(post.city), (await loadJson<TalkPost[]>(localKey(post.city), [])).filter((p) => p.id !== post.id))
}

/** 신고: 내 화면에서 바로 숨기고, 실서비스에서는 서버에도 접수한다(3명이 신고하면 자동 숨김) */
export async function reportPost(post: TalkPost): Promise<void> {
  const hidden = await loadHidden()
  if (!hidden.includes(post.id)) await saveJson(HIDDEN_KEY, [...hidden, post.id].slice(-500))
  const sb = ENV.mockAi || post.sample ? null : getSupabase()
  if (sb) {
    await ensureSession()
    await sb.from('talk_reports').insert({ post_id: post.id })
  }
}

/** "3시간 전" 같은 표시용 값 */
export function ago(iso: string, now: number = Date.now()): { unit: 'now' | 'min' | 'hour' | 'day'; n: number } {
  const min = Math.max(0, Math.floor((now - Date.parse(iso)) / 60_000))
  if (min < 1) return { unit: 'now', n: 0 }
  if (min < 60) return { unit: 'min', n: min }
  if (min < 60 * 24) return { unit: 'hour', n: Math.floor(min / 60) }
  return { unit: 'day', n: Math.floor(min / (60 * 24)) }
}
