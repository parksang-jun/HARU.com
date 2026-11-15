#!/bin/bash
# ════════════════════════════════════════════════════
#  하루 운영센터  —  설치 & 실행
#  이 파일을 더블클릭하면 모든 설치가 자동으로 됩니다.
#  이후에는 바탕화면의 "하루 운영센터" 앱을 클릭하세요.
# ════════════════════════════════════════════════════
set -euo pipefail

# 터미널 창 제목
printf '\033]0;하루 운영센터 설치\007'

export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
HOME_DIR="$HOME/HaruOps"
REPO="$HOME_DIR/HARU.com"
REPO_URL="https://github.com/parksang-jun/HARU.com.git"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  하루 운영센터 설치"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1) Node.js 확인
if ! command -v node >/dev/null 2>&1; then
  echo "✗ Node.js 가 없습니다."
  echo "  → https://nodejs.org 에서 LTS 버전을 설치한 뒤 다시 실행하세요."
  read -n1 -rp "  (아무 키나 누르면 닫힙니다)" _
  exit 1
fi
echo "✓ Node.js $(node -v)"

# 2) git 확인
if ! command -v git >/dev/null 2>&1; then
  echo "✗ git 이 없습니다. Xcode Command Line Tools 를 설치합니다..."
  xcode-select --install 2>/dev/null || true
  echo "  설치 창이 뜨면 완료 후 이 파일을 다시 실행하세요."
  read -n1 -rp "  (아무 키나 누르면 닫힙니다)" _
  exit 1
fi
echo "✓ git $(git --version | awk '{print $3}')"

# 3) 저장소 받기 (없으면 clone, 있으면 pull)
mkdir -p "$HOME_DIR"
if [ -d "$REPO/.git" ]; then
  echo "✓ 저장소 최신 버전으로 갱신 중..."
  cd "$REPO"
  git -c credential.helper= fetch -q origin main 2>/dev/null || true
  git merge -q --ff-only origin/main 2>/dev/null || true
else
  echo "  저장소 다운로드 중 (최초 1회)..."
  git clone --depth 1 "$REPO_URL" "$REPO"
fi
echo "✓ 최신 버전 준비 완료"

# 4) 운영센터 앱 설치 (바탕화면 앱 생성 포함)
echo ""
echo "  바탕화면 앱 만드는 중..."
bash "$REPO/ops/agent/mac/console/install-app.sh"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ 설치 완료!"
echo "  바탕화면의 '하루 운영센터' 를 더블클릭하세요."
echo "  (이 파일은 다시 쓸 일이 없습니다)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
read -n1 -rp "  (아무 키나 누르면 닫힙니다)" _
