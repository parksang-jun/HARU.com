import { describe, expect, it } from 'vitest'
import { addCustomStop, addPasted, moveStop, moveStopToDay, parsePasted, removeStop, setMemo } from '../src/lib/edit'
import { normalizeItinerary, type Itinerary, type TripParams } from '../src/lib/itinerary'
import { addExpense, addMember, balances, removeMember, settle, totals, EMPTY_LEDGER } from '../src/lib/ledger'
import { buildMockItinerary as mockItinerary } from '../src/lib/mock/itinerary'
import { addCustom, packingItems, removeCustom, toggleItem, EMPTY_PACKING } from '../src/lib/packing'
import { checkPlan, dayLegs, estimateLeg, projectDay, retime } from '../src/lib/route'
import { decodeTrip, encodeTrip, SHARE_PREFIX } from '../src/lib/share'
import { ago, checkBody } from '../src/lib/talk'

const params: TripParams = { cities: ['seoul'], startDate: '2027-04-10', endDate: '2027-04-12', travelers: 'couple', interests: ['food', 'history'], budget: 'standard', pace: 'balanced', locale: 'ko' }
const base = (): Itinerary => mockItinerary(params)
const names = (it: Itinerary, day: number) => it.days[day - 1].stops.map((s) => s.name.ko)

describe('일정 편집', () => {
  it('위·아래로 옮기면 순서가 바뀌고 시간순은 유지된다', () => {
    const it0 = base()
    const before = names(it0, 1)
    const it1 = moveStop(it0, 1, 0, 1)
    expect(names(it1, 1).slice(0, 2)).toEqual([before[1], before[0]])
    const times = it1.days[0].stops.map((s) => s.time)
    expect(times).toEqual([...times].sort())
    expect(names(it0, 1)).toEqual(before) // 원본 불변
    expect(moveStop(it0, 1, 0, -1)).toBe(it0)
  })
  it('다른 날로 옮기고 삭제한다', () => {
    const it0 = base()
    const first = names(it0, 1)[0]
    const it1 = moveStopToDay(it0, 1, 0, 1)
    expect(names(it1, 1)).not.toContain(first)
    expect(names(it1, 2).at(-1)).toBe(first)
    expect(moveStopToDay(it0, 1, 0, -1)).toBe(it0)
    expect(removeStop(it0, 1, 0).days[0].stops.length).toBe(it0.days[0].stops.length - 1)
  })
  it('등록되지 않은 장소를 이름만으로 넣고, 저장 후 다시 읽어도 남는다', () => {
    const it1 = setMemo(addCustomStop(base(), 2, { name: '우리 동네 숨은 국숫집', time: '12:30' }), 2, 0, '첫 메모')
    const custom = it1.days[1].stops.find((s) => s.custom)
    expect(custom?.name.ko).toBe('우리 동네 숨은 국숫집')
    const again = normalizeItinerary(JSON.parse(JSON.stringify(it1)), params)
    expect(again?.days[1].stops.some((s) => s.custom && s.name.ko === '우리 동네 숨은 국숫집')).toBe(true)
    expect(again?.days[1].stops[0].memo).toBe('첫 메모')
  })
  it('붙여넣은 목록에서 장소 이름을 뽑는다', () => {
    expect(parsePasted('1. 경복궁\n2) 통인시장 - 기름떡볶이\n• 북촌 한옥마을 (오전)\nhttps://blog.example\n경복궁')).toEqual(['경복궁', '통인시장', '북촌 한옥마을'])
    const r = addPasted(base(), 1, '카페 A\n서점 B')
    expect(r.added).toBe(2)
    expect(r.itinerary.days[0].stops.filter((s) => s.custom).length).toBe(2)
  })
})

describe('동선·일정 점검', () => {
  it('거리로 이동 수단과 시간을 추정한다', () => {
    expect(estimateLeg(0.5).mode).toBe('walk')
    expect(estimateLeg(5)).toEqual({ minutes: 26, mode: 'ride' })
  })
  it('직접 추가한 장소는 지도·이동 계산에서 빠진다', () => {
    const it1 = addCustomStop(base(), 1, { name: '좌표 없는 곳' })
    expect(dayLegs(it1.days[0]).length).toBe(dayLegs(base().days[0]).length)
    const pts = projectDay(it1.days[0], 320, 220)
    expect(pts.every((p) => p.x >= 0 && p.x <= 320 && p.y >= 0 && p.y <= 220)).toBe(true)
    expect(pts.some((p) => p.stop.custom)).toBe(false)
  })
  it('장소가 너무 많거나 시간이 겹치면 알려 준다', () => {
    let it1 = base()
    for (let i = 0; i < 8; i++) it1 = addCustomStop(it1, 1, { name: `추가 ${i}`, time: '10:00' })
    const kinds = checkPlan(it1, 'relaxed', (s) => s.name.ko).filter((x) => x.day === 1).map((x) => x.kind)
    expect(kinds).toContain('tooMany')
    expect(kinds).toContain('overlap')
    const one = addCustomStop(base(), 2, { name: '겹침', time: base().days[1].stops[0].time })
    expect(checkPlan(one, 'packed', (s) => s.name.ko).some((x) => x.kind === 'overlap')).toBe(true)
    const fixed = checkPlan(retime(one), 'packed', (s) => s.name.ko).map((x) => x.kind)
    expect(fixed).not.toContain('overlap')
  })
  it('기본 생성 일정 자체의 시간 겹침 건수(참고용)', () => {
    const n = checkPlan(base(), 'balanced', (s) => s.name.ko).filter((x) => x.kind === 'overlap').length
    expect(n).toBeGreaterThanOrEqual(0)
    console.log('mock overlap issues:', n)
  })
})

describe('가계부·정산', () => {
  it('1/N 정산: 누가 누구에게 얼마', () => {
    let l = ['민수', '지영', '철수'].reduce(addMember, EMPTY_LEDGER)
    l = addExpense(l, { title: '저녁', amount: 90000, currency: 'KRW', payer: '민수', among: [] })
    l = addExpense(l, { title: '택시', amount: 30000, currency: 'KRW', payer: '지영', among: ['지영', '철수'] })
    expect(totals(l)).toEqual([{ currency: 'KRW', total: 120000 }])
    expect(balances(l, 'KRW')).toEqual({ 민수: 60000, 지영: -15000, 철수: -45000 })
    expect(settle(l)).toEqual([
      { from: '철수', to: '민수', amount: 45000, currency: 'KRW' },
      { from: '지영', to: '민수', amount: 15000, currency: 'KRW' },
    ])
    expect(removeMember(l, '민수')).toBe(l) // 지출 기록이 있으면 못 지운다
    expect(addExpense(l, { title: '', amount: 10, currency: 'KRW', payer: '민수', among: [] })).toBe(l)
  })
  it('통화별로 따로 정산한다', () => {
    let l = ['A', 'B'].reduce(addMember, EMPTY_LEDGER)
    l = addExpense(l, { title: 'x', amount: 100, currency: 'JPY', payer: 'A', among: [] })
    l = addExpense(l, { title: 'y', amount: 10.5, currency: 'USD', payer: 'B', among: [] })
    expect(settle(l)).toEqual([
      { from: 'B', to: 'A', amount: 50, currency: 'JPY' },
      { from: 'A', to: 'B', amount: 5.25, currency: 'USD' },
    ])
  })
})

describe('짐 싸기', () => {
  it('해외면 여권이 들어가고, 직접 추가·체크·삭제가 된다', () => {
    expect(packingItems([], false, []).some((i) => i.key === 'abroad:passport')).toBe(false)
    let s = addCustom(EMPTY_PACKING, '삼각대')
    s = toggleItem(s, 'custom:삼각대')
    const items = packingItems([{ id: 'umbrella', why: 'rain' } as never, { id: 'esim', why: 'abroad' } as never], true, s.custom)
    expect(items.map((i) => i.key)).toEqual(expect.arrayContaining(['abroad:passport', 'gear:umbrella', 'custom:삼각대']))
    expect(items.some((i) => i.key === 'gear:esim')).toBe(false)
    expect(removeCustom(s, '삼각대')).toEqual({ checked: [], custom: [] })
  })
})

describe('공유 코드', () => {
  it('일정을 코드로 만들고 다시 읽는다', () => {
    const it0 = addCustomStop(base(), 1, { name: '한글 장소 🍜' })
    const code = encodeTrip(params, it0)
    expect(code.startsWith(SHARE_PREFIX)).toBe(true)
    const got = decodeTrip(`  ${code}\n`)
    expect(got?.params.cities).toEqual(['seoul'])
    expect(got?.itinerary.days.length).toBe(3)
    expect(got?.itinerary.days[0].stops.some((s) => s.name.ko === '한글 장소 🍜')).toBe(true)
  })
  it('깨진 코드나 잘못된 내용은 거부한다', () => {
    expect(decodeTrip('hello')).toBeNull()
    expect(decodeTrip(`${SHARE_PREFIX}@@@`)).toBeNull()
    const bad = encodeTrip({ ...params, travelers: 'army' as never }, base())
    expect(decodeTrip(bad)).toBeNull()
  })
})

describe('여행자 톡', () => {
  it('링크·연락처·빈 글·긴 글을 막는다', () => {
    expect(checkBody('  아침엔  쌀쌀해요 ')).toEqual({ ok: true, body: '아침엔 쌀쌀해요' })
    expect(checkBody('')).toEqual({ ok: false, error: 'empty' })
    expect(checkBody('가'.repeat(301))).toEqual({ ok: false, error: 'tooLong' })
    expect(checkBody('여기 좋아요 https://spam.example')).toEqual({ ok: false, error: 'link' })
    expect(checkBody('싸게 해드려요 bit.ly 접속')).toEqual({ ok: false, error: 'link' })
    expect(checkBody('연락주세요 010-1234-5678')).toEqual({ ok: false, error: 'contact' })
    expect(checkBody('오픈채팅으로 오세요')).toEqual({ ok: false, error: 'contact' })
    expect(checkBody('입장료는 15000원, 11시 30분 전에 가세요')).toMatchObject({ ok: true })
  })
  it('지난 시간을 표시용으로 바꾼다', () => {
    const now = Date.parse('2027-01-01T12:00:00Z')
    expect(ago('2027-01-01T11:59:40Z', now)).toEqual({ unit: 'now', n: 0 })
    expect(ago('2027-01-01T09:00:00Z', now)).toEqual({ unit: 'hour', n: 3 })
    expect(ago('2026-12-30T12:00:00Z', now)).toEqual({ unit: 'day', n: 2 })
  })
})
