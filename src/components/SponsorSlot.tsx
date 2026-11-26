// 스폰서 칸 — '광고' 표시 필수. 광고주가 없으면 아무것도 그리지 않는다
import { useEffect, useState } from 'react'
import { useI18n } from '../i18n/context'
import { getDestination } from '../lib/destinations'
import type { Trip } from '../lib/itinerary'
import { openExternal } from '../lib/openUrl'
import { loadSponsor, logSponsor, type SlotId, type Sponsor } from '../lib/sponsors'

export function SponsorSlot({ slot, trip }: { slot: SlotId; trip: Trip }) {
  const { t, locale } = useI18n()
  const [ad, setAd] = useState<Sponsor | null>(null)
  const countries = [...new Set(trip.params.cities.map((c) => getDestination(c)?.country ?? ''))].filter(Boolean).join(',')

  useEffect(() => {
    let alive = true
    loadSponsor(slot, countries.split(',').filter(Boolean), locale)
      .then((s) => {
        if (!alive) return
        setAd(s)
        if (s) void logSponsor(s, 'impression', trip.id)
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [slot, countries, locale, trip.id])

  if (!ad) return null
  const title = ad.sample ? t(`sponsor.sample.${slot}.title`) : ad.title
  const body = ad.sample ? t(`sponsor.sample.${slot}.body`) : ad.body
  return (
    <aside className="sponsor" data-testid="sponsor-slot" data-slot={slot} data-sample={ad.sample ? '1' : '0'}>
      <div className="sponsor__head">
        <span className="badge badge--sponsored">{t('common.sponsored')}</span>
        {ad.sample ? <span className="badge badge--cat">{t('common.sample')}</span> : <span className="xs muted">{ad.advertiser}</span>}
      </div>
      <strong>{title}</strong>
      {body && <p className="xs muted">{body}</p>}
      {!ad.sample && (
        <button
          type="button"
          className="btn btn--sm"
          onClick={async () => {
            await logSponsor(ad, 'click', trip.id)
            await openExternal(ad.link)
          }}
        >
          {ad.cta || t('deals.open')}
        </button>
      )}
    </aside>
  )
}
