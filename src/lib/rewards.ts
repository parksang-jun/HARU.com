// 보상형 광고 — 하루 무료 횟수를 다 쓰면 광고를 보고 횟수를 더 받는다.
// 광고를 보여 줄 수 없는 환경(광고 꺼짐, 일반 웹)에서는 제한을 걸지 않는다 — 막기만 하고 풀 방법이 없으면 안 되므로.
import { Capacitor } from '@capacitor/core'
import { ENV } from './env'
import { loadJson, saveJson } from './storage'

export type RewardKind = 'regen' | 'chat'

/** 하루 무료 횟수 / 광고 한 번에 받는 횟수 / 하루에 볼 수 있는 광고 수 */
export const REWARD_RULES: Record<RewardKind, { free: number; perAd: number; maxAds: number }> = {
  regen: { free: 1, perAd: 1, maxAds: 2 },
  chat: { free: 10, perAd: 5, maxAds: 5 },
}

export interface RewardState {
  day: string
  used: Record<RewardKind, number>
  ads: Record<RewardKind, number>
}

export const emptyRewards = (day: string): RewardState => ({ day, used: { regen: 0, chat: 0 }, ads: { regen: 0, chat: 0 } })
const today = (now: Date = new Date()) => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

/** 남은 횟수 */
export function remaining(s: RewardState, kind: RewardKind): number {
  const r = REWARD_RULES[kind]
  return Math.max(0, r.free + s.ads[kind] * r.perAd - s.used[kind])
}
/** 오늘 광고를 더 볼 수 있는지 */
export const canWatch = (s: RewardState, kind: RewardKind): boolean => s.ads[kind] < REWARD_RULES[kind].maxAds
export const spend = (s: RewardState, kind: RewardKind): RewardState => ({ ...s, used: { ...s.used, [kind]: s.used[kind] + 1 } })
export const grant = (s: RewardState, kind: RewardKind): RewardState => (canWatch(s, kind) ? { ...s, ads: { ...s.ads, [kind]: s.ads[kind] + 1 } } : s)

const KEY = 'rewards'
export async function loadRewards(now: Date = new Date()): Promise<RewardState> {
  const s = await loadJson<RewardState | null>(KEY, null)
  return s && s.day === today(now) && s.used && s.ads ? s : emptyRewards(today(now))
}
export const saveRewards = (s: RewardState) => saveJson(KEY, s)

/** 보상형 광고를 쓰는 환경인지: 네이티브 앱, 또는 테스트 베드(광고 대신 미리보기 화면) */
export function rewardsActive(): boolean {
  return ENV.admobEnabled && (Capacitor.isNativePlatform() || ENV.mockAi)
}
/** 테스트 베드: 실제 광고 대신 미리보기 화면을 보여 준다 */
export const rewardPreview = (): boolean => ENV.admobEnabled && ENV.mockAi && !Capacitor.isNativePlatform()
