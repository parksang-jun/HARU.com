// 어필리에이트 링크 빌더 — 파트너별 검색 URL 템플릿 + 제휴 추적 파라미터(환경변수)
import type { PartnerId, ReserveProvider } from './itinerary'

export interface AffiliateConfig {
  klook: string
  booking: string
  agoda: string
  trip: string
  getyourguide: string
  expedia: string
  creatripUrl: string
  trazyUrl: string
  nolUrl: string
}

export const EMPTY_AFFILIATE: AffiliateConfig = {
  klook: '',
  booking: '',
  agoda: '',
  trip: '',
  getyourguide: '',
  expedia: '',
  creatripUrl: '',
  trazyUrl: '',
  nolUrl: '',
}

/** 쿼리스트링을 URL 뒤에 안전하게 이어 붙임 */
export function appendQuery(url: string, qs: string): string {
  const clean = qs.replace(/^[?&]+/, '').trim()
  if (!clean) return url
  const hashIdx = url.indexOf('#')
  const base = hashIdx >= 0 ? url.slice(0, hashIdx) : url
  const hash = hashIdx >= 0 ? url.slice(hashIdx) : ''
  const sep = base.includes('?') ? (base.endsWith('?') || base.endsWith('&') ? '' : '&') : '?'
  return `${base}${sep}${clean}${hash}`
}

/** 파트너별 공개 검색 URL (제휴 파라미터 제외) */
export function partnerSearchUrl(partner: PartnerId, query: string, cfg: AffiliateConfig): string {
  const q = encodeURIComponent(query)
  switch (partner) {
    case 'klook':
      return `https://www.klook.com/search/result/?query=${q}`
    case 'trip':
      return `https://www.trip.com/global-search/searchlist/search/?keyword=${q}`
    case 'agoda':
      return `https://www.agoda.com/search?textToSearch=${q}`
    case 'booking':
      return `https://www.booking.com/searchresults.html?ss=${q}`
    case 'expedia':
      return `https://www.expedia.com/Hotel-Search?destination=${q}`
    case 'getyourguide':
      return `https://www.getyourguide.com/s/?q=${q}`
    // 아래 3곳은 제휴 승인 후 받은 랜딩 URL 을 그대로 사용 (검색 딥링크 형식 미확정) — TODO
    case 'creatrip':
      return cfg.creatripUrl || 'https://www.creatrip.com/en'
    case 'trazy':
      return cfg.trazyUrl || 'https://www.trazy.com/'
    case 'nol':
      return cfg.nolUrl || 'https://www.yanolja.com/'
  }
}

/** 제휴 파라미터가 붙은 최종 링크 */
export function buildAffiliateUrl(partner: PartnerId, query: string, cfg: AffiliateConfig): string {
  const base = partnerSearchUrl(partner, query, cfg)
  switch (partner) {
    case 'klook':
      return appendQuery(base, cfg.klook)
    case 'booking':
      return appendQuery(base, cfg.booking)
    case 'agoda':
      return appendQuery(base, cfg.agoda)
    case 'trip':
      return appendQuery(base, cfg.trip)
    case 'getyourguide':
      return appendQuery(base, cfg.getyourguide)
    case 'expedia':
      return appendQuery(base, cfg.expedia)
    default:
      return base
  }
}

/** 제휴 파라미터가 설정되었는지 (설정 안 된 파트너도 링크는 열리지만 수익 추적 불가) */
export function isPartnerConfigured(partner: PartnerId, cfg: AffiliateConfig): boolean {
  switch (partner) {
    case 'creatrip':
      return Boolean(cfg.creatripUrl)
    case 'trazy':
      return Boolean(cfg.trazyUrl)
    case 'nol':
      return Boolean(cfg.nolUrl)
    default:
      return Boolean(cfg[partner])
  }
}

/** 식당 예약 리드 링크 (예약 플랫폼 검색 페이지로 연결) */
export function reserveUrl(provider: ReserveProvider, query: string): string {
  const q = encodeURIComponent(query)
  if (provider === 'catchtable') return `https://app.catchtable.co.kr/ct/search?keyword=${q}` // TODO: Catchtable Global 제휴 시 딥링크 교체
  if (provider === 'google') return `https://www.google.com/maps/search/?api=1&query=${q}`
  return `https://map.naver.com/p/search/${q}`
}
