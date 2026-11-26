# Haru — 하루 만에 끝내는 여행 준비 (일정·항공권·호텔·날씨)

> **목표: 하루 만에 모든 여행 준비를 끝낸다.** 일정 → 항공권 → 숙소 → 날씨·준비물 → 현지 혜택 → 출국 준비를 한 화면의 체크리스트로 따라간다.

**국내·해외 여행 모두**에 대해 **실제 장소 기반 일자별 일정 + 항공권 검색 + 호텔 검색 + 예약 링크 + 현지 혜택**을 제공하는 앱.
v0.1(방한 여행자 전용) → v0.2 에서 전 세계 여행지 93곳(국내 12 · 일본 9 · 중화권 9 · 동남아 18 · 유럽 24 · 미주 9 · 대양주·하와이 7 · 중동 등 5), 항공권·호텔 검색을 추가했다.
수익 모델은 (1) 항공·호텔·액티비티 **어필리에이트 커미션**, (2) 지역 업체 **스폰서 혜택(광고) 게재**, (3) 선택적 AdMob 배너(목록 화면 한정).

### v0.3 추가 기능 (2026-11-15)
| 기능 | 내용 | 데이터 (라이브) | 데이터 (목업) |
|---|---|---|---|
| 일정별 날씨 | 날짜 탭마다 아이콘·최고기온, 선택한 날의 날씨 카드(상태·최고/최저·강수 확률·준비물), 비·눈 오는 날 야외 일정이 2곳 이상이면 실내 대안 안내. `src/lib/weather.ts` | Edge Function `trip-weather` → Open-Meteo. 오늘부터 16일 안은 **예보**, 그 뒤는 **평년값**(지난 3년 같은 날짜 ±3일 평균·비 온 날 비율). 실패하면 위도·지역 기반 평년 추정으로 대체 | 16일 안은 날짜별 샘플 예보, 그 뒤는 평년 추정 ("샘플" 표시) |
| 하루 준비 체크리스트 | 일정 화면 상단: 일정(자동 완료) → 항공권 → 숙소(구간별) → 날씨·준비물 → 현지 혜택 → 출국 준비(해외일 때), 진행률 표시, 여행별로 기기에 저장 | — | — |
| 운영센터 | `ops/agent/` — 여섯 부서(운영·제휴·재무·제품개선·마케팅·여행데이터) 운영 에이전트 헌장과 맥 운영센터 앱. `ops/agent/mac/README.md` | — | — |

> Open-Meteo 무료 호스트는 **비상업적 이용만** 허용한다. 수익이 나는 정식 출시 전에 유료 플랜 키를 Supabase 비밀값 `WEATHER_API_KEY` 로 넣어야 한다(넣으면 customer-* 호스트로 호출). 데이터 출처 표기(Open-Meteo.com)는 일정 화면 하단에 있다.

### v0.6 추가 기능 (2026-11-15)
| 기능 | 내용 |
|---|---|
| 날씨별 옷차림 | 날씨 카드와 보고서에 낮 최고기온 기준 옷차림 8단계, 일교차 10도 이상이면 겉옷 안내 — `outfitFor` (`src/lib/weather.ts`) |
| 나라별 여행 꿀팁 | `/trip/:id/tips` — 콘센트·전압(어댑터·프리볼트 필요 여부), 팁 문화, 결제, 교통카드, 수돗물, 긴급 전화. 42개국 표 `src/lib/countryTips.ts` (**공식 자료 대조 전**). 어댑터 추천도 이 표를 쓴다 |

### v0.5 추가 기능 (2026-11-15)
| 기능 | 내용 |
|---|---|
| 점심·저녁 고르기 | 날마다 점심 3곳·저녁 3곳 후보를 보여 주고 하나씩 고른다(기기에 저장, 보고서와 예상 비용에 반영). 실서비스: AI 가 그날 동선 근처의 실제 식당을 `meals` 로 돌려준다. 샘플 모드: 식당 자료가 없어 **그 나라 대표 메뉴**(한국·일본·대만·태국·베트남, 그 외는 종류)를 후보로 내고 지도 검색으로 연결 — `src/lib/mock/meals.ts`, `src/components/MealPicker.tsx` |
| 식당 예약 방법 | 식사 카드 아래에 예약 순서 5단계와 나라별 예약 서비스(한국 캐치테이블·네이버, 일본 Tabelog·TableCheck, 대만 inline·EZTABLE, 유럽 TheFork, 미주 OpenTable, 공통 Google 지도). 앱이 예약을 대신하지는 않는다 — `src/lib/reserveGuide.ts` |
| 숙소 나누기 | 여행 만들기에서 "숙소를 옮기시나요?"를 묻고 2~3곳에 박 수와 지역(선택)을 배정. 숙소가 바뀌는 날 체크인을 넣고 그 지역 근처 장소를 먼저 배치, 호텔 검색 구간도 숙소별로 나뉜다 — `TripParams.stays`, `src/lib/plan.ts` |
| 추가 요청 키워드 | 키워드로 입력하라는 안내와 키워드 버튼 8개 |
| 배너 광고 | 기본 켜짐. 웹 목업에서는 자리만 표시 |
| 샘플 호텔 | 샘플 목록임을 목록 위에 알리고, 버튼은 같은 지역·날짜의 실제 호텔 검색으로 연결 |

### v0.4 추가 기능 (2026-11-15)
| 기능 | 내용 |
|---|---|
| 추가 요청 반영 | 여행 만들 때 적은 추가 요청을 일정에 반영하고, 일정 화면에 **요청별 반영 내역**(반영/미반영과 이유)을 보여 준다. 실서비스: AI 가 요청을 필수 조건으로 지키고 `requests` 로 보고(`generate-itinerary`). 샘플 모드: 키워드만 읽는다(채식, 아이·유모차, 걷기 부담, 늦은/이른 출발, 특정 종류 제외·추가, 장소 이름) — `src/lib/mock/requests.ts` |
| 관심사 20종 | 맛집·시장·카페·쇼핑·역사·미술관·건축·사진·자연·하이킹·바다·야경·체험·테마파크·축제·아이와 함께·K-컬처·애니·나이트라이프·온천 |
| 여행 보고서 | `/trip/:id/report` — 개요, 준비 현황, 요청 반영, 일자별 일정+날씨, 예상 비용(통화별 1인·인원 합계), 준비물. 복사·공유, 웹에서는 인쇄·PDF 저장 — `src/lib/report.ts` |
| 여행 제품 추천 | `/trip/:id/gear` — 날씨·해외 여부·비행 거리·관심사로 제품 **종류**를 고르고 쇼핑몰 검색으로 연결(ko 쿠팡, en Amazon, ja Amazon.co.jp, zh-TW 蝦皮, eSIM 은 Klook). 특정 상품·가격은 다루지 않는다 — `src/lib/gear.ts` |
| 공항 대기 가이드 | `/trip/:id/airport` — 탑승까지 남은 시간(1·2·4·6시간+)별 할 일, 라운지 이용권 검색(Klook 제휴)·공식 안내 검색, 일부 공항(ICN·SIN·HND·NRT) 대표 시설 — `src/lib/airportGuide.ts` |

> 제품 추천 링크의 제휴 수익: 아마존은 `VITE_AFF_AMAZON_TAG`·`VITE_AFF_AMAZON_JP_TAG` 를 넣으면 추적된다. **쿠팡·쇼피는 파트너스 딥링크가 필요해 지금은 수익이 잡히지 않는 일반 검색 링크**다. 공항 대표 시설 문구는 공식 자료 대조 전이다(`ops/agent/state/data-checks.csv`).

### v0.2 추가 기능
| 기능 | 내용 | 데이터 (라이브) | 데이터 (목업) |
|---|---|---|---|
| 국내·해외 여행지 | `src/lib/destinations.ts` 카탈로그(좌표·공항·통화·시간대), 검색·지역 탭, 최대 5개 도시 순서대로 | AI 가 전 세계 실제 장소로 일정 생성(도시 반경 검증, 현지 통화 비용) | 도쿄·오사카·후쿠오카·타이베이·방콕·다낭·파리 큐레이션 + 그 외 도시는 일반 샘플 |
| 항공권 검색 | 왕복/편도, 공항 검색, 인원·좌석, 정렬·직항 필터, 파트너 비교(Trip.com·Skyscanner·Aviasales·Google 항공권·네이버 항공권[ko]) | Edge Function `search-flights` → Travelpayouts(Aviasales) Data API 운임 캐시 | 거리·항공사 유형 기반 결정적 샘플 운임 |
| 호텔 검색 | 여행지·체크인/아웃·인원/객실, 정렬·성급·무료취소 필터, 아고다 예약 + 부킹닷컴·트립닷컴·익스피디아 비교 | Edge Function `search-hotels` → Agoda Affiliate Lite API(landingURL 에 제휴 추적 포함) | 도시 물가 지수 기반 샘플 호텔(실존 아님, "샘플" 표기) |
| 비즈니스 특가·땡처리 | 출발 공항 기준 45일 이내 출발 비즈니스석을 할인율·가격·출발 임박 순으로, 기간·지역 필터, Aviasales(비즈니스) 예약 + 항공권 검색 비교 | Edge Function `flight-deals` → Travelpayouts `get_latest_prices`(trip_class=1, 전 노선) | 결정적 샘플 특가 |
| 일정 연계 | 일정 상단 "항공권·호텔" 카드: 홈 공항→첫 도시 항공권(국내선은 김포), 도시별 숙박 구간 호텔 검색(날짜·인원 자동). 숙소 정류지 → "호텔 찾기" | — | — |
| 수익 로그 | `affiliate_clicks.kind` = activity / flight / hotel, 관리자 화면에 종류·파트너별 클릭 | — | — |

> Amadeus Self-Service API 는 2026-07 종료되어 사용하지 않는다. 항공 운임은 Travelpayouts 캐시(최근 48시간 검색 기반, 실시간 좌석 아님)라 화면에 "최근 운임, 최종 가격은 파트너 사이트" 로 표기한다.
보고서 아이디어 **A1**의 MVP 구현이다.

| 항목 | 내용 |
|---|---|
| 스택 | Vite 8 · React 19 · TypeScript · react-router 7 · Supabase (Auth/DB/Edge Functions) · Capacitor 8 (Android/iOS) |
| 언어 | en(기본) · ja · zh-TW · ko — `src/i18n/*.json` |
| AI | Supabase Edge Function → Anthropic Messages API(키는 서버 secret). `VITE_MOCK_AI=true` 면 고정 샘플로 동작 |
| 광고 | 스폰서 쿠폰(1차 인벤토리, 직접 판매) + AdMob 배너(옵션, UMP/ATT 동의 플로우 내장) |
| 저장소 | Supabase 설정 시 원격(RLS), 미설정 시 기기 로컬(Preferences) |

## 1. 실행

```bash
npm install
npm run dev          # http://localhost:5173  (목업 AI 모드)
npm run build        # tsc + vite build → dist/
npm test             # vitest 단위 테스트
npm run e2e          # Playwright 스모크 (vite preview :4181) + screenshots/*.png
```

실서비스 값은 `.env.local` 에 작성한다 (`.env.example` 참고). `.env` 의 기본값은 목업 모드다.

## 2. 환경 변수

| 변수 | 설명 |
|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Supabase 프로젝트. 비어 있으면 로컬 저장 + 목업 AI |
| `VITE_MOCK_AI` | `true`: Edge Function 대신 샘플 일정/답변 |
| `VITE_AFF_KLOOK_QS` 등 | 파트너 대시보드에서 받은 추적 파라미터(쿼리스트링 그대로). 예 `aid=12345` |
| `VITE_AFF_CREATRIP_URL`, `VITE_AFF_TRAZY_URL`, `VITE_AFF_NOL_URL` | 검색 딥링크 형식이 미확정인 파트너는 승인 후 받은 랜딩 URL 전체 |
| `VITE_AFF_SKYSCANNER_QS` | Skyscanner 제휴(Impact) 추적 쿼리스트링 |
| `VITE_TP_MARKER` | Travelpayouts 파트너 marker (Aviasales 링크 추적) |
| `VITE_ADMOB_ENABLED` | 배너 광고 (기본 `true`, `false` 로 끔). 네이티브 앱에서 실제 배너, 웹 목업에서는 자리 표시만. 홈·예약·혜택·일정·보고서·제품 추천·공항 가이드에 표시하고 컨시어지 대화·여행 만들기·약관에는 넣지 않는다 |
| `VITE_ADMOB_BANNER_ANDROID/IOS` | 배너 광고 단위 ID (기본값은 Google 테스트 ID) |

Edge Function secret: `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL_ITINERARY`(기본 claude-sonnet-5-5), `ANTHROPIC_MODEL_CHAT`(기본 claude-haiku-5-5), `ITINERARY_DAILY_CAP`(3), `CHAT_DAILY_CAP`(40), `TRAVELPAYOUTS_TOKEN`(항공), `AGODA_SITE_ID`·`AGODA_API_KEY`·`AGODA_API_URL`(호텔), `SEARCH_DAILY_CAP`(60), `WEATHER_API_KEY`(선택 — Open-Meteo 유료 플랜).

## 3. Supabase 설정
`supabase/SUPABASE_SETUP.md` 참고. 요약: 프로젝트 생성 → **Anonymous sign-ins 활성화** → `migrations/0001_init.sql` → `0002_travel_booking.sql` + `seed.sql` 실행 → Edge Function 6개 배포 → 운영자 `profiles.role='admin'` 지정.

## 4. 어필리에이트 프로그램 가입 목록

| 파트너 | 용도 | 가입 경로 | 앱 설정 |
|---|---|---|---|
| Klook | 액티비티·입장권·교통패스 | Klook Affiliate Program (Klook Partner Hub) | `VITE_AFF_KLOOK_QS` |
| Trip.com | 호텔·항공·기차 | Trip.com Affiliate Program | `VITE_AFF_TRIP_QS` (항공권 기본 예약처) |
| Travelpayouts (Aviasales) | 항공 운임 API + 항공 커미션 | Travelpayouts 가입 → Aviasales 프로그램 연결 | `TRAVELPAYOUTS_TOKEN`(서버), `VITE_TP_MARKER` |
| Skyscanner | 항공 비교 | Skyscanner Partners (Impact) | `VITE_AFF_SKYSCANNER_QS` |
| Agoda | 호텔 (호텔 검색 기본 예약처 + Lite API) | Agoda Partner Programs (Affiliate) | `VITE_AFF_AGODA_QS`, `AGODA_SITE_ID`/`AGODA_API_KEY`(서버), 도시 매핑 `supabase/functions/_shared/agoda-cities.ts` |
| Booking.com | 호텔 | Booking.com Affiliate Partner Programme | `VITE_AFF_BOOKING_QS` |
| Expedia | 호텔·패키지 | Expedia Group Affiliate Program (Partnerize) | `VITE_AFF_EXPEDIA_QS` |
| GetYourGuide | 투어 | GetYourGuide Partner Program | `VITE_AFF_GYG_QS` |
| Creatrip | 한국 특화 예약 | Creatrip 제휴 문의 | `VITE_AFF_CREATRIP_URL` |
| Trazy | 한국 투어·티켓 | Trazy Affiliate | `VITE_AFF_TRAZY_URL` |
| NOL(야놀자) | 국내 숙박 글로벌 | NOL/야놀자 제휴 문의 | `VITE_AFF_NOL_URL` |

각 프로그램의 **정확한 추적 파라미터 이름과 딥링크 형식은 승인 후 대시보드 안내를 따른다**(코드의 예시는 공개된 일반 형식이며 보장하지 않음). 모든 예약 CTA 는 `affiliate_clicks` 테이블에 기록되어 파트너 리포트와 대조할 수 있다.

Google 항공권·네이버 항공권은 수수료 없는 **비교용** 링크다. Trip.com 항공·호텔 딥링크 형식(`showfarefirst`, `hotels/list`)은 제휴 포털 딥링크 생성기로 최종 확인할 것(코드에 TODO).

식당 **예약 리드**는 국내는 캐치테이블/네이버, 해외는 Google 지도 검색 페이지로 보내는 임시 구현이다. Catchtable Global 등과 제휴가 되면 `src/lib/affiliate.ts` 의 `reserveUrl` 만 교체하면 된다.

## 5. 스폰서 혜택(광고) 운영
- `coupons` 테이블이 광고 인벤토리다. **More → Admin** 화면에서 등록·수정하고 노출/클릭을 본다.
- 스폰서 카드는 일정 2번째 정류지 뒤("오늘 동선 근처 혜택", 같은 도시·3km 이내·최대 2개)와 Deals 탭에 노출되며, 항상 `Sponsored/광고` 라벨이 붙는다(전자상거래법 표시 의무).
- 샘플 8건(`is_sample=true`)은 출시 전 삭제한다.
- 과금 모델 예시: 월 정액 게재(지역·카테고리별) 또는 클릭당 과금 — `ad_events` 로 정산.

## 6. AdMob
1. AdMob 앱 등록 → 앱 ID를 `android/app/src/main/AndroidManifest.xml` 의 `APPLICATION_ID` 와 `ios/App/App/Info.plist` 의 `GADApplicationIdentifier` 에 입력 (현재 테스트 ID).
2. 배너 광고 단위 생성 → `VITE_ADMOB_BANNER_ANDROID/IOS`, `VITE_ADMOB_ENABLED=true`.
3. AdMob 콘솔 Privacy & messaging 에서 GDPR(EEA/UK) 메시지를 게시해야 `requestConsentInfo` 폼이 나온다. 코드는 플러그인 권장 순서(initialize → consent info → ATT → consent form)를 따른다(`src/lib/ads.ts`).
4. 배너는 홈·Deals 목록 화면에서만 뜨고 일정·챗에서는 숨긴다. 전면광고는 의도적으로 쓰지 않는다.
5. iOS 미디에이션을 붙이면 `SKAdNetworkItems` 에 각 네트워크 ID를 추가한다.

## 7. 스토어 출시 절차

### 공통
- `capacitor.config.ts` 의 `appId`(현재 `com.harukorea.app`)·`appName` 확정 — **변경 시 `android/`, `ios/` 삭제 후 `npx cap add` 재실행**.
- 아이콘/스플래시: `@capacitor/assets` 로 생성 (`public/icon.svg` 를 원본으로).
- `npm run cap:sync` 로 최신 `dist/` 반영.
- 개인정보 처리방침 URL 필요 → 앱 내 `/legal/privacy` 내용을 웹에 호스팅(예: GitHub Pages).

### Google Play
1. Android Studio 에서 `android/` 열기 → 서명 키 생성 → `Build > Generate Signed Bundle (AAB)`.
2. Play Console: 앱 생성 → **데이터 보안(Data safety)**: 수집 항목 = 앱 활동(제휴 클릭·광고 이벤트), 기기 ID(AdMob, 광고 목적), 대략적 위치(선택, 기기 내 사용). 광고 포함 = 예.
3. 콘텐츠 등급 설문, 타깃 연령(18+ 권장), 광고 ID 선언(AdMob 사용).
4. 내부 테스트 → 프로덕션. 2026-12-31부터 한국 신수수료 체계 적용(결제 기능 없음 → 영향 없음).

### App Store
1. `ios/App/App.xcworkspace` 를 Xcode 로 열기 → Signing Team 설정 → Archive → App Store Connect 업로드.
2. **App Privacy(개인정보 영양표)**: Identifiers(Device ID — 광고, 추적), Usage Data(제품 상호작용 — 분석), Location(대략적 위치 — 앱 기능, 수집 안 함으로 표기 가능: 서버 저장 없음).
3. ATT 사용 여부 "예" (`NSUserTrackingUsageDescription` 설정됨). 광고 없이도 앱이 동작함을 심사 노트에 기재.
4. 외부 링크(제휴)는 정보 제공이며 인앱 결제 대상이 아님(3.1.1 해당 없음)을 심사 노트에 기재.
5. 연령 등급 17+ 권장(나이트라이프 콘텐츠 포함), AI 생성 콘텐츠 고지 화면(`/legal/ai`) 보유.

### 법적 고지
- 한국 AI 기본법(2026-01-22 시행) 생성형 AI 고지 → `/legal/ai`, 일정 하단 문구.
- EU AI Act Art.50 투명성 → 동일 화면.
- 제휴 링크 고지 → 일정 하단·More 화면. 스폰서 라벨 → 쿠폰 카드.
- `src/lib/legal.ts` 의 TODO(사업자 정보·시행일)를 채우고 법률 검토를 받을 것.

## 8. 구조

```
src/
  i18n/            en.json ja.json zh-TW.json ko.json, index.ts(translate), context.tsx
  lib/
    affiliate.ts   파트너별 검색 URL + 추적 파라미터
    destinations.ts 국내·해외 여행지 카탈로그(좌표·공항·통화·시간대·지역)
    airports.ts    공항·항공사 데이터, 공항 라벨/검색, 국내선 김포 보정
    flights.ts     항공권 검색(목업/Edge), 파트너 딥링크, 정렬
    hotels.ts      호텔 검색(목업/Edge), 파트너 딥링크, 필터·정렬
    plan.ts        일정 → 도시별 숙박 구간
    fx.ts, rng.ts  표시 통화 환산(목업), 결정적 난수
    ai.ts          Edge Function 호출 / 목업 분기
    ads.ts         AdMob 배너·동의 플로우(네이티브 전용)
    coupons.ts     스폰서 혜택 조회·근접 필터
    itinerary.ts   데이터 모델·정규화·검증
    logger.ts      affiliate_clicks / ad_events 기록
    repo.ts        Supabase ↔ 로컬 저장소
    supabase.ts    클라이언트·익명 세션·관리자 판정
    mock/          샘플 일정·장소·쿠폰·챗
  pages/           Home, TripSetup, Itinerary, Flights, Hotels, Chat, Deals, More, Legal, Admin
  components/      Layout(탭바·배너), StopCard(CTA), CouponCard(광고 로깅), LangSwitch,
                   DestinationPicker, SearchSelect, Stepper, BookTabs
supabase/
  migrations/0001_init.sql   스키마·RLS·RPC
  migrations/0002_travel_booking.sql  클릭 종류·검색 한도·통계 RPC
  seed.sql                   장소 30곳·샘플 쿠폰 8건
  functions/generate-itinerary, concierge-chat, search-flights, search-hotels, _shared/
scripts/e2e.mjs    Playwright 스모크
tests/             vitest
```

## 9. 알려진 공백 / 리스크
- **비즈니스 할인율은 추정치** — API 가 정가를 주지 않아 노선 거리 기반 평소 비즈니스 운임 추정치 대비로 계산(화면에 명시). 항공사 공식 땡처리·마일리지 특가 전부를 모으는 단일 API 는 없음.
- **항공 운임은 캐시 데이터**(Travelpayouts, 최근 48시간) — 인기 노선 외에는 결과가 비거나 실제가와 다를 수 있음. 실시간 좌석·발권이 필요하면 Duffel 등 NDC API 와 별도 계약 검토.
- **Agoda cityId 매핑**이 비어 있으면 해당 도시는 호텔 목록 대신 파트너 검색 링크만 표시됨(`_shared/agoda-cities.ts` 채우기). Agoda Lite API 기본 엔드포인트는 HTTP — HTTPS 엔드포인트는 계정 매니저에게 요청.
- 목업 항공·호텔 결과는 데모용 샘플(가상의 호텔명·대략 운임)로 "샘플" 라벨을 붙였다. 라이브 모드에서는 목업으로 대체하지 않는다.
- 앱 이름은 **Haru** 로 확정(2026-11-15). `appId` 는 아직 `com.harukorea.app` — 스토어 등록 전에 확정하고, 바꾸면 `android/`·`ios/` 를 다시 만들어야 한다.
- **어필리에이트 파라미터 형식**은 파트너 승인 전까지 확정 불가. Creatrip·Trazy·NOL 은 검색 딥링크가 없어 랜딩 URL 로만 연결.
- 장소 시드 좌표는 공개 지도 기준 대략값 — 출시 전 검증 필요. AI 생성 일정은 폐업·영업시간 오류 가능(고지 문구 포함).
- 식당 예약은 리드 링크(검색 페이지)이며 실제 예약 커미션 계약은 별도.
- 익명 계정은 기기 종속 — 앱 삭제 시 여행 데이터 유실. 이메일 매직링크 로그인(`supabase.auth.signInWithOtp`) 추가 권장.
- AdMob 통합은 실기기에서만 검증 가능(샌드박스에서는 웹 빌드·단위·e2e 까지만 검증함). Android Gradle/Xcode 빌드는 로컬에서 수행.
- 일일 한도는 사용자 단위라 다계정 남용에는 취약 — IP·기기 기준 제한은 추후 과제.
- 번들 약 570KB(gzip 172KB): supabase-js 비중이 큼. 필요 시 동적 import 로 분리.

## 저장소·CI (GitHub `parksang-jun/HARU.com`)

- 네이티브 프로젝트(`android/`, `ios/`)와 아이콘·스플래시 이미지까지 저장소에 들어 있다. 아이콘을 바꾸면 `public/icon.svg` 를 고치고 `npm run assets`(`scripts/make-icons.mjs` + `@capacitor/assets`).
- CI(`.github/workflows/ci.yml`): push·PR 마다 `npm ci → build → vitest → e2e(실패해도 통과)`.
