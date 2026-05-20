export default function Sidebar({ isProfesor, activeSection, setActiveSection }) {
  return (
    <aside className="sidebar">
      <h2>GymFlow</h2>

      {!isProfesor && (
        <button
          className={activeSection === 'dashboard' ? 'activeMenu' : ''}
          onClick={() => setActiveSection('dashboard')}
        >
          Dashboard
        </button>
      )}

      <button
        className={activeSection === 'alumnos' ? 'activeMenu' : ''}
        onClick={() => setActiveSection('alumnos')}
      >
        Alumnos
      </button>

      <button
        className={activeSection === 'rutinas' ? 'activeMenu' : ''}
        onClick={() => setActiveSection('rutinas')}
      >
        Rutinas
      </button>

      {!isProfesor && (
        <>
          <button
            className={activeSection === 'costos' ? 'activeMenu' : ''}
            onClick={() => setActiveSection('costos')}
          >
            Costos
          </button>

          <button
            className={activeSection === 'importar' ? 'activeMenu' : ''}
            onClick={() => setActiveSection('importar')}
          >
            Importar Excel
          </button>
        </>
      )}
    </aside>
  )
}
