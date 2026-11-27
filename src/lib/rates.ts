// 환율 — Frankfurter(무료·키 없음·상업 이용 가능, 중앙은행 기준 환율, 하루 한 번 갱신). 하루 동안 기기에 저장해 다시 쓴다.
// 불러오지 못하면 대략값 표로 계산하고, 화면에 "대략 환율"이라고 표시한다.
import { ENV } from './env'
import { loadJson, saveJson } from './storage'

export interface Rates {
  /** 기준 통화 — rates[X] 는 기준 통화 1 단위당 X 금액 */
  base: string
  date: string
  rates: Record<string, number>
  /** 실제 환율이면 true, 대략값이면 false */
  live: boolean
}

/** 1 USD 당 대략값 (오프라인·테스트 베드용. 실제 환율 아님) */
export const APPROX_PER_USD: Record<string, number> = {
  USD: 1, KRW: 1400, JPY: 152, TWD: 32, HKD: 7.8, MOP: 8, CNY: 7.2, EUR: 0.92, GBP: 0.79, CHF: 0.88,
  THB: 35, VND: 25400, SGD: 1.34, MYR: 4.4, IDR: 16000, PHP: 58, KHR: 4100, LAK: 21500,
  AUD: 1.52, NZD: 1.68, CAD: 1.38, MXN: 18, AED: 3.67, TRY: 35, EGP: 49, CZK: 23, HUF: 360, ISK: 138, MNT: 3400, NPR: 134, MVR: 15.4,
}

export function approxRates(base: string): Rates {
  const b = APPROX_PER_USD[base] ?? 1
  return { base, date: '', live: false, rates: Object.fromEntries(Object.entries(APPROX_PER_USD).map(([c, v]) => [c, v / b])) }
}

/** 응답 해석 — {rates:{KRW:1.2}} 형식과 [{quote:'KRW', rate:1.2}] 형식을 모두 받는다 */
export function parseRates(json: unknown, base: string): Rates | null {
  const out: Record<string, number> = {}
  let date = ''
  const put = (code: unknown, rate: unknown) => {
    if (typeof code === 'string' && /^[A-Za-z]{3}$/.test(code) && typeof rate === 'number' && rate > 0 && Number.isFinite(rate)) out[code.toUpperCase()] = rate
  }
  if (Array.isArray(json)) {
    for (const r of json as Record<string, unknown>[]) {
      if (!r || typeof r !== 'object') continue
      put(r.quote ?? r.currency ?? r.code, r.rate ?? r.value)
      if (typeof r.date === 'string' && r.date > date) date = r.date
    }
  } else if (json && typeof json === 'object') {
    const o = json as Record<string, unknown>
    if (typeof o.date === 'string') date = o.date
    if (Array.isArray(o.rates) || Array.isArray(o.data)) return parseRates(o.rates ?? o.data, base)
    if (o.rates && typeof o.rates === 'object') for (const [k, v] of Object.entries(o.rates as Record<string, unknown>)) put(k, v)
  }
  if (!Object.keys(out).length) return null
  out[base] = 1
  return { base, date: date.slice(0, 10), rates: out, live: true }
}

/** 금액 환산. 환율이 없는 통화면 null */
export function convert(amount: number, from: string, to: string, r: Rates): number | null {
  if (from === to) return amount
  const a = r.rates[from]
  const b = r.rates[to]
  if (!a || !b) return null
  return (amount / a) * b
}

const today = () => new Date().toISOString().slice(0, 10)
const cacheKey = (base: string) => `rates:${base}`

export async function loadRates(base: string, currencies: string[]): Promise<Rates> {
  const want = [...new Set(currencies.filter((c) => c !== base))]
  if (ENV.mockAi) return approxRates(base)
  const cached = await loadJson<(Rates & { fetched?: string }) | null>(cacheKey(base), null)
  if (cached?.live && cached.fetched === today() && want.every((c) => cached.rates[c])) return cached
  const tryFetch = async (url: string): Promise<Rates | null> => {
    try {
      const res = await fetch(url)
      if (!res.ok) return null
      return parseRates(await res.json(), base)
    } catch {
      return null
    }
  }
  const q = want.join(',')
  const got = (await tryFetch(`https://api.frankfurter.dev/v2/rates?base=${base}${q ? `&quotes=${q}` : ''}`)) ?? (await tryFetch(`https://api.frankfurter.dev/v1/latest?base=${base}${q ? `&symbols=${q}` : ''}`))
  if (got) {
    await saveJson(cacheKey(base), { ...got, fetched: today() })
    return got
  }
  // 오늘 것을 못 받으면 저장해 둔 지난 환율이라도 쓴다 (날짜가 함께 표시된다)
  return cached?.live ? cached : approxRates(base)
}
