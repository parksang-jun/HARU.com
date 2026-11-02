-- 시드: 큐레이션 장소(서울·부산) + 샘플 쿠폰(is_sample = true, 출시 전 삭제)
-- 좌표는 공개 지도 기준 대략값 — 출시 전 실제 값으로 검증할 것

insert into public.places (id, city, category, name_ko, name_en, name_ja, name_zh, area, lat, lng, tip, transit, booking_partner) values
  ('seoul-gyeongbokgung', 'seoul', 'sight', '경복궁', 'Gyeongbokgung Palace', '景福宮', '景福宮', 'Jongno', 37.5796, 126.9770, 'Guard-changing ceremony at 10:00 and 14:00; closed Tuesdays.', 'Gyeongbokgung Stn (Line 3), Exit 5', 'klook'),
  ('seoul-changdeokgung', 'seoul', 'sight', '창덕궁', 'Changdeokgung Palace', '昌徳宮', '昌德宮', 'Jongno', 37.5794, 126.9910, 'Secret Garden tour needs a timed ticket.', 'Anguk Stn (Line 3), Exit 3', 'klook'),
  ('seoul-bukchon', 'seoul', 'sight', '북촌한옥마을', 'Bukchon Hanok Village', '北村韓屋村', '北村韓屋村', 'Bukchon', 37.5826, 126.9831, 'Residential area; keep quiet.', '10 min walk from Anguk Stn', null),
  ('seoul-ikseon', 'seoul', 'cafe', '익선동', 'Ikseon-dong Hanok Alley', '益善洞', '益善洞', 'Jongno', 37.5726, 126.9906, 'Go before 11:00 to avoid queues.', 'Jongno 3-ga Stn, Exit 4', null),
  ('seoul-gwangjang', 'seoul', 'food', '광장시장', 'Gwangjang Market', '広蔵市場', '廣藏市場', 'Jongno', 37.5701, 126.9996, 'Bindaetteok and mayak gimbap.', 'Jongno 5-ga Stn (Line 1), Exit 8', null),
  ('seoul-namsan-tower', 'seoul', 'sight', '남산서울타워', 'N Seoul Tower', 'Nソウルタワー', '南山首爾塔', 'Namsan', 37.5512, 126.9882, 'Cable car up, walk down at sunset.', 'Cable car from Myeongdong', 'klook'),
  ('seoul-myeongdong', 'seoul', 'shopping', '명동', 'Myeongdong Shopping Street', '明洞', '明洞', 'Myeongdong', 37.5636, 126.9869, 'Street food after 16:00; tax refund counters in big stores.', 'Myeongdong Stn (Line 4), Exit 6', null),
  ('seoul-namdaemun', 'seoul', 'shopping', '남대문시장', 'Namdaemun Market', '南大門市場', '南大門市場', 'Jung-gu', 37.5591, 126.9775, 'Kalguksu alley for lunch.', 'Hoehyeon Stn (Line 4), Exit 5', null),
  ('seoul-hongdae', 'seoul', 'nightlife', '홍대 거리', 'Hongdae Street', '弘大通り', '弘大街', 'Hongdae', 37.5563, 126.9237, 'Busking from 19:00 near Exit 9.', 'Hongik Univ. Stn (Line 2), Exit 9', null),
  ('seoul-seongsu', 'seoul', 'cafe', '성수동', 'Seongsu-dong', '聖水洞', '聖水洞', 'Seongsu', 37.5445, 127.0560, 'Converted-factory cafés and pop-ups.', 'Seongsu Stn (Line 2), Exit 3', null),
  ('seoul-starfield', 'seoul', 'sight', '스타필드 라이브러리', 'Starfield Library (COEX)', 'スターフィールド図書館', '星空圖書館', 'Gangnam', 37.5103, 127.0592, 'Free; combine with COEX Mall.', 'Samseong Stn (Line 2), Exit 6', null),
  ('seoul-ddp', 'seoul', 'sight', '동대문디자인플라자', 'Dongdaemun Design Plaza', '東大門デザインプラザ', '東大門設計廣場', 'Dongdaemun', 37.5665, 127.0092, 'Late-night shopping malls nearby.', 'DDP Stn (Line 2/4/5)', null),
  ('seoul-yeouido', 'seoul', 'nature', '여의도 한강공원', 'Yeouido Hangang Park', '汝矣島漢江公園', '汝矣島漢江公園', 'Yeouido', 37.5283, 126.9329, 'Delivery chicken by the river; bike rental.', 'Yeouinaru Stn (Line 5), Exit 2', null),
  ('seoul-euljiro', 'seoul', 'food', '을지로 노가리골목', 'Euljiro Nogari Alley', '乙支路ノガリ横丁', '乙支路乾明太魚巷', 'Euljiro', 37.5668, 126.9913, 'Outdoor beer tables from 17:00.', 'Euljiro 3-ga Stn, Exit 4', null),
  ('seoul-lotte-tower', 'seoul', 'sight', '롯데월드타워 서울스카이', 'Lotte World Tower Seoul Sky', 'ロッテワールドタワー', '樂天世界塔', 'Jamsil', 37.5126, 127.1025, 'Observation deck, floors 117–123.', 'Jamsil Stn (Line 2/8), Exit 1', 'klook'),
  ('seoul-insadong', 'seoul', 'shopping', '인사동', 'Insadong', '仁寺洞', '仁寺洞', 'Jongno', 37.5740, 126.9850, 'Traditional crafts and tea houses.', 'Anguk Stn (Line 3), Exit 6', null),
  ('seoul-gangnam', 'seoul', 'nightlife', '강남역', 'Gangnam Station area', '江南駅', '江南站', 'Gangnam', 37.4979, 127.0276, 'Restaurants and bars open late.', 'Gangnam Stn (Line 2)', null),
  ('seoul-coex-aquarium', 'seoul', 'activity', '코엑스 아쿠아리움', 'COEX Aquarium', 'COEXアクアリウム', 'COEX 水族館', 'Gangnam', 37.5130, 127.0590, 'Good rainy-day option.', 'Samseong Stn (Line 2), Exit 6', 'klook'),
  ('seoul-lotte-world', 'seoul', 'activity', '롯데월드 어드벤처', 'Lotte World Adventure', 'ロッテワールド', '樂天世界', 'Jamsil', 37.5111, 127.0980, 'Indoor theme park; buy tickets in advance.', 'Jamsil Stn (Line 2/8), Exit 4', 'klook'),
  ('seoul-everland', 'seoul', 'activity', '에버랜드', 'Everland', 'エバーランド', '愛寶樂園', 'Yongin', 37.2944, 127.2024, 'Full-day trip; shuttle buses from Seoul.', 'Shuttle bus or Everline', 'klook'),
  ('busan-haeundae', 'busan', 'nature', '해운대 해수욕장', 'Haeundae Beach', '海雲台ビーチ', '海雲台海水浴場', 'Haeundae', 35.1587, 129.1604, 'Walk to Dongbaek Island.', 'Haeundae Stn (Line 2), Exit 3', null),
  ('busan-gamcheon', 'busan', 'sight', '감천문화마을', 'Gamcheon Culture Village', '甘川文化村', '甘川文化村', 'Gamcheon', 35.0975, 129.0106, 'Stamp map at the entrance.', 'Toseong Stn (Line 1), bus 2/2-2', null),
  ('busan-jagalchi', 'busan', 'food', '자갈치시장', 'Jagalchi Fish Market', 'チャガルチ市場', '札嘎其市場', 'Nampo', 35.0967, 129.0306, 'Pick fish downstairs, eat upstairs.', 'Jagalchi Stn (Line 1), Exit 10', null),
  ('busan-gwangalli', 'busan', 'nightlife', '광안리 해변', 'Gwangalli Beach', '広安里ビーチ', '廣安里海灘', 'Gwangan', 35.1531, 129.1187, 'Bridge views; drone show on Saturdays.', 'Gwangan Stn (Line 2)', null),
  ('busan-yonggungsa', 'busan', 'sight', '해동용궁사', 'Haedong Yonggungsa Temple', '海東龍宮寺', '海東龍宮寺', 'Gijang', 35.1884, 129.2233, 'Arrive before 09:00.', 'Bus 181 from Haeundae', 'klook'),
  ('busan-taejongdae', 'busan', 'nature', '태종대', 'Taejongdae Park', '太宗台', '太宗台', 'Yeongdo', 35.0516, 129.0872, 'Danubi train loop.', 'Bus 88/101 from Nampo', null),
  ('busan-biff', 'busan', 'food', 'BIFF 광장', 'BIFF Square', 'BIFF広場', 'BIFF 廣場', 'Nampo', 35.0987, 129.0287, 'Ssiat hotteok stalls.', 'Nampo Stn (Line 1), Exit 7', null),
  ('busan-huinnyeoul', 'busan', 'sight', '흰여울문화마을', 'Huinnyeoul Culture Village', '白如울文化村', '白淺灘文化村', 'Yeongdo', 35.0785, 129.0447, 'Cliffside walkway; sunset.', 'Bus 7/71/508 from Nampo', null),
  ('busan-songdo-cablecar', 'busan', 'activity', '송도해상케이블카', 'Songdo Marine Cable Car', '松島海上ケーブルカー', '松島海上纜車', 'Songdo', 35.0760, 129.0170, 'Crystal-floor cabins available.', 'Bus 26/71 from Nampo', 'klook'),
  ('busan-centum', 'busan', 'shopping', '센텀시티', 'Centum City', 'センタムシティ', '新世界 Centum City', 'Centum', 35.1690, 129.1296, 'Largest department store; spa inside.', 'Centum City Stn (Line 2)', null)
on conflict (id) do nothing;

insert into public.coupons (merchant, title_en, title_ko, title_ja, title_zh, discount, city, area, category, link, sponsored, weight, lat, lng, is_sample) values
  ('Sample Cosmetics (Myeongdong)', '10% off for travelers — show this screen', '여행자 10% 할인 — 이 화면 제시', '旅行者10%割引 — この画面を提示', '旅客九折 — 出示此畫面', '10% OFF', 'seoul', 'Myeongdong', 'shopping', 'https://example.com/sample-1', true, 10, 37.5636, 126.9869, true),
  ('Sample Hanok Café (Bukchon)', 'Free dessert with two drinks', '음료 2잔 주문 시 디저트 무료', 'ドリンク2杯でデザート無料', '兩杯飲品送甜點', 'FREE DESSERT', 'seoul', 'Bukchon', 'cafe', 'https://example.com/sample-2', true, 8, 37.5826, 126.9831, true),
  ('Sample BBQ (Hongdae)', 'Free side dish set for groups of 3+', '3인 이상 사이드 세트 무료', '3名以上でサイドセット無料', '三人以上送小菜組合', 'FREE SIDE', 'seoul', 'Hongdae', 'food', 'https://example.com/sample-3', false, 5, 37.5563, 126.9237, true),
  ('Sample Hanbok Rental (Gyeongbokgung)', '15% off 4-hour rental', '4시간 대여 15% 할인', '4時間レンタル15%割引', '四小時租借 85 折', '15% OFF', 'seoul', 'Gyeongbokgung', 'activity', 'https://example.com/sample-4', true, 9, 37.5796, 126.9770, true),
  ('Sample Spa (Gangnam)', '20% off evening jjimjilbang entry', '저녁 찜질방 입장 20% 할인', '夜のチムジルバン入場20%割引', '晚間汗蒸幕入場八折', '20% OFF', 'seoul', 'Gangnam', 'wellness', 'https://example.com/sample-5', false, 4, 37.5116, 127.0594, true),
  ('Sample Seafood (Jagalchi)', 'Free steamed clams with any set', '세트 주문 시 조개찜 서비스', 'セット注文で蒸し貝サービス', '點套餐送蒸蛤蜊', 'FREE DISH', 'busan', 'Jagalchi', 'food', 'https://example.com/sample-6', true, 7, 35.0967, 129.0306, true),
  ('Sample Surf School (Haeundae)', '10% off beginner lesson', '초보 강습 10% 할인', '初心者レッスン10%割引', '初學課程九折', '10% OFF', 'busan', 'Haeundae', 'activity', 'https://example.com/sample-7', false, 3, 35.1587, 129.1604, true),
  ('Sample Café (Gamcheon)', 'Free postcard with any drink', '음료 주문 시 엽서 증정', 'ドリンク注文でポストカード進呈', '點飲品送明信片', 'GIFT', 'busan', 'Gamcheon', 'cafe', 'https://example.com/sample-8', true, 6, 35.0975, 129.0106, true);
