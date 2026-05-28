import { useState } from 'react'
import StudentStatusBadge from './StudentStatusBadge'
import {
  buildRoutineShareText,
  getRoutineWhatsappUrl,
} from '../lib/routine-sharing'

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
  const [copyFeedback, setCopyFeedback] = useState('')

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
              ← Volver al listado
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
                <strong title={selectedAlumno.nombre}>{selectedAlumno.nombre}</strong>
              </div>
            </div>

            <div className="studentsInfoStack">
              <div className="studentsInfoItem">
                <span>Telefono</span>
                <strong>{selectedAlumno.telefono || '-'}</strong>
              </div>

              <div className="studentsInfoItem">
                <span>Observaciones</span>
                <strong>{selectedAlumno.observaciones || 'Sin observaciones'}</strong>
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
                      <pre>{currentRoutine.ejercicios || '-'}</pre>
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
        <button type="button" className="studentsMiniButton" onClick={onEditAlumno}>
          Editar alumno
        </button>
        <button
          type="button"
          className="studentsMiniButton"
          onClick={onAssociateRutina}
        >
          Asociar rutina
        </button>
        <button type="button" className="studentsMiniButton" onClick={onEditRutina}>
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
