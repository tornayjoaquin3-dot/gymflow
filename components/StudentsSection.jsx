export default function StudentsSection({
  alumnos,
  nuevoAlumno,
  setNuevoAlumno,
  crearAlumno,
  eliminarAlumno,
  setSelectedAlumnoId,
  setActiveSection,
}) {
  return (
    <section className="section">
      <div className="sectionHeader">
        <h2>Alumnos</h2>
        <p>Alta y listado de alumnos.</p>
      </div>

      <form onSubmit={crearAlumno} className="studentForm">
        <input
          placeholder="Nombre completo"
          value={nuevoAlumno.nombre}
          onChange={(e) =>
            setNuevoAlumno({ ...nuevoAlumno, nombre: e.target.value })
          }
        />

        <input
          placeholder="Teléfono"
          value={nuevoAlumno.telefono}
          onChange={(e) =>
            setNuevoAlumno({ ...nuevoAlumno, telefono: e.target.value })
          }
        />

        <input
          placeholder="Observaciones"
          value={nuevoAlumno.observaciones}
          onChange={(e) =>
            setNuevoAlumno({
              ...nuevoAlumno,
              observaciones: e.target.value,
            })
          }
        />

        <button>Crear alumno</button>
      </form>

      <div className="simpleList">
        {alumnos.length === 0 ? (
          <div className="empty">Todavía no hay alumnos cargados.</div>
        ) : (
          alumnos.map((alumno) => (
            <article key={alumno.id} className="listCard">
              <h3>{alumno.nombre}</h3>
              <p>Teléfono: {alumno.telefono || '-'}</p>
              <p>Estado: {alumno.estado || 'activo'}</p>
              <p>Observaciones: {alumno.observaciones || '-'}</p>

              <div className="buttonGroup">
                <button
                  className="smallButton"
                  onClick={() => {
                    setSelectedAlumnoId(alumno.id)
                    setActiveSection('fichaAlumno')
                  }}
                >
                  Ver ficha
                </button>

                <button
                  className="smallButton dangerButton"
                  onClick={() => eliminarAlumno(alumno.id)}
                >
                  Eliminar
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  )
}
