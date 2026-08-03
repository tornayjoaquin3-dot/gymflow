import { APP_CONFIG } from '../lib/app-config'

export default function Sidebar({
  isProfesor,
  activeSection,
  setActiveSection,
  isOpen = false,
  onClose,
}) {
  function handleNavigate(section) {
    setActiveSection(section)
    onClose?.()
  }

  return (
    <aside className={`sidebar${isOpen ? ' isOpen' : ''}`}>
      <div className="sidebarHeader">
        <div className="sidebarOrgBrand">
          {APP_CONFIG.organizationLogo ? (
            <img
              src={APP_CONFIG.organizationLogo}
              alt={APP_CONFIG.organizationName}
              className="sidebarOrgLogo"
            />
          ) : null}
          <h2>{APP_CONFIG.softwareName}</h2>
          <p
            className="sidebarOrgName"
            style={{ color: APP_CONFIG.organizationPrimaryColor }}
          >
            {APP_CONFIG.organizationName}
          </p>
        </div>
        <button
          type="button"
          className="sidebarCloseButton"
          onClick={onClose}
          aria-label="Cerrar menu"
        >
          ×
        </button>
      </div>

      <div className="sidebarNav">
        {!isProfesor && (
          <button
            className={activeSection === 'dashboard' ? 'activeMenu' : ''}
            onClick={() => handleNavigate('dashboard')}
          >
            Dashboard
          </button>
        )}

        <button
          className={activeSection === 'alumnos' ? 'activeMenu' : ''}
          onClick={() => handleNavigate('alumnos')}
        >
          Alumnos
        </button>

        <button
          className={activeSection === 'rutinas' ? 'activeMenu' : ''}
          onClick={() => handleNavigate('rutinas')}
        >
          Rutinas
        </button>

        <button
          className={activeSection === 'turnos' ? 'activeMenu' : ''}
          onClick={() => handleNavigate('turnos')}
        >
          Turnos
        </button>

        <button
          className={activeSection === 'asistencia' ? 'activeMenu' : ''}
          onClick={() => handleNavigate('asistencia')}
        >
          Asistencia
        </button>

        {!isProfesor && (
          <>
            <button
              className={activeSection === 'costos' ? 'activeMenu' : ''}
              onClick={() => handleNavigate('costos')}
            >
              Costos
            </button>

            <button
              className={activeSection === 'importar' ? 'activeMenu' : ''}
              onClick={() => handleNavigate('importar')}
            >
              Importar Excel
            </button>
          </>
        )}
      </div>
    </aside>
  )
}
