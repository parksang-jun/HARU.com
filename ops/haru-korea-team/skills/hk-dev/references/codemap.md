# 코드 지도

| 하고 싶은 일 | 위치 |
|---|---|
| 여행 설정 화면·옵션(도시·관심사) | `src/pages/TripSetupPage.tsx`, `src/lib/itinerary.ts`(타입·정규화) |
| 일정 화면·스톱 카드·Book/Reserve/Map 버튼 | `src/pages/ItineraryPage.tsx`, `src/components/StopCard.tsx`, `src/lib/links.ts` |
| 어필리에이트 URL 템플릿·추적 파라미터 | `src/lib/affiliate.ts`, `.env` `VITE_AFF_*` |
| 클릭·노출 로깅 | `src/lib/logger.ts`, `src/lib/repo.ts`(affiliate_clicks·ad_events insert) |
| 스폰서 쿠폰 선택·거리 계산 | `src/lib/coupons.ts`, `src/lib/geo.ts`, `src/components/CouponCard.tsx` |
| AI 호출(목업/실제 분기) | `src/lib/ai.ts`, `src/lib/mock/*` |
| 챗 화면 | `src/pages/ChatPage.tsx` |
| 딜 탭·관리자 | `src/pages/DealsPage.tsx`, `src/pages/AdminPage.tsx` |
| 법적 문서 | `src/pages/LegalPage.tsx`, `src/lib/legal.ts` |
| i18n | `src/i18n/*.json`, `src/i18n/context.tsx` |
| AdMob 배너·동의 | `src/lib/ads.ts`, `.env` `VITE_ADMOB_*` |
| Supabase 클라이언트·익명 로그인 | `src/lib/supabase.ts` |
| 스키마·RLS·RPC | `supabase/migrations/0001_init.sql` |
| 시드(장소·샘플 쿠폰) | `supabase/seed.sql` |
| Edge Functions | `supabase/functions/generate-itinerary`, `concierge-chat`, `_shared/{anthropic,auth,cors}.ts` |
| 네이티브 설정 | `capacitor.config.ts`, `android/app/src/main/AndroidManifest.xml`, `ios/App/App/Info.plist` |
| 테스트 | `tests/*.test.ts`, `scripts/e2e.mjs`(preview :4181) |

## 테이블

profiles(role), trips, itineraries(jsonb), chat_messages, places, coupons(sponsored, weight, valid_from/to, lat/lng), affiliate_clicks(partner, url, trip_id), ad_events(coupon_id, event impression|click, placement), usage_daily(user_id, day, itineraries, chats)

RPC: `increment_usage`, `coupon_stats`, `affiliate_stats`; `is_admin()` 헬퍼

## v0.2 추가 (국내·해외 + 항공권·호텔)
- `src/lib/destinations.ts` 여행지 카탈로그(id·국가·지역·4개 언어명·좌표·공항·통화·시간대·호텔 지역·물가지수). 새 도시는 여기 한 줄 추가.
- `src/lib/airports.ts` 공항명·항공사(LCC/허브) 데이터, `domesticOrigin`(국내선 김포 보정), `HOME_AIRPORT_KEY`.
- `src/lib/flights.ts` 검색(목업 `buildMockFlights` / Edge `search-flights`), 딥링크 `flightPartnerUrl`(trip·skyscanner·aviasales·google·naver).
- `src/lib/hotels.ts` 검색(목업 `buildMockHotels` / Edge `search-hotels`), 딥링크 `hotelPartnerUrl`(agoda·booking·trip·expedia).
- `src/lib/plan.ts` 일정 → 숙박 구간. 페이지: `FlightsPage`, `HotelsPage`(탭 '예약' 아래 항공권/호텔/혜택 세그먼트).
- Edge: `supabase/functions/search-flights`(TRAVELPAYOUTS_TOKEN), `search-hotels`(AGODA_SITE_ID·AGODA_API_KEY·AGODA_API_URL, `_shared/agoda-cities.ts`), 공통 한도 SEARCH_DAILY_CAP.
- DB: `0002_travel_booking.sql` — `affiliate_clicks.kind`(activity/flight/hotel), `usage_daily.searches`, RPC `affiliate_stats_by_kind`.
- 일정 생성 Edge 는 클라이언트가 보낸 `destinations`(이름·국가·통화·좌표)로 프롬프트 구성, 좌표는 도시 반경 250km 검증.
- TODO 확인: Trip.com 항공(`showfarefirst`)·호텔(`hotels/list`) 딥링크 형식, 네이버 항공권 URL 형식.
