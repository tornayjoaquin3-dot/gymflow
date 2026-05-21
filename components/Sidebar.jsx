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
        <h2>GymFlow</h2>
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
