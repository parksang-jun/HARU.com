#!/bin/bash
# 하루 운영센터 — 바탕화면 앱 만들기
#   처음 한 번만 터미널에서:  bash install-app.sh  (이후에는 앱이 스스로 업데이트한다)
# 결과: 바탕화면(과 응용 프로그램 폴더)에 "하루 운영센터" 앱. 더블클릭하면 관리 화면이 창으로 열린다.
set -euo pipefail
SRC="$(cd "$(dirname "$0")" && pwd)"
HOME_DIR="$HOME/HaruOps"
DEST="$HOME_DIR/console"
APP_NAME="하루 운영센터"
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"

if ! command -v node >/dev/null 2>&1; then
  echo "✗ Node.js 가 없습니다. 'brew install node' 또는 https://nodejs.org 에서 설치 후 다시 실행하세요."; exit 1
fi

echo "1/3 운영센터 파일 복사 → $DEST"
mkdir -p "$DEST" "$HOME_DIR/logs"
for f in server.mjs diagnose.mjs index.html icon.png launch.sh install-app.sh; do
  [ "$SRC/$f" -ef "$DEST/$f" ] || cp "$SRC/$f" "$DEST/$f"
done
# 실행 스크립트도 최신으로 (저장소 안에서 실행된 경우)
if [ -f "$SRC/../run-routine.sh" ] && ! [ "$SRC/../run-routine.sh" -ef "$HOME_DIR/run-routine.sh" ]; then cp "$SRC/../run-routine.sh" "$HOME_DIR/run-routine.sh"; chmod +x "$HOME_DIR/run-routine.sh"; fi
mkdir -p "$HOME_DIR/feedback"

# 실행 환경(env.sh): 앱이나 예약으로 실행될 때는 PATH 가 거의 비어 있어 claude·node·git 을 못 찾는다.
# 터미널(로그인 셸)에서 찾은 위치를 적어 둔다. 이미 있으면 claude 를 찾을 수 있는지 확인하고, 못 찾으면 다시 만든다.
find_bin() { command -v "$1" 2>/dev/null || /bin/zsh -lic "command -v $1" 2>/dev/null | tail -1 || true; }
env_ok() { [ -f "$HOME_DIR/env.sh" ] && ( . "$HOME_DIR/env.sh"; command -v claude >/dev/null 2>&1 ); }
if ! env_ok; then
  P=""
  for b in claude node git gh; do
    x="$(find_bin "$b")"
    case "$x" in /*) P="$P$(dirname "$x"):" ;; esac
  done
  cat > "$HOME_DIR/env.sh" <<ENV
export PATH="${P}\$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
export HARU_REPO_DIR="\$HOME/HaruOps/HARU.com"
export HARU_HOME_DIR="\$HOME/HaruOps"
ENV
  if env_ok; then echo "  실행 환경 기록: claude $(. "$HOME_DIR/env.sh"; command -v claude)"
  else echo "  ⚠ Claude Code(claude)를 찾지 못했습니다 — 설치·로그인 후 운영센터 설정에서 '다시 설치·복구'를 눌러 주세요."; fi
fi
xattr -dr com.apple.quarantine "$DEST" 2>/dev/null || true

echo "2/3 앱 만들기"
chmod +x "$DEST/launch.sh"
build_app() {
  local APP="$1"
  rm -rf "$APP"
  if command -v osacompile >/dev/null 2>&1; then
    # 진짜 맥 앱(애플스크립트 앱)으로 만든다 — 더블클릭하면 터미널 창 없이 실행기를 돌린다
    local AS; AS="$(mktemp -t haru).applescript"
    cat > "$AS" <<'AS'
set launcher to (POSIX path of (path to home folder)) & "HaruOps/console/launch.sh"
do shell script "/bin/bash " & quoted form of launcher & " >/dev/null 2>&1 &"
AS
    osacompile -o "$APP" "$AS" >/dev/null 2>&1; rm -f "$AS"
    if [ -d "$APP" ]; then
      [ -f "$ICNS" ] && cp "$ICNS" "$APP/Contents/Resources/applet.icns"
      /usr/libexec/PlistBuddy -c "Set :CFBundleName $APP_NAME" "$APP/Contents/Info.plist" >/dev/null 2>&1 || true
      /usr/libexec/PlistBuddy -c "Add :CFBundleIdentifier string com.haru.console" "$APP/Contents/Info.plist" >/dev/null 2>&1 || /usr/libexec/PlistBuddy -c "Set :CFBundleIdentifier com.haru.console" "$APP/Contents/Info.plist" >/dev/null 2>&1 || true
      /usr/libexec/PlistBuddy -c "Add :LSUIElement bool true" "$APP/Contents/Info.plist" >/dev/null 2>&1 || true
      xattr -cr "$APP" 2>/dev/null || true
      codesign --force --deep -s - "$APP" >/dev/null 2>&1 || true   # 아이콘을 바꿨으니 다시 서명(이 맥 전용)
      touch "$APP"; return 0
    fi
  fi
  # osacompile 을 못 쓰는 경우의 대체: 실행기를 부르는 단순 앱 묶음
  mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
  printf '#!/bin/bash\nexec /bin/bash "$HOME/HaruOps/console/launch.sh"\n' > "$APP/Contents/MacOS/launcher"
  chmod +x "$APP/Contents/MacOS/launcher"
  cat > "$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>$APP_NAME</string>
  <key>CFBundleDisplayName</key><string>$APP_NAME</string>
  <key>CFBundleExecutable</key><string>launcher</string>
  <key>CFBundleIdentifier</key><string>com.haru.console</string>
  <key>CFBundleIconFile</key><string>AppIcon</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>1.0</string>
  <key>CFBundleVersion</key><string>1</string>
  <key>LSUIElement</key><true/>
</dict>
</plist>
PLIST
  if [ -f "$ICNS" ]; then cp "$ICNS" "$APP/Contents/Resources/AppIcon.icns"; fi
  touch "$APP"
}

# 아이콘 (.icns)
ICNS="$DEST/AppIcon.icns"
TMP="$(mktemp -d)"; SET="$TMP/AppIcon.iconset"; mkdir -p "$SET"
for s in 16 32 128 256 512; do
  sips -z $s $s "$DEST/icon.png" --out "$SET/icon_${s}x${s}.png" >/dev/null 2>&1 || true
  d=$((s * 2)); sips -z $d $d "$DEST/icon.png" --out "$SET/icon_${s}x${s}@2x.png" >/dev/null 2>&1 || true
done
iconutil -c icns "$SET" -o "$ICNS" >/dev/null 2>&1 || echo "  (아이콘 변환 생략)"
rm -rf "$TMP"

build_app "$HOME/Desktop/$APP_NAME.app"
mkdir -p "$HOME/Applications"
build_app "$HOME/Applications/$APP_NAME.app"
rm -f "$HOME/Desktop/하루운영.command" 2>/dev/null || true   # 예전 임시 실행 파일 정리

if [ -n "${HARU_FROM_CONSOLE:-}" ]; then echo "✓ 앱을 다시 만들었습니다"; exit 0; fi   # 운영센터가 스스로 업데이트하는 중이면 여기까지

echo "3/3 실행"
# 이미 떠 있던 예전 서버가 있으면 내리고 새로 띄운다
curl -s -m 1 -X POST -H 'X-HARU: 1' http://127.0.0.1:4778/api/quit >/dev/null 2>&1 || true
sleep 0.5
open "$HOME/Desktop/$APP_NAME.app"
echo
echo "✅ 완료 — 바탕화면의 '$APP_NAME' 을 더블클릭하면 열립니다. (Dock 에 끌어다 두면 더 편해요)"
echo "   앞으로 업데이트는 앱이 스스로 합니다. 터미널을 다시 쓸 일은 없습니다."
