// 항공권 검색 — 목업(결정적 샘플 운임) 또는 Edge Function(search-flights → Travelpayouts 운임 캐시)
// 예약은 제휴 파트너 사이트로 연결 (Trip.com·Skyscanner·Aviasales·Google 항공권·네이버 항공권)
import type { Locale } from '../i18n'
import { airportDestination, getAirline, airlinesOf, AIRLINES, type Airline } from './airports'
import { appendQuery } from './affiliate'
import { ENV } from './env'
import { displayCurrency, fromUsd } from './fx'
import { distanceKm } from './geo'
import { addDays } from './itinerary'
import { between, pick, seeded } from './rng'
import { ensureSession, getSupabase } from './supabase'

export type Cabin = 'economy' | 'premium' | 'business'
export const CABINS: Cabin[] = ['economy', 'premium', 'business']

export interface FlightQuery {
  from: string // IATA
  to: string // IATA
  depart: string // YYYY-MM-DD
  return?: string // 없으면 편도
  adults: number
  cabin: Cabin
}

export interface FlightLeg {
  depart: string // HH:MM (현지)
  arrive: string // HH:MM (현지)
  dayOffset: number // 도착일 - 출발일
  durationMin: number
  stops: number
  via?: string // 경유 공항
}

export interface FlightOffer {
  id: string
  airline: string // IATA 항공사 코드
  flightNo: string
  outbound: FlightLeg
  inbound?: FlightLeg
  price: number // 전체 인원, 표시 통화
  currency: string
  baggage: boolean // 위탁 수하물 포함 여부(추정)
  source: 'sample' | 'travelpayouts'
  bookUrl?: string // 실데이터일 때 파트너가 제공한 딥링크
}

export type FlightPartner = 'trip' | 'skyscanner' | 'aviasales' | 'google' | 'naver'
export const FLIGHT_PARTNERS: FlightPartner[] = ['trip', 'skyscanner', 'aviasales', 'google', 'naver']

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function validateFlightQuery(q: FlightQuery): 'errAirport' | 'errSame' | 'errDates' | null {
  if (!airportDestination(q.from) || !airportDestination(q.to)) return 'errAirport'
  if (q.from === q.to) return 'errSame'
  if (!DATE_RE.test(q.depart)) return 'errDates'
  if (q.return !== undefined && (!DATE_RE.test(q.return) || q.return < q.depart)) return 'errDates'
  if (q.adults < 1 || q.adults > 9) return 'errDates'
  return null
}

// ---------- 딥링크 ----------
const yymmdd = (iso: string) => iso.slice(2).replace(/-/g, '')
const ddmm = (iso: string) => `${iso.slice(8, 10)}${iso.slice(5, 7)}`
const compact = (iso: string) => iso.replace(/-/g, '')

function skyscannerHost(locale: Locale): string {
  if (locale === 'ko') return 'www.skyscanner.co.kr'
  if (locale === 'ja') return 'www.skyscanner.jp'
  if (locale === 'zh-TW') return 'www.skyscanner.com.tw'
  return 'www.skyscanner.net'
}

function tripLocale(locale: Locale): string {
  return locale === 'ko' ? 'ko-KR' : locale === 'ja' ? 'ja-JP' : locale === 'zh-TW' ? 'zh-TW' : 'en-US'
}

/** 파트너별 항공권 검색 딥링크 (제휴 파라미터 포함) */
export function flightPartnerUrl(partner: FlightPartner, q: FlightQuery, locale: Locale): string {
  const rt = Boolean(q.return)
  const cur = displayCurrency(locale)
  switch (partner) {
    case 'trip': {
      // TODO: Trip.com 제휴 포털의 딥링크 생성기로 형식 최종 확인
      const cls = q.cabin === 'business' ? 'c' : q.cabin === 'premium' ? 's' : 'y'
      const url =
        `https://www.trip.com/flights/showfarefirst?dcity=${q.from.toLowerCase()}&acity=${q.to.toLowerCase()}&ddate=${q.depart}` +
        `${rt ? `&rdate=${q.return}` : ''}&triptype=${rt ? 'rt' : 'ow'}&class=${cls}&quantity=${q.adults}&locale=${tripLocale(locale)}&curr=${cur}`
      return appendQuery(url, ENV.affiliate.trip)
    }
    case 'skyscanner': {
      const cls = q.cabin === 'business' ? 'business' : q.cabin === 'premium' ? 'premiumeconomy' : 'economy'
      const url = `https://${skyscannerHost(locale)}/transport/flights/${q.from.toLowerCase()}/${q.to.toLowerCase()}/${yymmdd(q.depart)}/${rt ? `${yymmdd(q.return!)}/` : ''}?adultsv2=${q.adults}&cabinclass=${cls}`
      return appendQuery(url, ENV.affiliate.skyscanner)
    }
    case 'aviasales': {
      // 형식: ORIGIN DDMM DEST [DDMM] ADULTS — 제휴 marker 파라미터로 추적
      const path = `${q.from}${ddmm(q.depart)}${q.to}${rt ? ddmm(q.return!) : ''}${q.adults}`
      const url = `https://www.aviasales.com/search/${path}${q.cabin === 'business' ? '?trip_class=1' : ''}`
      return ENV.affiliate.tpMarker ? appendQuery(url, `marker=${encodeURIComponent(ENV.affiliate.tpMarker)}`) : url
    }
    case 'google': {
      const text = `Flights from ${q.from} to ${q.to} on ${q.depart}${rt ? ` through ${q.return}` : ''}${q.cabin === 'business' ? ' business class' : ''}`
      const hl = locale === 'zh-TW' ? 'zh-TW' : locale
      return `https://www.google.com/travel/flights?q=${encodeURIComponent(text)}&hl=${hl}&curr=${cur}`
    }
    case 'naver': {
      // 네이버 항공권 (국내 사용자용 비교 링크, 수수료 없음) — TODO: URL 형식 주기적 확인
      const domestic = airportDestination(q.from)?.country === 'KR' && airportDestination(q.to)?.country === 'KR'
      const seg1 = `${q.from}-${q.to}-${compact(q.depart)}`
      const seg2 = rt ? `/${q.to}-${q.from}-${compact(q.return!)}` : ''
      const fare = q.cabin === 'business' ? 'C' : 'Y'
      return `https://flight.naver.com/flights/${domestic ? 'domestic' : 'international'}/${seg1}${seg2}?adult=${q.adults}&fareType=${fare}`
    }
  }
}

/** 로케일별 노출 파트너 (네이버는 한국어 사용자만) */
export function flightPartnersFor(locale: Locale): FlightPartner[] {
  return FLIGHT_PARTNERS.filter((p) => p !== 'naver' || locale === 'ko')
}

/** 수수료가 발생하는 파트너인지 (Google·네이버는 비교용 무수익 링크) */
export function isEarningFlightPartner(p: FlightPartner): boolean {
  return p === 'trip' || p === 'skyscanner' || p === 'aviasales'
}

// ---------- 목업 운임 ----------
function hhmm(totalMin: number): { text: string; dayOffset: number } {
  const dayOffset = Math.floor(totalMin / 1440)
  const m = ((totalMin % 1440) + 1440) % 1440
  return { text: `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`, dayOffset }
}

function carrierPool(fromCountry: string, toCountry: string): Airline[] {
  const own = [...airlinesOf(fromCountry), ...airlinesOf(toCountry)]
  return own.filter((a, i) => own.findIndex((b) => b.code === a.code) === i)
}

function hubCarriers(exclude: Set<string>): Airline[] {
  return AIRLINES.filter((a) => a.hub && !exclude.has(a.code))
}

/** 결정적 샘플 항공편 — 거리·항공사 유형·요일 기반 대략 운임 (데모 표시용) */
export function buildMockFlights(q: FlightQuery, locale: Locale): FlightOffer[] {
  const from = airportDestination(q.from)
  const to = airportDestination(q.to)
  if (!from || !to) return []
  const km = distanceKm(from.lat, from.lng, to.lat, to.lng)
  const rand = seeded(`${q.from}-${q.to}-${q.depart}-${q.return ?? ''}-${q.cabin}`)
  const currency = displayCurrency(locale)
  const domestic = from.country === to.country
  const tzDiffMin = Math.round((to.tz - from.tz) * 60)

  const blockMin = (dist: number) => Math.round((dist / 800) * 60 + 35)
  const directPossible = domestic || km < 3800 || km < 12500

  const own = carrierPool(from.country, to.country)
  const ownCodes = new Set(own.map((a) => a.code))
  const offers: FlightOffer[] = []

  const baseUsd = km < 2200 ? 35 + km * 0.09 : 120 + km * 0.055
  const cabinMul = q.cabin === 'business' ? 3.4 : q.cabin === 'premium' ? 1.7 : 1
  const dow = new Date(`${q.depart}T00:00:00Z`).getUTCDay()
  const dayMul = dow === 5 || dow === 6 ? 1.12 : dow === 2 || dow === 3 ? 0.93 : 1

  const makeLeg = (dist: number, stops: number, via: string | undefined, depMin: number, tzDiff: number): FlightLeg => {
    const layover = stops ? Math.round(between(rand, 80, 260)) : 0
    const dur = blockMin(dist) + (stops ? Math.round(dist * 0.06) + layover : 0)
    const arr = hhmm(depMin + dur + tzDiff)
    return { depart: hhmm(depMin).text, arrive: arr.text, dayOffset: arr.dayOffset, durationMin: dur, stops, via }
  }

  const departSlots = [6 * 60 + 40, 8 * 60 + 5, 9 * 60 + 30, 11 * 60, 13 * 60 + 25, 15 * 60 + 10, 17 * 60 + 45, 20 * 60 + 15, 22 * 60 + 30]

  // 직항 — 출발·도착 국가 항공사
  if (directPossible && own.length) {
    const directCount = Math.min(own.length, km < 3800 ? 6 : 3)
    const shuffled = [...own].sort(() => rand() - 0.5).slice(0, directCount)
    for (const al of shuffled) {
      const dep = pick(rand, departSlots)
      const lccMul = al.lcc ? 0.72 : 1
      const usd = baseUsd * lccMul * cabinMul * dayMul * between(rand, 0.85, 1.2)
      const out = makeLeg(km, 0, undefined, dep, tzDiffMin)
      const inbound = q.return ? makeLeg(km, 0, undefined, pick(rand, departSlots), -tzDiffMin) : undefined
      offers.push({
        id: `${al.code}-${offers.length}`,
        airline: al.code,
        flightNo: `${al.code}${100 + Math.floor(rand() * 899)}`,
        outbound: out,
        inbound,
        price: fromUsd(usd * (q.return ? 1.8 : 1) * q.adults, currency),
        currency,
        baggage: !al.lcc,
        source: 'sample',
      })
    }
  }

  // 경유 — 허브 항공사 (장거리·직항 적은 노선)
  if (!domestic && (km > 2500 || offers.length < 3)) {
    const hubs = hubCarriers(ownCodes)
      .filter((a) => {
        const hub = airportDestination(a.hub!)
        if (!hub || a.hub === q.from || a.hub === q.to) return false
        const viaKm = distanceKm(from.lat, from.lng, hub.lat, hub.lng) + distanceKm(hub.lat, hub.lng, to.lat, to.lng)
        return viaKm < km * 1.35
      })
      .sort(() => rand() - 0.5)
      .slice(0, 4)
    for (const al of hubs) {
      const dep = pick(rand, departSlots)
      const usd = baseUsd * 0.86 * cabinMul * dayMul * between(rand, 0.85, 1.15)
      offers.push({
        id: `${al.code}-${offers.length}`,
        airline: al.code,
        flightNo: `${al.code}${100 + Math.floor(rand() * 899)}`,
        outbound: makeLeg(km, 1, al.hub, dep, tzDiffMin),
        inbound: q.return ? makeLeg(km, 1, al.hub, pick(rand, departSlots), -tzDiffMin) : undefined,
        price: fromUsd(usd * (q.return ? 1.8 : 1) * q.adults, currency),
        currency,
        baggage: true,
        source: 'sample',
      })
    }
  }

  return offers.sort((a, b) => a.price - b.price)
}

// ---------- 정렬·필터 ----------
export type FlightSort = 'price' | 'duration' | 'depart'

export function sortFlights(list: FlightOffer[], sort: FlightSort): FlightOffer[] {
  const total = (o: FlightOffer) => o.outbound.durationMin + (o.inbound?.durationMin ?? 0)
  return [...list].sort((a, b) => {
    if (sort === 'duration') return total(a) - total(b) || a.price - b.price
    if (sort === 'depart') return a.outbound.depart.localeCompare(b.outbound.depart) || a.price - b.price
    return a.price - b.price
  })
}

// ---------- 검색 (목업 / Edge Function) ----------
export class FlightSearchError extends Error {
  code: 'limit' | 'unavailable'
  constructor(code: 'limit' | 'unavailable') {
    super(code)
    this.code = code
  }
}

interface RemoteOffer {
  airline?: string
  flight_number?: string | number
  departure_at?: string
  return_at?: string
  transfers?: number
  return_transfers?: number
  duration_to?: number
  duration_back?: number
  price?: number
  link?: string
}

function localHHMM(iso: string | undefined): string | null {
  const m = iso?.match(/T(\d{2}):(\d{2})/)
  return m ? `${m[1]}:${m[2]}` : null
}

/** Travelpayouts 응답 → FlightOffer (도착 시각은 소요시간+시차로 계산) */
export function normalizeRemoteOffers(raw: unknown, q: FlightQuery, currency: string, marker: string): FlightOffer[] {
  if (!Array.isArray(raw)) return []
  const from = airportDestination(q.from)
  const to = airportDestination(q.to)
  const tzDiff = from && to ? Math.round((to.tz - from.tz) * 60) : 0
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
  const out: FlightOffer[] = []
  raw.forEach((r: RemoteOffer, i) => {
    const dep = localHHMM(r.departure_at)
    if (!dep || typeof r.price !== 'number' || !r.airline) return
    const durTo = Math.max(30, Number(r.duration_to) || 0)
    const arr = hhmm(toMin(dep) + durTo + tzDiff)
    const offer: FlightOffer = {
      id: `tp-${i}`,
      airline: r.airline,
      flightNo: `${r.airline}${r.flight_number ?? ''}`,
      outbound: { depart: dep, arrive: arr.text, dayOffset: arr.dayOffset, durationMin: durTo, stops: Number(r.transfers) || 0 },
      price: Math.round(r.price * q.adults),
      currency,
      baggage: !getAirline(r.airline)?.lcc,
      source: 'travelpayouts',
    }
    const ret = localHHMM(r.return_at)
    if (q.return && ret) {
      const durBack = Math.max(30, Number(r.duration_back) || 0)
      const a2 = hhmm(toMin(ret) + durBack - tzDiff)
      offer.inbound = { depart: ret, arrive: a2.text, dayOffset: a2.dayOffset, durationMin: durBack, stops: Number(r.return_transfers) || 0 }
    }
    if (typeof r.link === 'string' && r.link.startsWith('/')) {
      const base = `https://www.aviasales.com${r.link}`
      offer.bookUrl = marker ? appendQuery(base, `marker=${encodeURIComponent(marker)}`) : base
    }
    out.push(offer)
  })
  return out
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export async function searchFlights(q: FlightQuery, locale: Locale): Promise<FlightOffer[]> {
  if (ENV.mockAi) {
    await delay(450)
    return buildMockFlights(q, locale)
  }
  const sb = getSupabase()
  if (!sb) throw new FlightSearchError('unavailable')
  await ensureSession()
  const currency = displayCurrency(locale)
  const { data, error } = await sb.functions.invoke('search-flights', { body: { query: q, currency, locale } })
  if (error) {
    const status = (error as { context?: Response }).context?.status
    throw new FlightSearchError(status === 429 ? 'limit' : 'unavailable')
  }
  return normalizeRemoteOffers(data?.offers, q, currency, ENV.affiliate.tpMarker)
}

/** 여행 일정 → 기본 항공권 검색 조건 */
export function tripFlightQuery(fromCode: string, toCode: string, start: string, end: string, adults: number): FlightQuery {
  return { from: fromCode, to: toCode, depart: start, return: end > start ? end : addDays(start, 1), adults: Math.min(9, Math.max(1, adults)), cabin: 'economy' }
}
