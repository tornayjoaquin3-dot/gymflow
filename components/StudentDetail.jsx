import { useMemo, useState } from 'react'
import StudentStatusBadge from './StudentStatusBadge'
import {
  buildRoutineShareText,
  getRoutineWhatsappUrl,
} from '../lib/routine-sharing'

const ROUTINE_TITLE_PATTERNS = [
  /^dia\s*\d+/i,
  /^activacion\b/i,
  /^core\b/i,
  /^bloque\b/i,
  /^semana\b/i,
  /^observaciones\b/i,
]

function normalizeRoutineLine(line) {
  return String(line || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function isRoutineHeading(line) {
  const normalizedLine = normalizeRoutineLine(line)
  return ROUTINE_TITLE_PATTERNS.some((pattern) => pattern.test(normalizedLine))
}

function parseExerciseLine(line) {
  const normalizedLine = String(line || '')
    .replace(/\t+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()

  const seriesMatch = normalizedLine.match(
    /(\d+\s*[xX]\s*\d+(?:\s*[xX]\s*\d+)?(?:\s*(?:seg|min|rep|reps|series))?)(?:\s+|$)/i
  )

  if (!seriesMatch) {
    return null
  }

  const series = seriesMatch[1].trim()
  const beforeSeries = normalizedLine.slice(0, seriesMatch.index).trim()
  const afterSeries = normalizedLine
    .slice((seriesMatch.index || 0) + seriesMatch[0].length)
    .trim()
  const ejercicio = beforeSeries.replace(/[-:]+$/, '').trim()

  if (!ejercicio) {
    return null
  }

  let peso = '-'
  const weightMatch = afterSeries.match(
    /((?:c\/)?\s*\d+(?:[.,]\d+)?\s*(?:kg|kgs|k|lb|lbs|%)|(?:carga|peso)\s*:?\s*[^,.;]+)/i
  )

  if (weightMatch) {
    peso = weightMatch[1].trim()
  }

  return { ejercicio, series, peso }
}

function buildRoutineBlocks(routineText) {
  const lines = String(routineText || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  const blocks = []
  let exerciseRows = []

  function flushExerciseRows() {
    if (!exerciseRows.length) return
    blocks.push({
      type: 'exerciseTable',
      rows: exerciseRows,
    })
    exerciseRows = []
  }

  lines.forEach((line) => {
    if (isRoutineHeading(line)) {
      flushExerciseRows()
      blocks.push({
        type: 'heading',
        text: line,
      })
      return
    }

    const exerciseLine = parseExerciseLine(line)

    if (exerciseLine) {
      exerciseRows.push(exerciseLine)
      return
    }

    flushExerciseRows()
    blocks.push({
      type: 'text',
      text: line,
    })
  })

  flushExerciseRows()

  return blocks
}

export default function StudentDetail({
  selectedAlumno,
  pagosDelAlumno,
  rutinasDelAlumno,
  currentRoutineMeta,
  paymentSnapshot,
  isMobileDetail = false,
  onBackToList,
  onEditAlumno,
  onEditRutina,
  onAssociateRutina,
  onRegisterPago,
  onDeletePago,
  onDeleteAlumno,
}) {
  const [copyFeedback, setCopyFeedback] = useState('')

  if (!selectedAlumno) {
    return (
      <div className="studentsPanel studentsDetailPanel">
        <div className="studentsDetailEmpty">
          Selecciona un alumno para ver la ficha completa.
        </div>
      </div>
    )
  }

  const currentRoutine = rutinasDelAlumno[0] || null
  const routineBlocks = useMemo(
    () => buildRoutineBlocks(currentRoutine?.ejercicios),
    [currentRoutine?.ejercicios]
  )

  async function handleDeletePago(id) {
    if (!onDeletePago) return
    await onDeletePago(id)
  }

  function clearCopyFeedbackSoon() {
    window.setTimeout(() => {
      setCopyFeedback('')
    }, 1800)
  }

  async function handleCopyRoutine() {
    if (!currentRoutine) return

    const text = buildRoutineShareText(selectedAlumno.nombre, currentRoutine)

    try {
      await navigator.clipboard.writeText(text)
      setCopyFeedback('Rutina copiada')
      clearCopyFeedbackSoon()
    } catch (error) {
      setCopyFeedback('No se pudo copiar')
      clearCopyFeedbackSoon()
    }
  }

  function handleShareRoutine() {
    if (!currentRoutine) return

    const url = getRoutineWhatsappUrl(
      selectedAlumno.nombre,
      selectedAlumno.telefono,
      currentRoutine
    )

    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="studentsPanel studentsDetailPanel">
      <div className="studentsPanelTop">
        <div className="studentsDetailPanelHeading">
          {isMobileDetail && (
            <button
              type="button"
              className="studentsBackButton"
              onClick={onBackToList}
            >
              {'<-'} Volver al listado
            </button>
          )}
          <h3>FICHA DEL ALUMNO</h3>
        </div>
      </div>

      <div className="studentsDetailTop">
        <div className="studentsDetailSummary">
          <div className="studentsDetailPrimaryCard">
            <div className="studentsNameHeader">
              <div className="studentsPaymentBadgeWrap">
                <StudentStatusBadge
                  label={paymentSnapshot?.badgeLabel || 'No pago'}
                  tone={paymentSnapshot?.badgeTone || 'unpaid'}
                  compact
                />
              </div>
              <div className="studentsNameTextBlock">
                <strong title={selectedAlumno.nombre}>
                  {selectedAlumno.nombre}
                </strong>
              </div>
            </div>

            <div className="studentsInfoStack">
              <div className="studentsInfoItem">
                <span>Telefono</span>
                <strong>{selectedAlumno.telefono || '-'}</strong>
              </div>

              <div className="studentsInfoItem">
                <span>Observaciones</span>
                <strong>
                  {selectedAlumno.observaciones || 'Sin observaciones'}
                </strong>
              </div>
            </div>
          </div>

          <div className="studentsRoutineMiniCard studentsRoutineSectionCard">
            <div className="studentsRoutineHeader">
              <h4>Rutina actual</h4>
              {currentRoutineMeta?.badgeLabel && (
                <span className="studentsRoutineTypeBadge">
                  {currentRoutineMeta.badgeLabel}
                </span>
              )}
            </div>

            <div className="studentsRoutineContent">
              {currentRoutine ? (
                <>
                  <div className="studentsRoutineMeta">
                    <strong>{currentRoutine.nombre || 'Rutina actual'}</strong>
                    {currentRoutine.objetivo && (
                      <p className="studentsRoutineObjective">
                        {currentRoutine.objetivo}
                      </p>
                    )}
                  </div>

                  <div className="studentsRoutineBody">
                    <span className="studentsRoutineBodyLabel">
                      Detalle de rutina
                    </span>
                    <div className="studentsRoutineScrollArea">
                      {routineBlocks.length > 0 ? (
                        <div className="studentsRoutineRichContent">
                          {routineBlocks.map((block, index) => {
                            if (block.type === 'heading') {
                              return (
                                <div
                                  key={`${block.type}-${index}`}
                                  className="studentsRoutineHeading"
                                >
                                  {block.text}
                                </div>
                              )
                            }

                            if (block.type === 'exerciseTable') {
                              return (
                                <div
                                  key={`${block.type}-${index}`}
                                  className="studentsRoutineTableWrap"
                                >
                                  <div className="studentsRoutineTableHeader">
                                    <span>Ejercicio</span>
                                    <span>Series/Reps</span>
                                    <span>Peso</span>
                                  </div>
                                  <div className="studentsRoutineTableBody">
                                    {block.rows.map((row, rowIndex) => (
                                      <div
                                        key={`${row.ejercicio}-${rowIndex}`}
                                        className="studentsRoutineTableRow"
                                      >
                                        <span>{row.ejercicio}</span>
                                        <strong>{row.series}</strong>
                                        <em>{row.peso || '-'}</em>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )
                            }

                            return (
                              <p
                                key={`${block.type}-${index}`}
                                className="studentsRoutineParagraph"
                              >
                                {block.text}
                              </p>
                            )
                          })}
                        </div>
                      ) : (
                        <pre>-</pre>
                      )}
                    </div>
                  </div>

                  {currentRoutine.observaciones && (
                    <div className="studentsRoutineNotesBlock">
                      <span className="studentsRoutineBodyLabel">
                        Observaciones
                      </span>
                      <p>{currentRoutine.observaciones}</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="studentsRoutineBody">
                  <span className="studentsRoutineBodyLabel">
                    Detalle de rutina
                  </span>
                  <div className="studentsRoutineScrollArea studentsRoutineScrollAreaEmpty">
                    <p>Sin rutina cargada.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="studentsRoutineShareActions studentsRoutineShareActionsBelow">
              <button
                type="button"
                className="studentsTinyButton studentsTinyButtonPrimary"
                onClick={handleShareRoutine}
                disabled={!currentRoutine}
              >
                Compartir
              </button>
              <button
                type="button"
                className="studentsTinyButton"
                onClick={handleCopyRoutine}
                disabled={!currentRoutine}
              >
                Copiar
              </button>
            </div>

            {copyFeedback && (
              <small className="studentsCopyFeedback">{copyFeedback}</small>
            )}
          </div>
        </div>
      </div>

      <div className="studentsDetailActionBar">
        <button
          type="button"
          className="studentsMiniButton"
          onClick={onEditAlumno}
        >
          Editar alumno
        </button>
        <button
          type="button"
          className="studentsMiniButton"
          onClick={onAssociateRutina}
        >
          Asociar rutina
        </button>
        <button
          type="button"
          className="studentsMiniButton"
          onClick={onEditRutina}
        >
          Editar rutina
        </button>
        <button
          type="button"
          className="studentsMiniButton studentsMiniButtonPrimary"
          onClick={onRegisterPago}
        >
          Registrar pago
        </button>
        <button
          type="button"
          className="studentsMiniButton studentsMiniButtonDanger"
          onClick={onDeleteAlumno}
        >
          Eliminar
        </button>
      </div>

      <div className="studentsHistoryBlock">
        <div className="studentsPanelTop studentsHistoryHeader">
          <h3>HISTORIAL DE PAGOS</h3>
        </div>

        <div className="studentsHistoryTable">
          <div className="studentsHistoryTableHeader">
            <span>FECHA</span>
            <span>MEDIO</span>
            <span>MONTO</span>
            <span />
          </div>

          <div className="studentsHistoryTableBody">
            {pagosDelAlumno.length === 0 ? (
              <div className="studentsTableEmpty">
                No hay pagos registrados para este alumno.
              </div>
            ) : (
              pagosDelAlumno.map((pago) => (
                <div key={pago.id} className="studentsHistoryTableRow">
                  <span data-label="Fecha">{pago.fecha_pago || '-'}</span>
                  <span className="studentsHistoryPill" data-label="Medio">
                    {pago.medio_pago || '-'}
                  </span>
                  <strong data-label="Monto">
                    ${Number(pago.monto || 0).toLocaleString('es-AR')}
                  </strong>
                  <button
                    type="button"
                    className="studentsDeletePaymentButton"
                    onClick={() => handleDeletePago(pago.id)}
                    aria-label="Eliminar pago"
                  >
                    x
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
