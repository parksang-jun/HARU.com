// 오늘의 식사 — 점심·저녁 후보 가운데 하나씩 고른다
import { useI18n } from '../i18n/context'
import { pickName } from '../i18n'
import { reserveUrl } from '../lib/affiliate'
import { ENV } from '../lib/env'
import { MEAL_SLOTS, type DayMeals, type MealSlot } from '../lib/itinerary'
import { openExternal } from '../lib/openUrl'
import { RESERVE_STEPS, reservePlatforms } from '../lib/reserveGuide'
import type { Region } from '../lib/destinations'

interface Props {
  meals: DayMeals
  picked: Partial<Record<MealSlot, number>>
  onPick: (slot: MealSlot, idx: number) => void
  /** 여행지 나라·지역 (예약 서비스 안내용) */
  country: string
  region: Region
}

export function MealPicker({ meals, picked, onPick, country, region }: Props) {
  const { t, locale, formatMoney } = useI18n()
  // 예약 서비스 검색어: 고른 저녁(없으면 점심, 그것도 없으면 첫 후보)
  const target = meals.dinner[picked.dinner ?? -1] ?? meals.lunch[picked.lunch ?? -1] ?? meals.dinner[0] ?? meals.lunch[0]
  const platforms = reservePlatforms(country, region, target?.reserve?.query ?? target?.query ?? '')
  return (
    <section className="card meals" data-testid="meals">
      <div className="row">
        <h3>{t('meals.title')}</h3>
        <span className="xs muted">{t('meals.pick')}</span>
      </div>
      {MEAL_SLOTS.filter((slot) => meals[slot].length > 0).map((slot) => (
        <div key={slot} className="meals__slot" role="radiogroup" aria-label={t(`meals.${slot}`)} data-testid={`meals-${slot}`}>
          <p className="small meals__label">{t(`meals.${slot}`)}</p>
          {meals[slot].map((m, i) => {
            const on = picked[slot] === i
            return (
              <div key={i} className={`meals__opt${on ? ' is-on' : ''}`}>
                <button type="button" role="radio" aria-checked={on} className="meals__choose" onClick={() => onPick(slot, i)} data-testid="meal-option">
                  <span className={`prep__check${on ? ' is-on' : ''}`} aria-hidden="true">
                    ✓
                  </span>
                  <span className="meals__text">
                    <strong>{pickName(m.name, locale)}</strong>
                    <span className="xs muted">
                      {[m.desc, m.area && t('meals.near', { area: m.area }), m.estCost && m.currency ? t('itin.estCost', { cost: formatMoney(m.estCost, m.currency) }) : ''].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                </button>
                <button type="button" className="btn btn--sm btn--ghost" onClick={() => openExternal(reserveUrl(m.reserve?.provider ?? 'google', m.reserve?.query ?? m.query))} data-testid="meal-map">
                  {t('meals.find')}
                </button>
              </div>
            )
          })}
        </div>
      ))}
      <details className="reserve" data-testid="reserve-guide">
        <summary>{t('reserve.title')}</summary>
        <ol className="airport__tips">
          {RESERVE_STEPS.map((k) => (
            <li key={k}>{t(`reserve.step.${k}`)}</li>
          ))}
        </ol>
        <p className="xs muted">{t('reserve.apps')}</p>
        <div className="btn-row">
          {platforms.map((p) => (
            <button key={p.id} type="button" className="btn btn--sm" onClick={() => openExternal(p.url)} data-testid="reserve-platform" data-platform={p.id}>
              {p.name}
            </button>
          ))}
        </div>
        <p className="xs muted">{t('reserve.note')}</p>
      </details>
      {ENV.mockAi && <p className="xs muted">{t('meals.sampleNote')}</p>}
    </section>
  )
}
