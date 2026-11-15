// 샘플(목업) 모드에서 "추가 요청"을 키워드로 읽어 일정에 반영한다.
// 실제 서비스에서는 AI 가 문장 전체를 이해해 반영하고(Edge Function generate-itinerary), 여기는 키 없이 시험할 때만 쓴다.
import type { Interest, RequestNote, StopCategory } from '../itinerary'
import type { MockPlace } from './places'

type Lang = 'ko' | 'en' | 'ja' | 'zh'
const langOf = (locale: string): Lang => (locale === 'ko' ? 'ko' : locale === 'ja' ? 'ja' : locale === 'zh-TW' ? 'zh' : 'en')

/** 관심사 → 일정에서 우선할 장소 종류 */
export const INTEREST_CATEGORIES: Record<Interest, StopCategory[]> = {
  food: ['food'],
  market: ['food', 'shopping'],
  cafe: ['cafe'],
  shopping: ['shopping'],
  history: ['sight'],
  art: ['sight'],
  architecture: ['sight'],
  photo: ['sight', 'nature'],
  nature: ['nature'],
  hiking: ['nature', 'activity'],
  beach: ['nature'],
  nightview: ['sight', 'nightlife'],
  activity: ['activity'],
  themepark: ['activity'],
  festival: ['activity'],
  kids: ['activity', 'nature'],
  kpop: ['activity', 'shopping'],
  anime: ['shopping', 'activity'],
  nightlife: ['nightlife'],
  wellness: ['wellness'],
}

const CAT_WORDS: [StopCategory, RegExp][] = [
  ['shopping', /쇼핑|shopping|買い物|ショッピング|購物|逛街/i],
  ['nightlife', /술집|술|클럽|나이트|야시장|\bbars?\b|club|nightlife|drink|お酒|バー|酒吧|夜生活|夜店/i],
  ['cafe', /카페|디저트|caf[eé]|coffee|dessert|カフェ|スイーツ|咖啡|甜點/i],
  ['wellness', /온천|스파|마사지|찜질|onsen|\bspa\b|massage|hot spring|温泉|スパ|マッサージ|溫泉|按摩/i],
  ['activity', /체험|액티비티|테마파크|놀이공원|activity|activities|theme park|体験|テーマパーク|體驗|樂園/i],
  ['nature', /자연|공원|바다|해변|등산|하이킹|nature|park|beach|hik(e|ing)|自然|公園|ビーチ|海邊|海灘|爬山|健行/i],
  ['food', /맛집|음식|먹거리|식당|food|eat|restaurant|グルメ|料理|美食|餐廳/i],
  ['sight', /명소|관광지|유적|박물관|미술관|궁궐|사원|sight|museum|temple|palace|landmark|観光|博物館|美術館|景點/i],
]
const NEG = /빼|제외|싫|말고|없이|안\s?(가|넣|해)|\bno\b|\bnot\b|without|skip|avoid|なし|抜き|不要|いらない|不想|不去|不用/i

const RULES: [string, RegExp][] = [
  ['veg', /채식|비건|베지|vegetarian|vegan|ベジ|ヴィーガン|ビーガン|菜食|素食|純素/i],
  ['kids', /아이|아기|유아|어린이|유모차|초등|\bkids?\b|child|toddler|baby|stroller|子供|子ども|赤ちゃん|ベビーカー|小孩|孩子|嬰兒/i],
  ['easy', /부모님|어르신|노약자|많이\s?안\s?걷|걷기\s?힘|무릎|휠체어|거동|elderly|senior|wheelchair|less walking|not much walking|mobility|高齢|車椅子|歩くのが|長輩|輪椅|少走/i],
  ['late', /늦게|늦잠|느지막|오후부터|late start|sleep in|start late|遅め|朝はゆっくり|晚起|晚點出門/i],
  ['early', /일찍|새벽|early|早起|早め|早朝/i],
  ['slow', /여유|천천히|느긋|쉬엄|relax|slow|のんびり|ゆったり|悠閒|慢慢/i],
]

const CAT_NAME: Record<StopCategory, Record<Lang, string>> = {
  sight: { ko: '명소', en: 'sights', ja: '名所', zh: '景點' },
  nature: { ko: '자연', en: 'nature', ja: '自然', zh: '自然' },
  food: { ko: '맛집', en: 'food', ja: 'グルメ', zh: '美食' },
  cafe: { ko: '카페', en: 'cafés', ja: 'カフェ', zh: '咖啡廳' },
  shopping: { ko: '쇼핑', en: 'shopping', ja: 'ショッピング', zh: '購物' },
  activity: { ko: '체험', en: 'activities', ja: '体験', zh: '體驗' },
  nightlife: { ko: '밤 일정', en: 'nightlife', ja: 'ナイトライフ', zh: '夜生活' },
  wellness: { ko: '온천·스파', en: 'spas', ja: '温泉・スパ', zh: '溫泉·SPA' },
  transport: { ko: '이동', en: 'transport', ja: '移動', zh: '交通' },
  stay: { ko: '숙소', en: 'stays', ja: '宿', zh: '住宿' },
}

const TEXT: Record<string, Record<Lang, string>> = {
  veg: { ko: '식사 장소마다 채식 메뉴 확인 안내를 넣었습니다', en: 'Added a "check vegetarian options" note to every meal stop', ja: '食事スポットごとにベジタリアン対応の確認メモを追加しました', zh: '每個用餐地點都加上了確認素食餐點的提醒' },
  kids: { ko: '밤 일정을 빼고 하루 방문지를 한 곳 줄였습니다', en: 'Removed nightlife and cut one stop per day', ja: '夜のスポットを外し、1日の訪問先を1つ減らしました', zh: '移除夜間行程，每天減少一個地點' },
  easy: { ko: '하루 방문지를 한 곳 줄여 걷는 양을 줄였습니다', en: 'Cut one stop per day to reduce walking', ja: '1日の訪問先を1つ減らし、歩く量を抑えました', zh: '每天減少一個地點，降低步行量' },
  slow: { ko: '하루 방문지를 한 곳 줄였습니다', en: 'Cut one stop per day', ja: '1日の訪問先を1つ減らしました', zh: '每天減少一個地點' },
  late: { ko: '매일 첫 일정을 11시로 늦췄습니다', en: 'Each day now starts at 11:00', ja: '毎日のスタートを11時にしました', zh: '每天第一個行程改為11點開始' },
  early: { ko: '매일 첫 일정을 8시로 당겼습니다', en: 'Each day now starts at 08:00', ja: '毎日のスタートを8時にしました', zh: '每天第一個行程提前到8點' },
  exclude: { ko: '{cat} 일정을 뺐습니다', en: 'Removed {cat} stops', ja: '{cat}の予定を外しました', zh: '已移除{cat}行程' },
  want: { ko: '{cat} 일정을 앞쪽에 먼저 넣었습니다', en: 'Put {cat} stops first', ja: '{cat}を優先して入れました', zh: '優先安排{cat}行程' },
  wantNone: { ko: '이 여행지 샘플에는 {cat} 장소가 없습니다', en: 'The sample data for this destination has no {cat} places', ja: 'この旅行先のサンプルには{cat}のスポットがありません', zh: '這個目的地的範例資料沒有{cat}地點' },
  place: { ko: '{place}을(를) 일정 첫머리에 넣었습니다', en: 'Put {place} at the start of the plan', ja: '{place}を日程の最初に入れました', zh: '已將{place}排在行程最前面' },
  unknown: { ko: '샘플 모드에서는 이해하지 못한 요청입니다. 실제 AI 일정에서는 문장 그대로 반영됩니다', en: 'Sample mode could not interpret this. The live AI planner reads the full sentence', ja: 'サンプルモードでは解釈できませんでした。実際のAIプランでは文章どおり反映されます', zh: '範例模式無法理解這項需求，實際的 AI 行程會依原文處理' },
}

export interface RequestPlan {
  notes: RequestNote[]
  exclude: Set<StopCategory>
  prefer: StopCategory[]
  /** 하루 방문지 수 조정 (음수) */
  perDelta: number
  start: 'normal' | 'late' | 'early'
  vegetarian: boolean
  /** 꼭 넣을 장소 (영문명) */
  mustPlaces: string[]
}

const names = (p: MockPlace) => [p.name.ko, p.name.en, p.name.ja, p.name.zh].filter((n): n is string => Boolean(n && n.length >= 2))

/** 추가 요청 문장을 조각으로 나눠 규칙에 맞춰 해석한다 */
export function parseRequests(notes: string | undefined, locale: string, pool: MockPlace[]): RequestPlan {
  const lang = langOf(locale)
  const plan: RequestPlan = { notes: [], exclude: new Set(), prefer: [], perDelta: 0, start: 'normal', vegetarian: false, mustPlaces: [] }
  if (!notes?.trim()) return plan
  const tx = (key: string, vars: Record<string, string> = {}) => TEXT[key][lang].replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? '')
  const segments = notes
    .split(/[\n,.;/!?、。，；！？]|그리고|\band\b|하고\s/i)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2)
    .slice(0, 8)
  const reduced = new Set<string>()

  for (const seg of segments) {
    const before = plan.notes.length
    const add = (handled: string, applied = true) => plan.notes.push({ request: seg, handled, applied })
    const lower = seg.toLowerCase()

    // 장소 이름이 직접 나오면 꼭 넣는다 (부정 표현이 없을 때)
    // 전체 이름이 먼저, 없으면 이름의 첫 단어(충분히 길 때)로 찾는다 — "롯데월드타워" ↔ "롯데월드타워 서울스카이"
    const usable = pool.filter((p) => p.category !== 'stay')
    const place =
      usable.find((p) => names(p).some((n) => lower.includes(n.toLowerCase()))) ??
      usable.find((p) => names(p).some((n) => {
        const head = n.split(/\s+/)[0].toLowerCase()
        return head.length >= (/[a-z]/.test(head) ? 6 : 3) && lower.includes(head)
      }))
    if (place && !NEG.test(seg)) {
      plan.mustPlaces.push(place.name.en)
      add(tx('place', { place: lang === 'ko' ? place.name.ko : lang === 'ja' ? (place.name.ja ?? place.name.en) : lang === 'zh' ? (place.name.zh ?? place.name.en) : place.name.en }))
      continue
    }
    for (const [id, re] of RULES) {
      if (!re.test(seg)) continue
      if (id === 'veg') plan.vegetarian = true
      if (id === 'kids') plan.exclude.add('nightlife')
      if (id === 'kids' || id === 'easy' || id === 'slow') reduced.add(id)
      if (id === 'late' || id === 'early') plan.start = id
      add(tx(id))
    }
    for (const [cat, re] of CAT_WORDS) {
      if (!re.test(seg)) continue
      if (NEG.test(seg)) {
        plan.exclude.add(cat)
        add(tx('exclude', { cat: CAT_NAME[cat][lang] }))
      } else if (plan.notes.length === before) {
        // 다른 규칙에 걸리지 않은 조각에서만 "더 넣어 달라"로 해석
        const has = pool.some((p) => p.category === cat)
        if (has) plan.prefer.push(cat)
        add(tx(has ? 'want' : 'wantNone', { cat: CAT_NAME[cat][lang] }), has)
      }
    }
    if (plan.notes.length === before) add(tx('unknown'), false)
  }
  if (reduced.size) plan.perDelta = -1
  return plan
}

export const START_SLOTS: Record<RequestPlan['start'], string[]> = {
  normal: ['09:30', '11:30', '13:00', '15:00', '17:30', '19:30'],
  late: ['11:00', '12:30', '14:30', '16:30', '18:30', '20:00'],
  early: ['08:00', '10:00', '12:00', '14:00', '16:30', '18:30'],
}

export const VEG_TIP: Record<Lang, string> = {
  ko: '채식 메뉴가 있는지 미리 확인하세요.',
  en: 'Check vegetarian options before you go.',
  ja: 'ベジタリアン対応を事前にご確認ください。',
  zh: '請事先確認是否有素食餐點。',
}
export const vegTip = (locale: string) => VEG_TIP[langOf(locale)]
