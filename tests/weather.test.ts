import { describe, expect, it } from 'vitest'
import { computeNormals, datesBetween, normalRange, parseForecast, shiftYears, splitDates } from '../supabase/functions/_shared/weather-core'
import { conditionFromCode, conditionFromNormals, estimateClimate, formatTemps, mockDayWeather, needsRainPlan, normalizeRemote, packingList, tipsFor, weatherKey, weatherPoints, type DayWeather } from '../src/lib/weather'

const wx = (over: Partial<DayWeather>): DayWeather => ({ city: 'seoul', date: '2027-01-10', condition: 'clear', high: 20, low: 12, rainPct: 10, source: 'forecast', ...over })

describe('weather core (server)', () => {
  it('splits trip dates into forecast (16 days from today) and normals', () => {
    const dates = datesBetween('2026-11-28', '2026-12-03')
    const { forecast, normal } = splitDates(dates, '2026-11-15')
    expect(forecast).toEqual(['2026-11-28', '2026-11-29', '2026-11-30'])
    expect(normal).toEqual(['2026-12-01', '2026-12-02', '2026-12-03'])
    expect(splitDates(['2026-11-14'], '2026-11-15').normal).toEqual(['2026-11-14'])
  })

  it('shifts dates back by years, including Feb 29', () => {
    expect(shiftYears('2028-02-29', 1)).toBe('2027-02-28')
    expect(shiftYears('2028-02-29', 4)).toBe('2024-02-29')
    expect(normalRange(['2027-03-02', '2027-03-01'], 1)).toEqual({ start: '2026-02-26', end: '2026-03-05' })
  })

  it('parses an Open-Meteo forecast and skips days without temperatures', () => {
    const days = parseForecast(
      {
        time: ['2026-11-16', '2026-11-17', '2026-11-18'],
        weather_code: [61, 0, 3],
        temperature_2m_max: [11.26, 14, null],
        temperature_2m_min: [4.04, 3, 2],
        precipitation_probability_max: [78, null, 20],
        precipitation_sum: [6.2, 0, 0],
      },
      ['2026-11-16', '2026-11-17', '2026-11-18'],
    )
    expect(days).toHaveLength(2)
    expect(days[0]).toEqual({ date: '2026-11-16', code: 61, high: 11.3, low: 4, rainPct: 78, precipMm: 6.2, source: 'forecast' })
    expect(days[1].rainPct).toBeNull()
  })

  it('averages past years within ±3 days into normals with a wet-day share', () => {
    const mk = (year: number, base: number, wetEvery: number) => {
      const time = datesBetween(`${year}-07-07`, `${year}-07-13`)
      return { time, temperature_2m_max: time.map(() => base + 5), temperature_2m_min: time.map(() => base - 5), precipitation_sum: time.map((_, i) => (i % wetEvery === 0 ? 8 : 0)) }
    }
    const normals = computeNormals(['2027-07-10'], [
      { yearsBack: 1, daily: mk(2026, 26, 2) }, // 7일 중 4일 비
      { yearsBack: 2, daily: mk(2025, 24, 7) }, // 7일 중 1일 비
      { yearsBack: 3, daily: undefined },
    ])
    expect(normals).toEqual([{ date: '2027-07-10', code: null, high: 30, low: 20, rainPct: 36, precipMm: 2.9, source: 'normal' }])
    expect(computeNormals(['2027-07-10'], [{ yearsBack: 1, daily: undefined }])).toEqual([])
  })
})

describe('weather (app)', () => {
  it('maps WMO codes and normals to conditions', () => {
    expect([0, 2, 3, 45, 53, 63, 65, 73, 81, 82, 96].map(conditionFromCode)).toEqual(['clear', 'partly', 'cloudy', 'fog', 'drizzle', 'rain', 'heavyRain', 'snow', 'rain', 'heavyRain', 'storm'])
    expect(conditionFromNormals(55, 25)).toBe('rain')
    expect(conditionFromNormals(55, 0)).toBe('snow')
    expect(conditionFromNormals(null, 20)).toBe('clear')
  })

  it('estimates plausible seasons: Seoul cold in January and hot in August, Sydney reversed', () => {
    const seoulJan = estimateClimate(37.57, 'korea', '2027-01-15')
    const seoulAug = estimateClimate(37.57, 'korea', '2027-08-01')
    expect(seoulJan.high).toBeLessThan(6)
    expect(seoulAug.high).toBeGreaterThan(27)
    expect(seoulAug.rainPct).toBeGreaterThan(seoulJan.rainPct)
    const sydJan = estimateClimate(-33.87, 'oceania', '2027-01-15')
    const sydJul = estimateClimate(-33.87, 'oceania', '2027-07-15')
    expect(sydJan.high).toBeGreaterThan(sydJul.high + 6)
    const bkk = estimateClimate(13.75, 'sea', '2027-04-10')
    expect(bkk.high).toBeGreaterThan(29)
  })

  it('mock weather is deterministic: sample forecast inside 16 days, estimate beyond', () => {
    const near = mockDayWeather('tokyo', '2026-11-20', '2026-11-15', true)
    expect(near).toEqual(mockDayWeather('tokyo', '2026-11-20', '2026-11-15', true))
    expect(near?.source).toBe('forecast')
    expect(near?.sample).toBe(true)
    const far = mockDayWeather('tokyo', '2027-03-20', '2026-11-15', true)
    expect(far?.source).toBe('estimate')
    // 실서비스에서 서버가 실패했을 때의 대체값은 샘플 예보를 만들지 않는다
    const fallback = mockDayWeather('tokyo', '2026-11-20', '2026-11-15', false)
    expect(fallback?.source).toBe('estimate')
    expect(fallback?.sample).toBeUndefined()
    expect(mockDayWeather('nowhere', '2026-11-20', '2026-11-15', true)).toBeNull()
  })

  it('normalizes the server payload and drops malformed rows', () => {
    const out = normalizeRemote([
      { city: 'paris', days: [{ date: '2026-11-20', code: 63, high: 9.1, low: 4.2, rainPct: 140, source: 'forecast' }, { date: '2027-05-01', code: null, high: 19, low: 10, rainPct: 38, source: 'normal' }, { date: 'x' }] },
      { city: 5, days: [] },
    ])
    expect(Object.keys(out)).toEqual([weatherKey('paris', '2026-11-20'), weatherKey('paris', '2027-05-01')])
    expect(out[weatherKey('paris', '2026-11-20')]).toMatchObject({ condition: 'rain', rainPct: 100, source: 'forecast' })
    expect(out[weatherKey('paris', '2027-05-01')]).toMatchObject({ condition: 'cloudy', source: 'normal' })
    expect(normalizeRemote(null)).toEqual({})
  })

  it('builds one request point per city covering its date range', () => {
    const pts = weatherPoints([
      { city: 'seoul', date: '2027-01-10' },
      { city: 'seoul', date: '2027-01-11' },
      { city: 'busan', date: '2027-01-12' },
      { city: 'unknown', date: '2027-01-13' },
    ])
    expect(pts.map((p) => [p.city, p.start, p.end])).toEqual([
      ['seoul', '2027-01-10', '2027-01-11'],
      ['busan', '2027-01-12', '2027-01-12'],
    ])
  })

  it('gives packing tips and a trip packing list', () => {
    expect(tipsFor(wx({ condition: 'rain', rainPct: 80, high: 16, low: 9 }))).toEqual(['umbrella', 'jacket'])
    expect(tipsFor(wx({ condition: 'snow', high: -1, low: -8 }))).toEqual(['snow', 'heavyCoat'])
    expect(tipsFor(wx({ condition: 'clear', high: 33, low: 25 }))).toEqual(['hot', 'sunscreen'])
    expect(tipsFor(wx({ condition: 'partly', high: 22, low: 15, rainPct: 5 }))).toEqual([])
    expect(packingList([wx({ condition: 'rain', rainPct: 80, high: 16, low: 9 }), wx({ condition: 'clear', high: 26, low: 12 })])).toEqual(['umbrella', 'jacket', 'sunscreen', 'layers'])
  })

  it('suggests an indoor backup only on wet days with two or more outdoor stops', () => {
    const stops = (cats: string[]) => ({ stops: cats.map((category) => ({ category })) }) as never
    expect(needsRainPlan(wx({ condition: 'rain', rainPct: 80 }), stops(['sight', 'nature', 'food']))).toBe(true)
    expect(needsRainPlan(wx({ condition: 'rain', rainPct: 80 }), stops(['sight', 'food', 'cafe']))).toBe(false)
    expect(needsRainPlan(wx({ condition: 'clear', rainPct: 5 }), stops(['sight', 'nature']))).toBe(false)
    expect(needsRainPlan(undefined, stops(['sight', 'nature']))).toBe(false)
  })

  it('formats temperatures (°F added for English)', () => {
    expect(formatTemps({ high: 24.4, low: 15.6 }, 'ko')).toBe('24° / 16°C')
    expect(formatTemps({ high: 24.4, low: 15.6 }, 'en')).toBe('24° / 16°C (76° / 60°F)')
  })
})
