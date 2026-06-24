import { useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useDesktop } from './lib/useDesktop'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Iuran from './pages/Iuran'
import Lapor from './pages/Lapor'
import LaporanWarga from './pages/LaporanWarga'
import LaporanScurity from './pages/LaporanScurity'
import Tagihan from './pages/Tagihan'
import Profil from './pages/Profil'
import Lampiran from './pages/Lampiran'
import Warga from './pages/Warga'
import ProtectedRoute from './components/ProtectedRoute'
import PinScreen from './components/PinScreen'
import Sidebar from './components/Sidebar'
import BottomNav from './components/BottomNav'
import { pb } from './lib/pocketbase'

function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isDesktop = useDesktop()
  const location = useLocation()
  const hideSidebar = ['/login', '/register'].includes(location.pathname)

  if (hideSidebar) return children

  return (
    <>
      {isDesktop && <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} persistent={isDesktop} />}
      <div className="sidebar-page">
        {isDesktop && (
          <div className="sidebar-topbar">
            <button className="sidebar-toggle" onClick={() => setSidebarOpen(true)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M3 6h18M3 12h18M3 18h18" stroke="#0F1A14" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        )}
        {children}
      </div>
      {!isDesktop && <BottomNav />}
    </>
  )
}

function App() {
  return (
    <Routes>
      <Route 
        path="/" 
        element={
          pb.authStore.isValid ? 
            <Navigate to="/dashboard" replace /> : 
            <Navigate to="/login" replace />
        } 
      />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/pin" element={<ProtectedRoute><PinScreen /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
      <Route path="/iuran" element={<ProtectedRoute><AppLayout><Iuran /></AppLayout></ProtectedRoute>} />
      <Route path="/lapor" element={<ProtectedRoute><AppLayout><Lapor /></AppLayout></ProtectedRoute>} />
      <Route path="/laporan-warga" element={<ProtectedRoute><AppLayout><LaporanWarga /></AppLayout></ProtectedRoute>} />
      <Route path="/laporan-scurity" element={<ProtectedRoute><AppLayout><LaporanScurity /></AppLayout></ProtectedRoute>} />
      <Route path="/tagihan" element={<ProtectedRoute><AppLayout><Tagihan /></AppLayout></ProtectedRoute>} />
      <Route path="/lampiran" element={<ProtectedRoute><AppLayout><Lampiran /></AppLayout></ProtectedRoute>} />
      <Route path="/profil" element={<ProtectedRoute><AppLayout><Profil /></AppLayout></ProtectedRoute>} />
      <Route path="/warga" element={<ProtectedRoute><AppLayout><Warga /></AppLayout></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App