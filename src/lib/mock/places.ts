// 목업 일정용 장소 풀 — 실존 명소, 좌표는 대략값(출시 전 검증 권장)
// cost 는 해당 도시 현지 통화 기준 1인 대략 비용
import type { LocalizedName, PartnerId, ReserveProvider, StopCategory } from '../itinerary'

export interface MockPlace {
  name: LocalizedName
  category: StopCategory
  area: string
  lat: number
  lng: number
  durationMin: number
  tip: string
  transit: string
  cost?: number
  booking?: PartnerId
  reserve?: ReserveProvider
  /** 예약·검색 쿼리 (없으면 영문명) */
  query?: string
}

export const MOCK_PLACES: Record<string, MockPlace[]> = {
  seoul: [
    { name: { ko: '경복궁', en: 'Gyeongbokgung Palace', ja: '景福宮', zh: '景福宮' }, category: 'sight', area: 'Jongno', lat: 37.5796, lng: 126.977, durationMin: 120, tip: 'Free entry in hanbok. Guard-changing ceremony at 10:00 and 14:00 (closed Tue).', transit: 'Gyeongbokgung Stn (Line 3), Exit 5', cost: 3000, booking: 'klook' },
    { name: { ko: '북촌한옥마을', en: 'Bukchon Hanok Village', ja: '北村韓屋村', zh: '北村韓屋村' }, category: 'sight', area: 'Bukchon', lat: 37.5826, lng: 126.9831, durationMin: 75, tip: 'Residential area: keep voices low. Best photos on Bukchon-ro 11-gil.', transit: '10 min walk from Anguk Stn (Line 3)' },
    { name: { ko: '익선동', en: 'Ikseon-dong Hanok Alley', ja: '益善洞', zh: '益善洞' }, category: 'cafe', area: 'Jongno', lat: 37.5726, lng: 126.9906, durationMin: 60, tip: 'Narrow alleys of renovated hanok cafés; go before 11:00 to skip queues.', transit: 'Jongno 3-ga Stn, Exit 4', cost: 9000 },
    { name: { ko: '광장시장', en: 'Gwangjang Market', ja: '広蔵市場', zh: '廣藏市場' }, category: 'food', area: 'Jongno', lat: 37.5701, lng: 126.9996, durationMin: 75, tip: 'Order bindaetteok (mung-bean pancake) and mayak gimbap. Cash is handy.', transit: 'Jongno 5-ga Stn (Line 1), Exit 8', cost: 15000, reserve: 'naver' },
    { name: { ko: '남산서울타워', en: 'N Seoul Tower', ja: 'Nソウルタワー', zh: '南山首爾塔' }, category: 'sight', area: 'Namsan', lat: 37.5512, lng: 126.9882, durationMin: 120, tip: 'Take the cable car up and walk down the Namsan trail at sunset.', transit: 'Cable car from Myeongdong (Hoehyeon Stn)', cost: 21000, booking: 'klook' },
    { name: { ko: '명동', en: 'Myeongdong Shopping Street', ja: '明洞', zh: '明洞' }, category: 'shopping', area: 'Myeongdong', lat: 37.5636, lng: 126.9869, durationMin: 90, tip: 'Street food stalls open after 16:00. Tax refund counters in big stores.', transit: 'Myeongdong Stn (Line 4), Exit 6' },
    { name: { ko: '홍대 거리', en: 'Hongdae Street', ja: '弘大通り', zh: '弘大街' }, category: 'nightlife', area: 'Hongdae', lat: 37.5563, lng: 126.9237, durationMin: 120, tip: 'Busking starts around 19:00 near Exit 9. Great late-night food.', transit: 'Hongik Univ. Stn (Line 2), Exit 9' },
    { name: { ko: '성수동', en: 'Seongsu-dong', ja: '聖水洞', zh: '聖水洞' }, category: 'cafe', area: 'Seongsu', lat: 37.5445, lng: 127.056, durationMin: 90, tip: 'Converted-factory cafés and pop-up stores. Weekends are crowded.', transit: 'Seongsu Stn (Line 2), Exit 3', cost: 8000 },
    { name: { ko: '스타필드 라이브러리', en: 'Starfield Library (COEX)', ja: 'スターフィールド図書館', zh: '星空圖書館' }, category: 'sight', area: 'Gangnam', lat: 37.5103, lng: 127.0592, durationMin: 45, tip: 'Free. Combine with COEX Mall and the aquarium.', transit: 'Samseong Stn (Line 2), Exit 6' },
    { name: { ko: '창덕궁', en: 'Changdeokgung Palace', ja: '昌徳宮', zh: '昌德宮' }, category: 'sight', area: 'Jongno', lat: 37.5794, lng: 126.991, durationMin: 90, tip: 'Secret Garden tour requires a timed ticket; book early.', transit: 'Anguk Stn (Line 3), Exit 3', cost: 3000, booking: 'klook' },
    { name: { ko: '동대문디자인플라자', en: 'Dongdaemun Design Plaza (DDP)', ja: '東大門デザインプラザ', zh: '東大門設計廣場' }, category: 'sight', area: 'Dongdaemun', lat: 37.5665, lng: 127.0092, durationMin: 60, tip: 'Night markets nearby run late; shopping malls open until 04:00.', transit: 'Dongdaemun History & Culture Park Stn' },
    { name: { ko: '여의도 한강공원', en: 'Yeouido Hangang Park', ja: '汝矣島漢江公園', zh: '汝矣島漢江公園' }, category: 'nature', area: 'Yeouido', lat: 37.5283, lng: 126.9329, durationMin: 90, tip: 'Order fried chicken by delivery to the park; rent a bike by the river.', transit: 'Yeouinaru Stn (Line 5), Exit 2' },
    { name: { ko: '을지로 노가리골목', en: 'Euljiro Nogari Alley', ja: '乙支路ノガリ横丁', zh: '乙支路乾明太魚巷' }, category: 'food', area: 'Euljiro', lat: 37.5668, lng: 126.9913, durationMin: 90, tip: 'Draft beer and dried pollack on outdoor tables; from 17:00.', transit: 'Euljiro 3-ga Stn, Exit 4', cost: 20000, reserve: 'catchtable' },
    { name: { ko: '롯데월드타워 서울스카이', en: 'Lotte World Tower Seoul Sky', ja: 'ロッテワールドタワー', zh: '樂天世界塔' }, category: 'sight', area: 'Jamsil', lat: 37.5126, lng: 127.1025, durationMin: 90, tip: 'Observation deck on floors 117–123; go for sunset.', transit: 'Jamsil Stn (Line 2/8), Exit 1', cost: 29000, booking: 'klook' },
    { name: { ko: '서울 시내 호텔', en: 'Hotel check-in (central Seoul)', ja: 'ソウル市内ホテル', zh: '首爾市中心飯店' }, category: 'stay', area: 'Myeongdong', lat: 37.5636, lng: 126.9869, durationMin: 30, tip: 'Myeongdong or Hongdae are convenient for first-timers.', transit: 'Airport Railroad (AREX) to Seoul Stn, then subway', booking: 'agoda' },
  ],
  busan: [
    { name: { ko: '해운대 해수욕장', en: 'Haeundae Beach', ja: '海雲台ビーチ', zh: '海雲台海水浴場' }, category: 'nature', area: 'Haeundae', lat: 35.1587, lng: 129.1604, durationMin: 90, tip: 'Walk to Dongbaek Island at the west end for city views.', transit: 'Haeundae Stn (Line 2), Exit 3' },
    { name: { ko: '감천문화마을', en: 'Gamcheon Culture Village', ja: '甘川文化村', zh: '甘川文化村' }, category: 'sight', area: 'Gamcheon', lat: 35.0975, lng: 129.0106, durationMin: 120, tip: 'Buy the stamp map at the entrance; wear comfortable shoes for stairs.', transit: 'Toseong Stn (Line 1), then bus 2 or 2-2', cost: 2000 },
    { name: { ko: '자갈치시장', en: 'Jagalchi Fish Market', ja: 'チャガルチ市場', zh: '札嘎其市場' }, category: 'food', area: 'Nampo', lat: 35.0967, lng: 129.0306, durationMin: 90, tip: 'Pick fish on the 1st floor and have it prepared upstairs (fee applies).', transit: 'Jagalchi Stn (Line 1), Exit 10', cost: 30000, reserve: 'naver' },
    { name: { ko: '광안리 해변', en: 'Gwangalli Beach', ja: '広安里ビーチ', zh: '廣安里海灘' }, category: 'nightlife', area: 'Gwangan', lat: 35.1531, lng: 129.1187, durationMin: 120, tip: 'Drone light show on Saturdays (check schedule); cafés face the bridge.', transit: 'Gwangan Stn (Line 2), Exit 3/5' },
    { name: { ko: '해동용궁사', en: 'Haedong Yonggungsa Temple', ja: '海東龍宮寺', zh: '海東龍宮寺' }, category: 'sight', area: 'Gijang', lat: 35.1884, lng: 129.2233, durationMin: 90, tip: 'Seaside temple; arrive before 09:00 for calm and good light.', transit: 'Bus 181 from Haeundae', booking: 'klook' },
    { name: { ko: '태종대', en: 'Taejongdae Park', ja: '太宗台', zh: '太宗台' }, category: 'nature', area: 'Yeongdo', lat: 35.0516, lng: 129.0872, durationMin: 120, tip: 'Ride the Danubi train loop; cliffs and lighthouse views.', transit: 'Bus 88 or 101 from Nampo', cost: 4000 },
    { name: { ko: 'BIFF 광장', en: 'BIFF Square', ja: 'BIFF広場', zh: 'BIFF 廣場' }, category: 'food', area: 'Nampo', lat: 35.0987, lng: 129.0287, durationMin: 60, tip: 'Try ssiat hotteok (seed-filled pancake) from the street stalls.', transit: 'Nampo Stn (Line 1), Exit 7', cost: 5000 },
    { name: { ko: '흰여울문화마을', en: 'Huinnyeoul Culture Village', ja: '白如울文化村', zh: '白淺灘文化村' }, category: 'sight', area: 'Yeongdo', lat: 35.0785, lng: 129.0447, durationMin: 60, tip: 'Cliffside walkway with cafés; sunset is the best time.', transit: 'Bus 7, 71 or 508 from Nampo' },
    { name: { ko: '부산 해운대 호텔', en: 'Hotel check-in (Haeundae)', ja: '海雲台ホテル', zh: '海雲台飯店' }, category: 'stay', area: 'Haeundae', lat: 35.1587, lng: 129.1604, durationMin: 30, tip: 'Beachfront hotels book out in July–August.', transit: 'KTX to Busan Stn, then Line 1 → Line 2', booking: 'agoda' },
  ],
  jeju: [
    { name: { ko: '성산일출봉', en: 'Seongsan Ilchulbong', ja: '城山日出峰', zh: '城山日出峰' }, category: 'nature', area: 'Seongsan', lat: 33.458, lng: 126.9425, durationMin: 90, tip: 'UNESCO site; 25-minute climb. Sunrise crowds are large but worth it.', transit: 'Bus 201 or rental car', cost: 5000, booking: 'klook' },
    { name: { ko: '만장굴', en: 'Manjanggul Lava Tube', ja: '万丈窟', zh: '萬丈窟' }, category: 'sight', area: 'Gujwa', lat: 33.5283, lng: 126.7712, durationMin: 60, tip: 'Bring a light jacket: the cave stays around 12 °C.', transit: 'Rental car recommended', cost: 4000 },
    { name: { ko: '협재해수욕장', en: 'Hyeopjae Beach', ja: '挟才海水浴場', zh: '挾才海水浴場' }, category: 'nature', area: 'Hallim', lat: 33.394, lng: 126.2397, durationMin: 90, tip: 'Turquoise water with Biyangdo Island views; cafés across the road.', transit: 'Bus 202 or rental car' },
    { name: { ko: '동문시장', en: 'Dongmun Traditional Market', ja: '東門市場', zh: '東門市場' }, category: 'food', area: 'Jeju City', lat: 33.5124, lng: 126.5283, durationMin: 75, tip: 'Night market section opens at 18:00; try black-pork skewers.', transit: 'Bus 325/326 from Jeju Airport', cost: 15000, reserve: 'naver' },
    { name: { ko: '천지연폭포', en: 'Cheonjiyeon Waterfall', ja: '天地淵瀑布', zh: '天地淵瀑布' }, category: 'nature', area: 'Seogwipo', lat: 33.247, lng: 126.5545, durationMin: 60, tip: 'Short, flat walk; lit up at night until 22:00.', transit: 'Seogwipo bus terminal, 15 min walk', cost: 2000 },
    { name: { ko: '제주 호텔', en: 'Hotel check-in (Jeju)', ja: '済州ホテル', zh: '濟州飯店' }, category: 'stay', area: 'Jeju City', lat: 33.4996, lng: 126.5312, durationMin: 30, tip: 'Stay in Jeju City for the first night, Seogwipo later.', transit: 'Airport limousine bus 600', booking: 'agoda' },
  ],
  gyeongju: [
    { name: { ko: '불국사', en: 'Bulguksa Temple', ja: '仏国寺', zh: '佛國寺' }, category: 'sight', area: 'Jinhyeon', lat: 35.7901, lng: 129.332, durationMin: 90, tip: 'UNESCO temple; pair with Seokguram Grotto by bus 12.', transit: 'Bus 10/11 from Gyeongju Stn', cost: 6000, booking: 'klook' },
    { name: { ko: '석굴암', en: 'Seokguram Grotto', ja: '石窟庵', zh: '石窟庵' }, category: 'sight', area: 'Tohamsan', lat: 35.795, lng: 129.3493, durationMin: 60, tip: 'Short mountain walk from the parking lot; no photos inside.', transit: 'Bus 12 from Bulguksa', cost: 6000 },
    { name: { ko: '동궁과 월지', en: 'Donggung Palace and Wolji Pond', ja: '東宮と月池', zh: '東宮與月池' }, category: 'sight', area: 'Inwang', lat: 35.8347, lng: 129.2267, durationMin: 60, tip: 'Visit after dark for the illuminated reflections.', transit: '15 min walk from Daereungwon', cost: 3000 },
    { name: { ko: '대릉원', en: 'Daereungwon Tomb Complex', ja: '大陵苑', zh: '大陵苑' }, category: 'sight', area: 'Hwangnam', lat: 35.8378, lng: 129.2114, durationMin: 60, tip: 'Grassy royal tombs; the Cheonmachong tomb is open inside.', transit: 'Walkable from Gyeongju bus terminal' },
    { name: { ko: '황리단길', en: 'Hwangnidan-gil', ja: '皇理団通り', zh: '皇理團街' }, category: 'cafe', area: 'Hwangnam', lat: 35.8389, lng: 129.2103, durationMin: 90, tip: 'Hanok cafés and souvenir shops; try Gyeongju bread (red-bean pastry).', transit: 'Next to Daereungwon', cost: 10000 },
    { name: { ko: '경주 한옥 스테이', en: 'Hanok stay (Gyeongju)', ja: '慶州韓屋ステイ', zh: '慶州韓屋民宿' }, category: 'stay', area: 'Hwangnam', lat: 35.8378, lng: 129.2114, durationMin: 30, tip: 'Hanok guesthouses near Hwangnidan-gil fill up on weekends.', transit: 'KTX to Singyeongju Stn, bus 50/70', booking: 'agoda' },
  ],
  jeonju: [
    { name: { ko: '전주한옥마을', en: 'Jeonju Hanok Village', ja: '全州韓屋村', zh: '全州韓屋村' }, category: 'sight', area: 'Pungnam', lat: 35.8151, lng: 127.153, durationMin: 180, tip: 'Rent a hanbok, then try choco-pie and bibimbap in the village.', transit: 'Bus 79/119 from Jeonju Stn', cost: 20000, booking: 'klook' },
    { name: { ko: '전동성당', en: 'Jeondong Catholic Cathedral', ja: '殿洞聖堂', zh: '殿洞聖堂' }, category: 'sight', area: 'Pungnam', lat: 35.8132, lng: 127.149, durationMin: 30, tip: 'Romanesque cathedral at the village entrance; free entry.', transit: 'Inside Hanok Village' },
    { name: { ko: '남부시장 야시장', en: 'Nambu Market Night Market', ja: '南部市場夜市', zh: '南部市場夜市' }, category: 'food', area: 'Jeonju', lat: 35.8117, lng: 127.1466, durationMin: 90, tip: 'Friday–Saturday nights only; arrive by 19:00.', transit: '5 min walk from Hanok Village', cost: 15000, reserve: 'naver' },
    { name: { ko: '전주 한옥 스테이', en: 'Hanok stay (Jeonju)', ja: '全州韓屋ステイ', zh: '全州韓屋民宿' }, category: 'stay', area: 'Pungnam', lat: 35.8151, lng: 127.153, durationMin: 30, tip: 'Ondol-floor hanok rooms; bring earplugs on weekends.', transit: 'KTX to Jeonju Stn (about 1 h 40 min from Seoul)', booking: 'agoda' },
  ],
  gangneung: [
    { name: { ko: '안목해변 커피거리', en: 'Anmok Beach Coffee Street', ja: '安木海辺コーヒー通り', zh: '安木海邊咖啡街' }, category: 'cafe', area: 'Anmok', lat: 37.7724, lng: 128.9486, durationMin: 90, tip: 'Gangneung is Korea’s coffee capital; roasteries line the beach.', transit: 'Bus 202 from Gangneung Stn', cost: 7000 },
    { name: { ko: '경포해변', en: 'Gyeongpo Beach', ja: '鏡浦ビーチ', zh: '鏡浦海灘' }, category: 'nature', area: 'Gyeongpo', lat: 37.8059, lng: 128.908, durationMin: 90, tip: 'Pine forest and lake loop; sunrise over the East Sea.', transit: 'Bus 202/206' },
    { name: { ko: '주문진 수산시장', en: 'Jumunjin Fish Market', ja: '注文津水産市場', zh: '注文津水產市場' }, category: 'food', area: 'Jumunjin', lat: 37.8924, lng: 128.8286, durationMin: 90, tip: 'Raw-fish set menus at market prices; busiest at lunch.', transit: 'Bus 300/302 from Gangneung', cost: 30000, reserve: 'naver' },
    { name: { ko: '강릉 호텔', en: 'Hotel check-in (Gangneung)', ja: '江陵ホテル', zh: '江陵飯店' }, category: 'stay', area: 'Gyeongpo', lat: 37.8059, lng: 128.908, durationMin: 30, tip: 'KTX from Seoul Stn takes about 2 hours.', transit: 'KTX Gangneung Stn, taxi 10 min', booking: 'agoda' },
  ],
  incheon: [
    { name: { ko: '인천 차이나타운', en: 'Incheon Chinatown', ja: '仁川チャイナタウン', zh: '仁川中華街' }, category: 'food', area: 'Jung-gu', lat: 37.4747, lng: 126.6177, durationMin: 90, tip: 'Birthplace of jajangmyeon; the museum is next door.', transit: 'Incheon Stn (Line 1), Exit 1', cost: 10000, reserve: 'naver' },
    { name: { ko: '송도 센트럴파크', en: 'Songdo Central Park', ja: '松島セントラルパーク', zh: '松島中央公園' }, category: 'nature', area: 'Songdo', lat: 37.3926, lng: 126.6382, durationMin: 90, tip: 'Seawater canal with boat rentals; modern skyline views.', transit: 'Central Park Stn (Incheon Line 1)' },
    { name: { ko: '월미도', en: 'Wolmido', ja: '月尾島', zh: '月尾島' }, category: 'activity', area: 'Jung-gu', lat: 37.4754, lng: 126.5968, durationMin: 90, tip: 'Retro amusement rides and the Wolmi Sea Train loop.', transit: 'Bus 2/23/45 from Incheon Stn', cost: 8000, booking: 'klook' },
    { name: { ko: '인천공항 인근 호텔', en: 'Hotel near Incheon Airport', ja: '仁川空港近くのホテル', zh: '仁川機場附近飯店' }, category: 'stay', area: 'Yeongjong', lat: 37.4602, lng: 126.4407, durationMin: 30, tip: 'Good for early flights; free shuttles from Terminal 1.', transit: 'Airport shuttle', booking: 'agoda' },
  ],

  tokyo: [
    { name: { ko: '센소지', en: 'Senso-ji Temple', ja: '浅草寺', zh: '淺草寺' }, category: 'sight', area: 'Asakusa', lat: 35.7148, lng: 139.7967, durationMin: 90, tip: 'Arrive before 08:00 to beat the crowds; snack along Nakamise street.', transit: 'Asakusa Stn (Ginza Line), Exit 1' },
    { name: { ko: '도쿄 스카이트리', en: 'Tokyo Skytree', ja: '東京スカイツリー', zh: '東京晴空塔' }, category: 'sight', area: 'Oshiage', lat: 35.7101, lng: 139.8107, durationMin: 90, tip: 'Buy timed tickets online; sunset slots sell out first.', transit: 'Oshiage Stn (Hanzomon Line)', cost: 2100, booking: 'klook' },
    { name: { ko: '쓰키지 장외시장', en: 'Tsukiji Outer Market', ja: '築地場外市場', zh: '築地場外市場' }, category: 'food', area: 'Tsukiji', lat: 35.6655, lng: 139.7707, durationMin: 90, tip: 'Go for breakfast sushi and tamagoyaki; many stalls close by 14:00.', transit: 'Tsukiji Stn (Hibiya Line), Exit 1', cost: 3000, reserve: 'google' },
    { name: { ko: '팀랩 플래닛', en: 'teamLab Planets', ja: 'チームラボプラネッツ', zh: 'teamLab Planets' }, category: 'activity', area: 'Toyosu', lat: 35.6491, lng: 139.7898, durationMin: 120, tip: 'You walk barefoot through water rooms; wear shorts or roll-up pants.', transit: 'Shin-toyosu Stn (Yurikamome)', cost: 3800, booking: 'klook' },
    { name: { ko: '메이지 신궁', en: 'Meiji Jingu Shrine', ja: '明治神宮', zh: '明治神宮' }, category: 'nature', area: 'Harajuku', lat: 35.6764, lng: 139.6993, durationMin: 75, tip: 'Forest walk to the shrine; combine with Takeshita Street.', transit: 'Harajuku Stn (JR Yamanote)' },
    { name: { ko: '시부야 스크램블 교차로', en: 'Shibuya Crossing', ja: '渋谷スクランブル交差点', zh: '澀谷十字路口' }, category: 'sight', area: 'Shibuya', lat: 35.6595, lng: 139.7005, durationMin: 45, tip: 'See it from above at Shibuya Sky or the station walkway.', transit: 'Shibuya Stn, Hachiko Exit' },
    { name: { ko: '신주쿠 오모이데요코초', en: 'Omoide Yokocho (Shinjuku)', ja: '思い出横丁', zh: '回憶橫丁' }, category: 'nightlife', area: 'Shinjuku', lat: 35.6933, lng: 139.6995, durationMin: 90, tip: 'Tiny yakitori bars; small groups only, cash preferred.', transit: 'Shinjuku Stn, West Exit', cost: 3500 },
    { name: { ko: '신주쿠 호텔', en: 'Hotel check-in (Shinjuku)', ja: '新宿のホテル', zh: '新宿飯店' }, category: 'stay', area: 'Shinjuku', lat: 35.6896, lng: 139.7006, durationMin: 30, tip: 'Shinjuku and Ueno have direct airport access.', transit: 'Limousine bus or Keikyu/JR from the airport', booking: 'agoda' },
  ],
  osaka: [
    { name: { ko: '오사카성', en: 'Osaka Castle', ja: '大阪城', zh: '大阪城' }, category: 'sight', area: 'Chuo', lat: 34.6873, lng: 135.5262, durationMin: 90, tip: 'The park is free; the museum tower has a top-floor view.', transit: 'Osakajokoen Stn (JR Loop Line)', cost: 600, booking: 'klook' },
    { name: { ko: '구로몬 시장', en: 'Kuromon Market', ja: '黒門市場', zh: '黑門市場' }, category: 'food', area: 'Nippombashi', lat: 34.6654, lng: 135.5066, durationMin: 60, tip: 'Grilled scallops and fresh fruit; best before noon.', transit: 'Nippombashi Stn, Exit 10', cost: 2000 },
    { name: { ko: '유니버설 스튜디오 재팬', en: 'Universal Studios Japan', ja: 'ユニバーサル・スタジオ・ジャパン', zh: '日本環球影城' }, category: 'activity', area: 'Konohana', lat: 34.6654, lng: 135.4323, durationMin: 480, tip: 'Express passes and timed Nintendo World entry matter on weekends.', transit: 'Universal City Stn (JR Yumesaki Line)', cost: 9000, booking: 'klook' },
    { name: { ko: '도톤보리', en: 'Dotonbori', ja: '道頓堀', zh: '道頓堀' }, category: 'food', area: 'Namba', lat: 34.6687, lng: 135.5013, durationMin: 90, tip: 'Takoyaki and okonomiyaki; the Glico sign is best after dark.', transit: 'Namba Stn, Exit 14', cost: 2500, reserve: 'google' },
    { name: { ko: '신세카이·쓰텐카쿠', en: 'Shinsekai & Tsutenkaku', ja: '新世界・通天閣', zh: '新世界・通天閣' }, category: 'sight', area: 'Naniwa', lat: 34.6525, lng: 135.5063, durationMin: 75, tip: 'Retro district famous for kushikatsu (no double-dipping the sauce).', transit: 'Ebisucho Stn, Exit 3' },
    { name: { ko: '우메다 스카이빌딩', en: 'Umeda Sky Building', ja: '梅田スカイビル', zh: '梅田藍天大廈' }, category: 'sight', area: 'Umeda', lat: 34.7053, lng: 135.4906, durationMin: 60, tip: 'Open-air rooftop observatory; great at sunset.', transit: '10 min walk from Osaka Stn', cost: 2000, booking: 'klook' },
    { name: { ko: '난바 호텔', en: 'Hotel check-in (Namba)', ja: '難波のホテル', zh: '難波飯店' }, category: 'stay', area: 'Namba', lat: 34.6659, lng: 135.5013, durationMin: 30, tip: 'Namba has the Nankai rapit train straight to Kansai Airport.', transit: 'Nankai rapit from KIX', booking: 'agoda' },
  ],
  fukuoka: [
    { name: { ko: '구시다 신사', en: 'Kushida Shrine', ja: '櫛田神社', zh: '櫛田神社' }, category: 'sight', area: 'Hakata', lat: 33.593, lng: 130.4103, durationMin: 45, tip: 'See the giant Yamakasa festival float on display.', transit: 'Gion Stn (Kuko Line), Exit 2' },
    { name: { ko: '캐널시티 하카타', en: 'Canal City Hakata', ja: 'キャナルシティ博多', zh: '博多運河城' }, category: 'shopping', area: 'Hakata', lat: 33.5897, lng: 130.4107, durationMin: 90, tip: 'Ramen Stadium on the 5th floor; fountain shows every 30 min.', transit: '10 min walk from Gion Stn' },
    { name: { ko: '다자이후 덴만구', en: 'Dazaifu Tenmangu', ja: '太宰府天満宮', zh: '太宰府天滿宮' }, category: 'sight', area: 'Dazaifu', lat: 33.5215, lng: 130.5349, durationMin: 120, tip: 'Try umegae-mochi on the approach street.', transit: 'Nishitetsu train to Dazaifu Stn', booking: 'klook' },
    { name: { ko: '오호리 공원', en: 'Ohori Park', ja: '大濠公園', zh: '大濠公園' }, category: 'nature', area: 'Chuo', lat: 33.5862, lng: 130.3764, durationMin: 60, tip: 'Lakeside loop of 2 km; Starbucks with a lake view.', transit: 'Ohori-koen Stn (Kuko Line)' },
    { name: { ko: '후쿠오카 타워', en: 'Fukuoka Tower', ja: '福岡タワー', zh: '福岡塔' }, category: 'sight', area: 'Momochi', lat: 33.5933, lng: 130.3515, durationMin: 60, tip: 'Walk to Momochi Seaside Park after the view.', transit: 'Bus W1 or 302 from Tenjin', cost: 1000, booking: 'klook' },
    { name: { ko: '나카스 포장마차', en: 'Nakasu Yatai food stalls', ja: '中洲屋台', zh: '中洲屋台' }, category: 'food', area: 'Nakasu', lat: 33.5925, lng: 130.4064, durationMin: 90, tip: 'Open from about 18:00; tonkotsu ramen and oden by the river.', transit: 'Nakasu-Kawabata Stn, Exit 1', cost: 2500 },
    { name: { ko: '하카타 호텔', en: 'Hotel check-in (Hakata)', ja: '博多のホテル', zh: '博多飯店' }, category: 'stay', area: 'Hakata', lat: 33.5902, lng: 130.4207, durationMin: 30, tip: 'Fukuoka Airport is only two subway stops from Hakata.', transit: 'Subway Kuko Line from the airport', booking: 'agoda' },
  ],
  taipei: [
    { name: { ko: '타이베이 101', en: 'Taipei 101', ja: '台北101', zh: '台北101' }, category: 'sight', area: 'Xinyi', lat: 25.034, lng: 121.5645, durationMin: 90, tip: 'Observatory on the 89th floor; book a sunset slot.', transit: 'Taipei 101 Stn (Red Line), Exit 4', cost: 600, booking: 'klook' },
    { name: { ko: '국립고궁박물원', en: 'National Palace Museum', ja: '國立故宮博物院', zh: '國立故宮博物院' }, category: 'sight', area: 'Shilin', lat: 25.1024, lng: 121.5485, durationMin: 150, tip: 'Rent the audio guide; the Jadeite Cabbage draws queues.', transit: 'Shilin Stn, then bus R30', cost: 350, booking: 'klook' },
    { name: { ko: '딘타이펑', en: 'Din Tai Fung', ja: '鼎泰豐', zh: '鼎泰豐' }, category: 'food', area: "Da'an", lat: 25.033, lng: 121.53, durationMin: 75, tip: 'Take a queue number early; order xiaolongbao and shrimp fried rice.', transit: 'Dongmen Stn, Exit 5', cost: 800, reserve: 'google' },
    { name: { ko: '룽산쓰', en: 'Longshan Temple', ja: '龍山寺', zh: '龍山寺' }, category: 'sight', area: 'Wanhua', lat: 25.0372, lng: 121.4999, durationMin: 45, tip: 'Free; evenings are atmospheric with chanting.', transit: 'Longshan Temple Stn, Exit 1' },
    { name: { ko: '시먼딩', en: 'Ximending', ja: '西門町', zh: '西門町' }, category: 'shopping', area: 'Wanhua', lat: 25.0421, lng: 121.5081, durationMin: 90, tip: 'Street food and youth fashion; try Ay-Chung flour-rice noodles.', transit: 'Ximen Stn, Exit 6' },
    { name: { ko: '지우펀 옛거리', en: 'Jiufen Old Street', ja: '九份老街', zh: '九份老街' }, category: 'sight', area: 'Ruifang', lat: 25.1097, lng: 121.8445, durationMin: 150, tip: 'Teahouses with sea views; very crowded on weekends.', transit: 'Bus 1062 from Zhongxiao Fuxing', booking: 'klook' },
    { name: { ko: '스린 야시장', en: 'Shilin Night Market', ja: '士林夜市', zh: '士林夜市' }, category: 'food', area: 'Shilin', lat: 25.088, lng: 121.5241, durationMin: 90, tip: 'Giant fried chicken cutlet and oyster omelette; go after 18:00.', transit: 'Jiantan Stn, Exit 1', cost: 300 },
    { name: { ko: '타이베이역 호텔', en: 'Hotel check-in (Taipei Main Station)', ja: '台北駅のホテル', zh: '台北車站飯店' }, category: 'stay', area: 'Zhongzheng', lat: 25.0478, lng: 121.517, durationMin: 30, tip: 'Airport MRT ends at Taipei Main Station.', transit: 'Taoyuan Airport MRT (express)', booking: 'agoda' },
  ],
  bangkok: [
    { name: { ko: '왕궁', en: 'The Grand Palace', ja: '王宮', zh: '大皇宮' }, category: 'sight', area: 'Phra Nakhon', lat: 13.75, lng: 100.4913, durationMin: 120, tip: 'Strict dress code: covered shoulders and knees. Go at opening.', transit: 'Tha Chang pier (Chao Phraya Express)', cost: 500, booking: 'klook' },
    { name: { ko: '왓포', en: 'Wat Pho', ja: 'ワット・ポー', zh: '臥佛寺' }, category: 'sight', area: 'Phra Nakhon', lat: 13.7465, lng: 100.4927, durationMin: 60, tip: 'Home of the reclining Buddha and a famous massage school.', transit: 'Sanam Chai Stn (MRT Blue Line)', cost: 300 },
    { name: { ko: '왓아룬', en: 'Wat Arun', ja: 'ワット・アルン', zh: '鄭王廟' }, category: 'sight', area: 'Thonburi', lat: 13.7437, lng: 100.4888, durationMin: 60, tip: 'Cross by the 5-baht ferry from Tha Tien; stunning at sunset.', transit: 'Ferry from Tha Tien pier', cost: 200 },
    { name: { ko: '전통 타이 마사지', en: 'Traditional Thai massage', ja: 'タイ古式マッサージ', zh: '泰式按摩' }, category: 'wellness', area: 'Silom', lat: 13.7286, lng: 100.534, durationMin: 60, tip: 'One hour is about 400–600 baht at reputable shops.', transit: 'Sala Daeng Stn (BTS)', cost: 500, booking: 'klook' },
    { name: { ko: '짜뚜짝 주말시장', en: 'Chatuchak Weekend Market', ja: 'チャトゥチャック・ウィークエンドマーケット', zh: '恰圖恰週末市集' }, category: 'shopping', area: 'Chatuchak', lat: 13.7999, lng: 100.5502, durationMin: 120, tip: 'Saturday–Sunday only; bring cash and water.', transit: 'Mo Chit Stn (BTS) or Kamphaeng Phet (MRT)' },
    { name: { ko: '아이콘시암', en: 'ICONSIAM', ja: 'アイコンサイアム', zh: '暹羅天地' }, category: 'shopping', area: 'Khlong San', lat: 13.7266, lng: 100.5105, durationMin: 90, tip: 'Indoor floating market food hall on the ground floor.', transit: 'Charoen Nakhon Stn (Gold Line)' },
    { name: { ko: '짜오프라야 디너 크루즈', en: 'Chao Phraya dinner cruise', ja: 'チャオプラヤー川ディナークルーズ', zh: '湄南河晚餐遊船' }, category: 'activity', area: 'Riverside', lat: 13.7232, lng: 100.513, durationMin: 120, tip: 'Book a cruise that passes Wat Arun lit up at night.', transit: 'Saphan Taksin Stn (BTS), Sathorn pier', cost: 1500, booking: 'klook' },
    { name: { ko: '수쿰빗 호텔', en: 'Hotel check-in (Sukhumvit)', ja: 'スクンビットのホテル', zh: '素坤逸飯店' }, category: 'stay', area: 'Sukhumvit', lat: 13.7376, lng: 100.56, durationMin: 30, tip: 'Stay near a BTS station to skip traffic.', transit: 'Airport Rail Link to Phaya Thai, then BTS', booking: 'agoda' },
  ],
  danang: [
    { name: { ko: '미케 비치', en: 'My Khe Beach', ja: 'ミーケービーチ', zh: '美溪沙灘' }, category: 'nature', area: 'Son Tra', lat: 16.061, lng: 108.247, durationMin: 90, tip: 'Swim early morning or late afternoon; flags mark safe zones.', transit: 'Grab taxi from the city center (10 min)' },
    { name: { ko: '바나힐', en: 'Ba Na Hills (Golden Bridge)', ja: 'バーナーヒルズ', zh: '巴拿山' }, category: 'activity', area: 'Hoa Vang', lat: 15.995, lng: 107.996, durationMin: 360, tip: 'Go on a weekday morning; bring a jacket for the summit.', transit: 'Shuttle or Grab (45 min)', cost: 900000, booking: 'klook' },
    { name: { ko: '오행산', en: 'Marble Mountains', ja: '五行山', zh: '五行山' }, category: 'sight', area: 'Ngu Hanh Son', lat: 16.0042, lng: 108.262, durationMin: 90, tip: 'Take the elevator up and explore the caves on foot.', transit: 'Grab taxi (20 min)', cost: 40000 },
    { name: { ko: '미꽝 점심', en: 'Mi Quang noodle lunch', ja: 'ミークアンのランチ', zh: '廣南麵午餐' }, category: 'food', area: 'Hai Chau', lat: 16.059, lng: 108.215, durationMin: 60, tip: 'Turmeric noodles are the local specialty; add the rice crackers.', transit: 'Walk or Grab in Hai Chau', cost: 50000, reserve: 'google' },
    { name: { ko: '한 시장', en: 'Han Market', ja: 'ハン市場', zh: '韓市場' }, category: 'shopping', area: 'Hai Chau', lat: 16.0683, lng: 108.2242, durationMin: 60, tip: 'Dried mango and coffee souvenirs; compare prices before buying.', transit: 'Riverside, central Da Nang' },
    { name: { ko: '호이안 올드타운', en: 'Hoi An Ancient Town', ja: 'ホイアン旧市街', zh: '會安古鎮' }, category: 'sight', area: 'Hoi An', lat: 15.8801, lng: 108.338, durationMin: 180, tip: 'Lanterns light up after 18:00; ticket covers heritage houses.', transit: 'Grab taxi (40 min)', cost: 120000, booking: 'klook' },
    { name: { ko: '용다리', en: 'Dragon Bridge', ja: 'ドラゴン橋', zh: '龍橋' }, category: 'nightlife', area: 'Hai Chau', lat: 16.0612, lng: 108.2272, durationMin: 45, tip: 'Fire and water show on weekend nights around 21:00.', transit: 'Walk along the Han River' },
    { name: { ko: '미케 해변 호텔', en: 'Hotel check-in (My Khe Beach)', ja: 'ミーケービーチのホテル', zh: '美溪海灘飯店' }, category: 'stay', area: 'My Khe Beach', lat: 16.056, lng: 108.246, durationMin: 30, tip: 'Beachfront hotels are 15 min from the airport.', transit: 'Grab taxi from DAD airport', booking: 'agoda' },
  ],
  paris: [
    { name: { ko: '에펠탑', en: 'Eiffel Tower', ja: 'エッフェル塔', zh: '艾菲爾鐵塔' }, category: 'sight', area: '7th arr.', lat: 48.8584, lng: 2.2945, durationMin: 120, tip: 'Book summit tickets weeks ahead; Trocadéro has the classic view.', transit: 'Bir-Hakeim (Line 6) or Champ de Mars (RER C)', cost: 36, booking: 'klook' },
    { name: { ko: '루브르 박물관', en: 'Louvre Museum', ja: 'ルーヴル美術館', zh: '羅浮宮' }, category: 'sight', area: '1st arr.', lat: 48.8606, lng: 2.3376, durationMin: 180, tip: 'Timed entry is required; enter via the Carrousel to skip the pyramid line.', transit: 'Palais-Royal Musée du Louvre (Line 1/7)', cost: 22, booking: 'klook' },
    { name: { ko: '마레 지구 카페', en: 'Café time in Le Marais', ja: 'ル・マレのカフェ', zh: '瑪黑區咖啡時光' }, category: 'cafe', area: 'Le Marais', lat: 48.859, lng: 2.362, durationMin: 90, tip: 'Falafel on Rue des Rosiers and boutiques on Sunday.', transit: 'Saint-Paul (Line 1)', cost: 12 },
    { name: { ko: '오르세 미술관', en: "Musée d'Orsay", ja: 'オルセー美術館', zh: '奧賽美術館' }, category: 'sight', area: '7th arr.', lat: 48.86, lng: 2.3266, durationMin: 120, tip: 'Impressionists on the 5th floor; closed Mondays.', transit: "Musée d'Orsay (RER C)", cost: 16, booking: 'klook' },
    { name: { ko: '센강 유람선', en: 'Seine river cruise', ja: 'セーヌ川クルーズ', zh: '塞納河遊船' }, category: 'activity', area: 'Pont de l’Alma', lat: 48.862, lng: 2.305, durationMin: 60, tip: 'Evening cruises show the illuminated bridges.', transit: 'Alma-Marceau (Line 9)', cost: 17, booking: 'klook' },
    { name: { ko: '몽마르트르·사크레쾨르', en: 'Montmartre & Sacré-Cœur', ja: 'モンマルトルとサクレ・クール', zh: '蒙馬特與聖心堂' }, category: 'sight', area: 'Montmartre', lat: 48.8867, lng: 2.3431, durationMin: 120, tip: 'Watch for petition scams on the steps; the view is free.', transit: 'Anvers (Line 2) + funicular' },
    { name: { ko: '갤러리 라파예트', en: 'Galeries Lafayette', ja: 'ギャラリー・ラファイエット', zh: '老佛爺百貨' }, category: 'shopping', area: 'Opéra', lat: 48.8738, lng: 2.332, durationMin: 90, tip: 'Free rooftop terrace; ask for the tourist tax-refund desk.', transit: 'Chaussée d’Antin (Line 7/9)' },
    { name: { ko: '오페라 호텔', en: 'Hotel check-in (Opéra)', ja: 'オペラ地区のホテル', zh: '歌劇院區飯店' }, category: 'stay', area: 'Opéra', lat: 48.871, lng: 2.332, durationMin: 30, tip: 'Roissybus runs from CDG to Opéra.', transit: 'Roissybus or RER B from CDG', booking: 'agoda' },
  ],
}

// ---------- 큐레이션이 없는 도시용 일반 샘플 ----------
const GENERIC: { cat: StopCategory; name: LocalizedName; dur: number; booking?: 'klook' | 'getyourguide'; reserve?: boolean; q: string }[] = [
  { cat: 'sight', name: { ko: '구시가지 산책', en: 'Old town walk', ja: '旧市街さんぽ', zh: '老城區散步' }, dur: 90, booking: 'klook', q: 'walking tour' },
  { cat: 'food', name: { ko: '로컬 시장 먹거리 탐방', en: 'Local market food crawl', ja: '地元市場の食べ歩き', zh: '在地市場美食巡禮' }, dur: 75, reserve: true, q: 'local market' },
  { cat: 'sight', name: { ko: '대표 명소 방문', en: 'Top landmark visit', ja: '代表的な名所めぐり', zh: '代表景點參觀' }, dur: 120, booking: 'klook', q: 'attractions tickets' },
  { cat: 'cafe', name: { ko: '카페 휴식', en: 'Café break', ja: 'カフェ休憩', zh: '咖啡廳小憩' }, dur: 60, q: 'cafe' },
  { cat: 'activity', name: { ko: '반나절 현지 투어', en: 'Half-day local tour', ja: '半日現地ツアー', zh: '半日在地導覽' }, dur: 240, booking: 'getyourguide', q: 'day tour' },
  { cat: 'shopping', name: { ko: '쇼핑 거리', en: 'Shopping street', ja: 'ショッピング街', zh: '購物街' }, dur: 90, q: 'shopping' },
  { cat: 'nature', name: { ko: '공원·수변 산책', en: 'Park or waterfront stroll', ja: '公園・水辺の散策', zh: '公園水岸散步' }, dur: 60, q: 'park' },
  { cat: 'nightlife', name: { ko: '야경과 저녁 식사', en: 'Night view & dinner', ja: '夜景とディナー', zh: '夜景與晚餐' }, dur: 120, reserve: true, q: 'restaurant' },
]

/** 도시 중심 좌표 주변 일반 샘플 장소 (데모 모드 — 실제 장소는 라이브 AI 가 선택) */
export function genericPlaces(dest: { id: string; name: LocalizedName & { en: string }; lat: number; lng: number; areas?: string[] }): MockPlace[] {
  const areas = dest.areas?.length ? dest.areas : ['City Center', 'Old Town', 'Waterfront']
  let h = 0
  for (const ch of dest.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const jitter = (i: number, k: number) => (((h >> ((i + k) % 16)) % 200) - 100) / 6000
  const city = dest.name.en.replace(/\s*\(.*\)$/, '')
  const places: MockPlace[] = GENERIC.map((g, i) => ({
    name: g.name,
    category: g.cat,
    area: areas[i % areas.length],
    lat: dest.lat + jitter(i, 1),
    lng: dest.lng + jitter(i, 5),
    durationMin: g.dur,
    tip: 'Sample stop (demo mode). The live AI planner picks real places for this city.',
    transit: 'Public transport or taxi',
    booking: g.booking,
    reserve: g.reserve ? 'google' : undefined,
    query: `${city} ${g.q}`,
  }))
  places.push({
    name: { ko: `호텔 체크인 (${dest.name.ko})`, en: `Hotel check-in (${city})`, ja: `ホテルにチェックイン（${dest.name.ja ?? city}）`, zh: `飯店入住（${dest.name.zh ?? city}）` },
    category: 'stay',
    area: areas[0],
    lat: dest.lat,
    lng: dest.lng,
    durationMin: 30,
    tip: 'Compare hotels for your dates in the Hotels tab.',
    transit: 'Airport transfer or taxi',
    booking: 'agoda',
    query: `${city} hotels`,
  })
  return places
}
