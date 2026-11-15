// 여행 제품 추천 — 날씨·여행지·비행 거리·관심사로 "이번 여행에 필요한 물건 종류"를 고른다.
// 특정 상품·가격은 다루지 않는다(상품 데이터가 없다). 쇼핑몰 검색 링크로 연결하고, 제휴 태그가 있으면 붙인다.
import { airportDestination } from './airports'
import { appendQuery } from './affiliate'
import { ENV } from './env'
import { distanceKm } from './geo'
import type { Trip } from './itinerary'
import { flightRoute, isAbroad } from './plan'
import { packingList, type DayWeather, type Tip } from './weather'

export type GearId =
  | 'umbrella' | 'raincoat' | 'padding' | 'gloves' | 'windbreaker' | 'fan' | 'sunscreen'
  | 'adapter' | 'esim' | 'neckpillow' | 'powerbank' | 'organizer' | 'waterproof' | 'daypack' | 'kidskit'

export interface GearItem {
  id: GearId
  /** 추천 이유 문구 키 (gear.why.*) */
  why: string
}

const FROM_TIP: Partial<Record<Tip, GearId[]>> = {
  umbrella: ['umbrella', 'raincoat'],
  snow: ['gloves', 'padding'],
  heavyCoat: ['padding'],
  coat: ['padding'],
  jacket: ['windbreaker'],
  layers: ['windbreaker'],
  hot: ['fan'],
  sunscreen: ['sunscreen'],
}

const KIDS_NOTE = /아이|아기|유아|어린이|유모차|\bkids?\b|child|toddler|baby|stroller|子供|子ども|赤ちゃん|ベビーカー|小孩|孩子|嬰兒/i
export const LONG_HAUL_KM = 3000

/** 이번 여행에 추천할 제품 종류 (중요한 순서, 중복 없음) */
export function recommendGear(trip: Trip, weather: DayWeather[], home: string): GearItem[] {
  const out: GearItem[] = []
  const add = (id: GearId, why: string) => {
    if (!out.some((x) => x.id === id)) out.push({ id, why })
  }
  const p = trip.params

  // 1) 날씨
  for (const tip of packingList(weather)) for (const id of FROM_TIP[tip] ?? []) add(id, `weather_${tip}`)

  // 2) 해외
  if (isAbroad(trip, home)) {
    add('adapter', 'abroad')
    add('esim', 'abroad')
  }

  // 3) 장거리 비행
  const flight = flightRoute(trip, home)
  if (flight) {
    const a = airportDestination(flight.from)
    const b = airportDestination(flight.to)
    if (a && b && distanceKm(a.lat, a.lng, b.lat, b.lng) >= LONG_HAUL_KM) add('neckpillow', 'longhaul')
    add('powerbank', 'flight')
  }

  // 4) 관심사·동행
  if (p.interests.includes('beach')) add('waterproof', 'beach')
  if (p.interests.includes('hiking') || p.interests.includes('nature')) add('daypack', 'outdoor')
  if (p.travelers === 'family' && (p.interests.includes('kids') || KIDS_NOTE.test(p.notes ?? ''))) add('kidskit', 'kids')

  // 5) 일정 길이
  if ((trip.itinerary?.days.length ?? 0) >= 5) add('organizer', 'long')
  if (!flight) add('powerbank', 'always')
  return out
}

export type Shop = 'coupang' | 'amazon' | 'amazonjp' | 'shopee' | 'klook'

export interface ShopLink {
  shop: Shop
  url: string
}

const withTag = (url: string, tag: string) => (tag ? `${url}&tag=${encodeURIComponent(tag)}` : url)

/** 제품 종류 → 쇼핑몰 검색 링크 (언어권별 쇼핑몰). eSIM 은 판매처가 여행 플랫폼이라 Klook 으로 보낸다 */
export function shopLinks(id: GearId, query: string, locale: string): ShopLink[] {
  const q = encodeURIComponent(query)
  if (id === 'esim') {
    const base = `https://www.klook.com/search/result/?query=${q}`
    return [{ shop: 'klook', url: appendQuery(base, ENV.affiliate.klook) }]
  }
  switch (locale) {
    case 'ko':
      return [{ shop: 'coupang', url: `https://www.coupang.com/np/search?q=${q}` }]
    case 'ja':
      return [{ shop: 'amazonjp', url: withTag(`https://www.amazon.co.jp/s?k=${q}`, ENV.affiliate.amazonJp) }]
    case 'zh-TW':
      return [{ shop: 'shopee', url: `https://shopee.tw/search?keyword=${q}` }]
    default:
      return [{ shop: 'amazon', url: withTag(`https://www.amazon.com/s?k=${q}`, ENV.affiliate.amazon) }]
  }
}
