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
  await page.screenshot({ path: join(shots, '02-setup.png'), fullPage: true })
  await page.getByTestId('generate').click()

  await page.getByTestId('itin-title').waitFor({ timeout: 15000 })
  const dayTabs = await page.getByTestId('day-tab').count()
  assert(dayTabs >= 2, `itinerary renders with ${dayTabs} days (>= 2)`)
  const stops = await page.getByTestId('stop').count()
  assert(stops >= 3, `day 1 has ${stops} stops`)
  await page.screenshot({ path: join(shots, '03-itinerary.png'), fullPage: true })

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
