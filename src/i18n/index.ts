// i18n 코어 — React 의존 없음 (테스트에서 직접 사용)
import en from './en.json'
import ja from './ja.json'
import ko from './ko.json'
import zhTW from './zh-TW.json'

export type Locale = 'en' | 'ja' | 'zh-TW' | 'ko'

export const LOCALES: { code: Locale; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'zh-TW', label: '繁體中文' },
  { code: 'ko', label: '한국어' },
]

type Dict = Record<string, unknown>

const DICTS: Record<Locale, Dict> = { en, ja, 'zh-TW': zhTW, ko }

/** 점 표기 키로 중첩 객체 탐색 */
function lookup(dict: Dict, key: string): string | undefined {
  let node: unknown = dict
  for (const part of key.split('.')) {
    if (node === null || typeof node !== 'object') return undefined
    node = (node as Dict)[part]
  }
  return typeof node === 'string' ? node : undefined
}

/** {name} 형태 치환 */
function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (_, k: string) => (params[k] === undefined ? `{${k}}` : String(params[k])))
}

/** 번역 — 해당 로케일에 없으면 영어, 영어에도 없으면 키 그대로 반환 */
export function translate(locale: Locale, key: string, params?: Record<string, string | number>): string {
  const text = lookup(DICTS[locale], key) ?? lookup(DICTS.en, key) ?? key
  return interpolate(text, params)
}

/** navigator.language → 지원 로케일 매핑 */
export function resolveLocale(input: string | undefined | null): Locale {
  const tag = (input ?? '').toLowerCase()
  if (tag.startsWith('ko')) return 'ko'
  if (tag.startsWith('ja')) return 'ja'
  if (tag.startsWith('zh')) return 'zh-TW'
  return 'en'
}

/** 장소명 등 다국어 필드에서 로케일에 맞는 값 선택 (zh-TW 키는 'zh' 로 저장) */
export function pickName(names: { ko?: string; en?: string; ja?: string; zh?: string } | undefined, locale: Locale): string {
  if (!names) return ''
  const key = locale === 'zh-TW' ? 'zh' : locale
  return names[key] || names.en || names.ko || ''
}

/** 로케일별 Intl 태그 */
export function intlTag(locale: Locale): string {
  return locale === 'zh-TW' ? 'zh-TW' : locale
}
