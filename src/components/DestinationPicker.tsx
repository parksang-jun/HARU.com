// 여행지 다중 선택 — 검색 + 지역 탭(국내·일본·중화권·동남아·유럽·미주·대양주·중동/기타) + 선택 순서 표시
import { useMemo, useState } from 'react'
import { useI18n } from '../i18n/context'
import { DESTINATIONS, destName, REGIONS, searchDestinations, type Region } from '../lib/destinations'
import { MAX_CITIES } from '../lib/itinerary'

interface Props {
  value: string[]
  onChange: (ids: string[]) => void
  initialRegion?: Region
}

export function DestinationPicker({ value, onChange, initialRegion = 'korea' }: Props) {
  const { t, locale } = useI18n()
  const [region, setRegion] = useState<Region>(initialRegion)
  const [q, setQ] = useState('')

  const list = useMemo(() => (q.trim() ? searchDestinations(q) : DESTINATIONS.filter((d) => d.region === region)), [q, region])

  const toggle = (id: string) => {
    if (value.includes(id)) onChange(value.filter((x) => x !== id))
    else if (value.length < MAX_CITIES) onChange([...value, id])
  }

  return (
    <section className="field">
      <span className="field__label">{t('setup.city')}</span>

      {value.length > 0 && (
        <div className="route" data-testid="selected-cities">
          {value.map((id, i) => (
            <span key={id} className="route__stop">
              {i > 0 && <span className="route__arrow">→</span>}
              <button type="button" className="chip chip--sm is-on" onClick={() => toggle(id)} aria-label={t('setup.remove', { city: destName(id, locale) })}>
                {destName(id, locale)} ✕
              </button>
            </span>
          ))}
        </div>
      )}

      <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('setup.destSearch')} data-testid="dest-search" />

      {!q.trim() && (
        <div className="region-tabs" role="tablist">
          {REGIONS.map((r) => (
            <button key={r} type="button" role="tab" aria-selected={r === region} className={`region-tab${r === region ? ' is-on' : ''}`} onClick={() => setRegion(r)} data-testid={`region-${r}`}>
              {t(`region.${r}`)}
            </button>
          ))}
        </div>
      )}

      <div className="chips">
        {list.length === 0 && <span className="muted small">{t('common.noMatch')}</span>}
        {list.map((d) => (
          <button key={d.id} type="button" className={`chip${value.includes(d.id) ? ' is-on' : ''}`} onClick={() => toggle(d.id)} data-testid={`city-${d.id}`} disabled={!value.includes(d.id) && value.length >= MAX_CITIES}>
            {destName(d.id, locale)}
          </button>
        ))}
      </div>
      <span className="xs muted">{t('setup.cityHint', { n: MAX_CITIES })}</span>
    </section>
  )
}
