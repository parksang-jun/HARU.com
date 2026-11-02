// 비즈니스석 특가·땡처리 — 출발지 기준 가까운 출발일(기본 45일 이내) 비즈니스 운임을 할인율 순으로 모음
// 라이브: Edge Function `flight-deals` → Travelpayouts `get_latest_prices`(trip_class=1, 목적지 생략 = 전 노선)
// 할인율 = 노선 거리 기반 "평소 비즈니스 운임 추정치" 대비 (API 가 정가를 주지 않으므로 화면에 "추정 정가 대비" 표기)
import type { Locale } from '../i18n'
import { airportDestination, airlinesOf, bestAirportFor, getAirline } from './airports'
import { appendQuery } from './affiliate'
import { DESTINATIONS, type Region } from './destinations'
import { ENV } from './env'
import { displayCurrency, fromUsd } from './fx'
import { distanceKm } from './geo'
import { addDays } from './itinerary'
import { between, pick, seeded } from './rng'
import { ensureSession, getSupabase } from './supabase'
import type { FlightQuery } from './flights'

export interface FlightDeal {
  id: string
  from: string
  to: string
  cityId: string
  region: Region
  depart: string
  return?: string
  airline?: string
  stops: number
  price: number // 1인, 표시 통화
  usualPrice: number // 추정 평소 운임
  discountPct: number
  currency: string
  foundAt?: string
  source: 'sample' | 'travelpayouts'
}

/** 평소 비즈니스 왕복 운임 추정 (USD, 1인) — 거리 기반 */
export function typicalBusinessUsd(km: number, roundTrip = true): number {
  const oneWay = km < 2200 ? 180 + km * 0.32 : 520 + km * 0.21
  return oneWay * (roundTrip ? 1.75 : 1)
}

function daysFrom(today: string, iso: string): number {
  return Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000)
}

/** 결정적 샘플 땡처리 — 오늘 날짜·출발지로 시드 (데모 표시용) */
export function buildMockBusinessDeals(fromCode: string, today: string, locale: Locale): FlightDeal[] {
  const from = airportDestination(fromCode)
  if (!from) return []
  const rand = seeded(`deals-${fromCode}-${today}`)
  const currency = displayCurrency(locale)
  const candidates = DESTINATIONS.filter((d) => d.airports.length && d.country !== from.country)
  const deals: FlightDeal[] = []
  for (const dst of candidates) {
    if (rand() > 0.55) continue
    const to = bestAirportFor(dst.id)!
    const km = distanceKm(from.lat, from.lng, dst.lat, dst.lng)
    const lead = Math.round(between(rand, 2, 45))
    const depart = addDays(today, lead)
    const stay = km < 3000 ? Math.round(between(rand, 3, 6)) : Math.round(between(rand, 5, 12))
    const usual = typicalBusinessUsd(km)
    // 출발이 가까울수록 할인 폭이 큰 경향 (땡처리)
    const disc = Math.min(0.72, Math.max(0.18, between(rand, 0.15, 0.45) + (lead <= 7 ? 0.2 : lead <= 14 ? 0.1 : 0)))
    const carriers = [...airlinesOf(from.country), ...airlinesOf(dst.country)].filter((a) => !a.lcc)
    const al = carriers.length ? pick(rand, carriers) : undefined
    const stops = km > 9000 && rand() < 0.5 ? 1 : al && (al.country === from.country || al.country === dst.country) ? 0 : 1
    deals.push({
      id: `${to}-${depart}`,
      from: fromCode,
      to,
      cityId: dst.id,
      region: dst.region,
      depart,
      return: addDays(depart, stay),
      airline: al?.code,
      stops,
      price: fromUsd(usual * (1 - disc), currency),
      usualPrice: fromUsd(usual, currency),
      discountPct: Math.round(disc * 100),
      currency,
      source: 'sample',
    })
  }
  return deals.sort((a, b) => b.discountPct - a.discountPct)
}

interface RemoteDeal {
  value?: number
  origin?: string
  destination?: string
  depart_date?: string
  return_date?: string
  number_of_changes?: number
  found_at?: string
  trip_class?: number
}

/** Travelpayouts get_latest_prices 결과 → FlightDeal (카탈로그에 있는 도시만, 할인율 계산) */
export function normalizeRemoteDeals(raw: unknown, fromCode: string, today: string, currency: string, maxDays = 45): FlightDeal[] {
  if (!Array.isArray(raw)) return []
  const from = airportDestination(fromCode)
  if (!from) return []
  const best = new Map<string, FlightDeal>()
  for (const r of raw as RemoteDeal[]) {
    if (typeof r.value !== 'number' || !r.destination || !r.depart_date) continue
    const lead = daysFrom(today, r.depart_date)
    if (lead < 0 || lead > maxDays) continue
    const dst = airportDestination(r.destination) ?? DESTINATIONS.find((d) => d.airports.includes(r.destination!))
    if (!dst) continue
    const km = distanceKm(from.lat, from.lng, dst.lat, dst.lng)
    const usual = fromUsd(typicalBusinessUsd(km, Boolean(r.return_date)), currency)
    const discountPct = Math.round((1 - r.value / usual) * 100)
    if (discountPct < 10) continue
    const deal: FlightDeal = {
      id: `tp-${r.destination}-${r.depart_date}`,
      from: fromCode,
      to: r.destination,
      cityId: dst.id,
      region: dst.region,
      depart: r.depart_date,
      return: r.return_date || undefined,
      stops: Number(r.number_of_changes) || 0,
      price: Math.round(r.value),
      usualPrice: usual,
      discountPct,
      currency,
      foundAt: r.found_at,
      source: 'travelpayouts',
    }
    const prev = best.get(dst.id)
    if (!prev || prev.discountPct < deal.discountPct) best.set(dst.id, deal)
  }
  return [...best.values()].sort((a, b) => b.discountPct - a.discountPct)
}

/** 특가 → 항공권 검색 조건 (비즈니스, 성인 1) */
export function dealQuery(d: FlightDeal): FlightQuery {
  return { from: d.from, to: d.to, depart: d.depart, return: d.return, adults: 1, cabin: 'business' }
}

/** 특가 예약 링크 — Aviasales(비즈니스, marker) */
export function dealBookUrl(d: FlightDeal): string {
  const dd = (iso: string) => `${iso.slice(8, 10)}${iso.slice(5, 7)}`
  const url = `https://www.aviasales.com/search/${d.from}${dd(d.depart)}${d.to}${d.return ? dd(d.return) : ''}1?trip_class=1`
  return ENV.affiliate.tpMarker ? appendQuery(url, `marker=${encodeURIComponent(ENV.affiliate.tpMarker)}`) : url
}

export function airlineLabelCode(d: FlightDeal): string | undefined {
  return d.airline && getAirline(d.airline) ? d.airline : undefined
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export async function fetchBusinessDeals(fromCode: string, locale: Locale, today = new Date().toISOString().slice(0, 10)): Promise<FlightDeal[]> {
  if (ENV.mockAi) {
    await delay(350)
    return buildMockBusinessDeals(fromCode, today, locale)
  }
  const sb = getSupabase()
  if (!sb) throw new Error('unavailable')
  await ensureSession()
  const currency = displayCurrency(locale)
  const { data, error } = await sb.functions.invoke('flight-deals', { body: { from: fromCode, currency, locale } })
  if (error) throw error
  return normalizeRemoteDeals(data?.deals, fromCode, today, currency)
}
