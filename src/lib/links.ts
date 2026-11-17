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

/** 장소 이름으로 구글 지도 검색 (좌표를 모르는 직접 추가 장소용) */
export function googleMapsSearchUrl(name: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`
}

/** 여러 지점을 순서대로 잇는 구글 지도 길찾기 (최대 10곳) */
export function googleDirectionsUrl(points: { lat: number; lng: number }[]): string {
  return `https://www.google.com/maps/dir/${points.slice(0, 10).map((p) => `${p.lat},${p.lng}`).join('/')}`
}
