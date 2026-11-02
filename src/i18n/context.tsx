// React 용 i18n 컨텍스트
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { loadPref, savePref } from '../lib/storage'
import { intlTag, resolveLocale, translate, type Locale } from './index'

interface I18nValue {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: string, params?: Record<string, string | number>) => string
  formatDate: (iso: string) => string
  formatKrw: (amount: number) => string
  /** 통화별 금액 표기 (KRW·JPY 등 소수점 없는 통화 자동 처리) */
  formatMoney: (amount: number, currency: string) => string
}

const I18nContext = createContext<I18nValue | null>(null)

const PREF_KEY = 'locale'

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => resolveLocale(typeof navigator !== 'undefined' ? navigator.language : 'en'))

  // 저장된 언어 설정 복원
  useEffect(() => {
    loadPref(PREF_KEY).then((saved) => {
      if (saved) setLocaleState(resolveLocale(saved))
    })
  }, [])

  useEffect(() => {
    document.documentElement.lang = intlTag(locale)
  }, [locale])

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    void savePref(PREF_KEY, l)
  }, [])

  const value = useMemo<I18nValue>(
    () => ({
      locale,
      setLocale,
      t: (key, params) => translate(locale, key, params),
      formatDate: (iso) => {
        const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso)
        return new Intl.DateTimeFormat(intlTag(locale), { month: 'short', day: 'numeric', weekday: 'short' }).format(d)
      },
      formatKrw: (amount) => new Intl.NumberFormat(intlTag(locale), { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(amount),
      formatMoney: (amount, currency) => {
        try {
          const big = amount >= 100 || ['KRW', 'JPY', 'VND', 'IDR', 'TWD', 'HUF', 'ISK', 'LAK', 'MNT'].includes(currency)
          return new Intl.NumberFormat(intlTag(locale), { style: 'currency', currency, maximumFractionDigits: big ? 0 : 2 }).format(amount)
        } catch {
          return `${Math.round(amount).toLocaleString()} ${currency}`
        }
      },
    }),
    [locale, setLocale],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
