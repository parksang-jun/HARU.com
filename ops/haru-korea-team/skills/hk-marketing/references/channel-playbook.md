# 채널 플레이북

## 시장 × 채널 매트릭스

| 시장 | 1순위 | 2순위 | 커뮤니티 | 검색 키워드 예 |
|---|---|---|---|---|
| 일본 | Instagram 릴스 | YouTube·X | X 해시태그 #韓国旅行, Ameba 블로그 | 韓国旅行 モデルコース, ソウル 3泊4日, 釜山 観光 |
| 대만 | 小紅書(샤오홍슈)·Instagram | Threads·YouTube | PTT Korea_Travel, Dcard 旅遊 | 首爾自由行 行程, 釜山 景點, 韓國 優惠券 |
| 영어권 | TikTok·YouTube Shorts | Instagram | Reddit r/koreatravel, r/seoul, Facebook 그룹 | Seoul itinerary 4 days, Korea trip planner, Busan things to do |

## 숏폼 5종 포맷

| 포맷 | 구조 | 훅 예 (ja / zh-TW / en) |
|---|---|---|
| 1분 일정 | 앱 화면 녹화 → 생성 → 지도 | "韓国3泊4日、1分で予定完成" / "首爾4天3夜，1分鐘排好行程" / "Seoul in 4 days, planned in 60 seconds" |
| 따라가 봄 | 실제 동선 브이로그 + 앱 캡처 | "AIが組んだ明洞コース、実際に行ってみた" / "照AI排的明洞行程走一天" / "I followed an AI itinerary in Seoul" |
| 실수 TOP5 | 자막 리스트 | "韓国旅行で失敗したこと5つ" / "韓國旅遊5個踩雷" / "5 mistakes on your first Korea trip" |
| 쿠폰 | 매장 + 쿠폰 화면 | "明洞のコスメ、アプリ見せたら10%オフ" / "明洞美妝 出示App打9折" / "Show the app, get 10% off in Myeongdong" |
| 비교 | ChatGPT vs Haru 일정 | "ChatGPTとどこが違う？" / "跟ChatGPT排的有什麼不同" / "ChatGPT vs a Korea-only planner" |

## 해시태그 세트

- ja: #韓国旅行 #ソウル旅行 #韓国 #釜山旅行 #韓国カフェ #韓国グルメ #旅行計画 #harukorea
- zh-TW: #韓國旅遊 #首爾自由行 #釜山旅遊 #韓國美食 #韓國咖啡廳 #旅遊規劃 #韓國優惠 #harukorea
- en: #koreatravel #seoul #seoulitinerary #busan #travelplanner #koreatrip #visitkorea #harukorea

## 인플루언서 DM 초안

- ja: はじめまして。韓国旅行者向けのAI旅程アプリ「Haru Korea」を作っている韓国在住の開発者、Peterです。{name}さんの韓国旅行動画がまさに私たちのユーザー像です。アプリで組んだ旅程を実際に歩く動画を1本お願いできないでしょうか。無料コード、提携店クーポン体験、謝礼をご用意します。
- zh-TW: 您好，我是住在韓國的開發者 Peter，做了一款給訪韓旅客用的 AI 行程 App「Haru Korea」。{name} 的韓國旅遊影片正是我們的目標客群。想邀請您用 App 排一段行程並實際走一趟拍成影片，我們提供免費碼、合作店家優惠體驗與酬勞。
- en: Hi {name}, I'm Peter, a developer in Korea building Haru Korea, an AI itinerary app for inbound travelers. Your Korea videos are exactly our audience. Would you plan one day with the app and film it? Free code, partner-shop coupon experience and a fee included.

## 유료 광고 세팅 요약

- Meta: 목표 "앱 설치"(네이티브) 또는 "전환-일정 생성"(웹, 픽셀/CAPI). 배치 릴스·스토리 우선. 일본 CPM 비교적 높음 → 소재 품질이 승부.
- TikTok: 영어권·대만, Spark Ads로 인플루언서 게시물 부스팅.
- 전환 이벤트 정의: `trip_created`(설정 완료), `itinerary_viewed`, `book_click` — `hk-dev` 가 웹 이벤트 연결.
- 성과 기준: CPA(일정 생성) 일본 ≤ $1.5, 대만 ≤ $1.0, 영어권 ≤ $2.0; 일정 생성 완료율 ≥ 50%; Book CTR ≥ 8%

## 협찬 표시 규정
일본 ステマ規制(2023-10, #PR·#広告), 대만 公平交易法 광고 표시, 한국 표시광고법 — 모든 협찬 콘텐츠에 표시. Reddit 등 커뮤니티는 운영자임을 밝힌다.
