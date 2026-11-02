// 지도 링크 — 좌표/이름 기반 공개 URL 스킴
export function googleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
}

export function naverMapUrl(name: string): string {
  return `https://map.naver.com/p/search/${encodeURIComponent(name)}`
}

export function kakaoMapUrl(name: string, lat: number, lng: number): string {
  // 카카오맵 공식 URL 스킴: https://map.kakao.com/link/map/이름,위도,경도
  return `https://map.kakao.com/link/map/${encodeURIComponent(name)},${lat},${lng}`
}
