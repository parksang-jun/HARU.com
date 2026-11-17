// 짐 싸기 체크리스트 — 기본 준비물 + 날씨·여행에 맞춘 추천 + 직접 추가. 기기에 저장한다.
import type { GearItem } from './gear'
import { loadJson, saveJson } from './storage'

/** 기본 준비물 (문구 키 packing.item.*) */
export const BASE_ITEMS = ['id', 'cards', 'phone', 'charger', 'clothes', 'underwear', 'toiletries', 'medicine'] as const
export const ABROAD_ITEMS = ['passport', 'cash', 'insurance', 'bookings'] as const

export interface PackingState {
  checked: string[]
  custom: string[]
}
export const EMPTY_PACKING: PackingState = { checked: [], custom: [] }
const key = (tripId: string) => `packing:${tripId}`
export const loadPacking = (tripId: string) => loadJson<PackingState>(key(tripId), EMPTY_PACKING)
export const savePacking = (tripId: string, s: PackingState) => saveJson(key(tripId), s)

export interface PackingItem {
  /** 저장용 키: base:phone / gear:umbrella / custom:… */
  key: string
  group: 'base' | 'abroad' | 'trip' | 'custom'
  /** 문구 키 (custom 은 label 사용) */
  i18n?: string
  label?: string
}

/** 이번 여행의 짐 목록: 기본 + (해외면) 출국용 + 날씨·여행 맞춤(제품 추천과 같은 근거) + 직접 추가 */
export function packingItems(gear: GearItem[], abroad: boolean, custom: string[]): PackingItem[] {
  return [
    ...BASE_ITEMS.map((k): PackingItem => ({ key: `base:${k}`, group: 'base', i18n: `packing.item.${k}` })),
    ...(abroad ? ABROAD_ITEMS.map((k): PackingItem => ({ key: `abroad:${k}`, group: 'abroad', i18n: `packing.item.${k}` })) : []),
    ...gear.filter((g) => g.id !== 'esim').map((g): PackingItem => ({ key: `gear:${g.id}`, group: 'trip', i18n: `gear.item.${g.id}` })),
    ...custom.map((c): PackingItem => ({ key: `custom:${c}`, group: 'custom', label: c })),
  ]
}

export function toggleItem(s: PackingState, k: string): PackingState {
  return { ...s, checked: s.checked.includes(k) ? s.checked.filter((x) => x !== k) : [...s.checked, k] }
}

export function addCustom(s: PackingState, name: string): PackingState {
  const n = name.trim().slice(0, 40)
  if (!n || s.custom.includes(n) || s.custom.length >= 40) return s
  return { ...s, custom: [...s.custom, n] }
}

export function removeCustom(s: PackingState, name: string): PackingState {
  return { custom: s.custom.filter((c) => c !== name), checked: s.checked.filter((k) => k !== `custom:${name}`) }
}
