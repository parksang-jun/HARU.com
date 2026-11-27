// e2e 스모크 (목업 모드): vite preview 기동 → 여행 생성 → 일정/스폰서/제휴 클릭 로그/챗 → 항공권·호텔·해외여행 검증 → 스크린샷
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

// Playwright 는 전역(preinstalled) 패키지를 CJS require 로 로드
const require = createRequire(import.meta.url)
const { chromium } = require('playwright')

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const shots = join(root, 'screenshots')
mkdirSync(shots, { recursive: true })
const PORT = 4181
const BASE = `http://localhost:${PORT}`

function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERT: ${msg}`)
  console.log(`ok - ${msg}`)
}

async function waitForServer(url, ms = 20000) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    try {
      const r = await fetch(url)
      if (r.ok) return
    } catch {}
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error('preview server did not start')
}

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: root, stdio: 'ignore' })
let browser
try {
  await waitForServer(BASE)
  browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'en-US' })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => console.error('pageerror', e.message))
  // 외부 링크 새 탭 차단: window.open 가로채기
  await page.addInitScript(() => {
    window.__opened = []
    window.open = (u) => {
      window.__opened.push(String(u))
      return null
    }
  })

  await page.goto(`${BASE}/#/`)
  await page.getByTestId('start-trip').waitFor()
  await page.screenshot({ path: join(shots, '01-home.png') })

  await page.getByTestId('start-trip').click()
  await page.getByTestId('generate').waitFor()
  await page.getByTestId('city-busan').click() // 서울 + 부산
  assert((await page.getByTestId('interest-chip').count()) === 20, 'setup offers 20 interests')
  // 숙소 나누기: 3박을 두 곳으로 (2박 + 1박)
  await page.getByTestId('stay-count').nth(1).click()
  assert((await page.getByTestId('stay-row').count()) === 2, 'two stay rows appear when splitting')
  assert((await page.getByTestId('stay-total').innerText()).includes('3'), 'stay nights add up to the trip')
  await page.getByTestId('stay-area').first().fill('Jongno')
  assert((await page.getByTestId('notes-help').innerText()).toLowerCase().includes('keyword'), 'setup asks for keywords')
  await page.getByTestId('note-keyword').nth(0).click() // vegetarian
  await page.getByTestId('note-keyword').nth(6).click() // no shopping
  assert((await page.getByTestId('setup-notes').inputValue()) === 'vegetarian, no shopping', 'keyword chips fill the request box')
  assert((await page.getByTestId('banner-slot').count()) === 0, 'no banner on the setup screen')
  await page.screenshot({ path: join(shots, '02-setup.png'), fullPage: true })
  await page.getByTestId('generate').click()

  await page.getByTestId('itin-title').waitFor({ timeout: 15000 })
  assert((await page.getByTestId('banner-slot').count()) === 1, 'banner slot is shown on the itinerary')
  const dayTabs = await page.getByTestId('day-tab').count()
  assert(dayTabs >= 2, `itinerary renders with ${dayTabs} days (>= 2)`)
  const stops = await page.getByTestId('stop').count()
  assert(stops >= 3, `day 1 has ${stops} stops`)

  // 날씨: 날짜 탭마다 아이콘·기온, 선택한 날의 날씨 카드, 준비 체크리스트
  await page.getByTestId('day-weather').waitFor({ timeout: 5000 })
  assert((await page.getByTestId('day-tab-weather').count()) === dayTabs, 'every day tab shows weather')
  const temp = await page.getByTestId('day-weather-temp').innerText()
  assert(/-?\d+° \/ -?\d+°C \(-?\d+° \/ -?\d+°F\)/.test(temp), `day weather shows temperatures: "${temp}"`)
  const src = await page.getByTestId('day-weather').getAttribute('data-source')
  assert(['forecast', 'estimate'].includes(src), `weather source is labelled (${src})`)
  const before = await page.getByTestId('prep-progress').innerText()
  await page.getByTestId('prep-weather').click()
  const after = await page.getByTestId('prep-progress').innerText()
  assert(before !== after && /^2\//.test(after), `prep checklist progress moves: "${before}" → "${after}"`)
  assert((await page.getByTestId('packing-list').innerText()).length > 0, 'packing list is shown')
  assert((await page.getByTestId('day-outfit').innerText()).length > 12, 'day weather suggests what to wear')
  await page.screenshot({ path: join(shots, '03-itinerary.png'), fullPage: true })

  // 숙소 나누기 결과: 숙소 구간이 도시·숙소 경계마다 나뉜다 (서울 2박 → 서울/부산 경계 포함 3구간 이하)
  const hotelRows = await page.getByTestId('plan-hotels').count()
  assert(hotelRows >= 2, `stay plan shows ${hotelRows} hotel segments`)
  assert((await page.getByTestId('plan-hotels').first().innerText()).includes('Jongno'), 'first stay shows the chosen area')

  // 점심·저녁 고르기 + 식당 예약 방법
  assert((await page.locator('[data-testid="meals-lunch"] [data-testid="meal-option"]').count()) === 3, 'three lunch options')
  assert((await page.locator('[data-testid="meals-dinner"] [data-testid="meal-option"]').count()) === 3, 'three dinner options')
  await page.locator('[data-testid="meals-dinner"] [data-testid="meal-option"]').nth(1).click()
  assert((await page.locator('[data-testid="meals-dinner"] [aria-checked="true"]').count()) === 1, 'one dinner is selected')
  await page.getByTestId('reserve-guide').locator('summary').click()
  assert((await page.locator('[data-testid="reserve-platform"][data-platform="catchtable"]').count()) === 1, 'Korean reservation service is offered')
  await page.screenshot({ path: join(shots, '19-meals.png'), fullPage: true })

  // 추가 요청 반영 내역
  const reqItems = page.getByTestId('request-item')
  assert((await reqItems.count()) === 2, 'both special requests are listed')
  assert((await page.locator('[data-testid="request-item"][data-applied="true"]').count()) === 2, 'both requests are marked applied')
  for (let i = 0; i < dayTabs; i++) {
    await page.getByTestId('day-tab').nth(i).click()
    assert((await page.locator('[data-testid="stop"][data-category="shopping"]').count()) === 0, `day ${i + 1} has no shopping stops ("no shopping")`)
  }
  await page.getByTestId('day-tab').first().click()

  // 여행 보고서
  await page.getByTestId('report-open').click()
  await page.getByTestId('report-title').waitFor()
  assert((await page.getByTestId('report-day').count()) === dayTabs, 'report lists every day')
  assert((await page.getByTestId('report-prep').innerText()).includes('2/'), 'report shows prep progress')
  assert((await page.getByTestId('report-costs').innerText()).includes('₩'), 'report totals costs')
  assert((await page.locator('[data-testid="report-meal"][data-chosen="true"]').count()) === 1, 'the chosen dinner appears in the report')
  await page.screenshot({ path: join(shots, '16-report.png'), fullPage: true })
  await page.goBack()

  // 여행 제품 추천
  await page.getByTestId('prep-gear').click()
  await page.getByTestId('gear-item').first().waitFor()
  const gearUrl = await page.getByTestId('gear-link').first().getAttribute('data-url')
  assert(/^https:\/\/www\.(amazon\.com\/s\?k=|klook\.com\/search)/.test(gearUrl), `gear links to a shop search (${gearUrl})`)
  await page.screenshot({ path: join(shots, '17-gear.png'), fullPage: true })
  await page.goBack()

  // 공항 대기 가이드 (항공편이 있는 여행일 때)
  if (await page.getByTestId('prep-airport').count()) {
    await page.getByTestId('prep-airport').click()
    await page.getByTestId('wait-tips').waitFor()
    const two = await page.locator('[data-testid="wait-tips"] li').count()
    await page.getByTestId('wait-chip').nth(3).click()
    assert((await page.locator('[data-testid="wait-tips"] li[data-tip="nap"]').count()) === 1, 'long waits suggest a nap zone')
    assert(two >= 3, 'wait tips are listed')
    await page.screenshot({ path: join(shots, '18-airport.png'), fullPage: true })
    await page.goBack()
  }
  await page.getByTestId('itin-title').waitFor()

  // 스폰서 카드 + 라벨
  const nearby = page.getByTestId('nearby-deals')
  await nearby.waitFor()
  const sponsored = nearby.locator('[data-testid="coupon-card"][data-sponsored="1"]')
  assert((await sponsored.count()) >= 1, 'a sponsored coupon card is visible in the itinerary')
  const label = await sponsored.first().locator('.badge--sponsored').innerText()
  assert(label.trim() === 'Sponsored', `sponsored label text is "${label.trim()}"`)
  await sponsored.first().scrollIntoViewIfNeeded()
  await page.waitForTimeout(400)

  // 제휴 CTA 클릭 → 로그 + window.open
  const book = page.getByTestId('book-cta').first()
  await book.click()
  await page.waitForTimeout(300)
  const log = await page.evaluate(() => window.__haruLog ?? [])
  const aff = log.filter((e) => e.kind === 'affiliate_click')
  assert(aff.length === 1, `affiliate click logged (partner=${aff[0]?.partner}, url=${aff[0]?.url})`)
  assert(log.some((e) => e.kind === 'ad_impression'), 'sponsored impression logged')
  const opened = await page.evaluate(() => window.__opened)
  assert(opened.length === 1 && opened[0].startsWith('https://'), `external link opened: ${opened[0]}`)

  // 항공·호텔 바로가기 카드 (서울 출발 기본 → 서울 여행은 항공권 생략, 서울·부산 호텔 2구간)
  await page.getByTestId('plan-card').waitFor()
  assert((await page.getByTestId('plan-flights').count()) === 0, 'no flight shortcut for a trip starting in the home city')
  assert((await page.getByTestId('plan-hotels').count()) === 2, 'hotel shortcuts for Seoul and Busan stays')

  // 2일차 전환
  await page.getByTestId('day-tab').nth(1).click()
  await page.waitForTimeout(200)
  assert((await page.getByTestId('stop').count()) >= 3, 'day 2 renders stops')

  // 언어 전환(일본어) 스크린샷
  await page.locator('header select').selectOption('ja')
  await page.waitForTimeout(200)
  await page.screenshot({ path: join(shots, '04-itinerary-ja.png'), fullPage: true })
  await page.locator('header select').selectOption('en')

  // 챗
  await page.locator('a.btn--accent').click()
  await page.getByTestId('chat-input').waitFor()
  await page.getByTestId('chat-input').fill('How do I get a T-money card?')
  await page.getByTestId('chat-send').click()
  await page.getByTestId('msg-assistant').first().waitFor({ timeout: 10000 })
  const answer = await page.getByTestId('msg-assistant').first().innerText()
  assert(answer.toLowerCase().includes('t-money'), `chat answered: "${answer.slice(0, 60)}…"`)
  await page.screenshot({ path: join(shots, '05-chat.png') })

  // 혜택 탭
  await page.goto(`${BASE}/#/deals`)
  await page.getByTestId('deals-list').waitFor()
  await page.waitForTimeout(300)
  assert((await page.getByTestId('coupon-card').count()) >= 5, 'deals tab lists coupons')
  await page.screenshot({ path: join(shots, '06-deals.png'), fullPage: true })

  // ---------- 호텔: 일정 카드 → 자동 검색 → 제휴 클릭 ----------
  await page.goto(`${BASE}/#/`)
  await page.getByTestId('start-trip').waitFor()
  await page.locator('a.card.row').first().click()
  await page.getByTestId('plan-hotels').first().click()
  await page.getByTestId('hotel-results').waitFor({ timeout: 10000 })
  const hotels = await page.getByTestId('hotel-card').count()
  assert(hotels >= 5, `hotel search lists ${hotels} hotels`)
  await page.getByTestId('stars-4').click()
  const fourPlus = await page.getByTestId('hotel-card').count()
  assert(fourPlus > 0 && fourPlus < hotels, `4★+ filter narrows results (${fourPlus})`)
  await page.getByTestId('stars-4').click()
  await page.screenshot({ path: join(shots, '09-hotels.png'), fullPage: true })
  await page.evaluate(() => {
    window.__haruLog = []
    window.__opened = []
  })
  await page.getByTestId('hotel-book').first().click()
  await page.waitForTimeout(300)
  let ev = (await page.evaluate(() => window.__haruLog)).filter((e) => e.kind === 'affiliate_click')
  let urls = await page.evaluate(() => window.__opened)
  assert(ev.length === 1 && ev[0].clickKind === 'hotel' && ev[0].partner === 'agoda' && ev[0].tripId, `hotel click logged (${ev[0]?.partner}, trip=${Boolean(ev[0]?.tripId)})`)
  assert(urls[0]?.includes('agoda.com/search') && urls[0]?.includes('checkIn=') && urls[0]?.includes('adults=2'), `hotel link carries dates/guests: ${urls[0]}`)
  await page.getByTestId('hotel-compare-booking').click()
  await page.waitForTimeout(200)
  urls = await page.evaluate(() => window.__opened)
  assert(urls[1]?.startsWith('https://www.booking.com/searchresults.html?ss=Seoul') || urls[1]?.startsWith('https://www.booking.com/searchresults.html?ss=Busan'), `compare on Booking.com: ${urls[1]}`)

  // ---------- 항공권: 직접 검색 ----------
  await page.goto(`${BASE}/#/flights?from=ICN&to=NRT&depart=2027-03-10&return=2027-03-14&adults=2`)
  await page.getByTestId('flight-results').waitFor({ timeout: 10000 })
  const flights = await page.getByTestId('flight-offer').count()
  assert(flights >= 4, `flight search lists ${flights} offers`)
  await page.getByTestId('nonstop').click()
  const nonstop = await page.getByTestId('flight-offer').count()
  assert(nonstop >= 1 && nonstop <= flights, `nonstop filter shows ${nonstop}`)
  await page.getByTestId('nonstop').click()
  await page.screenshot({ path: join(shots, '10-flights.png'), fullPage: true })
  await page.evaluate(() => {
    window.__haruLog = []
    window.__opened = []
  })
  await page.getByTestId('flight-book').first().click()
  await page.waitForTimeout(300)
  ev = (await page.evaluate(() => window.__haruLog)).filter((e) => e.kind === 'affiliate_click')
  urls = await page.evaluate(() => window.__opened)
  assert(ev.length === 1 && ev[0].clickKind === 'flight' && ev[0].partner === 'trip', `flight click logged (${ev[0]?.partner})`)
  assert(urls[0]?.includes('trip.com/flights') && urls[0]?.includes('ddate=2027-03-10') && urls[0]?.includes('quantity=2'), `flight link carries route/dates: ${urls[0]}`)
  await page.getByTestId('compare-skyscanner').click()
  await page.waitForTimeout(200)
  urls = await page.evaluate(() => window.__opened)
  assert(urls[1] === 'https://www.skyscanner.net/transport/flights/icn/nrt/270310/270314/?adultsv2=2&cabinclass=economy', `compare on Skyscanner: ${urls[1]}`)

  // 공항 검색 선택기
  await page.getByTestId('to').click()
  await page.getByTestId('to-search').fill('bangkok')
  await page.getByTestId('to-opt-BKK').click()
  await page.getByTestId('search-flights').click()
  await page.waitForTimeout(800)
  assert((await page.getByTestId('flight-results').locator('h2').innerText()).includes('Bangkok'), 'airport picker switches destination to Bangkok')

  // ---------- 해외 여행: 도쿄 → 오사카 ----------
  await page.goto(`${BASE}/#/setup`)
  await page.getByTestId('generate').waitFor()
  await page.getByTestId('city-seoul').click() // 기본 선택 해제
  await page.getByTestId('region-japan').click()
  await page.getByTestId('city-tokyo').click()
  await page.getByTestId('dest-search').fill('大阪')
  await page.getByTestId('city-osaka').click()
  await page.getByTestId('dest-search').fill('')
  const route = await page.getByTestId('selected-cities').innerText()
  assert(route.includes('Tokyo') && route.includes('Osaka') && !route.includes('Seoul'), `route shows Tokyo → Osaka: "${route.replace(/\s+/g, ' ')}"`)
  await page.screenshot({ path: join(shots, '11-setup-overseas.png'), fullPage: true })
  await page.getByTestId('generate').click()
  await page.getByTestId('itin-title').waitFor({ timeout: 15000 })
  const title2 = await page.getByTestId('itin-title').innerText()
  assert(title2.includes('Tokyo') && title2.includes('Osaka'), `overseas itinerary title: "${title2}"`)
  assert((await page.getByTestId('plan-flights').count()) === 1, 'flight shortcut appears for an overseas trip')
  assert((await page.getByTestId('plan-flights').innerText()).includes('ICN ⇄ HND'), 'flight shortcut uses ICN ⇄ HND')
  // 해외 정류지: 네이버/카카오맵 대신 구글맵만
  await page.getByRole('button', { name: 'Map', exact: true }).first().click()
  assert((await page.getByRole('button', { name: 'Naver Map' }).count()) === 0, 'no Naver Map button for overseas stops')
  assert((await page.getByRole('button', { name: 'Google Maps' }).count()) >= 1, 'Google Maps button shown for overseas stops')
  // 숙소 정류지 → 호텔 찾기
  assert((await page.getByTestId('find-hotels').count()) >= 1, 'stay stop offers "Find hotels"')
  await page.screenshot({ path: join(shots, '12-itinerary-overseas.png'), fullPage: true })

  // 해외 여행: 나라별 꿀팁
  await page.getByTestId('prep-tips').click()
  await page.getByTestId('country-tips').first().waitFor()
  assert((await page.locator('[data-testid="country-tips"] li[data-tip="plug"]').count()) >= 1, 'country tips show plug and voltage')
  assert((await page.locator('[data-testid="country-tips"] li[data-tip="emergency"]').count()) >= 1, 'country tips show emergency numbers')
  await page.screenshot({ path: join(shots, '20-tips.png'), fullPage: true })
  await page.goBack()
  await page.getByTestId('itin-title').waitFor()

  // 해외 여행: 공항 대기 가이드
  await page.getByTestId('prep-airport').click()
  await page.getByTestId('wait-tips').waitFor()
  await page.getByTestId('wait-chip').nth(3).click()
  assert((await page.locator('[data-testid="wait-tips"] li[data-tip="nap"]').count()) === 1, 'long waits suggest a nap zone')
  assert((await page.getByTestId('airport-name').innerText()).length > 2, 'airport guide names the departure airport')
  await page.screenshot({ path: join(shots, '18-airport.png'), fullPage: true })
  await page.goBack()
  await page.getByTestId('itin-title').waitFor()
  await page.getByTestId('plan-flights').click()
  await page.getByTestId('flight-results').waitFor({ timeout: 10000 })
  assert((await page.getByTestId('flight-offer').count()) >= 3, 'flights prefilled from the itinerary return offers')

  // 한국어 화면 (항공권·호텔)
  await page.locator('header select').selectOption('ko')
  await page.waitForTimeout(200)
  await page.screenshot({ path: join(shots, '13-flights-ko.png'), fullPage: true })
  await page.goto(`${BASE}/#/hotels?dest=danang&in=2027-03-10&out=2027-03-13&adults=2`)
  await page.getByTestId('hotel-results').waitFor({ timeout: 10000 })
  await page.screenshot({ path: join(shots, '14-hotels-ko.png'), fullPage: true })
  await page.goto(`${BASE}/#/`)
  await page.getByTestId('quick-flights').waitFor()
  await page.screenshot({ path: join(shots, '15-home-ko.png'), fullPage: true })
  await page.locator('header select').selectOption('en')

  // ---------- 비즈니스 특가·땡처리 ----------
  await page.goto(`${BASE}/#/flights`)
  await page.getByTestId('deals-link').click()
  await page.getByTestId('deal-results').waitFor({ timeout: 10000 })
  const deals30 = await page.getByTestId('deal-card').count()
  assert(deals30 >= 5, `business deals list ${deals30} deals (30 days)`)
  await page.getByTestId('window-7').click()
  const deals7 = await page.getByTestId('deal-card').count()
  assert(deals7 <= deals30, `7-day window narrows deals (${deals7})`)
  await page.getByTestId('window-45').click()
  await page.screenshot({ path: join(shots, '16-business-deals.png'), fullPage: true })
  await page.evaluate(() => {
    window.__haruLog = []
    window.__opened = []
  })
  await page.getByTestId('deal-book').first().click()
  await page.waitForTimeout(300)
  ev = (await page.evaluate(() => window.__haruLog)).filter((e) => e.kind === 'affiliate_click')
  urls = await page.evaluate(() => window.__opened)
  assert(ev[0]?.clickKind === 'flight' && ev[0]?.query.startsWith('BUSINESS DEAL'), 'business deal click logged')
  assert(urls[0]?.includes('aviasales.com/search/') && urls[0]?.includes('trip_class=1'), `deal link is business class: ${urls[0]}`)
  await page.getByTestId('deal-compare').first().click()
  await page.getByTestId('flight-results').waitFor({ timeout: 10000 })
  assert((await page.locator('select').filter({ hasText: 'Business' }).inputValue()) === 'business', 'compare opens flight search in business class')

  // ── v0.7 여행 도구: 편집 · 지도/점검 · 짐 · 가계부 · 여행자 톡 · 공유 코드 ──
  await page.goto(`${BASE}/#/`)
  await page.locator('a.card.row').first().click()
  await page.getByTestId('tools').waitFor()
  const tripBase = page.url().replace(/\/(report|gear|airport|tips)$/, '')
  assert((await page.getByTestId('tools').locator('a').count()) === 7, 'trip tools shown (7)')

  await page.getByTestId('tool-edit').click()
  await page.getByTestId('edit-stop').first().waitFor()
  const n0 = await page.getByTestId('edit-stop').count()
  const firstName = await page.getByTestId('edit-stop').first().locator('.edit__name').innerText()
  await page.getByTestId('edit-stop').first().getByTestId('edit-down').click()
  await page.waitForFunction((n) => document.querySelector('[data-testid="edit-stop"] .edit__name')?.textContent !== n, firstName)
  assert((await page.getByTestId('edit-stop').nth(1).locator('.edit__name').innerText()) === firstName, 'stop moved down')
  await page.getByTestId('edit-add-name').fill('My secret noodle shop')
  await page.getByTestId('edit-add').click()
  await page.waitForFunction((n) => document.querySelectorAll('[data-testid="edit-stop"]').length === n + 1, n0)
  await page.getByTestId('edit-paste-open').click()
  await page.getByTestId('edit-paste').fill('1. Cafe Alpha\n2. Bookshop Beta')
  await page.getByTestId('edit-paste-add').click()
  await page.waitForFunction((n) => document.querySelectorAll('[data-testid="edit-stop"]').length === n + 3, n0)
  assert(true, 'own place + pasted list added (3 custom stops)')
  await page.getByTestId('edit-memo').first().fill('window seat')
  await page.getByTestId('edit-memo').first().blur()
  await page.screenshot({ path: join(shots, '20-edit.png'), fullPage: true })
  await page.goto(tripBase)
  await page.getByTestId('stop').first().waitFor()
  assert((await page.locator('[data-testid="stop"][data-custom="true"]').count()) === 3, 'custom stops appear in itinerary')
  assert((await page.getByTestId('stop-memo').first().innerText()).includes('window seat'), 'memo shown on stop')

  await page.goto(`${tripBase}/map`)
  await page.getByTestId('route-map').waitFor()
  assert((await page.getByTestId('map-point').count()) >= 2, 'route map drawn')
  assert((await page.getByTestId('map-leg').count()) >= 1 && (await page.getByTestId('map-total').innerText()).length > 0, 'legs and total travel shown')
  assert(Number(await page.getByTestId('plan-check').getAttribute('data-issues')) >= 0, 'plan check rendered')
  if (await page.getByTestId('plan-fix').count()) {
    await page.getByTestId('plan-fix').click()
    await page.waitForFunction(() => !document.querySelector('[data-testid="plan-issue"][data-kind="overlap"]'))
    assert(true, 'auto-fix removes time overlaps')
  }
  await page.screenshot({ path: join(shots, '21-map.png'), fullPage: true })

  await page.goto(`${tripBase}/packing`)
  await page.getByTestId('packing-item').first().waitFor()
  await page.getByTestId('packing-item').first().click()
  await page.getByTestId('packing-add-name').fill('Tripod')
  await page.getByTestId('packing-add').click()
  await page.locator('[data-testid="packing-item"][data-key="custom:Tripod"]').waitFor()
  assert(/^1\//.test((await page.getByTestId('packing-progress').innerText()).replace(/[^\d/]/g, '')), 'packing progress counts 1')
  await page.reload()
  await page.locator('[data-testid="packing-item"][data-key="custom:Tripod"]').waitFor()
  assert((await page.locator('[data-testid="packing-item"].is-on').count()) === 1, 'packing state persisted')
  await page.screenshot({ path: join(shots, '22-packing.png'), fullPage: true })

  await page.goto(`${tripBase}/budget`)
  for (const m of ['Ann', 'Ben', 'Cho']) {
    await page.getByTestId('ledger-member-name').fill(m)
    await page.getByTestId('ledger-member-add').click()
  }
  await page.getByTestId('ledger-title').fill('Dinner')
  await page.getByTestId('ledger-amount').fill('90')
  await page.getByTestId('ledger-add').click()
  await page.getByTestId('ledger-transfer').first().waitFor()
  assert((await page.getByTestId('ledger-transfer').count()) === 2, 'settlement: 2 transfers to the payer')
  await page.screenshot({ path: join(shots, '23-ledger.png'), fullPage: true })

  await page.goto(`${tripBase}/talk`)
  await page.getByTestId('talk-item').first().waitFor()
  const t0n = await page.getByTestId('talk-item').count()
  await page.getByTestId('talk-input').fill('visit https://spam.example now')
  await page.getByTestId('talk-post').click()
  await page.getByTestId('talk-error').waitFor()
  assert(true, 'talk: link post rejected')
  await page.getByTestId('talk-input').fill('Bring a light jacket for the evening.')
  await page.getByTestId('talk-post').click()
  await page.locator('[data-testid="talk-item"][data-mine="true"]').waitFor()
  assert((await page.getByTestId('talk-item').count()) === t0n + 1, 'talk: own post added')
  await page.getByTestId('talk-report').first().click()
  await page.waitForFunction((n) => document.querySelectorAll('[data-testid="talk-item"]').length === n, t0n)
  assert(true, 'talk: reported post hidden')
  await page.screenshot({ path: join(shots, '24-talk.png'), fullPage: true })

  // 공유 코드: 만들기 → 홈에서 가져오기
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto(`${tripBase}/report`)
  await page.getByTestId('share-code').click()
  await page.getByTestId('share-copied').waitFor()
  const code = await page.evaluate(() => navigator.clipboard.readText())
  assert(code.startsWith('HARU1:'), 'share code copied')
  await page.goto(`${BASE}/#/`)
  const tripsBefore = await page.locator('a.card.row').count()
  await page.getByTestId('import-open').click()
  await page.getByTestId('import-code').fill('HARU1:broken')
  await page.getByTestId('import-go').click()
  await page.getByTestId('import-bad').waitFor()
  await page.getByTestId('import-code').fill(code)
  await page.getByTestId('import-go').click()
  await page.getByTestId('tools').waitFor()
  assert((await page.locator('[data-testid="stop"][data-custom="true"]').count()) === 3, 'imported trip keeps custom stops')
  await page.goto(`${BASE}/#/`)
  await page.locator('a.card.row').first().waitFor()
  assert((await page.locator('a.card.row').count()) === tripsBefore + 1, 'imported trip saved as a copy')

  // ── v0.9 자동 준비: 환율·예산 · 회화 ──
  await page.locator('a.card.row').first().click()
  await page.getByTestId('ready').waitFor()
  assert((await page.getByTestId('ready-item').count()) >= 6, 'auto-prepared list shown')
  assert((await page.getByTestId('tools').locator('a').count()) === 7, 'trip tools shown (7)')
  const prepTrip = page.url()
  await page.goto(`${prepTrip}/money`)
  await page.getByTestId('budget-total').waitFor()
  assert((await page.getByTestId('budget-line').count()) === 5, 'budget estimate has 5 lines')
  assert((await page.getByTestId('fx-kind').getAttribute('data-live')) === '0', 'test bed shows approximate rate label')
  const r1 = await page.getByTestId('fx-result').innerText()
  await page.getByTestId('fx-amount').fill('2500')
  await page.waitForFunction((v) => document.querySelector('[data-testid="fx-result"]')?.textContent !== v, r1)
  await page.getByTestId('fx-swap').click()
  assert((await page.getByTestId('cash-card').count()) === 1, 'cash-to-exchange recommendation shown')
  await page.screenshot({ path: join(shots, '27-money.png'), fullPage: true })
  await page.goto(`${prepTrip}/phrases`)
  await page.getByTestId('phrase').first().waitFor()
  assert((await page.getByTestId('phrase').count()) === 13, '13 phrases listed')
  await page.getByTestId('phrase').nth(5).click()
  await page.getByTestId('phrase-show').waitFor()
  await page.screenshot({ path: join(shots, '28-phrase.png') })
  await page.getByTestId('phrase-show').click()
  await page.goto(`${prepTrip}/budget`)
  await page.getByTestId('ledger-member-name').waitFor()
  if ((await page.getByTestId('ledger-member').count()) === 0) {
    await page.getByTestId('ledger-member-name').fill('Me')
    await page.getByTestId('ledger-member-add').click()
  }
  await page.getByTestId('ledger-title').fill('Lunch')
  await page.getByTestId('ledger-amount').fill('3000')
  await page.getByTestId('ledger-add').click()
  await page.getByTestId('ledger-vs-budget').waitFor()
  assert(true, 'ledger shows home-currency total against the budget')
  await page.goto(`${BASE}/#/`)

  // ── v0.8 광고: 스폰서 칸 · 보상형(무료 횟수 → 광고 보고 더 받기) ──
  await page.locator('a.card.row').first().click()
  await page.getByTestId('tools').waitFor()
  const adTrip = page.url()
  assert((await page.locator('[data-testid="sponsor-slot"][data-slot="essentials"]').count()) === 1, 'sponsor slot shown at the overseas-prep step')
  for (const [path, slot] of [['gear', 'gear'], ['packing', 'packing'], ['airport', 'airport']]) {
    await page.goto(`${adTrip}/${path}`)
    await page.locator(`[data-testid="sponsor-slot"][data-slot="${slot}"]`).waitFor()
  }
  assert(true, 'sponsor slots shown on gear, packing and airport pages (labelled as ads)')
  await page.goto(adTrip)
  await page.getByTestId('regenerate').click()
  await page.waitForFunction(() => !document.querySelector('[data-testid="regenerate"]')?.disabled && !document.querySelector('[data-testid="stop"][data-custom="true"]'))
  assert((await page.getByTestId('reward-gate').count()) === 0, 'first regenerate of the day is free')
  await page.getByTestId('regenerate').click()
  await page.getByTestId('reward-gate').waitFor()
  assert(true, 'second regenerate asks to watch an ad')
  await page.screenshot({ path: join(shots, '25-reward-gate.png') })
  await page.getByTestId('reward-watch').click()
  await page.getByTestId('reward-preview').waitFor()
  await page.getByTestId('reward-gate').waitFor({ state: 'detached', timeout: 8000 })
  await page.waitForFunction(() => !document.querySelector('[data-testid="regenerate"]')?.disabled)
  assert(true, 'ad watched → regenerate runs')
  await page.getByTestId('regenerate').click()
  await page.getByTestId('reward-watch').click()
  await page.getByTestId('reward-gate').waitFor({ state: 'detached', timeout: 8000 })
  await page.waitForFunction(() => !document.querySelector('[data-testid="regenerate"]')?.disabled)
  await page.getByTestId('regenerate').click()
  await page.getByTestId('reward-maxed').waitFor()
  assert(true, 'daily ad limit reached → no more regenerates today')
  await page.getByTestId('reward-close').click()
  await page.goto(`${adTrip}/chat`)
  await page.getByTestId('chat-left').waitFor()
  assert(Number(await page.getByTestId('chat-left').getAttribute('data-left')) >= 1, 'chat shows free questions left')
  await page.screenshot({ path: join(shots, '26-sponsor-slot.png'), fullPage: true })

  // 법적 고지
  await page.goto(`${BASE}/#/legal/ai`)
  await page.locator('.prose').waitFor()
  await page.screenshot({ path: join(shots, '07-ai-notice.png') })

  // 데스크톱 폭
  const desk = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await desk.goto(`${BASE}/#/`)
  await desk.getByTestId('start-trip').waitFor()
  await desk.screenshot({ path: join(shots, '08-desktop-home.png') })

  console.log('\nE2E PASSED')
} catch (e) {
  console.error('\nE2E FAILED:', e.message)
  process.exitCode = 1
} finally {
  await browser?.close()
  server.kill()
}
