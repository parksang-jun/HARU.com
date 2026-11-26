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
  /** AI 를 부르지 않고 앱에 내장된 일정 생성기·기본 답변을 쓴다 (비용 0원). 서버의 숙소·항공·날씨 연결은 그대로 쓴다 */
  aiBuiltin: bool(e.VITE_AI_BUILTIN as string | undefined, false) || bool(e.VITE_MOCK_AI as string | undefined, true) || !(e.VITE_SUPABASE_URL as string | undefined),
  admobEnabled: bool(e.VITE_ADMOB_ENABLED as string | undefined, true),
  admobBannerAndroid: (e.VITE_ADMOB_BANNER_ANDROID as string | undefined) || 'ca-app-pub-3940256099942544/6300978111',
  admobRewardedAndroid: (e.VITE_ADMOB_REWARDED_ANDROID as string | undefined) || 'ca-app-pub-3940256099942544/5224354917',
  admobRewardedIos: (e.VITE_ADMOB_REWARDED_IOS as string | undefined) || 'ca-app-pub-3940256099942544/1712485313',
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
    /** 아마존 어소시에이트 태그 (미국 / 일본) — 여행 제품 추천 링크 */
    amazon: (e.VITE_AFF_AMAZON_TAG as string | undefined) ?? '',
    amazonJp: (e.VITE_AFF_AMAZON_JP_TAG as string | undefined) ?? '',
    /** Travelpayouts(Aviasales) 파트너 marker */
    tpMarker: (e.VITE_TP_MARKER as string | undefined) ?? '',
  },
  version: '0.6.0',
} as const

export const hasSupabase = Boolean(ENV.supabaseUrl && ENV.supabaseAnonKey)
