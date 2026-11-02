import { Navigate, useParams } from 'react-router-dom'
import { useI18n } from '../i18n/context'
import { LEGAL, type LegalDoc } from '../lib/legal'

const TITLE_KEY: Record<LegalDoc, string> = { privacy: 'legal.privacyTitle', terms: 'legal.termsTitle', ai: 'legal.aiTitle' }

export function LegalPage() {
  const { doc } = useParams<{ doc: string }>()
  const { t, locale } = useI18n()
  if (doc !== 'privacy' && doc !== 'terms' && doc !== 'ai') return <Navigate to="/more" replace />
  const sections = locale === 'ko' ? LEGAL[doc].ko : LEGAL[doc].en
  return (
    <>
      <h1>{t(TITLE_KEY[doc])}</h1>
      <div className="card prose">
        {sections.map((s) => (
          <section key={s.h}>
            <h3>{s.h}</h3>
            {s.p.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </section>
        ))}
      </div>
    </>
  )
}
