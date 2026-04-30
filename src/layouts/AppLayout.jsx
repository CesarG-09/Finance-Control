import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';

const menuSections = [
  {
    title: 'General',
    items: [
      {
        label: 'Dashboard',
        description: 'Resumen financiero',
        path: '/dashboard',
        icon: 'D',
      },
      {
        label: 'Movimientos',
        description: 'Movimientos del mes',
        path: '/movimientos',
        icon: 'M',
      },
    ],
  },
  {
    title: 'Gestión',
    items: [
      {
        label: 'Cuentas',
        description: 'Activas e inactivas',
        path: '/cuentas',
        icon: 'C',
      },
      {
        label: 'Transacciones',
        description: 'Entradas y salidas',
        path: '/transacciones',
        icon: 'T',
      },
    ],
  },
];

function getUserDisplayName(clientProfile) {
  const firstName = clientProfile?.cl_first_name || '';
  const lastName = clientProfile?.cl_last_name || '';

  const fullName = `${firstName} ${lastName}`.trim();

  return fullName || 'Usuario';
}

function getInitials(clientProfile) {
  const firstName = clientProfile?.cl_first_name || '';
  const lastName = clientProfile?.cl_last_name || '';

  const firstInitial = firstName.charAt(0).toUpperCase();
  const lastInitial = lastName.charAt(0).toUpperCase();

  return `${firstInitial}${lastInitial}` || 'U';
}

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, clientProfile } = useAuth();

  const isTransactionsPage = location.pathname.startsWith('/transacciones');
  const isDashboardPage = location.pathname.startsWith('/dashboard');
  const isMovementsPage = location.pathname.startsWith('/movimientos');

  const isScrollablePage =
    isTransactionsPage || isDashboardPage || isMovementsPage;

  const userDisplayName = getUserDisplayName(clientProfile);
  const userInitials = getInitials(clientProfile);

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo">FC</div>

          <div>
            <h2>Finance Control</h2>
            <span>Personal Finance MVP</span>
          </div>

          <small>MVP</small>
        </div>

        <nav className="sidebar-nav" aria-label="Menú principal">
          {menuSections.map((section) => (
            <div className="sidebar-nav-section" key={section.title}>
              <p>{section.title}</p>

              <div className="sidebar-nav-links">
                {section.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `sidebar-link ${isActive ? 'active' : ''}`
                    }
                  >
                    <span className="sidebar-link-icon">{item.icon}</span>

                    <span className="sidebar-link-text">
                      <strong>{item.label}</strong>
                      <small>{item.description}</small>
                    </span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user-card">
            <div className="sidebar-user-avatar">{userInitials}</div>

            <div>
              <strong>{userDisplayName}</strong>
              <span>Perfil activo</span>
            </div>
          </div>

          <button
            type="button"
            className="sidebar-logout-button"
            onClick={handleLogout}
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main
        className={`main-content ${
          isScrollablePage ? 'scrollable-main-content' : ''
        } ${isTransactionsPage ? 'transactions-main-content' : ''}`}
      >
        <Outlet />
      </main>
    </div>
  );
}