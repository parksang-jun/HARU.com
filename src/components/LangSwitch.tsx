import { useI18n } from '../i18n/context'
import { LOCALES, type Locale } from '../i18n'

export function LangSwitch() {
  const { locale, setLocale, t } = useI18n()
  return (
    <select
      className="select"
      style={{ width: 'auto', minHeight: 36, padding: '4px 8px', fontSize: 13 }}
      aria-label={t('more.language')}
      value={locale}
      onChange={(e) => setLocale(e.target.value as Locale)}
    >
      {LOCALES.map((l) => (
        <option key={l.code} value={l.code}>
          {l.label}
        </option>
      ))}
    </select>
  )
}
