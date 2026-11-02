import { describe, expect, it } from 'vitest'
import { appendQuery, buildAffiliateUrl, EMPTY_AFFILIATE, isPartnerConfigured, reserveUrl } from '../src/lib/affiliate'

describe('affiliate URL builder', () => {
  const cfg = { ...EMPTY_AFFILIATE, klook: 'aid=12345', booking: '?aid=999', agoda: '&cid=777', trip: 'Allianceid=1&SID=2' }

  it('appends partner params to a search URL that already has a query', () => {
    expect(buildAffiliateUrl('klook', 'Gyeongbokgung Palace', cfg)).toBe('https://www.klook.com/search/result/?query=Gyeongbokgung%20Palace&aid=12345')
  })

  it('strips leading ? or & from configured params', () => {
    expect(buildAffiliateUrl('booking', 'Seoul', cfg)).toBe('https://www.booking.com/searchresults.html?ss=Seoul&aid=999')
    expect(buildAffiliateUrl('agoda', 'Busan', cfg)).toBe('https://www.agoda.com/search?textToSearch=Busan&cid=777')
  })

  it('keeps multi-param tracking strings intact', () => {
    expect(buildAffiliateUrl('trip', 'Jeju', cfg)).toContain('keyword=Jeju&Allianceid=1&SID=2')
  })

  it('returns the plain search URL when no params are configured', () => {
    expect(buildAffiliateUrl('getyourguide', 'DMZ tour', EMPTY_AFFILIATE)).toBe('https://www.getyourguide.com/s/?q=DMZ%20tour')
  })

  it('uses landing URLs for partners without a known search deep link', () => {
    expect(buildAffiliateUrl('creatrip', 'x', EMPTY_AFFILIATE)).toBe('https://www.creatrip.com/en')
    expect(buildAffiliateUrl('creatrip', 'x', { ...EMPTY_AFFILIATE, creatripUrl: 'https://aff.example/creatrip' })).toBe('https://aff.example/creatrip')
  })

  it('reports configuration state per partner', () => {
    expect(isPartnerConfigured('klook', cfg)).toBe(true)
    expect(isPartnerConfigured('expedia', cfg)).toBe(false)
    expect(isPartnerConfigured('nol', { ...EMPTY_AFFILIATE, nolUrl: 'https://x' })).toBe(true)
  })

  it('appendQuery preserves hash fragments', () => {
    expect(appendQuery('https://a.com/p?x=1#top', 'aid=5')).toBe('https://a.com/p?x=1&aid=5#top')
    expect(appendQuery('https://a.com/p', '')).toBe('https://a.com/p')
  })

  it('builds restaurant reservation lead links', () => {
    expect(reserveUrl('naver', '광장시장')).toBe('https://map.naver.com/p/search/%EA%B4%91%EC%9E%A5%EC%8B%9C%EC%9E%A5')
    expect(reserveUrl('catchtable', '을지로')).toContain('catchtable')
  })
})
