import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LangSwitch } from '../components/LangSwitch'
import { useI18n } from '../i18n/context'
import { ENV } from '../lib/env'
import { isAdmin } from '../lib/supabase'

export function MorePage() {
  const { t } = useI18n()
  const [admin, setAdmin] = useState(false)

  useEffect(() => {
    isAdmin().then(setAdmin)
  }, [])

  return (
    <>
      <h1>{t('more.title')}</h1>
      <div className="card list">
        <div className="row">
          <span>{t('more.language')}</span>
          <LangSwitch />
        </div>
        <div className="divider" />
        <Link to="/legal/privacy">{t('more.privacy')}</Link>
        <Link to="/legal/terms">{t('more.terms')}</Link>
        <Link to="/legal/ai">{t('more.ai')}</Link>
        {admin && <Link to="/admin">{t('more.admin')}</Link>}
        <div className="divider" />
        <div className="row small muted">
          <span>{t('more.mode')}</span>
          <span>{ENV.mockAi ? t('more.modeMock') : t('more.modeLive')}</span>
        </div>
        <div className="row small muted">
          <span>{t('more.version')}</span>
          <span>{ENV.version}</span>
        </div>
      </div>
      <p className="notice">{t('itin.affiliateDisclosure')}</p>
    </>
  )
}
