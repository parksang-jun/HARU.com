// 호텔 검색 — 목업(결정적 샘플) 또는 Edge Function(search-hotels → Agoda Affiliate Lite API)
// 예약은 제휴 파트너(아고다·부킹닷컴·트립닷컴·익스피디아)로 연결
import type { Locale } from '../i18n'
import { appendQuery } from './affiliate'
import { costIndex, getDestination } from './destinations'
import { ENV } from './env'
import { displayCurrency, fromUsd } from './fx'
import { daysBetween } from './itinerary'
import { between, seeded } from './rng'
import { ensureSession, getSupabase } from './supabase'

export interface HotelQuery {
  destId: string
  checkIn: string // YYYY-MM-DD
  checkOut: string // YYYY-MM-DD
  adults: number
  rooms: number
}

export interface Hotel {
  id: string
  name: string
  stars: number // 0–5
  reviewScore?: number // 0–10
  reviewCount?: number
  area?: string
  distanceKm?: number // 도심에서
  pricePerNight: number // 객실 1개 1박, 표시 통화
  crossedOut?: number // 할인 전 가격
  currency: string
  freeCancel?: boolean
  breakfast?: boolean
  freeWifi?: boolean
  imageUrl?: string
  hue: number // 이미지 없을 때 플레이스홀더 색
  source: 'sample' | 'agoda'
  bookUrl?: string // 실데이터일 때 파트너 딥링크(제휴 추적 포함)
}

export type HotelPartner = 'agoda' | 'booking' | 'trip' | 'expedia'
export const HOTEL_PARTNERS: HotelPartner[] = ['agoda', 'booking', 'trip', 'expedia']

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function nightsOf(q: Pick<HotelQuery, 'checkIn' | 'checkOut'>): number {
  return Math.max(0, daysBetween(q.checkIn, q.checkOut) - 1)
}

export function validateHotelQuery(q: HotelQuery): 'errDest' | 'errDates' | null {
  if (!getDestination(q.destId)) return 'errDest'
  if (!DATE_RE.test(q.checkIn) || !DATE_RE.test(q.checkOut)) return 'errDates'
  const n = nightsOf(q)
  if (n < 1 || n > 30) return 'errDates'
  if (q.adults < 1 || q.adults > 16 || q.rooms < 1 || q.rooms > 8 || q.rooms > q.adults) return 'errDates'
  return null
}

// ---------- 딥링크 ----------
function agodaLocale(l: Locale) {
  return l === 'ko' ? 'ko-kr' : l === 'ja' ? 'ja-jp' : l === 'zh-TW' ? 'zh-tw' : 'en-us'
}
function bookingLang(l: Locale) {
  return l === 'ko' ? 'ko' : l === 'ja' ? 'ja' : l === 'zh-TW' ? 'zh-tw' : 'en-us'
}
function tripLocale(l: Locale) {
  return l === 'ko' ? 'ko-KR' : l === 'ja' ? 'ja-JP' : l === 'zh-TW' ? 'zh-TW' : 'en-US'
}

/** 파트너 호텔 검색 딥링크 — hotelName 이 있으면 해당 호텔명으로 검색 */
export function hotelPartnerUrl(partner: HotelPartner, q: HotelQuery, locale: Locale, hotelName?: string): string {
  const dst = getDestination(q.destId)
  const city = dst?.name.en ?? q.destId
  const text = encodeURIComponent(hotelName ? `${hotelName}, ${city}` : city)
  const nights = Math.max(1, nightsOf(q))
  const cur = displayCurrency(locale)
  switch (partner) {
    case 'agoda':
      return appendQuery(
        `https://www.agoda.com/search?textToSearch=${text}&checkIn=${q.checkIn}&los=${nights}&rooms=${q.rooms}&adults=${q.adults}&children=0&locale=${agodaLocale(locale)}&currencyCode=${cur}`,
        ENV.affiliate.agoda,
      )
    case 'booking':
      return appendQuery(
        `https://www.booking.com/searchresults.html?ss=${text}&checkin=${q.checkIn}&checkout=${q.checkOut}&group_adults=${q.adults}&no_rooms=${q.rooms}&group_children=0&lang=${bookingLang(locale)}&selected_currency=${cur}`,
        ENV.affiliate.booking,
      )
    case 'trip':
      // TODO: Trip.com 제휴 포털 딥링크 생성기로 형식 최종 확인
      return appendQuery(
        `https://www.trip.com/hotels/list?keyword=${text}&checkin=${q.checkIn.replace(/-/g, '/')}&checkout=${q.checkOut.replace(/-/g, '/')}&adult=${q.adults}&crn=${q.rooms}&locale=${tripLocale(locale)}&curr=${cur}`,
        ENV.affiliate.trip,
      )
    case 'expedia':
      return appendQuery(
        `https://www.expedia.com/Hotel-Search?destination=${text}&startDate=${q.checkIn}&endDate=${q.checkOut}&adults=${q.adults}&rooms=${q.rooms}`,
        ENV.affiliate.expedia,
      )
  }
}

// ---------- 목업 ----------
const GENERIC_AREAS = ['City Center', 'Old Town', 'Station Area', 'Waterfront']

const TEMPLATES: { name: (area: string, city: string) => string; stars: number }[] = [
  { name: (a) => `${a} Grand Hotel`, stars: 5 },
  { name: (a) => `Hotel ${a} Central`, stars: 4 },
  { name: (_a, c) => `${c} Garden Hotel`, stars: 4 },
  { name: (a) => `${a} Boutique Stay`, stars: 4 },
  { name: (a) => `The ${a} Plaza`, stars: 5 },
  { name: (_a, c) => `${c} Business Hotel`, stars: 3 },
  { name: (a) => `${a} Residence & Suites`, stars: 4 },
  { name: (_a, c) => `${c} Design Hotel`, stars: 3 },
  { name: (a) => `${a} Comfort Inn`, stars: 3 },
  { name: (_a, c) => `${c} Backpackers Hostel`, stars: 2 },
]

const STAR_USD: Record<number, number> = { 2: 38, 3: 78, 4: 135, 5: 255 }

/** 결정적 샘플 호텔 — 도시 물가 지수·성급 기반 대략 가격 (데모 표시용, 실존 호텔 아님) */
export function buildMockHotels(q: HotelQuery, locale: Locale): Hotel[] {
  const dst = getDestination(q.destId)
  if (!dst) return []
  const rand = seeded(`${q.destId}-${q.checkIn}-${q.checkOut}`)
  const areas = dst.areas?.length ? dst.areas : GENERIC_AREAS
  const currency = displayCurrency(locale)
  const city = dst.name.en.replace(/\s*\(.*\)$/, '')
  const month = Number(q.checkIn.slice(5, 7))
  const peak = [7, 8, 12].includes(month) ? 1.18 : [1, 2, 11].includes(month) ? 0.92 : 1
  return TEMPLATES.map((tpl, i) => {
    const area = areas[i % areas.length]
    const usd = STAR_USD[tpl.stars] * costIndex(dst) * peak * between(rand, 0.82, 1.22)
    const price = fromUsd(usd, currency)
    const discounted = rand() < 0.35
    const score = Math.min(9.6, Math.max(6.6, 6.4 + tpl.stars * 0.55 + between(rand, -0.6, 0.9)))
    return {
      id: `${q.destId}-h${i + 1}`,
      name: tpl.name(area, city),
      stars: tpl.stars,
      reviewScore: Math.round(score * 10) / 10,
      reviewCount: Math.round(between(rand, 120, 4800)),
      area,
      distanceKm: Math.round(between(rand, 0.3, 5.5) * 10) / 10,
      pricePerNight: price,
      crossedOut: discounted ? fromUsd(usd * between(rand, 1.15, 1.4), currency) : undefined,
      currency,
      freeCancel: rand() < 0.6,
      breakfast: tpl.stars >= 4 ? rand() < 0.6 : rand() < 0.25,
      freeWifi: true,
      hue: Math.round(between(rand, 0, 360)),
      source: 'sample' as const,
    }
  })
}

// ---------- 정렬·필터 ----------
export type HotelSort = 'recommended' | 'price' | 'rating'

export function filterSortHotels(list: Hotel[], opts: { sort: HotelSort; minStars: number; freeCancelOnly: boolean }): Hotel[] {
  const filtered = list.filter((h) => h.stars >= opts.minStars && (!opts.freeCancelOnly || h.freeCancel))
  if (opts.sort === 'price') return [...filtered].sort((a, b) => a.pricePerNight - b.pricePerNight)
  if (opts.sort === 'rating') return [...filtered].sort((a, b) => (b.reviewScore ?? 0) - (a.reviewScore ?? 0))
  // 추천: 평점 대비 가격(가성비) + 원래 순서 가중
  return [...filtered].sort((a, b) => score(b) - score(a))
}

function score(h: Hotel): number {
  return (h.reviewScore ?? 7) * 10 + h.stars * 4 - Math.log10(Math.max(1, h.pricePerNight)) * 6
}

// ---------- 검색 ----------
export class HotelSearchError extends Error {
  code: 'limit' | 'unavailable' | 'unsupported'
  constructor(code: 'limit' | 'unavailable' | 'unsupported') {
    super(code)
    this.code = code
  }
}

interface RemoteHotel {
  hotelId?: number
  hotelName?: string
  starRating?: number
  reviewScore?: number
  reviewCount?: number
  dailyRate?: number
  crossedOutRate?: number
  currency?: string
  imageURL?: string
  landingURL?: string
  includeBreakfast?: boolean
  freeWifi?: boolean
}

/** Agoda Lite API 결과 → Hotel */
export function normalizeRemoteHotels(raw: unknown): Hotel[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((r: RemoteHotel) => r && typeof r.hotelName === 'string' && typeof r.dailyRate === 'number')
    .map((r: RemoteHotel, i) => ({
      id: `agoda-${r.hotelId ?? i}`,
      name: r.hotelName!,
      stars: Math.max(0, Math.min(5, Math.round(Number(r.starRating) || 0))),
      reviewScore: typeof r.reviewScore === 'number' ? r.reviewScore : undefined,
      reviewCount: typeof r.reviewCount === 'number' ? r.reviewCount : undefined,
      pricePerNight: Math.round(r.dailyRate!),
      crossedOut: r.crossedOutRate && r.crossedOutRate > r.dailyRate! ? Math.round(r.crossedOutRate) : undefined,
      currency: r.currency ?? 'USD',
      breakfast: r.includeBreakfast,
      freeWifi: r.freeWifi,
      imageUrl: typeof r.imageURL === 'string' && r.imageURL.startsWith('https://') ? r.imageURL : undefined,
      hue: (Number(r.hotelId) || i * 37) % 360,
      source: 'agoda' as const,
      bookUrl: typeof r.landingURL === 'string' && /^https?:\/\//.test(r.landingURL) ? r.landingURL.replace(/^http:/, 'https:') : undefined,
    }))
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export async function searchHotels(q: HotelQuery, locale: Locale): Promise<Hotel[]> {
  if (ENV.mockAi) {
    await delay(400)
    return buildMockHotels(q, locale)
  }
  const sb = getSupabase()
  if (!sb) throw new HotelSearchError('unavailable')
  await ensureSession()
  const { data, error } = await sb.functions.invoke('search-hotels', { body: { query: q, currency: displayCurrency(locale), locale } })
  if (error) {
    const status = (error as { context?: Response }).context?.status
    throw new HotelSearchError(status === 429 ? 'limit' : status === 404 ? 'unsupported' : 'unavailable')
  }
  return normalizeRemoteHotels(data?.hotels)
}
