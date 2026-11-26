# 무료 연결 순서 — 숙소 · 항공 · 액티비티 (2026-11-27)

앱 코드는 이미 준비되어 있다. 아래 값만 넣으면 연결된다. **가입과 키 발급은 본인 명의로 직접 해야 한다**(정산 계좌·세금 정보가 필요).
키는 저장소에 올리지 않는다: 앱용 값은 `.env`(git 제외), 서버용 값은 Supabase 비밀값.

## 1. Supabase (무료 요금제) — 가장 먼저
숙소·항공 실제 검색은 서버 함수에서 돈다. 이것이 없으면 아래 API 키를 넣을 곳이 없다.
1. 프로젝트 생성 → `supabase/SUPABASE_SETUP.md` 대로 마이그레이션(0001~0004)과 함수 배포
2. `.env`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_MOCK_AI=false`

## 2. Travelpayouts — 한 번 가입으로 여러 브랜드
1. 가입 → 프로젝트 등록(앱/사이트 주소 필요)
2. 항공 데이터 API 토큰 → `supabase secrets set TRAVELPAYOUTS_TOKEN=...`
3. marker → `.env` 의 `VITE_TP_MARKER`
4. 프로그램 목록에서 Klook, Trip.com, GetYourGuide, Booking.com 등을 각각 신청(브랜드별 승인, 보통 영업일 3일 이내)
   승인되면 받은 추적값을 `.env` 의 `VITE_AFF_KLOOK_QS`, `VITE_AFF_TRIP_QS`, `VITE_AFF_GYG_QS`, `VITE_AFF_BOOKING_QS` 에 넣는다

## 3. 아고다 — 숙소 가격·평점 API
1. 아고다 파트너 가입 → 승인 후 Affiliate Lite API 사용 신청
2. `supabase secrets set AGODA_SITE_ID=... AGODA_API_KEY=...`
3. `.env`: `VITE_AFF_AGODA_QS=cid=...`
승인 전에는 숙소 화면이 "예시"로 표시되고, 버튼은 아고다 검색으로 연결된다.

## 4. 확인
```
npm run check:connections     # .env 에 무엇이 들어 있는지
supabase secrets list         # 서버 비밀값
```
그다음 실제 검색을 한 번씩 해 보고(숙소·항공), 링크에 추적값이 붙는지 확인한다.

## 알아 둘 것
- 제휴 심사는 대부분 **운영 중인 앱이나 사이트 주소**를 요구한다. 출시 전이면 소개 페이지(예: GitHub Pages)를 먼저 올려야 승인이 쉽다.
- 서버 함수의 실제 호출(아고다·Travelpayouts)은 키가 없어 한 번도 실행해 보지 못했다. 키를 넣은 뒤 첫 실행에서 응답 형식 차이로 수정이 필요할 수 있다.
- 항공 가격은 최근 검색된 운임(캐시)이다.
