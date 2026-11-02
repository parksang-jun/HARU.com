import { describe, expect, it } from 'vitest'
import { addDays, daysBetween, defaultPartnerFor, normalizeItinerary, normalizeStop, validateTripParams, type TripParams } from '../src/lib/itinerary'
import { buildMockItinerary } from '../src/lib/mock/itinerary'

const params: TripParams = {
  cities: ['seoul', 'busan'],
  startDate: '2027-04-10',
  endDate: '2027-04-13',
  travelers: 'couple',
  interests: ['food'],
  budget: 'standard',
  pace: 'balanced',
  locale: 'en',
}

describe('trip params', () => {
  it('validates cities and date ranges', () => {
    expect(validateTripParams(params)).toBeNull()
    expect(validateTripParams({ ...params, cities: [] })).toBe('errCity')
    expect(validateTripParams({ ...params, cities: ['atlantis'] })).toBe('errCity')
    expect(validateTripParams({ ...params, cities: ['seoul', 'tokyo', 'paris', 'london', 'rome', 'bali'] })).toBe('errCity')
    expect(validateTripParams({ ...params, cities: ['tokyo', 'osaka'] })).toBeNull()
    expect(validateTripParams({ ...params, endDate: '2027-04-01' })).toBe('errDates')
    expect(validateTripParams({ ...params, endDate: '2027-05-10' })).toBe('errDates')
    expect(validateTripParams({ ...params, startDate: 'bad' })).toBe('errDates')
  })

  it('date helpers', () => {
    expect(daysBetween('2027-04-10', '2027-04-13')).toBe(4)
    expect(addDays('2027-12-31', 1)).toBe('2028-01-01')
  })
})

describe('normalizeStop', () => {
  it('rejects stops far from the trip cities, accepts overseas stops near them', () => {
    expect(normalizeStop({ name: { en: 'Tokyo Tower', ko: '도쿄타워' }, lat: 35.65, lng: 139.74 }, 0, 0)).toBeNull()
    expect(normalizeStop({ name: { en: 'Tokyo Tower', ko: '도쿄타워' }, lat: 35.6586, lng: 139.7454 }, 0, 0, ['tokyo'])?.name.en).toBe('Tokyo Tower')
    expect(normalizeStop({ name: { en: 'Eiffel', ko: '에펠탑' }, lat: 48.8584, lng: 2.2945 }, 0, 0, ['tokyo'])).toBeNull()
    expect(normalizeStop({ name: { en: 'X' } }, 0, 0)).toBeNull()
  })

  it('keeps local currency costs and reads legacy estCostKrw', () => {
    const eur = normalizeStop({ name: { en: 'Louvre', ko: '루브르' }, lat: 48.8606, lng: 2.3376, estCost: 22, currency: 'eur' }, 0, 0, ['paris'], 'EUR')
    expect(eur?.estCost).toBe(22)
    expect(eur?.currency).toBe('EUR')
    const fallback = normalizeStop({ name: { en: 'Senso-ji', ko: '센소지' }, lat: 35.7148, lng: 139.7967, estCost: 500 }, 0, 0, ['tokyo'], 'JPY')
    expect(fallback?.currency).toBe('JPY')
    const legacy = normalizeStop({ name: { en: 'A', ko: 'A' }, lat: 37.5, lng: 127, estCostKrw: 3000 }, 0, 0, ['seoul'], 'USD')
    expect(legacy?.currency).toBe('KRW')
  })

  it('fills defaults and clamps values', () => {
    const s = normalizeStop({ name: 'Gwangjang Market', lat: '37.5701', lng: 126.9996, category: 'weird', durationMin: 9999, time: '25:99', estCostKrw: 15000.4 }, 0, 2)
    expect(s).not.toBeNull()
    expect(s?.name.ko).toBe('Gwangjang Market')
    expect(s?.category).toBe('sight')
    expect(s?.durationMin).toBe(480)
    expect(s?.time).toBe('13:00')
    expect(s?.estCost).toBe(15000)
    expect(s?.currency).toBe('KRW')
    expect(s?.id).toBe('d1s3')
  })

  it('keeps booking only for known partners', () => {
    const ok = normalizeStop({ name: { en: 'A', ko: 'A' }, lat: 37.5, lng: 127, booking: { partner: 'klook', query: '' } }, 0, 0)
    expect(ok?.booking).toEqual({ partner: 'klook', query: 'A' })
    const bad = normalizeStop({ name: { en: 'A', ko: 'A' }, lat: 37.5, lng: 127, booking: { partner: 'unknown', query: 'q' } }, 0, 0)
    expect(bad?.booking).toBeUndefined()
  })
})

describe('normalizeItinerary', () => {
  it('drops empty days, renumbers, sorts stops by time and fills dates', () => {
    const raw = {
      title: ' T ',
      days: [
        { day: 1, city: 'seoul', stops: [] },
        {
          day: 7,
          city: 'nowhere',
          stops: [
            { name: { en: 'B', ko: 'B' }, lat: 37.5, lng: 127, time: '14:00' },
            { name: { en: 'A', ko: 'A' }, lat: 37.5, lng: 127, time: '09:00' },
          ],
        },
      ],
    }
    const it = normalizeItinerary(raw, params)
    expect(it).not.toBeNull()
    expect(it?.title).toBe('T')
    expect(it?.days).toHaveLength(1)
    expect(it?.days[0].day).toBe(1)
    expect(it?.days[0].city).toBe('seoul')
    expect(it?.days[0].date).toBe('2027-04-10')
    expect(it?.days[0].stops.map((s) => s.name.en)).toEqual(['A', 'B'])
  })

  it('returns null for garbage', () => {
    expect(normalizeItinerary(null, params)).toBeNull()
    expect(normalizeItinerary({ days: 'x' }, params)).toBeNull()
  })

  it('mock itinerary is deterministic and normalizes cleanly', () => {
    const a = buildMockItinerary(params)
    const b = buildMockItinerary(params)
    expect(a).toEqual(b)
    const it = normalizeItinerary(a, params)
    expect(it?.days).toHaveLength(4)
    expect(it?.days[0].city).toBe('seoul')
    expect(it?.days[3].city).toBe('busan')
    expect(it?.days.every((d) => d.stops.length >= 3)).toBe(true)
  })
})

describe('mock itinerary — overseas', () => {
  it('builds curated and generic overseas days with local currency', () => {
    const p: TripParams = { ...params, cities: ['tokyo', 'reykjavik'], locale: 'ko' }
    const it = normalizeItinerary(buildMockItinerary(p), p)
    expect(it?.days).toHaveLength(4)
    expect(it?.title).toBe('도쿄·레이캬비크 4일 여행')
    expect(it?.days[0].city).toBe('tokyo')
    expect(it?.days[3].city).toBe('reykjavik')
    expect(it?.days.every((d) => d.stops.length >= 3)).toBe(true)
    const costed = it?.days[0].stops.find((s) => s.estCost)
    expect(costed?.currency).toBe('JPY')
    // 도시가 바뀌는 날에는 숙소 체크인 포함
    expect(it?.days[2].stops.some((s) => s.category === 'stay')).toBe(true)
  })
})

describe('defaultPartnerFor', () => {
  it('maps categories to partners', () => {
    expect(defaultPartnerFor('stay')).toBe('agoda')
    expect(defaultPartnerFor('activity')).toBe('klook')
    expect(defaultPartnerFor('food')).toBeNull()
  })
})
