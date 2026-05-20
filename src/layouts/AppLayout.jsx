import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router';
import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

const menuSections = [
  {
    title: 'General',
    items: [
      {
        label: 'Dashboard',
        description: 'Resumen financiero',
        path: '/dashboard',
        icon: 'dashboard',
      },
      {
        label: 'Movimientos',
        description: 'Movimientos del mes',
        path: '/movimientos',
        icon: 'movements',
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
        icon: 'accounts',
      },
      {
        label: 'Transacciones',
        description: 'Entradas y salidas',
        path: '/transacciones',
        icon: 'transactions',
      },
    ],
  },
];

function SidebarIcon({ name }) {
  const icons = {
    dashboard: (
      <>
        <path d="M4 4h6v6H4z" />
        <path d="M14 4h6v6h-6z" />
        <path d="M4 14h6v6H4z" />
        <path d="M14 14h6v6h-6z" />
      </>
    ),
    movements: (
      <>
        <path d="M4 18V6" />
        <path d="M4 18h16" />
        <path d="M7 14l3-3 3 2 5-6" />
      </>
    ),
    accounts: (
      <>
        <path d="M4 7h16v12H4z" />
        <path d="M4 10h16" />
        <path d="M16 15h2" />
      </>
    ),
    transactions: (
      <>
        <path d="M7 7h13" />
        <path d="M17 4l3 3-3 3" />
        <path d="M17 17H4" />
        <path d="M7 14l-3 3 3 3" />
      </>
    ),
    logout: (
      <>
        <path d="M10 6V4h10v16H10v-2" />
        <path d="M4 12h11" />
        <path d="M12 9l3 3-3 3" />
      </>
    ),
  };

  return (
    <svg
      className="sidebar-svg-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {icons[name]}
    </svg>
  );
}

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
  const sidebarRef = useRef(null);

  const isTransactionsPage = location.pathname.startsWith('/transacciones');
  const isDashboardPage = location.pathname.startsWith('/dashboard');
  const isMovementsPage = location.pathname.startsWith('/movimientos');

  const isProfilePage = location.pathname.startsWith('/mi-perfil');

  const isScrollablePage =
    isTransactionsPage ||
    isDashboardPage ||
    isMovementsPage ||
    isProfilePage;

  const userDisplayName = getUserDisplayName(clientProfile);
  const userInitials = getInitials(clientProfile);

  useEffect(() => {
    const activeElement = document.activeElement;

    if (sidebarRef.current?.contains(activeElement)) {
      activeElement.blur();
    }
  }, [location.pathname]);

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="app-layout">
      <aside className="sidebar" ref={sidebarRef}>
        <div className="sidebar-top">
          <div className="sidebar-brand">
            <div className="sidebar-logo">FC</div>

            <div className="sidebar-brand-text">
              <h2>Finance Control</h2>
              <span>Personal Finance MVP</span>
            </div>

            <small>v1.0</small>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Menú principal">
          {menuSections.map((section) => (
            <div className="sidebar-nav-section" key={section.title}>
              <p className="sidebar-section-title">{section.title}</p>

              <div className="sidebar-nav-links">
                {section.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    title={item.label}
                    onClick={(event) => event.currentTarget.blur()}
                    className={({ isActive }) =>
                      `sidebar-link ${isActive ? 'active' : ''}`
                    }
                  >
                    <span className="sidebar-link-icon">
                      <SidebarIcon name={item.icon} />
                    </span>

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
          <button
            type="button"
            className="sidebar-user-card sidebar-user-card-button"
            title="Ir a mi perfil"
            onClick={(event) => {
              event.currentTarget.blur();
              navigate('/mi-perfil');
            }}
          >
            <div className="sidebar-user-avatar">{userInitials}</div>

            <div className="sidebar-user-info">
              <strong>{userDisplayName}</strong>
              <span>Perfil activo</span>
            </div>
          </button>

          <button
            type="button"
            className="sidebar-logout-button"
            onClick={(event) => {
              event.currentTarget.blur();
              handleLogout();
            }}
            title="Cerrar sesión"
          >
            <span className="sidebar-logout-icon">
              <SidebarIcon name="logout" />
            </span>
            <span className="sidebar-logout-text">Cerrar sesión</span>
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