import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { I18nProvider } from './i18n/context'
import './styles/tokens.css'
import './styles/base.css'
import './styles/components.css'

// HashRouter: Capacitor 의 file:// / 정적 호스팅에서 새로고침에도 안전
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <I18nProvider>
        <App />
      </I18nProvider>
    </HashRouter>
  </StrictMode>,
)
