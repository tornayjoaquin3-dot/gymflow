export default function RoutinesSection({
  alumnos,
  rutinas,
  nuevaRutina,
  setNuevaRutina,
  guardarRutina,
  rutinaEditandoId,
  editarRutina,
  cancelarEdicionRutina,
  eliminarRutina,
}) {
  return (
    <section className="section">
      <div className="sectionHeader">
        <h2>Rutinas</h2>
        <p>
          {rutinaEditandoId
            ? 'Editando datos de la rutina.'
            : 'Los profesores pueden crear y visualizar rutinas.'}
        </p>
      </div>

      <form onSubmit={guardarRutina} className="routineForm">
        <select
          value={nuevaRutina.alumno_id}
          onChange={(e) =>
            setNuevaRutina({
              ...nuevaRutina,
              alumno_id: e.target.value,
            })
          }
        >
          <option value="">Seleccionar alumno</option>

          {alumnos.map((alumno) => (
            <option key={alumno.id} value={alumno.id}>
              {alumno.nombre}
            </option>
          ))}
        </select>

        <input
          placeholder="Nombre rutina"
          value={nuevaRutina.nombre}
          onChange={(e) =>
            setNuevaRutina({
              ...nuevaRutina,
              nombre: e.target.value,
            })
          }
        />

        <input
          placeholder="Objetivo"
          value={nuevaRutina.objetivo}
          onChange={(e) =>
            setNuevaRutina({
              ...nuevaRutina,
              objetivo: e.target.value,
            })
          }
        />

        <textarea
          placeholder="Ejercicios"
          value={nuevaRutina.ejercicios}
          onChange={(e) =>
            setNuevaRutina({
              ...nuevaRutina,
              ejercicios: e.target.value,
            })
          }
        />

        <textarea
          placeholder="Observaciones"
          value={nuevaRutina.observaciones}
          onChange={(e) =>
            setNuevaRutina({
              ...nuevaRutina,
              observaciones: e.target.value,
            })
          }
        />

        <button>
          {rutinaEditandoId ? 'Guardar cambios' : 'Crear rutina'}
        </button>

        {rutinaEditandoId && (
          <button
            type="button"
            className="secondaryButton"
            onClick={cancelarEdicionRutina}
          >
            Cancelar edición
          </button>
        )}
      </form>

      <div className="routineGrid">
        {rutinas.length === 0 ? (
          <div className="empty">Todavía no hay rutinas cargadas.</div>
        ) : (
          rutinas.map((rutina) => (
            <article className="routineCard" key={rutina.id}>
              <span>{rutina.alumnos?.nombre || 'Sin alumno'}</span>
              <h3>{rutina.nombre}</h3>

              <p>
                <b>Objetivo:</b> {rutina.objetivo || '-'}
              </p>

              <p>
                <b>Ejercicios:</b>
              </p>

              <pre>{rutina.ejercicios || '-'}</pre>

              {rutina.observaciones && (
                <p>
                  <b>Observaciones:</b> {rutina.observaciones}
                </p>
              )}

              <div className="buttonGroup">
                <button
                  className="smallButton"
                  onClick={() => editarRutina(rutina)}
                >
                  Editar
                </button>

                <button
                  className="smallButton dangerButton"
                  onClick={() => eliminarRutina(rutina.id)}
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
