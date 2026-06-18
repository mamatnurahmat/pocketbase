import { Navigate } from 'react-router-dom';
import { pb } from '../lib/pocketbase';

export default function ProtectedRoute({ children }) {
  if (!pb.authStore.isValid) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
