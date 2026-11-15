// 식당 예약 방법 안내 — 나라별로 많이 쓰는 예약 서비스와 예약 순서.
// 앱이 예약을 대신하지 않는다. 예약 서비스로 연결하고 방법을 알려 준다.
import type { Region } from './destinations'

export interface ReservePlatform {
  id: 'catchtable' | 'naver' | 'tabelog' | 'tablecheck' | 'inline' | 'eztable' | 'thefork' | 'opentable' | 'google'
  name: string
  url: string
}

const g = (q: string): ReservePlatform => ({ id: 'google', name: 'Google Maps', url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` })

/** 그 나라에서 식당 예약에 많이 쓰는 서비스 (앞쪽이 우선). query 는 식당 이름 또는 메뉴+지역 */
export function reservePlatforms(country: string, region: Region, query: string): ReservePlatform[] {
  const q = encodeURIComponent(query)
  switch (country) {
    case 'KR':
      return [
        { id: 'catchtable', name: 'CatchTable', url: `https://app.catchtable.co.kr/ct/search?keyword=${q}` },
        { id: 'naver', name: 'Naver Map', url: `https://map.naver.com/p/search/${q}` },
        g(query),
      ]
    case 'JP':
      return [
        { id: 'tabelog', name: 'Tabelog', url: 'https://tabelog.com/' },
        { id: 'tablecheck', name: 'TableCheck', url: 'https://www.tablecheck.com/' },
        g(query),
      ]
    case 'TW':
      return [
        { id: 'inline', name: 'inline', url: 'https://inline.app/' },
        { id: 'eztable', name: 'EZTABLE', url: 'https://tw.eztable.com/' },
        g(query),
      ]
    default:
      if (region === 'europe') return [{ id: 'thefork', name: 'TheFork', url: 'https://www.thefork.com/' }, g(query)]
      if (region === 'americas') return [{ id: 'opentable', name: 'OpenTable', url: 'https://www.opentable.com/' }, g(query)]
      return [g(query)]
  }
}

/** 예약 순서 문구 키 (reserve.step.*) */
export const RESERVE_STEPS = ['need', 'app', 'hotel', 'tell', 'cancel'] as const
