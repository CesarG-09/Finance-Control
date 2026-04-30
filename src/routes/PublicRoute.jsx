import { Navigate } from 'react-router';
import { useAuth } from '../context/AuthContext';

export default function PublicRoute({ children }) {
  const { user, clientProfile, loading } = useAuth();

  if (loading) {
    return <p>Cargando...</p>;
  }

  if (user && clientProfile) {
    return <Navigate to="/dashboard" replace />;
  }

  if (user && !clientProfile) {
    return <Navigate to="/perfil" replace />;
  }

  return children;
}