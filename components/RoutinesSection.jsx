import { useState } from 'react'
import {
  buildRoutineShareText,
  getRoutineWhatsappUrl,
} from '../lib/routine-sharing'

export default function RoutinesSection({
  alumnos,
  rutinas,
  nuevaRutina,
  setNuevaRutina,
  crearRutina,
  eliminarRutina,
}) {
  const [copyFeedbackId, setCopyFeedbackId] = useState(null)

  function clearCopyFeedbackSoon() {
    window.setTimeout(() => {
      setCopyFeedbackId(null)
    }, 1800)
  }

  async function handleCopyRoutine(rutina) {
    const text = buildRoutineShareText(rutina.alumnos?.nombre, rutina)

    try {
      await navigator.clipboard.writeText(text)
      setCopyFeedbackId(rutina.id)
      clearCopyFeedbackSoon()
    } catch (error) {
      setCopyFeedbackId(null)
    }
  }

  function handleShareRoutine(rutina) {
    const url = getRoutineWhatsappUrl(
      rutina.alumnos?.nombre,
      rutina.alumnos?.telefono,
      rutina
    )

    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <section className="section">
      <div className="sectionHeader">
        <h2>Rutinas</h2>
        <p>Los profesores pueden crear y visualizar rutinas.</p>
      </div>

      <form onSubmit={crearRutina} className="routineForm">
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

        <button>Crear rutina</button>
      </form>

      <div className="routineGrid">
        {rutinas.length === 0 ? (
          <div className="empty">Todavía no hay rutinas cargadas.</div>
        ) : (
          rutinas.map((rutina) => (
            <article className="routineCard" key={rutina.id}>
              <span>{rutina.alumnos?.nombre || 'Sin alumno'}</span>
              <h3>{rutina.nombre}</h3>

              <div className="routineActionRow">
                <button
                  type="button"
                  className="routineShareButton routineShareButtonPrimary"
                  onClick={() => handleShareRoutine(rutina)}
                >
                  Compartir
                </button>
                <button
                  type="button"
                  className="routineShareButton"
                  onClick={() => handleCopyRoutine(rutina)}
                >
                  Copiar
                </button>
                {copyFeedbackId === rutina.id && (
                  <small className="routineCopyFeedback">Rutina copiada</small>
                )}
              </div>

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

              <button
                className="smallButton dangerButton"
                onClick={() => eliminarRutina(rutina.id)}
              >
                Eliminar rutina
              </button>
            </article>
          ))
        )}
      </div>
    </section>
  )
}
