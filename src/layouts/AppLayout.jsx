import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { useState } from 'react';
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

  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

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

  function handleToggleSidebar() {
    setIsSidebarExpanded((currentValue) => !currentValue);
  }

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div
      className={`app-layout ${
        isSidebarExpanded ? 'sidebar-expanded-layout' : 'sidebar-collapsed-layout'
      }`}
    >
      <aside
        className={`sidebar ${
          isSidebarExpanded ? 'sidebar-expanded' : 'sidebar-collapsed'
        }`}
      >
        <div className="sidebar-top">
          <button
            type="button"
            className="sidebar-toggle-button"
            onClick={handleToggleSidebar}
            aria-label={
              isSidebarExpanded ? 'Contraer menú lateral' : 'Expandir menú lateral'
            }
            title={
              isSidebarExpanded ? 'Contraer menú lateral' : 'Expandir menú lateral'
            }
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

          <div className="sidebar-brand">
            <div className="sidebar-logo">FC</div>

            <div className="sidebar-brand-text">
              <h2>Finance Control</h2>
              <span>Personal Finance MVP</span>
            </div>

            <small>MVP</small>
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
                    className={({ isActive }) =>
                      `sidebar-link ${isActive ? 'active' : ''}`
                    }
                  >
                    <span className="sidebar-link-icon">
                      {item.icon}

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
            onClick={() => navigate('/mi-perfil')}
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
            onClick={handleLogout}
            title="Cerrar sesión"
          >
            <span className="sidebar-logout-icon">S</span>
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