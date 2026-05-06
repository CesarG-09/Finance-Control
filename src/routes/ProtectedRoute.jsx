import { Navigate } from 'react-router';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, requireProfile = true }) {
  const { user, clientProfile, loading } = useAuth();

  if (loading) {
    return <p>Cargando...</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (clientProfile && !clientProfile.cl_is_active) {
    return <Navigate to="/login" replace />;
  }

  if (requireProfile && !clientProfile) {
    return <Navigate to="/perfil" replace />;
  }

  if (!requireProfile && clientProfile) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}