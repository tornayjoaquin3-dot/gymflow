import { useEffect, useRef, useState } from 'react'
import RoutineDisplay from './RoutineDisplay'
import {
  buildRoutineShareText,
  getRoutineWhatsappUrl,
} from '../lib/routine-sharing'
import { formatStudentName } from '../lib/student-utils'

function getPaymentEmoji(tone) {
  return tone === 'paid' ? '🟢' : '🔴'
}

export default function StudentDetail({
  selectedAlumno,
  alta,
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
  onDuplicateAlumno,
  onExportAlumno,
}) {
  const [copyFeedback, setCopyFeedback] = useState('')
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false)
  const moreMenuRef = useRef(null)
  const currentRoutine = Array.isArray(rutinasDelAlumno) ? rutinasDelAlumno[0] || null : null

  useEffect(() => {
    if (!isMoreMenuOpen) return undefined

    function handleClickOutside(event) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setIsMoreMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isMoreMenuOpen])

  useEffect(() => {
    setIsMoreMenuOpen(false)
  }, [selectedAlumno?.id])

  if (!selectedAlumno) {
    return (
      <div className="studentsPanel studentsDetailPanel">
        <div className="studentsDetailEmpty">
          Selecciona un alumno para ver la ficha completa.
        </div>
      </div>
    )
  }

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

    const text = buildRoutineShareText(formatStudentName(selectedAlumno), currentRoutine)

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
      formatStudentName(selectedAlumno),
      selectedAlumno.telefono,
      currentRoutine
    )

    window.open(url, '_blank', 'noopener,noreferrer')
  }

  function runMoreAction(action) {
    setIsMoreMenuOpen(false)
    action?.()
  }

  const latestPago = pagosDelAlumno[0] || null

  return (
    <div className="studentsPanel studentsDetailPanel">
      {isMobileDetail && (
        <button type="button" className="studentsBackButton" onClick={onBackToList}>
          {'<-'} Volver al listado
        </button>
      )}

      <div className="studentsFichaHeader">
        <div className="studentsFichaHeaderIdentity">
          <div
            className={`studentsFichaStatusBadge ${
              paymentSnapshot?.badgeTone === 'paid' ? 'isPaid' : 'isUnpaid'
            }`}
          >
            <span>{getPaymentEmoji(paymentSnapshot?.badgeTone)}</span>
            {paymentSnapshot?.badgeLabel || 'No pago'}
          </div>
          {paymentSnapshot?.helperText && (
            <small className="studentsFichaStatusHelper">{paymentSnapshot.helperText}</small>
          )}
          <h2 className="studentsFichaName" title={formatStudentName(selectedAlumno)}>
            {formatStudentName(selectedAlumno)}
          </h2>
          <p className="studentsFichaPhone">{selectedAlumno.telefono || 'Sin telefono'}</p>
        </div>

        <div className="studentsFichaActions">
          <button
            type="button"
            className="studentsMiniButton studentsMiniButtonPrimary"
            onClick={onRegisterPago}
          >
            Registrar pago
          </button>
          <button type="button" className="studentsMiniButton" onClick={onEditAlumno}>
            Editar alumno
          </button>

          <div className="studentsMoreMenuWrap" ref={moreMenuRef}>
            <button
              type="button"
              className="studentsMiniButton studentsMoreMenuButton"
              onClick={() => setIsMoreMenuOpen((current) => !current)}
              aria-expanded={isMoreMenuOpen}
            >
              Mas acciones ···
            </button>

            {isMoreMenuOpen && (
              <div className="studentsMoreMenuPanel">
                <button type="button" onClick={() => runMoreAction(onEditRutina)}>
                  Editar rutina
                </button>
                <button type="button" onClick={() => runMoreAction(onAssociateRutina)}>
                  Asociar rutina
                </button>
                <button
                  type="button"
                  onClick={() => runMoreAction(() => onDuplicateAlumno?.(selectedAlumno))}
                >
                  Duplicar ficha
                </button>
                <button type="button" onClick={() => runMoreAction(onExportAlumno)}>
                  Exportar ficha
                </button>
                <button
                  type="button"
                  className="studentsMoreMenuDanger"
                  onClick={() => runMoreAction(onDeleteAlumno)}
                >
                  Eliminar alumno
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="studentsFichaGrid">
        <div className="studentsDataCard">
          <h4>Datos</h4>
          <div className="studentsInfoStack">
            <div className="studentsInfoItem">
              <span>Telefono</span>
              <strong>{selectedAlumno.telefono || '-'}</strong>
            </div>
            <div className="studentsInfoItem">
              <span>Observaciones</span>
              <strong>{selectedAlumno.observaciones || 'Sin observaciones'}</strong>
            </div>
            <div className="studentsInfoItem">
              <span>Fecha de alta</span>
              <strong>{alta || '-'}</strong>
            </div>
            <div className="studentsInfoItem">
              <span>Profesor asignado</span>
              <strong>Sin asignar</strong>
            </div>
          </div>
        </div>

        <div className="studentsStatusCard">
          <h4>Estado del alumno</h4>
          <div className="studentsStatusGrid">
            <div className="studentsInfoItem">
              <span>Estado</span>
              <strong>{selectedAlumno.estado ? selectedAlumno.estado : 'Sin definir'}</strong>
            </div>
            <div className="studentsInfoItem">
              <span>Ultima asistencia</span>
              <strong>Sin datos aun</strong>
            </div>
            <div className="studentsInfoItem">
              <span>Ultimo pago</span>
              <strong>{latestPago?.mes || 'Sin pagos'}</strong>
            </div>
            <div className="studentsInfoItem">
              <span>Rutina</span>
              <strong>{currentRoutine?.nombre || 'Sin rutina'}</strong>
            </div>
            <div className="studentsInfoItem">
              <span>Profesor</span>
              <strong>Sin asignar</strong>
            </div>
          </div>
        </div>

        <div className="studentsRoutineMiniCard studentsFichaRoutineCard">
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
                  <RoutineDisplay ejercicios={currentRoutine.ejercicios} />
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

        <div className="studentsHistoryBlock">
          <h4>Historial de pagos</h4>

          <div className="studentsHistorySummary">
            <div className="studentsHistorySummaryItem">
              <span>Ultimo pago</span>
              <strong>{latestPago?.mes || '-'}</strong>
            </div>
            <div className="studentsHistorySummaryItem">
              <span>Monto</span>
              <strong>
                {latestPago ? `$${Number(latestPago.monto || 0).toLocaleString('es-AR')}` : '-'}
              </strong>
            </div>
            <div className="studentsHistorySummaryItem">
              <span>Cantidad de pagos</span>
              <strong>{pagosDelAlumno.length}</strong>
            </div>
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
    </div>
  )
}
