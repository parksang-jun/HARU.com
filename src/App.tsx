import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ensureSession } from './lib/supabase'
import { AdminPage } from './pages/AdminPage'
import { ChatPage } from './pages/ChatPage'
import { DealsPage } from './pages/DealsPage'
import { FlightsPage } from './pages/FlightsPage'
import { HotelsPage } from './pages/HotelsPage'
import { HomePage } from './pages/HomePage'
import { ItineraryPage } from './pages/ItineraryPage'
import { LegalPage } from './pages/LegalPage'
import { MorePage } from './pages/MorePage'
import { TripSetupPage } from './pages/TripSetupPage'

export default function App() {
  // 앱 시작 시 익명 세션 확보 (Supabase 설정 시)
  useEffect(() => {
    void ensureSession()
  }, [])

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/setup" element={<TripSetupPage />} />
        <Route path="/trip/:id" element={<ItineraryPage />} />
        <Route path="/trip/:id/chat" element={<ChatPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/flights" element={<FlightsPage />} />
        <Route path="/hotels" element={<HotelsPage />} />
        <Route path="/deals" element={<DealsPage />} />
        <Route path="/more" element={<MorePage />} />
        <Route path="/legal/:doc" element={<LegalPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
