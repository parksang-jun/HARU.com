// 키-값 저장 — Capacitor Preferences (웹에서는 localStorage 기반)
import { Preferences } from '@capacitor/preferences'

export async function loadPref(key: string): Promise<string | null> {
  try {
    const { value } = await Preferences.get({ key })
    return value
  } catch {
    return null
  }
}

export async function savePref(key: string, value: string): Promise<void> {
  try {
    await Preferences.set({ key, value })
  } catch {
    // 저장 실패는 치명적이지 않음 (프라이빗 모드 등)
  }
}

export async function loadJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await loadPref(key)
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export async function saveJson(key: string, value: unknown): Promise<void> {
  await savePref(key, JSON.stringify(value))
}
