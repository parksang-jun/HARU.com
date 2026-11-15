// 점심·저녁 선택 — 날마다 끼니별로 고른 후보 번호를 기기에 저장한다
import type { DayMeals, ItineraryDay, MealOption, MealSlot } from './itinerary'
import { loadJson, saveJson } from './storage'

/** 일차(day) → 끼니별로 고른 후보 번호 */
export type MealPicks = Record<string, Partial<Record<MealSlot, number>>>

const key = (tripId: string) => `meals:${tripId}`

export const loadMealPicks = (tripId: string) => loadJson<MealPicks>(key(tripId), {})
export const saveMealPicks = (tripId: string, picks: MealPicks) => saveJson(key(tripId), picks)

/** 같은 후보를 다시 누르면 선택을 푼다 */
export function togglePick(picks: MealPicks, day: number, slot: MealSlot, idx: number): MealPicks {
  const cur = picks[day] ?? {}
  const next = { ...cur }
  if (cur[slot] === idx) delete next[slot]
  else next[slot] = idx
  return { ...picks, [day]: next }
}

/** 그날 고른 식당 (안 골랐거나 번호가 범위를 벗어나면 undefined) */
export function chosenMeal(day: Pick<ItineraryDay, 'day' | 'meals'>, slot: MealSlot, picks: MealPicks): MealOption | undefined {
  const idx = picks[day.day]?.[slot]
  return idx === undefined ? undefined : day.meals?.[slot][idx]
}

export const hasMeals = (m: DayMeals | undefined): m is DayMeals => Boolean(m && (m.lunch.length || m.dinner.length))
