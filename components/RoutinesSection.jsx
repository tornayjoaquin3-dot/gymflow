import { useMemo, useState } from 'react'
import {
  buildRoutineShareText,
  getRoutineWhatsappUrl,
} from '../lib/routine-sharing'
import { normalizeText } from '../lib/student-utils'

function buildRoutineGroupKey(rutina) {
  return [
    rutina.nombre || '',
    rutina.objetivo || '',
    rutina.ejercicios || '',
    rutina.observaciones || '',
  ].join('::')
}

function getAssociatedAlumnoLabel(rutinaGroup) {
  if (rutinaGroup.alumnos.length > 1) {
    return 'Varios alumnos'
  }

  if (rutinaGroup.alumnos.length === 1) {
    return rutinaGroup.alumnos[0].nombre
  }

  return 'Sin alumno'
}

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
  const [expandedRoutineKey, setExpandedRoutineKey] = useState(null)

  const selectedAlumnoIds = nuevaRutina.alumno_ids?.length
    ? nuevaRutina.alumno_ids
    : nuevaRutina.alumno_id
      ? [nuevaRutina.alumno_id]
      : []

  const selectedAlumnos = useMemo(() => {
    return alumnos.filter((alumno) => selectedAlumnoIds.includes(alumno.id))
  }, [alumnos, selectedAlumnoIds])

  const filteredAlumnos = useMemo(() => {
    const normalizedSearch = normalizeText(studentSearchTerm)
    const hasEnoughChars = normalizedSearch.length >= 2

    if (!hasEnoughChars) {
      return []
    }

    return alumnos
      .filter((alumno) => !selectedAlumnoIds.includes(alumno.id))
      .filter((alumno) =>
        normalizeText(alumno.nombre).includes(normalizedSearch)
      )
      .slice(0, 8)
  }, [alumnos, selectedAlumnoIds, studentSearchTerm])

  const normalizedStudentSearch = normalizeText(studentSearchTerm)
  const shouldShowStudentResults = normalizedStudentSearch.length >= 2

  const groupedRutinas = useMemo(() => {
    const groupedMap = new Map()

    rutinas.forEach((rutina) => {
      const groupKey = buildRoutineGroupKey(rutina)

      if (!groupedMap.has(groupKey)) {
        groupedMap.set(groupKey, {
          key: groupKey,
          id: rutina.id,
          ids: [],
          alumno_id: rutina.alumno_id || '',
          alumno_ids: [],
          nombre: rutina.nombre,
          objetivo: rutina.objetivo,
          ejercicios: rutina.ejercicios,
          observaciones: rutina.observaciones,
          alumnos: [],
          telefono: rutina.alumnos?.telefono || '',
        })
      }

      const currentGroup = groupedMap.get(groupKey)
      currentGroup.ids.push(rutina.id)

      if (rutina.alumno_id && !currentGroup.alumno_ids.includes(rutina.alumno_id)) {
        currentGroup.alumno_ids.push(rutina.alumno_id)
      }

      if (
        rutina.alumnos?.nombre &&
        !currentGroup.alumnos.some((alumno) => alumno.id === rutina.alumno_id)
      ) {
        currentGroup.alumnos.push({
          id: rutina.alumno_id,
          nombre: rutina.alumnos.nombre,
          telefono: rutina.alumnos.telefono || '',
        })
      }
    })

    return [...groupedMap.values()]
  }, [rutinas])

  const filteredRutinas = useMemo(() => {
    const normalizedSearch = normalizeText(searchTerm)

    if (!normalizedSearch) {
      return groupedRutinas
    }

    return groupedRutinas.filter((rutina) => {
      const searchableText = normalizeText(
        [
          rutina.nombre,
          rutina.objetivo,
          rutina.ejercicios,
          rutina.alumnos.map((alumno) => alumno.nombre).join(' '),
        ]
          .filter(Boolean)
          .join(' ')
      )

      return searchableText.includes(normalizedSearch)
    })
  }, [groupedRutinas, searchTerm])

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
    const text = buildRoutineShareText(getAssociatedAlumnoLabel(rutina), rutina)

    try {
      await navigator.clipboard.writeText(text)
      setCopyFeedbackId(rutina.key)
      clearCopyFeedbackSoon()
    } catch (error) {
      setCopyFeedbackId(null)
    }
  }

  function handleShareRoutine(rutina) {
    const sharedPhone =
      rutina.alumnos.length === 1 ? rutina.alumnos[0].telefono : ''
    const url = getRoutineWhatsappUrl(
      getAssociatedAlumnoLabel(rutina),
      sharedPhone,
      rutina
    )

    window.open(url, '_blank', 'noopener,noreferrer')
  }

  function handleToggleRoutine(rutinaKey) {
    setExpandedRoutineKey((currentKey) =>
      currentKey === rutinaKey ? null : rutinaKey
    )
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

            {shouldShowStudentResults ? (
              <div className="routineSelectorResults">
                {filteredAlumnos.length > 0 ? (
                  filteredAlumnos.map((alumno) => (
                    <button
                      key={alumno.id}
                      type="button"
                      className="routineSelectorOption"
                      onClick={() => handleSelectAlumno(alumno)}
                    >
                      {alumno.nombre}
                    </button>
                  ))
                ) : (
                  <div className="routineSelectorEmpty">
                    No se encontraron alumnos.
                  </div>
                )}
              </div>
            ) : (
              <small className="routineHelperText">
                Busca un alumno para asociarlo a la rutina.
              </small>
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
                    x
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

      <div className="routineList">
        {filteredRutinas.length === 0 ? (
          <div className="empty">Todavia no hay rutinas cargadas.</div>
        ) : (
          filteredRutinas.map((rutina) => {
            const isExpanded = expandedRoutineKey === rutina.key

            return (
              <article
                key={rutina.key}
                className={`routineCard routineRowCard ${
                  isExpanded ? 'isExpanded' : ''
                }`}
                role="button"
                tabIndex={0}
                onClick={() => handleToggleRoutine(rutina.key)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    handleToggleRoutine(rutina.key)
                  }
                }}
              >
                <div className="routineRowSummary">
                  <div className="routineRowMain">
                    <strong>{rutina.nombre || 'Rutina sin nombre'}</strong>
                    <span>{getAssociatedAlumnoLabel(rutina)}</span>
                    {rutina.objetivo && (
                      <small>{rutina.objetivo}</small>
                    )}
                  </div>

                  <div
                    className="routineRowActions"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <button
                      type="button"
                      className="smallButton"
                      onClick={() => handleToggleRoutine(rutina.key)}
                    >
                      {isExpanded ? 'Ocultar' : 'Ver'}
                    </button>
                    <button
                      type="button"
                      className="smallButton"
                      onClick={() => editarRutina(rutina)}
                    >
                      Editar
                    </button>
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
                    <button
                      type="button"
                      className="smallButton dangerButton"
                      onClick={() => eliminarRutina(rutina.ids)}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>

                {copyFeedbackId === rutina.key && (
                  <small className="routineCopyFeedback">Rutina copiada</small>
                )}

                {isExpanded && (
                  <div className="routineExpandedContent">
                    {rutina.alumnos.length > 1 && (
                      <div className="routineExpandedMeta">
                        <span>Alumnos asociados</span>
                        <div className="routineSelectedChips">
                          {rutina.alumnos.map((alumno) => (
                            <span key={alumno.id} className="routineChip">
                              {alumno.nombre}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="routineExpandedMeta">
                      <span>Ejercicios</span>
                      <pre>{rutina.ejercicios || '-'}</pre>
                    </div>

                    {rutina.observaciones && (
                      <div className="routineExpandedMeta">
                        <span>Observaciones</span>
                        <p>{rutina.observaciones}</p>
                      </div>
                    )}
                  </div>
                )}
              </article>
            )
          })
        )}
      </div>
    </section>
  )
}
