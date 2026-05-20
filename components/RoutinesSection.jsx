import { useMemo, useState } from 'react'
import {
  buildRoutineShareText,
  getRoutineWhatsappUrl,
} from '../lib/routine-sharing'
import { normalizeText } from '../lib/student-utils'

export default function RoutinesSection({
  alumnos,
  rutinas,
  nuevaRutina,
  setNuevaRutina,
  crearRutina,
  editingRutinaId,
  editarRutina,
  cancelarEdicionRutina,
  eliminarRutina,
}) {
  const [copyFeedbackId, setCopyFeedbackId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [studentSearchTerm, setStudentSearchTerm] = useState('')

  const selectedAlumnoIds = nuevaRutina.alumno_ids?.length
    ? nuevaRutina.alumno_ids
    : nuevaRutina.alumno_id
      ? [nuevaRutina.alumno_id]
      : []

  const selectedAlumnos = useMemo(() => {
    return alumnos.filter((alumno) => selectedAlumnoIds.includes(alumno.id))
  }, [alumnos, selectedAlumnoIds])

  const filteredRutinas = useMemo(() => {
    const normalizedSearch = normalizeText(searchTerm)

    if (!normalizedSearch) {
      return rutinas
    }

    return rutinas.filter((rutina) => {
      const searchableText = normalizeText(
        [
          rutina.alumnos?.nombre,
          rutina.nombre,
          rutina.objetivo,
          rutina.ejercicios,
        ]
          .filter(Boolean)
          .join(' ')
      )

      return searchableText.includes(normalizedSearch)
    })
  }, [rutinas, searchTerm])

  const filteredAlumnos = useMemo(() => {
    const normalizedSearch = normalizeText(studentSearchTerm)

    return alumnos
      .filter((alumno) => !selectedAlumnoIds.includes(alumno.id))
      .filter((alumno) => {
        if (!normalizedSearch) {
          return true
        }

        return normalizeText(alumno.nombre).includes(normalizedSearch)
      })
      .slice(0, 8)
  }, [alumnos, selectedAlumnoIds, studentSearchTerm])

  function updateSelectedAlumnoIds(nextAlumnoIds) {
    setNuevaRutina({
      ...nuevaRutina,
      alumno_ids: nextAlumnoIds,
      alumno_id: nextAlumnoIds[0] || '',
    })
  }

  function handleSelectAlumno(alumno) {
    updateSelectedAlumnoIds([...selectedAlumnoIds, alumno.id])
    setStudentSearchTerm('')
  }

  function handleRemoveAlumno(alumnoId) {
    updateSelectedAlumnoIds(
      selectedAlumnoIds.filter((selectedId) => selectedId !== alumnoId)
    )
  }

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
        <p>Espacio rapido para crear, duplicar y compartir rutinas.</p>
      </div>

      <div className="studentsSearchBar routineSearchBarTop">
        <input
          placeholder="Buscar rutina..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      </div>

      <form onSubmit={crearRutina} className="routineForm routineFormCompact">
        <div className="routineFormBlock routineSelectorBlock">
          <span>Alumnos</span>

          <div className="routineSelectorField">
            <input
              placeholder="Buscar alumno para asociar"
              value={studentSearchTerm}
              onChange={(event) => setStudentSearchTerm(event.target.value)}
            />

            {filteredAlumnos.length > 0 && (
              <div className="routineSelectorResults">
                {filteredAlumnos.map((alumno) => (
                  <button
                    key={alumno.id}
                    type="button"
                    className="routineSelectorOption"
                    onClick={() => handleSelectAlumno(alumno)}
                  >
                    {alumno.nombre}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="routineSelectedChips">
            {selectedAlumnos.length > 0 ? (
              selectedAlumnos.map((alumno) => (
                <span key={alumno.id} className="routineChip">
                  {alumno.nombre}
                  <button
                    type="button"
                    onClick={() => handleRemoveAlumno(alumno.id)}
                  >
                    ×
                  </button>
                </span>
              ))
            ) : (
              <small className="routineHelperText">
                Sin alumnos asociados. Se intentara guardar sin asignacion si tu
                esquema actual lo permite.
              </small>
            )}
          </div>
        </div>

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

        <div className="routineFormActions">
          <button className="routineSubmitButton">
            {editingRutinaId ? 'Guardar cambios' : 'Crear rutina'}
          </button>

          {editingRutinaId && (
            <button
              type="button"
              className="smallButton"
              onClick={cancelarEdicionRutina}
            >
              Cancelar edicion
            </button>
          )}
        </div>
      </form>

      <div className="routineGrid routineGridCompact">
        {filteredRutinas.length === 0 ? (
          <div className="empty">Todavia no hay rutinas cargadas.</div>
        ) : (
          filteredRutinas.map((rutina) => (
            <article className="routineCard routineCardCompact" key={rutina.id}>
              <div className="routineCardTop">
                <span>{rutina.alumnos?.nombre || 'Sin alumno'}</span>
                <h3>{rutina.nombre}</h3>
              </div>

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

              <pre>{rutina.ejercicios || '-'}</pre>

              {rutina.observaciones && (
                <p>
                  <b>Observaciones:</b> {rutina.observaciones}
                </p>
              )}

              <div className="buttonGroup">
                <button
                  type="button"
                  className="smallButton"
                  onClick={() => editarRutina(rutina)}
                >
                  Editar
                </button>

                <button
                  type="button"
                  className="smallButton dangerButton"
                  onClick={() => eliminarRutina(rutina.id)}
                >
                  Eliminar rutina
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  )
}
