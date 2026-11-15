// AdMob 배너 — 네이티브 앱에서 표시(기본 켜짐, VITE_ADMOB_ENABLED=false 로 끔). 전면광고는 쓰지 않음(신뢰 우선)
import { Capacitor } from '@capacitor/core'
import { ENV } from './env'

type AdMobModule = typeof import('@capacitor-community/admob')

let mod: AdMobModule | null = null
let initialized = false
let bannerShown = false

export function adsAvailable(): boolean {
  return ENV.admobEnabled && Capacitor.isNativePlatform()
}

/** 배너를 보여 줄 화면: 홈·예약·혜택·일정·보고서·제품 추천·공항 가이드.
 *  컨시어지 대화, 여행 만들기(입력 중), 약관, 관리자, 더보기에는 넣지 않는다 (AI 답변 안·입력 화면 광고 금지) */
export function bannerAllowed(pathname: string): boolean {
  if (['/', '/deals', '/hotels', '/flights', '/flights/deals'].includes(pathname)) return true
  return /^\/trip\/[^/]+(\/(report|gear|airport))?$/.test(pathname)
}

/** 웹 미리보기(테스트 베드)에서 배너 자리를 표시할지 — 실제 광고는 네이티브 앱에서만 나온다 */
export function bannerPreview(): boolean {
  return ENV.admobEnabled && ENV.mockAi && !Capacitor.isNativePlatform()
}

async function load(): Promise<AdMobModule | null> {
  if (!adsAvailable()) return null
  if (!mod) mod = await import('@capacitor-community/admob')
  return mod
}

/** 초기화 + UMP 동의 + iOS ATT (플러그인 공식 권장 순서) */
export async function initAds(): Promise<void> {
  const m = await load()
  if (!m || initialized) return
  initialized = true
  const { AdMob, AdmobConsentStatus, BannerAdPluginEvents } = m
  await AdMob.initialize({ initializeForTesting: import.meta.env.DEV })

  const [tracking, consent] = await Promise.all([AdMob.trackingAuthorizationStatus(), AdMob.requestConsentInfo()])
  if (tracking.status === 'notDetermined') {
    await AdMob.requestTrackingAuthorization()
  }
  const auth = await AdMob.trackingAuthorizationStatus()
  if (auth.status === 'authorized' && consent.isConsentFormAvailable && consent.status === AdmobConsentStatus.REQUIRED) {
    await AdMob.showConsentForm()
  }

  // 배너 높이만큼 하단 여백 확보
  AdMob.addListener(BannerAdPluginEvents.SizeChanged, (size) => {
    document.documentElement.style.setProperty('--banner-h', `${size.height}px`)
  })
}

export async function showBanner(): Promise<void> {
  const m = await load()
  if (!m) return
  await initAds()
  const { AdMob, BannerAdPosition, BannerAdSize } = m
  const adId = Capacitor.getPlatform() === 'ios' ? ENV.admobBannerIos : ENV.admobBannerAndroid
  if (bannerShown) {
    await AdMob.resumeBanner()
    return
  }
  await AdMob.showBanner({
    adId,
    adSize: BannerAdSize.ADAPTIVE_BANNER,
    position: BannerAdPosition.BOTTOM_CENTER,
    isTesting: import.meta.env.DEV,
  })
  bannerShown = true
}

export async function hideBanner(): Promise<void> {
  const m = await load()
  if (!m || !bannerShown) return
  await m.AdMob.hideBanner()
  document.documentElement.style.setProperty('--banner-h', '0px')
}
