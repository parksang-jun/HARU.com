// 무료 연결 점검 — .env 에 어떤 제휴 값이 들어 있는지 알려 준다 (값 자체는 출력하지 않는다)
// 사용: npm run check:connections
import { existsSync, readFileSync } from 'node:fs'

const env = {}
for (const f of ['.env', '.env.local', '.env.production']) {
  if (!existsSync(f)) continue
  for (const line of readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
const has = (k) => Boolean(env[k] && env[k].trim())

const ROWS = [
  ['서버', 'Supabase 주소·키', ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'], '없으면 숙소·항공 실제 검색이 동작하지 않음'],
  ['항공', 'Travelpayouts marker', ['VITE_TP_MARKER'], '항공권 링크 수수료 추적'],
  ['숙소', '아고다 추적값', ['VITE_AFF_AGODA_QS'], '숙소 링크 수수료 추적'],
  ['숙소', '트립닷컴 추적값', ['VITE_AFF_TRIP_QS'], ''],
  ['숙소', '부킹닷컴 추적값', ['VITE_AFF_BOOKING_QS'], ''],
  ['액티비티', 'Klook 추적값', ['VITE_AFF_KLOOK_QS'], '투어·입장권 링크 수수료 추적'],
  ['액티비티', 'GetYourGuide 추적값', ['VITE_AFF_GYG_QS'], ''],
  ['제품', '아마존 태그', ['VITE_AFF_AMAZON_TAG'], '여행 제품 추천 링크'],
]
let ok = 0
console.log('Haru 무료 연결 점검 (.env)\n')
for (const [group, name, keys, note] of ROWS) {
  const done = keys.every(has)
  if (done) ok++
  console.log(`${done ? '✓' : '·'} [${group}] ${name}${done ? '' : ` — 비어 있음 (${keys.filter((k) => !has(k)).join(', ')})`}${note && !done ? ` · ${note}` : ''}`)
}
console.log(`\n${ok}/${ROWS.length} 연결됨`)
console.log('서버 비밀값(TRAVELPAYOUTS_TOKEN, AGODA_SITE_ID, AGODA_API_KEY)은 Supabase 에 있어 여기서 확인할 수 없습니다: supabase secrets list')
if (env.VITE_MOCK_AI === 'true') console.log('주의: VITE_MOCK_AI=true — 예시 데이터로 동작 중입니다. 실제 연결을 쓰려면 false 로 바꾸세요.')
