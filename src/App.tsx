import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ensureSession } from './lib/supabase'
import { AdminPage } from './pages/AdminPage'
import { AirportPage } from './pages/AirportPage'
import { GearPage } from './pages/GearPage'
import { ChatPage } from './pages/ChatPage'
import { DealsPage } from './pages/DealsPage'
import { BusinessDealsPage } from './pages/BusinessDealsPage'
import { FlightsPage } from './pages/FlightsPage'
import { HotelsPage } from './pages/HotelsPage'
import { HomePage } from './pages/HomePage'
import { ReportPage } from './pages/ReportPage'
import { ItineraryPage } from './pages/ItineraryPage'
import { LegalPage } from './pages/LegalPage'
import { MorePage } from './pages/MorePage'
import { TipsPage } from './pages/TipsPage'
import { EditPage } from './pages/EditPage'
import { MapPage } from './pages/MapPage'
import { LedgerPage } from './pages/LedgerPage'
import { PackingPage } from './pages/PackingPage'
import { TalkPage } from './pages/TalkPage'
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
        <Route path="/trip/:id/report" element={<ReportPage />} />
        <Route path="/trip/:id/gear" element={<GearPage />} />
        <Route path="/trip/:id/airport" element={<AirportPage />} />
        <Route path="/trip/:id/tips" element={<TipsPage />} />
        <Route path="/trip/:id/edit" element={<EditPage />} />
        <Route path="/trip/:id/map" element={<MapPage />} />
        <Route path="/trip/:id/budget" element={<LedgerPage />} />
        <Route path="/trip/:id/packing" element={<PackingPage />} />
        <Route path="/trip/:id/talk" element={<TalkPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/flights" element={<FlightsPage />} />
        <Route path="/flights/deals" element={<BusinessDealsPage />} />
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
