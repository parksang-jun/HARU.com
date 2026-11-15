# 맥에서 하루 운영센터 쓰기

`하루_설치.command` 를 더블클릭하면 이 맥에 **하루 운영센터** 앱이 설치된다(막히면 터미널에서 `bash 하루_설치.command`).
자동 실행(launchd)까지 등록하려면 `install.command` 를 쓴다.

**필요한 것**: git, Node.js, Claude Code(`claude`, 한 번 실행해 로그인), 권장: GitHub CLI(`gh auth login`).

| 무엇 | 언제 | 수동 실행 |
|---|---|---|
| 주간 운영 점검 | 월 09:13 | `bash ~/HaruOps/run-routine.sh A` |
| 제휴·광고주 | 수 10:07 | `bash ~/HaruOps/run-routine.sh B` |
| 월간 정산 | 매월 3일 10:22 | `bash ~/HaruOps/run-routine.sh C` |
| 제품 개선 (피드백 → 수정 → 효과 확인) | 화·금 10:41 | `bash ~/HaruOps/run-routine.sh D` |
| 마케팅 콘텐츠 | 목 10:37 | `bash ~/HaruOps/run-routine.sh E` |
| 여행 데이터 점검 | 토 09:27 | `bash ~/HaruOps/run-routine.sh F` |

**운영센터 앱**: 바탕화면에 `하루 운영센터` 가 생긴다. 더블클릭하면 대시보드(출시 준비 연결 상태 포함)·명령·결재함·제품 개선(피드백 접수)·여행 데이터·마케팅 콘텐츠·앱 미리보기·제휴·광고주·정산·보고서·실행 기록·설정 화면이 열리고, 루틴을 버튼으로 바로 돌릴 수 있다. 이 맥에서만 열리는 화면이다(127.0.0.1:4778 — 싹싹클린 운영센터 4777 과 따로 돈다). 앱을 열 때와 5분마다 GitHub 의 새 버전을 확인해 스스로 바뀐다.

- 규칙과 권한은 `ops/agent/AGENT.md` 그대로다: main 직접 푸시·메일 발송·지급·제휴 가입은 하지 않는다(실행 옵션에서도 막아 둠).
- 결과: `~/HaruOps/HARU.com/ops/agent/reports/`, 로그: `~/HaruOps/logs/`, 끝나면 알림 센터에 알림.
- **클라우드 예약 작업과 같이 켜 두면 같은 일을 두 번 한다.** 한쪽만 쓸 것.
- 제거: `bash uninstall.command`
