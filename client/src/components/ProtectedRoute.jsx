import { Navigate, useLocation } from 'react-router-dom';
import { pb } from '../lib/pocketbase';
import { useIdleTimer } from './IdleTimer';

export default function ProtectedRoute({ children }) {
  const location = useLocation();
  const { locked } = useIdleTimer();

  if (!pb.authStore.isValid) {
    return <Navigate to="/login" replace />;
  }

  // Redirect ke PIN jika terkunci, kecuali sudah di halaman PIN
  if (locked && location.pathname !== '/pin') {
    return <Navigate to="/pin" replace />;
  }

  return children;
}
