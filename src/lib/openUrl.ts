// 외부 링크 열기 — 네이티브는 인앱 브라우저(Capacitor Browser), 웹은 새 탭
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'

export async function openExternal(url: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url, presentationStyle: 'popover' })
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}
