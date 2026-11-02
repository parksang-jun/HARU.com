// 여행지 카탈로그 — 국내 + 해외 주요 도시 (좌표·공항·통화·시간대)
// 좌표는 도심 기준 대략값. 공항 코드는 첫 번째가 대표 공항.
import type { Locale } from '../i18n'
import { distanceKm } from './geo'

export type Region = 'korea' | 'japan' | 'china' | 'sea' | 'oceania' | 'americas' | 'europe' | 'mea'
export const REGIONS: Region[] = ['korea', 'japan', 'china', 'sea', 'europe', 'americas', 'oceania', 'mea']

export interface DestName {
  ko: string
  en: string
  ja: string
  zh: string
}

export interface Destination {
  id: string
  country: string // ISO 3166-1 alpha-2
  region: Region
  name: DestName
  lat: number
  lng: number
  airports: string[] // IATA, 대표 공항 우선
  currency: string // ISO 4217
  tz: number // UTC 오프셋(표준시, 시간 단위)
  areas?: string[] // 숙소 많은 지역 (호텔 검색 목업·필터)
  cost?: number // 물가 지수 (서울=1.0). 없으면 지역 기본값
}

function d(
  id: string,
  country: string,
  region: Region,
  ko: string,
  en: string,
  ja: string,
  zh: string,
  lat: number,
  lng: number,
  airports: string[],
  currency: string,
  tz: number,
  extra: Partial<Pick<Destination, 'areas' | 'cost'>> = {},
): Destination {
  return { id, country, region, name: { ko, en, ja, zh }, lat, lng, airports, currency, tz, ...extra }
}

export const DESTINATIONS: Destination[] = [
  // ---------- 국내 ----------
  d('seoul', 'KR', 'korea', '서울', 'Seoul', 'ソウル', '首爾', 37.5665, 126.978, ['ICN', 'GMP'], 'KRW', 9, { areas: ['Myeongdong', 'Hongdae', 'Gangnam', 'Jongno', 'Seongsu'] }),
  d('busan', 'KR', 'korea', '부산', 'Busan', '釜山', '釜山', 35.1796, 129.0756, ['PUS'], 'KRW', 9, { areas: ['Haeundae', 'Seomyeon', 'Nampo', 'Gwangalli'], cost: 0.9 }),
  d('jeju', 'KR', 'korea', '제주', 'Jeju', '済州', '濟州', 33.4996, 126.5312, ['CJU'], 'KRW', 9, { areas: ['Jeju City', 'Seogwipo', 'Aewol', 'Jungmun'], cost: 0.95 }),
  d('gyeongju', 'KR', 'korea', '경주', 'Gyeongju', '慶州', '慶州', 35.8562, 129.2247, ['PUS'], 'KRW', 9, { cost: 0.8 }),
  d('jeonju', 'KR', 'korea', '전주', 'Jeonju', '全州', '全州', 35.8242, 127.148, [], 'KRW', 9, { cost: 0.75 }),
  d('gangneung', 'KR', 'korea', '강릉', 'Gangneung', '江陵', '江陵', 37.7519, 128.8761, ['YNY'], 'KRW', 9, { cost: 0.85 }),
  d('sokcho', 'KR', 'korea', '속초', 'Sokcho', '束草', '束草', 38.207, 128.5918, ['YNY'], 'KRW', 9, { cost: 0.85 }),
  d('yeosu', 'KR', 'korea', '여수', 'Yeosu', '麗水', '麗水', 34.7604, 127.6622, ['RSU'], 'KRW', 9, { cost: 0.8 }),
  d('incheon', 'KR', 'korea', '인천', 'Incheon', '仁川', '仁川', 37.4563, 126.7052, ['ICN'], 'KRW', 9, { cost: 0.85 }),
  d('daegu', 'KR', 'korea', '대구', 'Daegu', '大邱', '大邱', 35.8714, 128.6014, ['TAE'], 'KRW', 9, { cost: 0.8 }),
  d('gwangju', 'KR', 'korea', '광주', 'Gwangju', '光州', '光州', 35.1595, 126.8526, ['KWJ'], 'KRW', 9, { cost: 0.75 }),
  d('daejeon', 'KR', 'korea', '대전', 'Daejeon', '大田', '大田', 36.3504, 127.3845, ['CJJ'], 'KRW', 9, { cost: 0.75 }),

  // ---------- 일본 ----------
  d('tokyo', 'JP', 'japan', '도쿄', 'Tokyo', '東京', '東京', 35.6762, 139.6503, ['HND', 'NRT'], 'JPY', 9, { areas: ['Shinjuku', 'Shibuya', 'Ginza', 'Asakusa', 'Ueno'], cost: 1.25 }),
  d('osaka', 'JP', 'japan', '오사카', 'Osaka', '大阪', '大阪', 34.6937, 135.5023, ['KIX', 'ITM'], 'JPY', 9, { areas: ['Namba', 'Umeda', 'Shinsaibashi', 'Tennoji'], cost: 1.05 }),
  d('kyoto', 'JP', 'japan', '교토', 'Kyoto', '京都', '京都', 35.0116, 135.7681, ['KIX', 'ITM'], 'JPY', 9, { areas: ['Gion', 'Kyoto Station', 'Kawaramachi', 'Arashiyama'], cost: 1.2 }),
  d('fukuoka', 'JP', 'japan', '후쿠오카', 'Fukuoka', '福岡', '福岡', 33.5904, 130.4017, ['FUK'], 'JPY', 9, { areas: ['Hakata', 'Tenjin', 'Nakasu'], cost: 0.95 }),
  d('sapporo', 'JP', 'japan', '삿포로', 'Sapporo', '札幌', '札幌', 43.0618, 141.3545, ['CTS'], 'JPY', 9, { areas: ['Susukino', 'Sapporo Station', 'Odori'] }),
  d('okinawa', 'JP', 'japan', '오키나와', 'Okinawa', '沖縄', '沖繩', 26.2124, 127.6809, ['OKA'], 'JPY', 9, { areas: ['Naha', 'Onna', 'Chatan'], cost: 1.1 }),
  d('nagoya', 'JP', 'japan', '나고야', 'Nagoya', '名古屋', '名古屋', 35.1815, 136.9066, ['NGO'], 'JPY', 9),
  d('hiroshima', 'JP', 'japan', '히로시마', 'Hiroshima', '広島', '廣島', 34.3853, 132.4553, ['HIJ'], 'JPY', 9, { cost: 0.9 }),
  d('matsuyama', 'JP', 'japan', '마쓰야마', 'Matsuyama', '松山', '松山', 33.8392, 132.7657, ['MYJ'], 'JPY', 9, { cost: 0.85 }),

  // ---------- 중화권 ----------
  d('taipei', 'TW', 'china', '타이베이', 'Taipei', '台北', '台北', 25.033, 121.5654, ['TPE', 'TSA'], 'TWD', 8, { areas: ['Ximending', 'Zhongshan', 'Xinyi', "Da'an"], cost: 0.85 }),
  d('kaohsiung', 'TW', 'china', '가오슝', 'Kaohsiung', '高雄', '高雄', 22.6273, 120.3014, ['KHH'], 'TWD', 8, { cost: 0.7 }),
  d('taichung', 'TW', 'china', '타이중', 'Taichung', '台中', '台中', 24.1477, 120.6736, ['RMQ'], 'TWD', 8, { cost: 0.7 }),
  d('hongkong', 'HK', 'china', '홍콩', 'Hong Kong', '香港', '香港', 22.3193, 114.1694, ['HKG'], 'HKD', 8, { areas: ['Tsim Sha Tsui', 'Central', 'Causeway Bay', 'Mong Kok'], cost: 1.4 }),
  d('macau', 'MO', 'china', '마카오', 'Macau', 'マカオ', '澳門', 22.1987, 113.5439, ['MFM'], 'MOP', 8, { cost: 1.2 }),
  d('shanghai', 'CN', 'china', '상하이', 'Shanghai', '上海', '上海', 31.2304, 121.4737, ['PVG', 'SHA'], 'CNY', 8, { areas: ['The Bund', "Jing'an", 'Xintiandi', 'Lujiazui'], cost: 0.95 }),
  d('beijing', 'CN', 'china', '베이징', 'Beijing', '北京', '北京', 39.9042, 116.4074, ['PEK', 'PKX'], 'CNY', 8, { cost: 0.9 }),
  d('qingdao', 'CN', 'china', '칭다오', 'Qingdao', '青島', '青島', 36.0671, 120.3826, ['TAO'], 'CNY', 8, { cost: 0.65 }),
  d('zhangjiajie', 'CN', 'china', '장자제', 'Zhangjiajie', '張家界', '張家界', 29.1171, 110.4792, ['DYG'], 'CNY', 8, { cost: 0.6 }),

  // ---------- 동남아 ----------
  d('bangkok', 'TH', 'sea', '방콕', 'Bangkok', 'バンコク', '曼谷', 13.7563, 100.5018, ['BKK', 'DMK'], 'THB', 7, { areas: ['Sukhumvit', 'Siam', 'Silom', 'Riverside'], cost: 0.6 }),
  d('phuket', 'TH', 'sea', '푸껫', 'Phuket', 'プーケット', '普吉島', 7.8804, 98.3923, ['HKT'], 'THB', 7, { areas: ['Patong', 'Kata', 'Kamala'], cost: 0.65 }),
  d('chiangmai', 'TH', 'sea', '치앙마이', 'Chiang Mai', 'チェンマイ', '清邁', 18.7883, 98.9853, ['CNX'], 'THB', 7, { cost: 0.45 }),
  d('danang', 'VN', 'sea', '다낭', 'Da Nang', 'ダナン', '峴港', 16.0544, 108.2022, ['DAD'], 'VND', 7, { areas: ['My Khe Beach', 'Han River', 'Son Tra', 'Hoi An'], cost: 0.5 }),
  d('nhatrang', 'VN', 'sea', '나트랑', 'Nha Trang', 'ニャチャン', '芽莊', 12.2388, 109.1967, ['CXR'], 'VND', 7, { cost: 0.5 }),
  d('hanoi', 'VN', 'sea', '하노이', 'Hanoi', 'ハノイ', '河內', 21.0278, 105.8342, ['HAN'], 'VND', 7, { areas: ['Old Quarter', 'Hoan Kiem', 'West Lake'], cost: 0.45 }),
  d('hochiminh', 'VN', 'sea', '호찌민', 'Ho Chi Minh City', 'ホーチミン', '胡志明市', 10.8231, 106.6297, ['SGN'], 'VND', 7, { cost: 0.5 }),
  d('phuquoc', 'VN', 'sea', '푸꾸옥', 'Phu Quoc', 'フーコック', '富國島', 10.2899, 103.984, ['PQC'], 'VND', 7, { cost: 0.6 }),
  d('singapore', 'SG', 'sea', '싱가포르', 'Singapore', 'シンガポール', '新加坡', 1.3521, 103.8198, ['SIN'], 'SGD', 8, { areas: ['Marina Bay', 'Orchard', 'Bugis', 'Sentosa'], cost: 1.5 }),
  d('kualalumpur', 'MY', 'sea', '쿠알라룸푸르', 'Kuala Lumpur', 'クアラルンプール', '吉隆坡', 3.139, 101.6869, ['KUL'], 'MYR', 8, { cost: 0.55 }),
  d('kotakinabalu', 'MY', 'sea', '코타키나발루', 'Kota Kinabalu', 'コタキナバル', '亞庇', 5.9804, 116.0735, ['BKI'], 'MYR', 8, { cost: 0.55 }),
  d('bali', 'ID', 'sea', '발리', 'Bali', 'バリ島', '峇里島', -8.3405, 115.092, ['DPS'], 'IDR', 8, { areas: ['Seminyak', 'Ubud', 'Kuta', 'Nusa Dua'], cost: 0.6 }),
  d('cebu', 'PH', 'sea', '세부', 'Cebu', 'セブ', '宿霧', 10.3157, 123.8854, ['CEB'], 'PHP', 8, { areas: ['Mactan', 'Cebu City'], cost: 0.55 }),
  d('boracay', 'PH', 'sea', '보라카이', 'Boracay', 'ボラカイ', '長灘島', 11.9674, 121.9248, ['MPH'], 'PHP', 8, { cost: 0.65 }),
  d('manila', 'PH', 'sea', '마닐라', 'Manila', 'マニラ', '馬尼拉', 14.5995, 120.9842, ['MNL'], 'PHP', 8, { cost: 0.55 }),
  d('bohol', 'PH', 'sea', '보홀', 'Bohol', 'ボホール', '薄荷島', 9.8499, 124.1435, ['TAG'], 'PHP', 8, { cost: 0.55 }),
  d('siemreap', 'KH', 'sea', '씨엠립', 'Siem Reap', 'シェムリアップ', '暹粒', 13.3671, 103.8448, ['SAI'], 'USD', 7, { cost: 0.45 }),
  d('vientiane', 'LA', 'sea', '비엔티안', 'Vientiane', 'ビエンチャン', '永珍', 17.9757, 102.6331, ['VTE'], 'LAK', 7, { cost: 0.4 }),

  // ---------- 유럽 ----------
  d('paris', 'FR', 'europe', '파리', 'Paris', 'パリ', '巴黎', 48.8566, 2.3522, ['CDG', 'ORY'], 'EUR', 1, { areas: ['Le Marais', 'Saint-Germain', 'Opéra', 'Montmartre'], cost: 2.0 }),
  d('london', 'GB', 'europe', '런던', 'London', 'ロンドン', '倫敦', 51.5074, -0.1278, ['LHR', 'LGW'], 'GBP', 0, { areas: ['Covent Garden', 'South Kensington', 'Shoreditch', 'Westminster'], cost: 2.2 }),
  d('rome', 'IT', 'europe', '로마', 'Rome', 'ローマ', '羅馬', 41.9028, 12.4964, ['FCO'], 'EUR', 1, { areas: ['Centro Storico', 'Trastevere', 'Termini', 'Vatican'], cost: 1.7 }),
  d('milan', 'IT', 'europe', '밀라노', 'Milan', 'ミラノ', '米蘭', 45.4642, 9.19, ['MXP'], 'EUR', 1, { cost: 1.8 }),
  d('venice', 'IT', 'europe', '베네치아', 'Venice', 'ヴェネツィア', '威尼斯', 45.4408, 12.3155, ['VCE'], 'EUR', 1, { cost: 2.0 }),
  d('florence', 'IT', 'europe', '피렌체', 'Florence', 'フィレンツェ', '佛羅倫斯', 43.7696, 11.2558, ['FLR'], 'EUR', 1, { cost: 1.8 }),
  d('barcelona', 'ES', 'europe', '바르셀로나', 'Barcelona', 'バルセロナ', '巴塞隆納', 41.3874, 2.1686, ['BCN'], 'EUR', 1, { areas: ['Gothic Quarter', 'Eixample', 'El Born', 'Barceloneta'], cost: 1.6 }),
  d('madrid', 'ES', 'europe', '마드리드', 'Madrid', 'マドリード', '馬德里', 40.4168, -3.7038, ['MAD'], 'EUR', 1, { cost: 1.5 }),
  d('lisbon', 'PT', 'europe', '리스본', 'Lisbon', 'リスボン', '里斯本', 38.7223, -9.1393, ['LIS'], 'EUR', 0, { cost: 1.4 }),
  d('amsterdam', 'NL', 'europe', '암스테르담', 'Amsterdam', 'アムステルダム', '阿姆斯特丹', 52.3676, 4.9041, ['AMS'], 'EUR', 1, { cost: 2.0 }),
  d('frankfurt', 'DE', 'europe', '프랑크푸르트', 'Frankfurt', 'フランクフルト', '法蘭克福', 50.1109, 8.6821, ['FRA'], 'EUR', 1, { cost: 1.6 }),
  d('munich', 'DE', 'europe', '뮌헨', 'Munich', 'ミュンヘン', '慕尼黑', 48.1351, 11.582, ['MUC'], 'EUR', 1, { cost: 1.7 }),
  d('berlin', 'DE', 'europe', '베를린', 'Berlin', 'ベルリン', '柏林', 52.52, 13.405, ['BER'], 'EUR', 1, { cost: 1.5 }),
  d('prague', 'CZ', 'europe', '프라하', 'Prague', 'プラハ', '布拉格', 50.0755, 14.4378, ['PRG'], 'CZK', 1, { areas: ['Old Town', 'Malá Strana', 'New Town'], cost: 1.2 }),
  d('vienna', 'AT', 'europe', '빈', 'Vienna', 'ウィーン', '維也納', 48.2082, 16.3738, ['VIE'], 'EUR', 1, { cost: 1.6 }),
  d('budapest', 'HU', 'europe', '부다페스트', 'Budapest', 'ブダペスト', '布達佩斯', 47.4979, 19.0402, ['BUD'], 'HUF', 1, { cost: 1.1 }),
  d('zurich', 'CH', 'europe', '취리히', 'Zurich', 'チューリッヒ', '蘇黎世', 47.3769, 8.5417, ['ZRH'], 'CHF', 1, { cost: 2.6 }),
  d('interlaken', 'CH', 'europe', '인터라켄', 'Interlaken', 'インターラーケン', '因特拉肯', 46.6863, 7.8632, ['ZRH'], 'CHF', 1, { cost: 2.4 }),
  d('athens', 'GR', 'europe', '아테네', 'Athens', 'アテネ', '雅典', 37.9838, 23.7275, ['ATH'], 'EUR', 2, { cost: 1.3 }),
  d('santorini', 'GR', 'europe', '산토리니', 'Santorini', 'サントリーニ島', '聖托里尼', 36.3932, 25.4615, ['JTR'], 'EUR', 2, { cost: 2.2 }),
  d('istanbul', 'TR', 'europe', '이스탄불', 'Istanbul', 'イスタンブール', '伊斯坦堡', 41.0082, 28.9784, ['IST'], 'TRY', 3, { areas: ['Sultanahmet', 'Beyoğlu', 'Karaköy'], cost: 1.0 }),
  d('dubrovnik', 'HR', 'europe', '두브로브니크', 'Dubrovnik', 'ドゥブロヴニク', '杜布羅夫尼克', 42.6507, 18.0944, ['DBV'], 'EUR', 1, { cost: 1.8 }),
  d('reykjavik', 'IS', 'europe', '레이캬비크', 'Reykjavik', 'レイキャビク', '雷克雅維克', 64.1466, -21.9426, ['KEF'], 'ISK', 0, { cost: 2.6 }),
  d('helsinki', 'FI', 'europe', '헬싱키', 'Helsinki', 'ヘルシンキ', '赫爾辛基', 60.1699, 24.9384, ['HEL'], 'EUR', 2, { cost: 1.7 }),

  // ---------- 미주 ----------
  d('newyork', 'US', 'americas', '뉴욕', 'New York', 'ニューヨーク', '紐約', 40.7128, -74.006, ['JFK', 'EWR', 'LGA'], 'USD', -5, { areas: ['Midtown', 'Times Square', 'SoHo', 'Brooklyn'], cost: 2.6 }),
  d('losangeles', 'US', 'americas', '로스앤젤레스', 'Los Angeles', 'ロサンゼルス', '洛杉磯', 34.0522, -118.2437, ['LAX'], 'USD', -8, { areas: ['Hollywood', 'Santa Monica', 'Downtown', 'Koreatown'], cost: 2.2 }),
  d('sanfrancisco', 'US', 'americas', '샌프란시스코', 'San Francisco', 'サンフランシスコ', '舊金山', 37.7749, -122.4194, ['SFO'], 'USD', -8, { cost: 2.5 }),
  d('lasvegas', 'US', 'americas', '라스베이거스', 'Las Vegas', 'ラスベガス', '拉斯維加斯', 36.1699, -115.1398, ['LAS'], 'USD', -8, { cost: 1.8 }),
  d('seattle', 'US', 'americas', '시애틀', 'Seattle', 'シアトル', '西雅圖', 47.6062, -122.3321, ['SEA'], 'USD', -8, { cost: 2.2 }),
  d('chicago', 'US', 'americas', '시카고', 'Chicago', 'シカゴ', '芝加哥', 41.8781, -87.6298, ['ORD'], 'USD', -6, { cost: 2.1 }),
  d('honolulu', 'US', 'oceania', '하와이(호놀룰루)', 'Honolulu (Hawaii)', 'ホノルル（ハワイ）', '檀香山（夏威夷）', 21.3069, -157.8583, ['HNL'], 'USD', -10, { areas: ['Waikiki', 'Ala Moana', 'Ko Olina'], cost: 2.6 }),
  d('vancouver', 'CA', 'americas', '밴쿠버', 'Vancouver', 'バンクーバー', '溫哥華', 49.2827, -123.1207, ['YVR'], 'CAD', -8, { cost: 1.9 }),
  d('toronto', 'CA', 'americas', '토론토', 'Toronto', 'トロント', '多倫多', 43.6532, -79.3832, ['YYZ'], 'CAD', -5, { cost: 1.9 }),
  d('cancun', 'MX', 'americas', '칸쿤', 'Cancún', 'カンクン', '坎昆', 21.1619, -86.8515, ['CUN'], 'MXN', -5, { cost: 1.6 }),

  // ---------- 대양주·괌·사이판 ----------
  d('guam', 'GU', 'oceania', '괌', 'Guam', 'グアム', '關島', 13.4443, 144.7937, ['GUM'], 'USD', 10, { areas: ['Tumon Bay', 'Hagåtña'], cost: 1.7 }),
  d('saipan', 'MP', 'oceania', '사이판', 'Saipan', 'サイパン', '塞班島', 15.1779, 145.7509, ['SPN'], 'USD', 10, { cost: 1.5 }),
  d('sydney', 'AU', 'oceania', '시드니', 'Sydney', 'シドニー', '雪梨', -33.8688, 151.2093, ['SYD'], 'AUD', 10, { areas: ['The Rocks', 'CBD', 'Darling Harbour', 'Bondi'], cost: 1.9 }),
  d('melbourne', 'AU', 'oceania', '멜버른', 'Melbourne', 'メルボルン', '墨爾本', -37.8136, 144.9631, ['MEL'], 'AUD', 10, { cost: 1.8 }),
  d('auckland', 'NZ', 'oceania', '오클랜드', 'Auckland', 'オークランド', '奧克蘭', -36.8485, 174.7633, ['AKL'], 'NZD', 12, { cost: 1.7 }),
  d('queenstown', 'NZ', 'oceania', '퀸스타운', 'Queenstown', 'クイーンズタウン', '皇后鎮', -45.0312, 168.6626, ['ZQN'], 'NZD', 12, { cost: 1.9 }),

  // ---------- 중동·아프리카·기타 ----------
  d('dubai', 'AE', 'mea', '두바이', 'Dubai', 'ドバイ', '杜拜', 25.2048, 55.2708, ['DXB'], 'AED', 4, { areas: ['Downtown', 'Dubai Marina', 'Deira', 'Palm Jumeirah'], cost: 1.9 }),
  d('cairo', 'EG', 'mea', '카이로', 'Cairo', 'カイロ', '開羅', 30.0444, 31.2357, ['CAI'], 'EGP', 2, { cost: 0.7 }),
  d('maldives', 'MV', 'mea', '몰디브', 'Maldives', 'モルディブ', '馬爾地夫', 4.1755, 73.5093, ['MLE'], 'USD', 5, { cost: 3.0 }),
  d('ulaanbaatar', 'MN', 'mea', '울란바토르', 'Ulaanbaatar', 'ウランバートル', '烏蘭巴托', 47.8864, 106.9057, ['UBN'], 'MNT', 8, { cost: 0.6 }),
  d('kathmandu', 'NP', 'mea', '카트만두', 'Kathmandu', 'カトマンズ', '加德滿都', 27.7172, 85.324, ['KTM'], 'NPR', 5.75, { cost: 0.4 }),
]

const BY_ID = new Map(DESTINATIONS.map((x) => [x.id, x]))

export function getDestination(id: string | undefined | null): Destination | undefined {
  return id ? BY_ID.get(id) : undefined
}

export function isDestination(id: unknown): id is string {
  return typeof id === 'string' && BY_ID.has(id)
}

export function destName(id: string, locale: Locale): string {
  const dst = BY_ID.get(id)
  if (!dst) return id
  const key = locale === 'zh-TW' ? 'zh' : locale
  return dst.name[key] || dst.name.en
}

/** 국내(한국) 여부 */
export function isDomesticKorea(id: string): boolean {
  return BY_ID.get(id)?.country === 'KR'
}

/** 검색어 매칭 — 4개 언어 이름·영문 id·공항 코드·국가 코드 */
export function searchDestinations(query: string, list: Destination[] = DESTINATIONS): Destination[] {
  const q = query.trim().toLowerCase()
  if (!q) return list
  return list.filter((x) => {
    if (x.id.includes(q.replace(/\s+/g, ''))) return true
    if (x.country.toLowerCase() === q) return true
    if (x.airports.some((a) => a.toLowerCase() === q)) return true
    return Object.values(x.name).some((n) => n.toLowerCase().includes(q))
  })
}

/** 지역 기본 물가 지수 */
const REGION_COST: Record<Region, number> = { korea: 1, japan: 1.05, china: 0.9, sea: 0.55, europe: 1.7, americas: 2.0, oceania: 1.8, mea: 1.3 }

export function costIndex(dst: Destination): number {
  return dst.cost ?? REGION_COST[dst.region]
}

/** 좌표가 여행 도시들 중 하나의 반경(km) 안에 있는지 */
export function nearAnyDestination(lat: number, lng: number, ids: string[], radiusKm = 250): boolean {
  return ids.some((id) => {
    const dst = BY_ID.get(id)
    return dst ? distanceKm(lat, lng, dst.lat, dst.lng) <= radiusKm : false
  })
}

/** 로케일별 인기 여행지 (홈 화면 바로가기) */
export const POPULAR: Record<Locale, string[]> = {
  ko: ['jeju', 'busan', 'tokyo', 'osaka', 'fukuoka', 'danang', 'bangkok', 'taipei', 'paris', 'guam'],
  en: ['seoul', 'busan', 'jeju', 'tokyo', 'kyoto', 'bangkok', 'bali', 'paris', 'london', 'newyork'],
  ja: ['seoul', 'busan', 'jeju', 'taipei', 'hongkong', 'bangkok', 'honolulu', 'paris', 'singapore', 'danang'],
  'zh-TW': ['seoul', 'busan', 'jeju', 'tokyo', 'osaka', 'okinawa', 'bangkok', 'danang', 'hongkong', 'paris'],
}

/** 로케일별 기본 출발 공항 */
export function defaultHomeAirport(locale: Locale): string {
  if (locale === 'ja') return 'HND'
  if (locale === 'zh-TW') return 'TPE'
  return 'ICN'
}
