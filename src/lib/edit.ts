// 일정 편집 — 순서 바꾸기, 다른 날로 옮기기, 삭제, 내 장소 추가, 메모, 붙여넣어 가져오기.
// 모든 함수는 새 Itinerary 를 돌려준다(원본을 바꾸지 않는다).
import type { Itinerary, ItineraryDay, Stop, StopCategory } from './itinerary'

const clone = (it: Itinerary): Itinerary => ({ ...it, days: it.days.map((d) => ({ ...d, stops: [...d.stops] })) })
const dayOf = (it: Itinerary, day: number): ItineraryDay | undefined => it.days.find((d) => d.day === day)

/** 두 장소의 시간을 맞바꿔 화면 순서(시간순)가 실제로 바뀌게 한다 */
function swap(stops: Stop[], i: number, j: number): void {
  const a = stops[i]
  const b = stops[j]
  stops[i] = { ...b, time: a.time }
  stops[j] = { ...a, time: b.time }
}

/** 같은 날 안에서 위(-1)·아래(+1)로 한 칸 */
export function moveStop(it: Itinerary, day: number, idx: number, dir: -1 | 1): Itinerary {
  const out = clone(it)
  const d = dayOf(out, day)
  const j = idx + dir
  if (!d || idx < 0 || idx >= d.stops.length || j < 0 || j >= d.stops.length) return it
  swap(d.stops, idx, j)
  return out
}

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
const toTime = (m: number) => `${String(Math.floor(Math.min(m, 23 * 60 + 30) / 60)).padStart(2, '0')}:${String(Math.min(m, 23 * 60 + 30) % 60).padStart(2, '0')}`

/** 그날 마지막 일정 뒤의 시간 (비어 있으면 10:00) */
export function nextFreeTime(d: Pick<ItineraryDay, 'stops'>): string {
  const last = d.stops[d.stops.length - 1]
  return last ? toTime(toMin(last.time) + Math.min(last.durationMin, 120) + 30) : '10:00'
}

/** 전날(-1)·다음 날(+1)로 옮긴다 — 옮긴 날의 맨 끝에 붙는다 */
export function moveStopToDay(it: Itinerary, day: number, idx: number, delta: -1 | 1): Itinerary {
  const out = clone(it)
  const from = dayOf(out, day)
  const to = dayOf(out, day + delta)
  if (!from || !to || idx < 0 || idx >= from.stops.length) return it
  const [stop] = from.stops.splice(idx, 1)
  to.stops.push({ ...stop, time: nextFreeTime(to) })
  return out
}

export function removeStop(it: Itinerary, day: number, idx: number): Itinerary {
  const out = clone(it)
  const d = dayOf(out, day)
  if (!d || idx < 0 || idx >= d.stops.length) return it
  d.stops.splice(idx, 1)
  return out
}

export function setMemo(it: Itinerary, day: number, idx: number, memo: string): Itinerary {
  const out = clone(it)
  const d = dayOf(out, day)
  if (!d || !d.stops[idx]) return it
  const text = memo.trim().slice(0, 300)
  const { memo: _old, ...rest } = d.stops[idx]
  d.stops[idx] = text ? { ...rest, memo: text } : rest
  return out
}

export interface CustomPlace {
  name: string
  time?: string
  category?: StopCategory
  memo?: string
}

let seq = 0
/** 등록되지 않은 장소도 이름만으로 넣을 수 있다 (좌표가 없어 지도·거리 계산에서는 빠진다) */
export function addCustomStop(it: Itinerary, day: number, place: CustomPlace): Itinerary {
  const name = place.name.trim().slice(0, 80)
  const out = clone(it)
  const d = dayOf(out, day)
  if (!d || !name) return it
  const time = place.time && /^([01]\d|2[0-3]):[0-5]\d$/.test(place.time) ? place.time : nextFreeTime(d)
  const stop: Stop = {
    id: `c${Date.now().toString(36)}${(seq++).toString(36)}`,
    time,
    durationMin: 60,
    category: place.category ?? 'sight',
    name: { ko: name, en: name },
    area: '',
    lat: 0,
    lng: 0,
    tip: '',
    transitHint: '',
    custom: true,
  }
  const memo = place.memo?.trim().slice(0, 300)
  if (memo) stop.memo = memo
  d.stops.push(stop)
  d.stops.sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0))
  return out
}

/** 붙여넣은 글(블로그 메모·목록)에서 장소 이름을 뽑는다: 한 줄에 하나, 번호·기호·시간은 떼어 낸다 */
export function parsePasted(text: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of text.split(/\r?\n|[,;、，]/)) {
    if (/https?:|www\./i.test(raw)) continue
    const name = raw
      .replace(/^[\s\-–—•·*✓▶>\d.)(\]\[]+/, '')
      .replace(/^(\d{1,2}:\d{2}|오전|오후|AM|PM)\s*/i, '')
      .replace(/\s*[-–—:(（].*$/, '')
      .trim()
    if (name.length < 2 || name.length > 60 || /^https?:/i.test(name)) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(name)
    if (out.length >= 20) break
  }
  return out
}

/** 붙여넣은 장소들을 그날 일정 끝에 차례로 넣는다 */
export function addPasted(it: Itinerary, day: number, text: string): { itinerary: Itinerary; added: number } {
  let cur = it
  const names = parsePasted(text)
  for (const name of names) cur = addCustomStop(cur, day, { name })
  return { itinerary: cur, added: names.length }
}
