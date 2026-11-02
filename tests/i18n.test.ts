import { describe, expect, it } from 'vitest'
import { pickName, resolveLocale, translate } from '../src/i18n'
import en from '../src/i18n/en.json'
import ja from '../src/i18n/ja.json'
import ko from '../src/i18n/ko.json'
import zh from '../src/i18n/zh-TW.json'

function keys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) => (v && typeof v === 'object' ? keys(v as Record<string, unknown>, `${prefix}${k}.`) : [`${prefix}${k}`]))
}

describe('i18n', () => {
  it('all locales define the same keys as English', () => {
    const base = keys(en).sort()
    for (const dict of [ja, ko, zh]) {
      expect(keys(dict).sort()).toEqual(base)
    }
  })

  it('translates with interpolation', () => {
    expect(translate('en', 'common.days', { n: 3 })).toBe('3 days')
    expect(translate('ko', 'common.day', { n: 2 })).toBe('2일차')
    expect(translate('ja', 'nav.deals')).toBe('特典')
  })

  it('falls back to English, then to the key', () => {
    expect(translate('ja', 'legal.privacyTitle')).toBe('プライバシーポリシー')
    expect(translate('zh-TW', 'does.not.exist')).toBe('does.not.exist')
  })

  it('resolves browser locales', () => {
    expect(resolveLocale('ja-JP')).toBe('ja')
    expect(resolveLocale('zh-Hant-TW')).toBe('zh-TW')
    expect(resolveLocale('zh-CN')).toBe('zh-TW')
    expect(resolveLocale('ko-KR')).toBe('ko')
    expect(resolveLocale('fr')).toBe('en')
    expect(resolveLocale(undefined)).toBe('en')
  })

  it('picks localized names with fallback', () => {
    const n = { ko: '경복궁', en: 'Gyeongbokgung', ja: '景福宮' }
    expect(pickName(n, 'ja')).toBe('景福宮')
    expect(pickName(n, 'zh-TW')).toBe('Gyeongbokgung')
    expect(pickName(n, 'ko')).toBe('경복궁')
    expect(pickName(undefined, 'en')).toBe('')
  })
})
