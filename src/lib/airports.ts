// 공항·항공사 데이터 — 여행지 카탈로그와 연결 (항공권 검색용)
import type { Locale } from '../i18n'
import { DESTINATIONS, destName, getDestination, type Destination } from './destinations'

/** 저장된 출발(홈) 공항 키 */
export const HOME_AIRPORT_KEY = 'homeAirport'

export interface Airport {
  code: string
  cityId: string
  name: string // 공항명 (영문 기본, 일부 한국어)
}

/** 공항명 (도시당 공항이 여럿인 곳은 로케일별 이름) */
const AIRPORT_NAMES: Record<string, { en: string; ko?: string; ja?: string; zh?: string }> = {
  ICN: { en: 'Incheon', ko: '인천', ja: '仁川', zh: '仁川' },
  GMP: { en: 'Gimpo', ko: '김포', ja: '金浦', zh: '金浦' },
  PUS: { en: 'Gimhae', ko: '김해', ja: '金海', zh: '金海' },
  CJU: { en: 'Jeju', ko: '제주', ja: '済州', zh: '濟州' },
  YNY: { en: 'Yangyang', ko: '양양', ja: '襄陽', zh: '襄陽' },
  RSU: { en: 'Yeosu', ko: '여수', ja: '麗水', zh: '麗水' },
  TAE: { en: 'Daegu', ko: '대구', ja: '大邱', zh: '大邱' },
  KWJ: { en: 'Gwangju', ko: '광주', ja: '光州', zh: '光州' },
  CJJ: { en: 'Cheongju', ko: '청주', ja: '清州', zh: '清州' },
  HND: { en: 'Haneda', ko: '하네다', ja: '羽田', zh: '羽田' },
  NRT: { en: 'Narita', ko: '나리타', ja: '成田', zh: '成田' },
  KIX: { en: 'Kansai', ko: '간사이', ja: '関西', zh: '關西' },
  ITM: { en: 'Itami', ko: '이타미', ja: '伊丹', zh: '伊丹' },
  FUK: { en: 'Fukuoka' },
  CTS: { en: 'New Chitose', ko: '신치토세', ja: '新千歳', zh: '新千歲' },
  OKA: { en: 'Naha', ko: '나하', ja: '那覇', zh: '那霸' },
  NGO: { en: 'Chubu Centrair', ko: '주부', ja: '中部', zh: '中部' },
  HIJ: { en: 'Hiroshima' },
  MYJ: { en: 'Matsuyama' },
  TPE: { en: 'Taoyuan', ko: '타오위안', ja: '桃園', zh: '桃園' },
  TSA: { en: 'Songshan', ko: '쑹산', ja: '松山', zh: '松山' },
  KHH: { en: 'Kaohsiung' },
  RMQ: { en: 'Taichung' },
  HKG: { en: 'Hong Kong' },
  MFM: { en: 'Macau' },
  PVG: { en: 'Pudong', ko: '푸둥', ja: '浦東', zh: '浦東' },
  SHA: { en: 'Hongqiao', ko: '훙차오', ja: '虹橋', zh: '虹橋' },
  PEK: { en: 'Capital', ko: '서우두', ja: '首都', zh: '首都' },
  PKX: { en: 'Daxing', ko: '다싱', ja: '大興', zh: '大興' },
  TAO: { en: 'Jiaodong' },
  DYG: { en: 'Hehua' },
  BKK: { en: 'Suvarnabhumi', ko: '수완나품', ja: 'スワンナプーム', zh: '蘇凡納布' },
  DMK: { en: 'Don Mueang', ko: '돈므앙', ja: 'ドンムアン', zh: '廊曼' },
  HKT: { en: 'Phuket' },
  CNX: { en: 'Chiang Mai' },
  DAD: { en: 'Da Nang' },
  CXR: { en: 'Cam Ranh', ko: '깜라인', ja: 'カムラン', zh: '金蘭' },
  HAN: { en: 'Noi Bai', ko: '노이바이', ja: 'ノイバイ', zh: '內排' },
  SGN: { en: 'Tan Son Nhat', ko: '떤선녓', ja: 'タンソンニャット', zh: '新山一' },
  PQC: { en: 'Phu Quoc' },
  SIN: { en: 'Changi', ko: '창이', ja: 'チャンギ', zh: '樟宜' },
  KUL: { en: 'Kuala Lumpur Intl' },
  BKI: { en: 'Kota Kinabalu' },
  DPS: { en: 'Ngurah Rai', ko: '응우라라이', ja: 'ングラ・ライ', zh: '伍拉·賴' },
  CEB: { en: 'Mactan-Cebu', ko: '막탄세부', ja: 'マクタン・セブ', zh: '麥克坦宿霧' },
  MPH: { en: 'Caticlan', ko: '칼리보·카티클란', ja: 'カティクラン', zh: '卡蒂克蘭' },
  MNL: { en: 'Ninoy Aquino' },
  TAG: { en: 'Bohol-Panglao' },
  SAI: { en: 'Siem Reap-Angkor' },
  VTE: { en: 'Wattay' },
  CDG: { en: 'Charles de Gaulle', ko: '샤를 드골', ja: 'シャルル・ド・ゴール', zh: '戴高樂' },
  ORY: { en: 'Orly', ko: '오를리', ja: 'オルリー', zh: '奧利' },
  LHR: { en: 'Heathrow', ko: '히드로', ja: 'ヒースロー', zh: '希斯洛' },
  LGW: { en: 'Gatwick', ko: '개트윅', ja: 'ガトウィック', zh: '蓋威克' },
  FCO: { en: 'Fiumicino' },
  MXP: { en: 'Malpensa' },
  VCE: { en: 'Marco Polo' },
  FLR: { en: 'Florence' },
  BCN: { en: 'El Prat' },
  MAD: { en: 'Barajas' },
  LIS: { en: 'Humberto Delgado' },
  AMS: { en: 'Schiphol' },
  FRA: { en: 'Frankfurt' },
  MUC: { en: 'Munich' },
  BER: { en: 'Brandenburg' },
  PRG: { en: 'Václav Havel' },
  VIE: { en: 'Vienna' },
  BUD: { en: 'Budapest' },
  ZRH: { en: 'Zurich' },
  ATH: { en: 'Athens' },
  JTR: { en: 'Santorini' },
  IST: { en: 'Istanbul' },
  DBV: { en: 'Dubrovnik' },
  KEF: { en: 'Keflavík' },
  HEL: { en: 'Helsinki-Vantaa' },
  JFK: { en: 'John F. Kennedy' },
  EWR: { en: 'Newark' },
  LGA: { en: 'LaGuardia' },
  LAX: { en: 'Los Angeles Intl' },
  SFO: { en: 'San Francisco Intl' },
  LAS: { en: 'Harry Reid' },
  SEA: { en: 'Seattle-Tacoma' },
  ORD: { en: "O'Hare" },
  HNL: { en: 'Daniel K. Inouye' },
  YVR: { en: 'Vancouver Intl' },
  YYZ: { en: 'Pearson' },
  CUN: { en: 'Cancún Intl' },
  GUM: { en: 'Guam Intl' },
  SPN: { en: 'Saipan Intl' },
  SYD: { en: 'Kingsford Smith' },
  MEL: { en: 'Tullamarine' },
  AKL: { en: 'Auckland' },
  ZQN: { en: 'Queenstown' },
  DXB: { en: 'Dubai Intl' },
  CAI: { en: 'Cairo Intl' },
  MLE: { en: 'Velana' },
  UBN: { en: 'Chinggis Khaan' },
  KTM: { en: 'Tribhuvan' },
}

/** 카탈로그 전체 공항 (중복 코드는 첫 도시 기준 — 예: KIX 는 오사카) */
export const AIRPORTS: Airport[] = (() => {
  const seen = new Set<string>()
  const out: Airport[] = []
  for (const dst of DESTINATIONS) {
    for (const code of dst.airports) {
      if (seen.has(code)) continue
      seen.add(code)
      out.push({ code, cityId: dst.id, name: AIRPORT_NAMES[code]?.en ?? code })
    }
  }
  return out
})()

const BY_CODE = new Map(AIRPORTS.map((a) => [a.code, a]))

export function getAirport(code: string | null | undefined): Airport | undefined {
  return code ? BY_CODE.get(code.toUpperCase()) : undefined
}

export function airportDestination(code: string): Destination | undefined {
  return getDestination(getAirport(code)?.cityId)
}

export function airportName(code: string, locale: Locale): string {
  const n = AIRPORT_NAMES[code]
  if (!n) return code
  const key = locale === 'zh-TW' ? 'zh' : locale
  return (key !== 'en' && n[key]) || n.en
}

/** "도쿄 하네다 (HND)" 형태 라벨 */
export function airportLabel(code: string, locale: Locale): string {
  const a = getAirport(code)
  if (!a) return code
  const city = destName(a.cityId, locale)
  const name = airportName(code, locale)
  return name === city || name === code ? `${city} (${code})` : `${city} ${name} (${code})`
}

export function searchAirports(query: string, locale: Locale): Airport[] {
  const q = query.trim().toLowerCase()
  if (!q) return AIRPORTS
  return AIRPORTS.filter((a) => {
    if (a.code.toLowerCase().startsWith(q)) return true
    if (airportLabel(a.code, locale).toLowerCase().includes(q)) return true
    const dst = getDestination(a.cityId)
    return dst ? Object.values(dst.name).some((n) => n.toLowerCase().includes(q)) : false
  })
}

/** 여행지 → 대표 공항 (국내선이면 김포 우선 등 출발지 고려) */
export function bestAirportFor(cityId: string, fromCode?: string): string | undefined {
  const dst = getDestination(cityId)
  if (!dst || !dst.airports.length) return undefined
  return dst.airports[0] === fromCode && dst.airports.length > 1 ? dst.airports[1] : dst.airports[0]
}

/** 출발 공항 보정 — 한국 국내선은 김포 출발이 일반적 (인천 → 김포) */
export function domesticOrigin(fromCode: string, toCode: string): string {
  const from = airportDestination(fromCode)
  const to = airportDestination(toCode)
  if (fromCode === 'ICN' && from?.country === 'KR' && to?.country === 'KR' && toCode !== 'GMP') return 'GMP'
  return fromCode
}

// ---------- 항공사 ----------
export interface Airline {
  code: string
  en: string
  ko: string
  ja?: string
  zh?: string
  country: string
  lcc?: boolean
  hub?: string // 환승 허브 공항
}

export const AIRLINES: Airline[] = [
  { code: 'KE', en: 'Korean Air', ko: '대한항공', ja: '大韓航空', zh: '大韓航空', country: 'KR', hub: 'ICN' },
  { code: 'OZ', en: 'Asiana Airlines', ko: '아시아나항공', ja: 'アシアナ航空', zh: '韓亞航空', country: 'KR', hub: 'ICN' },
  { code: '7C', en: 'Jeju Air', ko: '제주항공', ja: 'チェジュ航空', zh: '濟州航空', country: 'KR', lcc: true },
  { code: 'LJ', en: 'Jin Air', ko: '진에어', ja: 'ジンエアー', zh: '真航空', country: 'KR', lcc: true },
  { code: 'TW', en: "T'way Air", ko: '티웨이항공', ja: 'ティーウェイ航空', zh: '德威航空', country: 'KR', lcc: true },
  { code: 'BX', en: 'Air Busan', ko: '에어부산', ja: 'エアプサン', zh: '釜山航空', country: 'KR', lcc: true },
  { code: 'RS', en: 'Air Seoul', ko: '에어서울', ja: 'エアソウル', zh: '首爾航空', country: 'KR', lcc: true },
  { code: 'ZE', en: 'Eastar Jet', ko: '이스타항공', ja: 'イースター航空', zh: '易斯達航空', country: 'KR', lcc: true },
  { code: 'YP', en: 'Air Premia', ko: '에어프레미아', ja: 'エアプレミア', zh: '普雷米亞航空', country: 'KR' },
  { code: 'JL', en: 'Japan Airlines', ko: '일본항공', ja: '日本航空', zh: '日本航空', country: 'JP', hub: 'HND' },
  { code: 'NH', en: 'ANA', ko: '전일본공수', ja: '全日空', zh: '全日空', country: 'JP', hub: 'NRT' },
  { code: 'MM', en: 'Peach', ko: '피치항공', ja: 'ピーチ', zh: '樂桃航空', country: 'JP', lcc: true },
  { code: 'GK', en: 'Jetstar Japan', ko: '젯스타 재팬', ja: 'ジェットスター・ジャパン', zh: '捷星日本', country: 'JP', lcc: true },
  { code: 'CI', en: 'China Airlines', ko: '중화항공', ja: 'チャイナエアライン', zh: '中華航空', country: 'TW', hub: 'TPE' },
  { code: 'BR', en: 'EVA Air', ko: '에바항공', ja: 'エバー航空', zh: '長榮航空', country: 'TW', hub: 'TPE' },
  { code: 'JX', en: 'Starlux', ko: '스타럭스', ja: 'スターラックス', zh: '星宇航空', country: 'TW' },
  { code: 'IT', en: 'Tigerair Taiwan', ko: '타이거에어 타이완', ja: 'タイガーエア台湾', zh: '台灣虎航', country: 'TW', lcc: true },
  { code: 'CX', en: 'Cathay Pacific', ko: '캐세이퍼시픽', ja: 'キャセイパシフィック', zh: '國泰航空', country: 'HK', hub: 'HKG' },
  { code: 'UO', en: 'HK Express', ko: '홍콩익스프레스', ja: '香港エクスプレス', zh: '香港快運', country: 'HK', lcc: true },
  { code: 'NX', en: 'Air Macau', ko: '에어마카오', ja: 'マカオ航空', zh: '澳門航空', country: 'MO' },
  { code: 'MU', en: 'China Eastern', ko: '중국동방항공', ja: '中国東方航空', zh: '中國東方航空', country: 'CN', hub: 'PVG' },
  { code: 'CA', en: 'Air China', ko: '중국국제항공', ja: '中国国際航空', zh: '中國國際航空', country: 'CN', hub: 'PEK' },
  { code: 'SC', en: 'Shandong Airlines', ko: '산둥항공', ja: '山東航空', zh: '山東航空', country: 'CN' },
  { code: 'TG', en: 'Thai Airways', ko: '타이항공', ja: 'タイ国際航空', zh: '泰國國際航空', country: 'TH', hub: 'BKK' },
  { code: 'FD', en: 'Thai AirAsia', ko: '타이 에어아시아', ja: 'タイ・エアアジア', zh: '泰國亞洲航空', country: 'TH', lcc: true },
  { code: 'VN', en: 'Vietnam Airlines', ko: '베트남항공', ja: 'ベトナム航空', zh: '越南航空', country: 'VN', hub: 'HAN' },
  { code: 'VJ', en: 'Vietjet Air', ko: '비엣젯항공', ja: 'ベトジェット', zh: '越捷航空', country: 'VN', lcc: true },
  { code: 'SQ', en: 'Singapore Airlines', ko: '싱가포르항공', ja: 'シンガポール航空', zh: '新加坡航空', country: 'SG', hub: 'SIN' },
  { code: 'TR', en: 'Scoot', ko: '스쿠트', ja: 'スクート', zh: '酷航', country: 'SG', lcc: true },
  { code: 'MH', en: 'Malaysia Airlines', ko: '말레이시아항공', ja: 'マレーシア航空', zh: '馬來西亞航空', country: 'MY' },
  { code: 'AK', en: 'AirAsia', ko: '에어아시아', ja: 'エアアジア', zh: '亞洲航空', country: 'MY', lcc: true },
  { code: 'GA', en: 'Garuda Indonesia', ko: '가루다인도네시아', ja: 'ガルーダ・インドネシア', zh: '印尼鷹航', country: 'ID' },
  { code: 'PR', en: 'Philippine Airlines', ko: '필리핀항공', ja: 'フィリピン航空', zh: '菲律賓航空', country: 'PH' },
  { code: '5J', en: 'Cebu Pacific', ko: '세부퍼시픽', ja: 'セブ・パシフィック', zh: '宿霧太平洋航空', country: 'PH', lcc: true },
  { code: 'QV', en: 'Lao Airlines', ko: '라오항공', ja: 'ラオス国営航空', zh: '寮國航空', country: 'LA' },
  { code: 'UA', en: 'United Airlines', ko: '유나이티드항공', ja: 'ユナイテッド航空', zh: '聯合航空', country: 'US', hub: 'SFO' },
  { code: 'DL', en: 'Delta Air Lines', ko: '델타항공', ja: 'デルタ航空', zh: '達美航空', country: 'US', hub: 'SEA' },
  { code: 'AA', en: 'American Airlines', ko: '아메리칸항공', ja: 'アメリカン航空', zh: '美國航空', country: 'US' },
  { code: 'AC', en: 'Air Canada', ko: '에어캐나다', ja: 'エア・カナダ', zh: '加拿大航空', country: 'CA', hub: 'YVR' },
  { code: 'AM', en: 'Aeroméxico', ko: '아에로멕시코', ja: 'アエロメヒコ', zh: '墨西哥航空', country: 'MX' },
  { code: 'QF', en: 'Qantas', ko: '콴타스', ja: 'カンタス航空', zh: '澳洲航空', country: 'AU', hub: 'SYD' },
  { code: 'JQ', en: 'Jetstar', ko: '젯스타', ja: 'ジェットスター', zh: '捷星航空', country: 'AU', lcc: true },
  { code: 'NZ', en: 'Air New Zealand', ko: '에어뉴질랜드', ja: 'ニュージーランド航空', zh: '紐西蘭航空', country: 'NZ' },
  { code: 'AF', en: 'Air France', ko: '에어프랑스', ja: 'エールフランス', zh: '法國航空', country: 'FR', hub: 'CDG' },
  { code: 'BA', en: 'British Airways', ko: '영국항공', ja: 'ブリティッシュ・エアウェイズ', zh: '英國航空', country: 'GB', hub: 'LHR' },
  { code: 'AZ', en: 'ITA Airways', ko: 'ITA항공', ja: 'ITAエアウェイズ', zh: 'ITA航空', country: 'IT' },
  { code: 'IB', en: 'Iberia', ko: '이베리아항공', ja: 'イベリア航空', zh: '伊比利亞航空', country: 'ES' },
  { code: 'TP', en: 'TAP Air Portugal', ko: 'TAP 포르투갈항공', ja: 'TAPポルトガル航空', zh: '葡萄牙航空', country: 'PT' },
  { code: 'KL', en: 'KLM', ko: 'KLM 네덜란드항공', ja: 'KLMオランダ航空', zh: '荷蘭皇家航空', country: 'NL', hub: 'AMS' },
  { code: 'LH', en: 'Lufthansa', ko: '루프트한자', ja: 'ルフトハンザ', zh: '漢莎航空', country: 'DE', hub: 'FRA' },
  { code: 'OS', en: 'Austrian Airlines', ko: '오스트리아항공', ja: 'オーストリア航空', zh: '奧地利航空', country: 'AT' },
  { code: 'LX', en: 'SWISS', ko: '스위스항공', ja: 'スイス航空', zh: '瑞士國際航空', country: 'CH' },
  { code: 'A3', en: 'Aegean Airlines', ko: '에게안항공', ja: 'エーゲ航空', zh: '愛琴海航空', country: 'GR' },
  { code: 'TK', en: 'Turkish Airlines', ko: '터키항공', ja: 'ターキッシュ エアラインズ', zh: '土耳其航空', country: 'TR', hub: 'IST' },
  { code: 'FI', en: 'Icelandair', ko: '아이슬란드항공', ja: 'アイスランド航空', zh: '冰島航空', country: 'IS' },
  { code: 'AY', en: 'Finnair', ko: '핀에어', ja: 'フィンエアー', zh: '芬蘭航空', country: 'FI', hub: 'HEL' },
  { code: 'EK', en: 'Emirates', ko: '에미레이트항공', ja: 'エミレーツ航空', zh: '阿聯酋航空', country: 'AE', hub: 'DXB' },
  { code: 'QR', en: 'Qatar Airways', ko: '카타르항공', ja: 'カタール航空', zh: '卡達航空', country: 'QA', hub: 'DOH' },
  { code: 'MS', en: 'EgyptAir', ko: '이집트항공', ja: 'エジプト航空', zh: '埃及航空', country: 'EG' },
  { code: 'OM', en: 'MIAT Mongolian Airlines', ko: '몽골항공', ja: 'MIATモンゴル航空', zh: '蒙古航空', country: 'MN' },
]

const AIRLINE_BY_CODE = new Map(AIRLINES.map((a) => [a.code, a]))

export function getAirline(code: string): Airline | undefined {
  return AIRLINE_BY_CODE.get(code)
}

export function airlineName(code: string, locale: Locale): string {
  const a = AIRLINE_BY_CODE.get(code)
  if (!a) return code
  if (locale === 'ko') return a.ko
  if (locale === 'ja') return a.ja ?? a.en
  if (locale === 'zh-TW') return a.zh ?? a.en
  return a.en
}

export function airlinesOf(country: string): Airline[] {
  return AIRLINES.filter((a) => a.country === country)
}
