// 환경 변수 접근 (타입 보장 + 기본값)
const e = import.meta.env

function bool(v: string | undefined, fallback = false): boolean {
  if (v === undefined || v === '') return fallback
  return v === 'true' || v === '1'
}

export const ENV = {
  supabaseUrl: (e.VITE_SUPABASE_URL as string | undefined) ?? '',
  supabaseAnonKey: (e.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '',
  /** Supabase 미설정 시 자동으로 목업 모드 */
  mockAi: bool(e.VITE_MOCK_AI as string | undefined, true) || !(e.VITE_SUPABASE_URL as string | undefined),
  admobEnabled: bool(e.VITE_ADMOB_ENABLED as string | undefined, false),
  admobBannerAndroid: (e.VITE_ADMOB_BANNER_ANDROID as string | undefined) || 'ca-app-pub-3940256099942544/6300978111',
  admobBannerIos: (e.VITE_ADMOB_BANNER_IOS as string | undefined) || 'ca-app-pub-3940256099942544/2934735716',
  affiliate: {
    klook: (e.VITE_AFF_KLOOK_QS as string | undefined) ?? '',
    booking: (e.VITE_AFF_BOOKING_QS as string | undefined) ?? '',
    agoda: (e.VITE_AFF_AGODA_QS as string | undefined) ?? '',
    trip: (e.VITE_AFF_TRIP_QS as string | undefined) ?? '',
    getyourguide: (e.VITE_AFF_GYG_QS as string | undefined) ?? '',
    expedia: (e.VITE_AFF_EXPEDIA_QS as string | undefined) ?? '',
    creatripUrl: (e.VITE_AFF_CREATRIP_URL as string | undefined) ?? '',
    trazyUrl: (e.VITE_AFF_TRAZY_URL as string | undefined) ?? '',
    nolUrl: (e.VITE_AFF_NOL_URL as string | undefined) ?? '',
    /** Skyscanner 제휴(Impact) 추적 쿼리스트링 */
    skyscanner: (e.VITE_AFF_SKYSCANNER_QS as string | undefined) ?? '',
    /** Travelpayouts(Aviasales) 파트너 marker */
    tpMarker: (e.VITE_TP_MARKER as string | undefined) ?? '',
  },
  version: '0.2.0',
} as const

export const hasSupabase = Boolean(ENV.supabaseUrl && ENV.supabaseAnonKey)
