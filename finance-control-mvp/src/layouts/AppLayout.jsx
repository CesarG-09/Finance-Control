import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, clientProfile } = useAuth();

  const isTransactionsPage = location.pathname.startsWith('/transacciones');

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <h2>Finance Control</h2>

        <nav>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/cuentas">Cuentas</Link>
          <Link to="/transacciones">Transacciones</Link>
          <Link to="/movimientos">Movimientos</Link>
        </nav>

        <div className="sidebar-footer">
          <p>{clientProfile?.cl_first_name || 'Usuario'}</p>

          <button type="button" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main
        className={`main-content ${isTransactionsPage ? 'transactions-main-content' : ''}`}
      >
        <Outlet />
      </main>
    </div>
  );
}