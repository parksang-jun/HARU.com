# 어필리에이트 프로그램 목록 (조건은 변동 — 가입 전 웹 검색으로 현재 값 확인)

| 파트너 | 카테고리 | 가입 경로(검색 키워드) | 메모 |
|---|---|---|---|
| Klook | 입장권·투어·교통패스·eSIM | "Klook affiliate program" (Klook Partner Hub) | 한국 상품 풍부, 활동 카테고리 1순위. 코드 템플릿 `aid=` 파라미터 가정 — 승인 후 실제 형식 확인 |
| Trip.com | 호텔·항공·입장권 | "Trip.com affiliate" (Allianceid/SID) | 중화권·일본 사용자 친숙 |
| Agoda | 숙소 | "Agoda Partners affiliate" (cid) | 아시아 숙소 강함, 일본·대만 전환 높음 |
| Booking.com | 숙소 | "Booking.com affiliate partner program" (aid) | 영어권 |
| Expedia Group | 숙소·항공 | "Expedia affiliate program Partnerize" (camref) | 북미 |
| GetYourGuide | 가이드 투어 | "GetYourGuide partner program" (partner_id) | 영어권 투어 |
| Creatrip | 한국 특화 예약·쿠폰 | "Creatrip partnership" | 딥링크 형식 미확정, 제휴 문의 필요 |
| Trazy | 한국 특화 투어 | "Trazy affiliate" | 딥링크 형식 미확정 |
| NOL(야놀자 글로벌)/야놀자 | 국내 숙소·레저 | "NOL global affiliate", 야놀자 제휴 | 형식 미확정, 한국 내 재고 강점 |
| 보조 | eSIM(예: Airalo), 환전·카드(Wise 등), 짐보관 | 각 "affiliate" | 여행 준비 체크리스트에 배치 |

## 심사 통과용 소개문(en, 수정해서 사용)

Haru Korea is a mobile and web trip planner for inbound travelers to South Korea (Japanese, Taiwanese and English-speaking visitors). Users get an AI-built day-by-day itinerary with real places, transit hints and local deals; every ticketed sight, tour and hotel links out to partner booking pages. Launch markets: Japan and Taiwan (2027). Traffic: {monthly users}. Site: {url}.

## 운영 체크

- 추적 파라미터 반영 후 테스트 클릭이 대시보드에 기록되는지 24~48시간 내 확인
- 쿠키 기간·지급 기준액·지급 수단(PayPal/계좌)·세금 양식(W-8BEN) 확인
- 월간 대조표: 앱 클릭(affiliate_clicks) / 대시보드 클릭 / 예약 / 확정 커미션 / 지급
- 파트너 정책: 브랜드 키워드 입찰 금지, 쿠폰 코드 무단 게시 금지, 링크 고지 의무

## v0.2 추가 — 항공·호텔
| 파트너 | 용도 | 앱 설정 | 비고 |
|---|---|---|---|
| Travelpayouts (Aviasales) | 항공 운임 API(`prices_for_dates`, 최근 48시간 캐시) + 항공 커미션 | 서버 `TRAVELPAYOUTS_TOKEN`, 앱 `VITE_TP_MARKER` | 실시간 좌석 아님 → "최근 운임" 표기 유지 |
| Trip.com | 항공권 결과의 기본 예약처 | `VITE_AFF_TRIP_QS` | 항공·호텔 딥링크 형식은 제휴 포털 생성기로 확인 |
| Skyscanner | 항공 비교 링크 | `VITE_AFF_SKYSCANNER_QS` | Impact 경유 승인 |
| Agoda | 호텔 결과 기본 예약처 + Affiliate Lite API | `VITE_AFF_AGODA_QS`, 서버 `AGODA_SITE_ID`/`AGODA_API_KEY`/`AGODA_API_URL` | 도시별 cityId 를 `agoda-cities.ts` 에 등록해야 목록 표시 |
| Booking.com · Expedia | 호텔 비교 링크 | `VITE_AFF_BOOKING_QS`, `VITE_AFF_EXPEDIA_QS` | — |
| Google 항공권 · 네이버 항공권 | 비교용(무수익) | — | 네이버는 한국어 사용자에게만 노출 |
- Amadeus Self-Service API 는 2026-07 종료 → 사용 불가.
- 관리자 화면·`affiliate_stats_by_kind` 로 항공/호텔/액티비티 클릭을 나눠 파트너 리포트와 대조.
