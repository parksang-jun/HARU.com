// 여행 예산 추정 — 일정과 숙박만으로 대략의 현지 지출을 계산한다. 항공권은 넣지 않는다.
// 기준 금액은 서울 물가(=1.0)에서의 1인 1일 대략값(USD)이며, 여행지 물가 지수를 곱한다. 추정치이지 견적이 아니다.
import { COUNTRY_FACTS } from './countryTips'
import { costIndex, getDestination } from './destinations'
import { adultsFor, daysBetween, totalNights, type Budget, type Trip } from './itinerary'

/** 1인 1일 (USD, 서울 물가 기준) */
const DAILY: Record<Budget, { food: number; transit: number; activity: number }> = {
  saver: { food: 25, transit: 8, activity: 15 },
  standard: { food: 50, transit: 15, activity: 35 },
  premium: { food: 110, transit: 35, activity: 80 },
}
/** 객실 1개 1박 (USD, 서울 물가 기준) */
const NIGHTLY: Record<Budget, number> = { saver: 60, standard: 130, premium: 320 }

export type BudgetLine = 'stay' | 'food' | 'transit' | 'activity' | 'extra'
export interface BudgetEstimate {
  /** 항목별 금액 (USD, 일행 전체) */
  lines: Record<BudgetLine, number>
  totalUsd: number
  /** 현지에서 쓰는 돈 (숙박 제외) */
  onTripUsd: number
  people: number
  days: number
  nights: number
  rooms: number
}

export function estimateBudget(trip: Pick<Trip, 'params'>): BudgetEstimate {
  const p = trip.params
  const people = adultsFor(p.travelers)
  const days = daysBetween(p.startDate, p.endDate) // 양 끝 날짜 포함
  const nights = Math.max(0, totalNights(p))
  const rooms = Math.max(1, Math.ceil(people / 2))
  const costs = p.cities.map((c) => getDestination(c)).filter((d) => d !== undefined).map((d) => costIndex(d!))
  const cost = costs.length ? costs.reduce((a, b) => a + b, 0) / costs.length : 1
  const d = DAILY[p.budget]
  const round = (n: number) => Math.round(n)
  const stay = round(NIGHTLY[p.budget] * cost * nights * rooms)
  const food = round(d.food * cost * days * people)
  const transit = round(d.transit * cost * days * people)
  const activity = round(d.activity * cost * days * people)
  const extra = round((food + transit + activity) * 0.1) // 기념품·예비비
  const onTripUsd = food + transit + activity + extra
  return { lines: { stay, food, transit, activity, extra }, totalUsd: stay + onTripUsd, onTripUsd, people, days, nights, rooms }
}

/** 현금으로 준비할 비율 — 현금 위주 나라는 많이, 카드·간편결제 위주 나라는 적게 */
export function cashShare(country: string): number {
  const pay = COUNTRY_FACTS[country]?.pay
  return pay === 'cash' ? 0.6 : pay === 'card' || pay === 'mobile' ? 0.2 : 0.4
}
