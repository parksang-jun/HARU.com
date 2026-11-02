// 표시 통화 — 목업 가격 환산용 대략 환율(1 USD 기준). 실제 가격은 파트너 사이트 기준.
import type { Locale } from '../i18n'

export const USD_RATES: Record<string, number> = {
  USD: 1,
  KRW: 1400,
  JPY: 152,
  TWD: 32,
  HKD: 7.8,
  EUR: 0.92,
}

export function displayCurrency(locale: Locale): string {
  if (locale === 'ko') return 'KRW'
  if (locale === 'ja') return 'JPY'
  if (locale === 'zh-TW') return 'TWD'
  return 'USD'
}

/** USD 금액을 표시 통화로 환산 후 통화별 단위로 반올림 */
export function fromUsd(usd: number, currency: string): number {
  const rate = USD_RATES[currency] ?? 1
  const v = usd * rate
  if (currency === 'KRW') return Math.round(v / 100) * 100
  if (currency === 'JPY' || currency === 'TWD') return Math.round(v / 10) * 10
  return Math.round(v)
}
