import { describe, expect, it } from 'vitest'
import { airportLabel, bestAirportFor, domesticOrigin, getAirport, searchAirports } from '../src/lib/airports'
import { DESTINATIONS, destName, isDestination, nearAnyDestination, searchDestinations } from '../src/lib/destinations'
import { buildMockFlights, flightPartnerUrl, normalizeRemoteOffers, sortFlights, validateFlightQuery, type FlightQuery } from '../src/lib/flights'
import { buildMockHotels, filterSortHotels, hotelPartnerUrl, nightsOf, normalizeRemoteHotels, validateHotelQuery, type HotelQuery } from '../src/lib/hotels'
import { normalizeItinerary, type TripParams } from '../src/lib/itinerary'
import { buildMockItinerary } from '../src/lib/mock/itinerary'
import { staySegments } from '../src/lib/plan'

describe('destinations', () => {
  it('catalog ids are unique and coordinates valid', () => {
    const ids = DESTINATIONS.map((d) => d.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(DESTINATIONS.length).toBeGreaterThan(80)
    for (const d of DESTINATIONS) {
      expect(Math.abs(d.lat)).toBeLessThanOrEqual(90)
      expect(Math.abs(d.lng)).toBeLessThanOrEqual(180)
      expect(d.currency).toMatch(/^[A-Z]{3}$/)
      for (const a of d.airports) expect(a).toMatch(/^[A-Z]{3}$/)
    }
  })

  it('covers domestic and international regions', () => {
    expect(DESTINATIONS.filter((d) => d.region === 'korea').length).toBeGreaterThanOrEqual(10)
    for (const r of ['japan', 'china', 'sea', 'europe', 'americas', 'oceania', 'mea']) {
      expect(DESTINATIONS.some((d) => d.region === r)).toBe(true)
    }
  })

  it('searches by any language, id and airport code', () => {
    expect(searchDestinations('도쿄').map((d) => d.id)).toContain('tokyo')
    expect(searchDestinations('パリ').map((d) => d.id)).toContain('paris')
    expect(searchDestinations('峴港').map((d) => d.id)).toContain('danang')
    expect(searchDestinations('cdg').map((d) => d.id)).toEqual(['paris'])
    expect(searchDestinations('new york').map((d) => d.id)).toContain('newyork')
    expect(destName('honolulu', 'ko')).toBe('하와이(호놀룰루)')
    expect(isDestination('seoul')).toBe(true)
    expect(isDestination('nowhere')).toBe(false)
  })

  it('checks proximity to trip cities', () => {
    expect(nearAnyDestination(35.7148, 139.7967, ['tokyo'])).toBe(true)
    expect(nearAnyDestination(35.7148, 139.7967, ['paris'])).toBe(false)
  })
})

describe('airports', () => {
  it('labels and searches airports', () => {
    expect(getAirport('icn')?.cityId).toBe('seoul')
    expect(airportLabel('HND', 'ko')).toBe('도쿄 하네다 (HND)')
    expect(airportLabel('FUK', 'en')).toBe('Fukuoka (FUK)')
    expect(searchAirports('나리타', 'ko').map((a) => a.code)).toContain('NRT')
  })

  it('picks Gimpo for domestic flights and avoids same-city airports', () => {
    expect(domesticOrigin('ICN', 'CJU')).toBe('GMP')
    expect(domesticOrigin('ICN', 'NRT')).toBe('ICN')
    expect(bestAirportFor('tokyo')).toBe('HND')
    expect(bestAirportFor('seoul', 'ICN')).toBe('GMP')
    expect(bestAirportFor('jeonju')).toBeUndefined()
  })
})

const fq: FlightQuery = { from: 'ICN', to: 'NRT', depart: '2027-03-10', return: '2027-03-14', adults: 2, cabin: 'economy' }

describe('flights', () => {
  it('validates queries', () => {
    expect(validateFlightQuery(fq)).toBeNull()
    expect(validateFlightQuery({ ...fq, to: 'ICN' })).toBe('errSame')
    expect(validateFlightQuery({ ...fq, to: 'XXX' })).toBe('errAirport')
    expect(validateFlightQuery({ ...fq, return: '2027-03-01' })).toBe('errDates')
  })

  it('mock fares are deterministic, sorted and realistic', () => {
    const a = buildMockFlights(fq, 'ko')
    expect(a).toEqual(buildMockFlights(fq, 'ko'))
    expect(a.length).toBeGreaterThanOrEqual(4)
    expect(a.every((o) => o.currency === 'KRW' && o.price > 0 && o.inbound)).toBe(true)
    expect(a.some((o) => o.outbound.stops === 0)).toBe(true)
    for (let i = 1; i < a.length; i++) expect(a[i].price).toBeGreaterThanOrEqual(a[i - 1].price)
    // 서울-도쿄 약 2시간대
    const direct = a.find((o) => o.outbound.stops === 0)!
    expect(direct.outbound.durationMin).toBeGreaterThan(100)
    expect(direct.outbound.durationMin).toBeLessThan(200)
  })

  it('long-haul routes include connections', () => {
    const list = buildMockFlights({ ...fq, to: 'LIS', return: undefined }, 'en')
    expect(list.some((o) => o.outbound.stops === 1 && o.outbound.via)).toBe(true)
    expect(list.every((o) => o.currency === 'USD' && !o.inbound)).toBe(true)
    const fastest = sortFlights(list, 'duration')
    expect(fastest[0].outbound.durationMin).toBeLessThanOrEqual(fastest[fastest.length - 1].outbound.durationMin)
  })

  it('domestic Korean routes only use Korean carriers', () => {
    const list = buildMockFlights({ ...fq, from: 'GMP', to: 'CJU' }, 'ko')
    expect(list.length).toBeGreaterThan(0)
    expect(list.every((o) => ['KE', 'OZ', '7C', 'LJ', 'TW', 'BX', 'RS', 'ZE', 'YP'].includes(o.airline))).toBe(true)
  })

  it('builds partner deep links', () => {
    expect(flightPartnerUrl('skyscanner', fq, 'ko')).toBe('https://www.skyscanner.co.kr/transport/flights/icn/nrt/270310/270314/?adultsv2=2&cabinclass=economy')
    expect(flightPartnerUrl('aviasales', fq, 'en')).toBe('https://www.aviasales.com/search/ICN1003NRT14032')
    expect(flightPartnerUrl('trip', fq, 'ja')).toContain('dcity=icn&acity=nrt&ddate=2027-03-10&rdate=2027-03-14&triptype=rt')
    expect(flightPartnerUrl('naver', fq, 'ko')).toBe('https://flight.naver.com/flights/international/ICN-NRT-20270310/NRT-ICN-20270314?adult=2&fareType=Y')
    expect(flightPartnerUrl('naver', { ...fq, from: 'GMP', to: 'CJU', return: undefined }, 'ko')).toContain('/flights/domestic/GMP-CJU-20270310?')
    expect(decodeURIComponent(flightPartnerUrl('google', fq, 'en'))).toContain('Flights from ICN to NRT on 2027-03-10 through 2027-03-14')
  })

  it('normalizes Travelpayouts offers', () => {
    const list = normalizeRemoteOffers(
      [
        { airline: 'KE', flight_number: 703, departure_at: '2027-03-10T09:05:00+09:00', return_at: '2027-03-14T18:30:00+09:00', transfers: 0, return_transfers: 0, duration_to: 145, duration_back: 160, price: 210000, link: '/search/ICN1003NRT14031?t=x' },
        { price: 1 },
      ],
      fq,
      'KRW',
      'm123',
    )
    expect(list).toHaveLength(1)
    expect(list[0].outbound).toMatchObject({ depart: '09:05', arrive: '11:30', stops: 0, durationMin: 145 })
    expect(list[0].inbound?.depart).toBe('18:30')
    expect(list[0].price).toBe(420000)
    expect(list[0].bookUrl).toBe('https://www.aviasales.com/search/ICN1003NRT14031?t=x&marker=m123')
  })
})

const hq: HotelQuery = { destId: 'osaka', checkIn: '2027-03-10', checkOut: '2027-03-13', adults: 2, rooms: 1 }

describe('hotels', () => {
  it('validates queries and counts nights', () => {
    expect(nightsOf(hq)).toBe(3)
    expect(validateHotelQuery(hq)).toBeNull()
    expect(validateHotelQuery({ ...hq, destId: 'x' })).toBe('errDest')
    expect(validateHotelQuery({ ...hq, checkOut: '2027-03-10' })).toBe('errDates')
    expect(validateHotelQuery({ ...hq, rooms: 3 })).toBe('errDates')
  })

  it('mock hotels scale with city cost and filter/sort', () => {
    const osaka = buildMockHotels(hq, 'en')
    const zurich = buildMockHotels({ ...hq, destId: 'zurich' }, 'en')
    expect(osaka).toHaveLength(10)
    expect(osaka).toEqual(buildMockHotels(hq, 'en'))
    const avg = (l: typeof osaka) => l.reduce((s, h) => s + h.pricePerNight, 0) / l.length
    expect(avg(zurich)).toBeGreaterThan(avg(osaka) * 1.8)
    const five = filterSortHotels(osaka, { sort: 'price', minStars: 5, freeCancelOnly: false })
    expect(five.every((h) => h.stars === 5)).toBe(true)
    const cheap = filterSortHotels(osaka, { sort: 'price', minStars: 0, freeCancelOnly: false })
    expect(cheap[0].pricePerNight).toBeLessThanOrEqual(cheap[cheap.length - 1].pricePerNight)
    expect(osaka.some((h) => h.area === 'Namba')).toBe(true)
  })

  it('builds partner deep links with dates and guests', () => {
    expect(hotelPartnerUrl('booking', hq, 'ko')).toBe('https://www.booking.com/searchresults.html?ss=Osaka&checkin=2027-03-10&checkout=2027-03-13&group_adults=2&no_rooms=1&group_children=0&lang=ko&selected_currency=KRW')
    expect(hotelPartnerUrl('agoda', hq, 'en', 'Hotel X')).toContain('textToSearch=Hotel%20X%2C%20Osaka&checkIn=2027-03-10&los=3&rooms=1&adults=2')
    expect(hotelPartnerUrl('expedia', hq, 'en')).toContain('startDate=2027-03-10&endDate=2027-03-13&adults=2&rooms=1')
  })

  it('normalizes Agoda results', () => {
    const list = normalizeRemoteHotels([
      { hotelId: 1, hotelName: 'A', starRating: 4.5, reviewScore: 8.8, dailyRate: 120.4, crossedOutRate: 150, currency: 'USD', landingURL: 'http://www.agoda.com/x?cid=1', imageURL: 'https://img/x.jpg' },
      { hotelName: 'no price' },
    ])
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({ name: 'A', stars: 5, pricePerNight: 120, crossedOut: 150, bookUrl: 'https://www.agoda.com/x?cid=1', source: 'agoda' })
  })
})

describe('stay segments', () => {
  it('splits multi-city trips into hotel stays', () => {
    const params: TripParams = { cities: ['tokyo', 'osaka'], startDate: '2027-03-10', endDate: '2027-03-14', travelers: 'couple', interests: [], budget: 'standard', pace: 'balanced', locale: 'en' }
    const itinerary = normalizeItinerary(buildMockItinerary(params), params)!
    const segs = staySegments({ id: 't', params, createdAt: '', updatedAt: '', itinerary })
    expect(segs.map((s) => [s.city, s.checkIn, s.checkOut, s.nights])).toEqual([
      ['tokyo', '2027-03-10', '2027-03-13', 3],
      ['osaka', '2027-03-13', '2027-03-14', 1],
    ])
  })
})

import { buildMockBusinessDeals, dealBookUrl, normalizeRemoteDeals, typicalBusinessUsd } from '../src/lib/flightDeals'

describe('business deals', () => {
  it('mock deals are deterministic, international, near-term and discounted', () => {
    const a = buildMockBusinessDeals('ICN', '2027-03-01', 'ko')
    expect(a).toEqual(buildMockBusinessDeals('ICN', '2027-03-01', 'ko'))
    expect(a.length).toBeGreaterThan(15)
    for (const d of a) {
      expect(d.cityId).not.toMatch(/^(seoul|busan|jeju)$/)
      expect(d.price).toBeLessThan(d.usualPrice)
      expect(d.discountPct).toBeGreaterThanOrEqual(15)
      expect(d.depart >= '2027-03-03' && d.depart <= '2027-04-15').toBe(true)
    }
    for (let i = 1; i < a.length; i++) expect(a[i].discountPct).toBeLessThanOrEqual(a[i - 1].discountPct)
  })

  it('normalizes Travelpayouts business fares, keeps best per city and drops far/undiscounted ones', () => {
    const usualTokyo = Math.round(typicalBusinessUsd(1160) * 1400)
    const list = normalizeRemoteDeals(
      [
        { value: 600000, origin: 'SEL', destination: 'HND', depart_date: '2027-03-05', return_date: '2027-03-09', number_of_changes: 0, trip_class: 1 },
        { value: 900000, origin: 'SEL', destination: 'NRT', depart_date: '2027-03-06', return_date: '2027-03-10', number_of_changes: 0 },
        { value: 100, destination: 'CDG', depart_date: '2027-06-01' },
        { value: 99999999, destination: 'BKK', depart_date: '2027-03-04' },
        { value: 1, destination: 'XXX', depart_date: '2027-03-04' },
      ],
      'ICN',
      '2027-03-01',
      'KRW',
    )
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({ cityId: 'tokyo', to: 'HND', price: 600000, source: 'travelpayouts' })
    expect(Math.abs(list[0].usualPrice - usualTokyo)).toBeLessThan(usualTokyo * 0.05)
    expect(dealBookUrl(list[0])).toBe('https://www.aviasales.com/search/ICN0503HND09031?trip_class=1')
  })
})
