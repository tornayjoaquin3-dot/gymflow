import { useEffect, useMemo, useRef, useState } from 'react'
import {
  buildRoutineShareText,
  getRoutineWhatsappUrl,
} from '../lib/routine-sharing'
import { normalizeText } from '../lib/student-utils'
import EjerciciosEditor from './EjerciciosEditor'

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

function formatStudentCount(count) {
  if (count === 0) return 'Sin alumnos asociados'
  if (count === 1) return '1 alumno'
  return `${count} alumnos`
}

function formatUltimaEdicion(fechaIso) {
  if (!fechaIso) return null

  const fecha = new Date(fechaIso)

  if (Number.isNaN(fecha.getTime())) return null

  const diffDias = Math.floor((Date.now() - fecha.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDias <= 0) return 'Editada hoy'
  if (diffDias === 1) return 'Editada ayer'
  if (diffDias < 30) return `Editada hace ${diffDias} dias`

  const diffMeses = Math.floor(diffDias / 30)

  if (diffMeses < 12) {
    return `Editada hace ${diffMeses} ${diffMeses === 1 ? 'mes' : 'meses'}`
  }

  const diffAnios = Math.floor(diffMeses / 12)
  return `Editada hace ${diffAnios} ${diffAnios === 1 ? 'ano' : 'anos'}`
}

const EMPTY_FORM_KEYS = ['nombre', 'objetivo', 'ejercicios', 'observaciones']

function isFormEmpty(nuevaRutina) {
  return (
    EMPTY_FORM_KEYS.every((key) => !nuevaRutina[key]) &&
    (nuevaRutina.alumno_ids?.length ?? 0) === 0
  )
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
  duplicarRutina,
  ejerciciosEditorResetKey,
}) {
  const [copyFeedback, setCopyFeedback] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [studentSearchTerm, setStudentSearchTerm] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const hasSubmittedNewRoutine = useRef(false)

  // Despues de crear una rutina nueva con exito, page.js vacia nuevaRutina y
  // limpia editingRutinaId (mismo comportamiento de siempre). Detectamos eso
  // para volver el panel al estado vacio en vez de dejar el formulario
  // abierto y en blanco. El flag evita confundir esto con el formulario
  // recien abierto (tambien arranca vacio).
  useEffect(() => {
    if (
      isCreating &&
      !editingRutinaId &&
      isFormEmpty(nuevaRutina) &&
      hasSubmittedNewRoutine.current
    ) {
      hasSubmittedNewRoutine.current = false
      setIsCreating(false)
    }
  }, [isCreating, editingRutinaId, nuevaRutina])

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
          creado_en: rutina.creado_en || null,
        })
      }

      const currentGroup = groupedMap.get(groupKey)
      currentGroup.ids.push(rutina.id)

      if (rutina.creado_en && (!currentGroup.creado_en || rutina.creado_en > currentGroup.creado_en)) {
        currentGroup.creado_en = rutina.creado_en
      }

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
        [rutina.nombre, rutina.objetivo, rutina.ejercicios]
          .filter(Boolean)
          .join(' ')
      )

      return searchableText.includes(normalizedSearch)
    })
  }, [groupedRutinas, searchTerm])

  const selectedGroup = useMemo(() => {
    if (!editingRutinaId) return null
    return groupedRutinas.find((rutina) => rutina.ids.includes(editingRutinaId)) || null
  }, [groupedRutinas, editingRutinaId])

  const isFormOpen = isCreating || Boolean(editingRutinaId)

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

  function handleSelectRoutine(rutina) {
    hasSubmittedNewRoutine.current = false
    setIsCreating(false)
    setStudentSearchTerm('')
    editarRutina(rutina)
  }

  function handleStartNew() {
    hasSubmittedNewRoutine.current = false
    cancelarEdicionRutina()
    setStudentSearchTerm('')
    setIsCreating(true)
  }

  function handleCloseForm() {
    hasSubmittedNewRoutine.current = false
    cancelarEdicionRutina()
    setStudentSearchTerm('')
    setIsCreating(false)
  }

  function handleSubmit(event) {
    if (isCreating && !editingRutinaId) {
      hasSubmittedNewRoutine.current = true
    }
    crearRutina(event)
  }

  function clearCopyFeedbackSoon() {
    window.setTimeout(() => {
      setCopyFeedback(false)
    }, 1800)
  }

  async function handleCopyRoutine() {
    if (!selectedGroup) return

    const text = buildRoutineShareText(getAssociatedAlumnoLabel(selectedGroup), selectedGroup)

    try {
      await navigator.clipboard.writeText(text)
      setCopyFeedback(true)
      clearCopyFeedbackSoon()
    } catch (error) {
      setCopyFeedback(false)
    }
  }

  function handleShareRoutine() {
    if (!selectedGroup) return

    const sharedPhone =
      selectedGroup.alumnos.length === 1 ? selectedGroup.alumnos[0].telefono : ''
    const url = getRoutineWhatsappUrl(
      getAssociatedAlumnoLabel(selectedGroup),
      sharedPhone,
      selectedGroup
    )

    window.open(url, '_blank', 'noopener,noreferrer')
  }

  function handleDelete() {
    if (!selectedGroup) return
    eliminarRutina(selectedGroup.ids)
  }

  return (
    <section className="section routinesSection">
      <div className="sectionHeader">
        <h2>Rutinas</h2>
      </div>

      <div className="routinesLayout">
        <aside className="routinesListPanel">
          <div className="studentsSearchBar routineSearchBarTop">
            <input
              placeholder="Buscar rutina..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>

          <div className="routineList">
            {filteredRutinas.length === 0 ? (
              <div className="studentsTableEmpty">
                {searchTerm ? 'No se encontraron rutinas.' : 'Todavia no hay rutinas cargadas.'}
              </div>
            ) : (
              filteredRutinas.map((rutina) => {
                const isSelected = Boolean(editingRutinaId) && rutina.ids.includes(editingRutinaId)
                const ultimaEdicion = formatUltimaEdicion(rutina.creado_en)

                return (
                  <button
                    key={rutina.key}
                    type="button"
                    className={`routineCard${isSelected ? ' isSelected' : ''}`}
                    onClick={() => handleSelectRoutine(rutina)}
                  >
                    <strong>{rutina.nombre || 'Rutina sin nombre'}</strong>

                    {rutina.objetivo && (
                      <div className="routineCardObjetivo">
                        <span>Objetivo</span>
                        <p>{rutina.objetivo}</p>
                      </div>
                    )}

                    <div className="routineCardFooter">
                      <span>{formatStudentCount(rutina.alumnos.length)}</span>
                      {ultimaEdicion && <span>{ultimaEdicion}</span>}
                    </div>
                  </button>
                )
              })
            )}
          </div>

          <button type="button" className="routineNewButton" onClick={handleStartNew}>
            + Nueva rutina
          </button>
        </aside>

        <div className="routinesDetailPanel">
          {!isFormOpen ? (
            <div className="routineEmptyState">
              <p>Selecciona una rutina para visualizarla o editarla.</p>
              <button type="button" className="routineSubmitButton" onClick={handleStartNew}>
                Nueva rutina
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="routineForm">
              <div className="routineFormTopBar">
                {editingRutinaId && (
                  <div className="routineFormTopBarActions">
                    <button type="button" className="smallButton" onClick={handleShareRoutine}>
                      Compartir
                    </button>
                    <button type="button" className="smallButton" onClick={handleCopyRoutine}>
                      Copiar
                    </button>
                    {copyFeedback && <span className="routineCopyFeedback">Copiada</span>}
                  </div>
                )}

                <button
                  type="button"
                  className="routineCloseButton"
                  onClick={handleCloseForm}
                  aria-label="Cerrar"
                >
                  ×
                </button>
              </div>

              <label className="routineFormField">
                <span>Nombre</span>
                <input
                  placeholder="Nombre de la rutina"
                  value={nuevaRutina.nombre}
                  onChange={(e) =>
                    setNuevaRutina({
                      ...nuevaRutina,
                      nombre: e.target.value,
                    })
                  }
                />
              </label>

              <label className="routineFormField">
                <span>Objetivo</span>
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
              </label>

              <EjerciciosEditor
                key={editingRutinaId ? `editar-${editingRutinaId}` : `nueva-${ejerciciosEditorResetKey}`}
                value={nuevaRutina.ejercicios}
                onChange={(ejercicios) =>
                  setNuevaRutina({
                    ...nuevaRutina,
                    ejercicios,
                  })
                }
              />

              <label className="routineFormField">
                <span>Observaciones</span>
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
              </label>

              <div className="routineFormField">
                <span>Alumnos asociados</span>

                <div className="routineSelectorField">
                  <input
                    placeholder="Buscar alumno"
                    value={studentSearchTerm}
                    onChange={(event) => setStudentSearchTerm(event.target.value)}
                  />

                  {shouldShowStudentResults && (
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
                  )}
                </div>

                {selectedAlumnos.length > 0 && (
                  <div className="routineSelectedChips">
                    {selectedAlumnos.map((alumno) => (
                      <span key={alumno.id} className="routineChip">
                        {alumno.nombre}
                        <button
                          type="button"
                          onClick={() => handleRemoveAlumno(alumno.id)}
                        >
                          x
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="routineFormActions">
                {editingRutinaId ? (
                  <>
                    <button className="routineSubmitButton">Guardar cambios</button>
                    <button type="button" className="smallButton" onClick={duplicarRutina}>
                      Duplicar
                    </button>
                    <button
                      type="button"
                      className="smallButton dangerButton"
                      onClick={handleDelete}
                    >
                      Eliminar
                    </button>
                  </>
                ) : (
                  <>
                    <button className="routineSubmitButton">Crear rutina</button>
                    <button type="button" className="smallButton" onClick={handleCloseForm}>
                      Cancelar
                    </button>
                  </>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
