import type { CapacitorConfig } from '@capacitor/cli'

// Capacitor 네이티브 래핑 설정 — appId는 스토어 등록 전에 확정할 것 (변경 시 android/ios 재생성 필요)
const config: CapacitorConfig = {
  appId: 'com.harukorea.app',
  appName: 'Haru Korea',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    // AdMob: 실제 앱 ID는 AndroidManifest.xml / Info.plist 의 TODO 항목에 입력
    AdMob: {},
  },
}

export default config
