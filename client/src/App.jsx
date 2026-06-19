import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Iuran from './pages/Iuran'
import Lapor from './pages/Lapor'
import Tagihan from './pages/Tagihan'
import Profil from './pages/Profil'
import ProtectedRoute from './components/ProtectedRoute'
import { pb } from './lib/pocketbase'

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
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/iuran" element={<ProtectedRoute><Iuran /></ProtectedRoute>} />
      <Route path="/lapor" element={<ProtectedRoute><Lapor /></ProtectedRoute>} />
      <Route path="/tagihan" element={<ProtectedRoute><Tagihan /></ProtectedRoute>} />
      <Route path="/profil" element={<ProtectedRoute><Profil /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
