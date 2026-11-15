import { describe, expect, it } from 'vitest'
import { WAIT_TIPS, highlightKeys, loungePassUrl, waitBucket } from '../src/lib/airportGuide'
import { recommendGear, shopLinks } from '../src/lib/gear'
import { INTERESTS, normalizeItinerary, type Trip, type TripParams } from '../src/lib/itinerary'
import { buildMockItinerary } from '../src/lib/mock/itinerary'
import { INTEREST_CATEGORIES, parseRequests } from '../src/lib/mock/requests'
import { MOCK_PLACES } from '../src/lib/mock/places'
import { prepKeys } from '../src/lib/plan'
import { buildReport, reportText, type ReportFormat } from '../src/lib/report'
import { weatherKey, type DayWeather, type TripWeather } from '../src/lib/weather'
import en from '../src/i18n/en.json'
import ko from '../src/i18n/ko.json'

const base: TripParams = { cities: ['seoul'], startDate: '2027-04-10', endDate: '2027-04-12', travelers: 'couple', interests: ['food', 'history'], budget: 'standard', pace: 'balanced', locale: 'ko' }
const cats = (p: TripParams) => buildMockItinerary(p).days.flatMap((d) => d.stops.map((s) => s.category))

describe('interests', () => {
  it('offers 20 interests, each mapped to place categories and labelled in every language', () => {
    expect(INTERESTS).toHaveLength(20)
    expect(new Set(INTERESTS).size).toBe(20)
    for (const i of INTERESTS) {
      expect(INTEREST_CATEGORIES[i].length).toBeGreaterThan(0)
      expect((ko.setup.interest as Record<string, string>)[i]).toBeTruthy()
      expect((en.setup.interest as Record<string, string>)[i]).toBeTruthy()
    }
  })

  it('changes the sample itinerary: shopping interest brings shopping stops forward', () => {
    const shop = buildMockItinerary({ ...base, interests: ['shopping'] }).days[0].stops.map((s) => s.category)
    const hist = buildMockItinerary({ ...base, interests: ['history'] }).days[0].stops.map((s) => s.category)
    expect(shop[0]).toBe('shopping')
    expect(hist[0]).toBe('sight')
    expect(hist[1]).toBe('sight')
  })
})

describe('special requests (sample mode)', () => {
  it('applies keyword requests and reports each one', () => {
    const it = buildMockItinerary({ ...base, interests: ['food', 'shopping', 'nightlife'], notes: '채식, 유모차 동반, 쇼핑은 빼고, 아침은 늦게 시작' })
    const all = it.days.flatMap((d) => d.stops)
    expect(all.some((s) => s.category === 'shopping')).toBe(false)
    expect(all.some((s) => s.category === 'nightlife')).toBe(false) // 아이 동반
    expect(it.days.every((d) => d.stops[0].time === '11:00')).toBe(true)
    expect(all.filter((s) => s.category === 'food').every((s) => s.tip.startsWith('채식'))).toBe(true)
    const plain = buildMockItinerary(base)
    expect(it.days[1].stops.length).toBe(plain.days[1].stops.length - 1)
    expect(it.requests?.map((r) => r.applied)).toEqual([true, true, true, true])
    expect(it.requests?.[2].handled).toContain('쇼핑')
  })

  it('puts a named place first and is honest about requests it cannot read', () => {
    const it = buildMockItinerary({ ...base, notes: '롯데월드타워는 꼭 가고 싶어요. 할머니 칠순 기념 여행' })
    expect(it.days[0].stops[0].name.ko).toContain('롯데월드타워')
    expect(it.requests?.[0].applied).toBe(true)
    expect(it.requests?.[1]).toMatchObject({ applied: false })
    expect(it.requests?.[1].handled).toContain('샘플 모드')
  })

  it('reads requests in other languages and leaves itineraries without notes untouched', () => {
    const plan = parseRequests('vegetarian, no shopping and late start', 'en', MOCK_PLACES.seoul)
    expect(plan.vegetarian).toBe(true)
    expect(plan.exclude.has('shopping')).toBe(true)
    expect(plan.start).toBe('late')
    expect(plan.notes.every((n) => n.applied)).toBe(true)
    expect(buildMockItinerary(base).requests).toBeUndefined()
    expect(cats(base)).toContain('food')
  })

  it('keeps AI-reported requests through normalization and drops malformed ones', () => {
    const raw = { ...buildMockItinerary(base), requests: [{ request: '채식', handled: '식당을 채식 가능한 곳으로 골랐습니다', applied: true }, { request: '', handled: 'x' }, 'bad', { request: '새벽 시장', handled: '운영 시간과 맞지 않아 넣지 못했습니다', applied: false }] }
    const out = normalizeItinerary(raw, base)
    expect(out?.requests).toEqual([
      { request: '채식', handled: '식당을 채식 가능한 곳으로 골랐습니다', applied: true },
      { request: '새벽 시장', handled: '운영 시간과 맞지 않아 넣지 못했습니다', applied: false },
    ])
  })
})

const tripOf = (params: TripParams): Trip => ({ id: 't1', params, createdAt: '', updatedAt: '', itinerary: buildMockItinerary(params) })
const wx = (city: string, date: string, over: Partial<DayWeather> = {}): DayWeather => ({ city, date, condition: 'clear', high: 22, low: 14, rainPct: 10, source: 'forecast', ...over })

describe('trip report', () => {
  const params: TripParams = { ...base, cities: ['tokyo'], notes: '채식' }
  const trip = tripOf(params)
  const weather: TripWeather = {
    [weatherKey('tokyo', '2027-04-10')]: wx('tokyo', '2027-04-10', { condition: 'rain', rainPct: 80, high: 15, low: 9 }),
    [weatherKey('tokyo', '2027-04-11')]: wx('tokyo', '2027-04-11'),
  }
  const f: ReportFormat = { t: (k, v) => `${k}${v ? JSON.stringify(v) : ''}`, locale: 'ko', formatDate: (d) => d, formatMoney: (a, c) => `${a} ${c}`, cityName: (c) => c, placeName: (n) => n.ko, temps: (w) => `${w.high}/${w.low}` }

  it('summarises prep status, days with weather, costs per currency, packing and gear', () => {
    const r = buildReport(trip, weather, ['flight', 'weather'], 'ICN')!
    expect(r.prep.map((x) => x.kind)).toEqual(['itinerary', 'flight', 'hotel', 'weather', 'gear', 'deals', 'airport', 'essentials'])
    expect(r.prepDone).toBe(3)
    expect(r.days).toHaveLength(3)
    expect(r.days[0].weather?.condition).toBe('rain')
    expect(r.days[2].weather).toBeUndefined()
    expect(r.costs).toHaveLength(1)
    expect(r.costs[0].currency).toBe('JPY')
    expect(r.costs[0].total).toBe(r.costs[0].perPerson * 2)
    const sum = trip.itinerary!.days.flatMap((d) => d.stops).reduce((a, s) => a + (s.estCost ?? 0), 0)
    expect(r.costs[0].perPerson).toBe(sum)
    expect(r.packing).toContain('umbrella')
    expect(r.gear.map((g) => g.id)).toEqual(expect.arrayContaining(['umbrella', 'adapter', 'esim', 'powerbank']))
    expect(r.requests).toHaveLength(1)
    expect(buildReport({ ...trip, itinerary: undefined }, {}, [], 'ICN')).toBeNull()
  })

  it('renders a plain-text report with every section', () => {
    const text = reportText(buildReport(trip, weather, ['flight'], 'ICN')!, f, '2026-11-15')
    for (const k of ['report.overview', 'report.prep', 'report.requests', 'report.days', 'report.costs', 'report.packing', 'gear.title', 'report.generated']) expect(text).toContain(k)
    expect(text).toContain('[v] prep.itinerary')
    expect(text).toContain('[ ] prep.weather')
    expect(text.split('\n').filter((l) => /^\s+\d\d:\d\d /.test(l)).length).toBe(trip.itinerary!.days.flatMap((d) => d.stops).length)
  })
})

describe('gear and airport guide', () => {
  it('recommends gear from weather, destination and flight length', () => {
    const paris = tripOf({ ...base, cities: ['paris'], interests: ['beach'], endDate: '2027-04-15' })
    const ids = recommendGear(paris, [wx('paris', '2027-04-10', { high: 4, low: -2, condition: 'snow' })], 'ICN').map((g) => g.id)
    expect(ids).toEqual(expect.arrayContaining(['gloves', 'padding', 'adapter', 'esim', 'neckpillow', 'powerbank', 'waterproof', 'organizer']))
    expect(new Set(ids).size).toBe(ids.length)
    const domestic = recommendGear(tripOf({ ...base, cities: ['seoul'] }), [wx('seoul', '2027-04-10')], 'ICN').map((g) => g.id)
    expect(domestic).toEqual(['powerbank'])
    expect(prepKeys(tripOf({ ...base, cities: ['seoul'] }), 'ICN')).not.toContain('airport')
  })

  it('builds shop links per language', () => {
    expect(shopLinks('umbrella', '여행용 접이식 우산', 'ko')[0]).toMatchObject({ shop: 'coupang', url: `https://www.coupang.com/np/search?q=${encodeURIComponent('여행용 접이식 우산')}` })
    expect(shopLinks('umbrella', 'Travel umbrella', 'en')[0].url).toBe('https://www.amazon.com/s?k=Travel%20umbrella')
    expect(shopLinks('umbrella', '折りたたみ傘', 'ja')[0].shop).toBe('amazonjp')
    expect(shopLinks('esim', 'Travel eSIM', 'ko')[0].shop).toBe('klook')
  })

  it('picks wait-time tips by bucket and knows a few airports', () => {
    expect([60, 120, 240, 360].map(waitBucket)).toEqual(['short', 'mid', 'long', 'xlong'])
    expect(WAIT_TIPS.short).not.toContain('lounge')
    expect(WAIT_TIPS.xlong).toEqual(expect.arrayContaining(['lounge', 'nap', 'transitTour']))
    expect(highlightKeys('ICN')).toEqual(['airport.hl.ICN.1', 'airport.hl.ICN.2', 'airport.hl.ICN.3'])
    expect(highlightKeys('XXX')).toEqual([])
    expect(loungePassUrl('ICN')).toContain('ICN%20airport%20lounge')
    const tips = ko.airport.tip as Record<string, string>
    for (const list of Object.values(WAIT_TIPS)) for (const k of list) expect(tips[k]).toBeTruthy()
  })
})
