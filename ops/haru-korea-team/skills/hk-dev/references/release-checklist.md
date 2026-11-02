# 릴리스 체크리스트

## 공통
- [ ] `npm test` / `npm run build` / `npm run e2e` 통과, 스크린샷(en/ja/zh-TW) 육안 확인
- [ ] `.env`: `VITE_MOCK_AI=false`, Supabase URL·anon key, `VITE_AFF_*` 실제 값(승인된 파트너만), AdMob 설정
- [ ] Edge Function 배포 + secrets(`ANTHROPIC_API_KEY`, 모델명, 일일 한도) 확인, 프로덕션에서 일정 1건 실제 생성 테스트
- [ ] 법적 페이지 운영자 정보·AI 고지·어필리에이트 고지·스폰서 라벨 확인(`hk-cs`)

## Google Play
- [ ] versionCode 증가, 데이터 안전: 위치(대략, 선택)·앱 활동·식별자(광고 ID, 배너 사용 시) 공개, 광고 포함 여부
- [ ] 콘텐츠 등급(여행 앱, 전체), 타깃 연령 18+ 권장(여행·결제 링크)
- [ ] 스크린샷 4~8장(ja/zh-TW/en), 설명 현지화, 개인정보 URL
- [ ] 단계적 출시(일본·대만·한국 먼저)

## App Store
- [ ] 앱 개인정보 라벨(위치·식별자·사용 데이터), ATT 문구(배너 사용 시), 위치 사용 설명
- [ ] 연령 등급 4+ 또는 12+(외부 링크), 수출 규정 비암호화
- [ ] 심사 노트: 데모용 샘플 일정 계정 불필요(익명 로그인), AI 생성 고지 위치 설명

## 웹
- [ ] 호스팅 배포, `VITE_PRIVACY` 링크, OG 이미지, 일본어·번체 SEO 메타
- [ ] Supabase Auth 허용 도메인·CORS 확인

## 출시 직후 24시간
- [ ] Edge Function 오류율·지연, Anthropic 비용, 429 발생률, 어필리에이트 클릭이 파트너 대시보드에 기록되는지 확인
