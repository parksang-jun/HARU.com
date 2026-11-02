# Supabase 설정 가이드 (Haru Korea)

## 1. 프로젝트 생성
1. https://supabase.com 에서 새 프로젝트 생성 (리전: Northeast Asia — Seoul 권장).
2. Authentication → Providers → **Anonymous sign-ins 활성화** (가입 없이 익명 세션 사용).
3. Project Settings → API 에서 `Project URL`, `anon public key` 복사 → 앱 `.env.local` 의 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

## 2. 스키마 적용
SQL Editor 에 `supabase/migrations/0001_init.sql` → `0002_travel_booking.sql` 순서로 붙여넣고 실행 → 이어서 `supabase/seed.sql` 실행.
(CLI 사용 시: `supabase link --project-ref <ref>` → `supabase db push` → `psql ... -f supabase/seed.sql`)

시드의 쿠폰 8건은 `is_sample = true` 입니다. 출시 전 삭제:
```sql
delete from public.coupons where is_sample;
```

## 3. 관리자 지정
앱을 한 번 실행해 익명 세션을 만든 뒤(또는 이메일 로그인 추가 후) 해당 사용자의 `profiles.role` 을 admin 으로 변경:
```sql
update public.profiles set role = 'admin' where id = '<auth.users.id>';
```
앱 **More → Admin** 에서 쿠폰 등록·성과 조회가 가능합니다. 익명 세션은 기기별이므로 운영자 기기에서 지정하세요.
(권장: 운영자용으로 이메일 매직링크 로그인을 추가해 고정 계정을 만든 뒤 admin 지정.)

## 4. Edge Functions 배포
```bash
npm i -g supabase            # CLI
supabase login
supabase link --project-ref <ref>
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set ANTHROPIC_MODEL_ITINERARY=claude-sonnet-5-5 ANTHROPIC_MODEL_CHAT=claude-haiku-5-5
supabase secrets set ITINERARY_DAILY_CAP=3 CHAT_DAILY_CAP=40
supabase functions deploy generate-itinerary
supabase functions deploy concierge-chat

# 항공권 (Travelpayouts 대시보드 → API token)
supabase secrets set TRAVELPAYOUTS_TOKEN=xxxxxxxx SEARCH_DAILY_CAP=60
supabase functions deploy search-flights
supabase functions deploy flight-deals      # 비즈니스 특가 (같은 토큰 사용)

# 호텔 (Agoda Partners Hub → Site ID / API key, HTTPS 엔드포인트는 계정 매니저에게 요청)
supabase secrets set AGODA_SITE_ID=123456 AGODA_API_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
# supabase secrets set AGODA_API_URL=https://...    # 받은 경우
supabase functions deploy search-hotels
```
호텔 검색은 `supabase/functions/_shared/agoda-cities.ts` 에 앱 여행지 id → Agoda cityId 를 채운 도시만 목록이 나옵니다(그 외 도시는 파트너 검색 링크로 안내).
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` 는 Edge Runtime 이 자동 주입합니다.

## 5. 동작 확인
- `.env.local` 에 `VITE_MOCK_AI=false` 설정 후 `npm run dev`.
- 여행 생성 시 `generate-itinerary` 호출 → `itineraries` 테이블에 저장 확인.
- 제휴 CTA 클릭 → `affiliate_clicks` 행 생성, 스폰서 카드 노출/클릭 → `ad_events` 행 생성.
- 한도 초과 시 429 → 앱에 "오늘 한도" 메시지.
- 항공권/호텔 검색 → 결과 표시, 예약·비교 클릭 시 `affiliate_clicks.kind` 가 flight / hotel 로 기록.

## 6. 비용 가드
- 일정 생성 1회 ≈ 입력 1.5K + 출력 4~6K 토큰 (Sonnet 기준 약 $0.1 이하), 챗 1회 ≈ $0.001 수준(Haiku).
- `usage_daily` 로 사용자·일 단위 상한. 남용 징후 시 `ITINERARY_DAILY_CAP` 을 낮추거나 Edge Function 에 IP 기반 제한을 추가하세요.
- Anthropic 콘솔에서 월 지출 한도(spend limit)를 설정하세요.

## 7. RLS 요약
| 테이블 | 읽기 | 쓰기 |
|---|---|---|
| profiles | 본인 | 없음(관리자 지정은 SQL) |
| trips / itineraries / chat_messages | 본인 | 본인 |
| places / coupons | 공개(활성) | 관리자 |
| affiliate_clicks / ad_events | 관리자 | 로그인 사용자 insert |
| usage_daily | 없음(service role 전용) | service role |
