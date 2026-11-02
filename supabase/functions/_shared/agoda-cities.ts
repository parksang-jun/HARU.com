// 앱 여행지 id → Agoda cityId 매핑
// Agoda 파트너 포털(Partners Hub → Tools/Data feeds)의 도시 목록에서 cityId 를 확인해 채워 넣을 것.
// 매핑이 없는 도시는 search-hotels 가 404(unsupported_city) 를 돌려주고, 앱은 파트너 검색 링크만 보여준다.
export const AGODA_CITY_IDS: Record<string, number> = {
  bangkok: 9395, // Affiliate Lite API 문서 예시값 — 운영 전 재확인
  // seoul: ,
  // busan: ,
  // jeju: ,
  // tokyo: ,
  // osaka: ,
  // fukuoka: ,
  // taipei: ,
  // danang: ,
  // paris: ,
}
