import { NavLink, Outlet, useLocation } from 'react-router-dom'

const navItems = [
  { to: '/activos', icon: '⚙️', label: 'Activos' },
]

export default function Layout() {
  const location = useLocation()

  const getPageTitle = () => {
    const path = location.pathname
    if (path === '/activos/nuevo') return { title: 'Nuevo Activo', subtitle: 'Registrar un nuevo activo en el sistema' }
    if (path.endsWith('/editar')) return { title: 'Editar Activo', subtitle: 'Modificar datos del activo' }
    if (path.match(/^\/activos\/[^/]+$/)) return { title: 'Detalle de Activo', subtitle: 'Información completa del activo' }
    return { title: 'Gestión de Activos', subtitle: 'Administra los activos del sistema de mantenimiento' }
  }

  const { title, subtitle } = getPageTitle()

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🔧</div>
          <div>
            <h1>CMMS</h1>
            <span>Mantenimiento</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <span className="sidebar-link-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid var(--border-color)',
          fontSize: '11px',
          color: 'var(--text-muted)'
        }}>
          CMMS v1.0.0
        </div>
      </aside>

      {/* Main */}
      <main className="main-content">
        <header className="topbar">
          <div>
            <div className="topbar-title">{title}</div>
            <div className="topbar-subtitle">{subtitle}</div>
          </div>
        </header>

        <div className="page-content animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
