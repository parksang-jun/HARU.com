import { useI18n } from '../i18n/context'
import type { ItineraryDay } from '../lib/itinerary'

export function DayTabs({ days, index, onChange }: { days: ItineraryDay[]; index: number; onChange: (i: number) => void }) {
  const { t, formatDate } = useI18n()
  return (
    <div className="day-tabs" role="tablist" data-testid="day-tabs">
      {days.map((d, i) => (
        <button key={d.day} type="button" role="tab" aria-selected={i === index} className={`day-tab${i === index ? ' is-active' : ''}`} onClick={() => onChange(i)} data-testid="day-tab">
          <span className="day-tab__n">{t('common.day', { n: d.day })}</span>
          <span className="day-tab__d">{formatDate(d.date)}</span>
        </button>
      ))}
    </div>
  )
}
