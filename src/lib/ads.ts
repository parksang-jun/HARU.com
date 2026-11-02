// AdMob 배너 — 네이티브 + VITE_ADMOB_ENABLED=true 일 때만. 전면광고는 쓰지 않음(신뢰 우선)
import { Capacitor } from '@capacitor/core'
import { ENV } from './env'

type AdMobModule = typeof import('@capacitor-community/admob')

let mod: AdMobModule | null = null
let initialized = false
let bannerShown = false

export function adsAvailable(): boolean {
  return ENV.admobEnabled && Capacitor.isNativePlatform()
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
