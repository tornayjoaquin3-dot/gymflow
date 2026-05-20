import StudentStatusBadge from './StudentStatusBadge'

export default function StudentDetail({
  selectedAlumno,
  pagosDelAlumno,
  rutinasDelAlumno,
  paymentSnapshot,
  onEditAlumno,
  onEditRutina,
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

  async function handleDeletePago(id) {
    if (!onDeletePago) return
    await onDeletePago(id)
  }

  return (
    <div className="studentsPanel studentsDetailPanel">
      <div className="studentsPanelTop">
        <h3>FICHA DEL ALUMNO</h3>
      </div>

      <div className="studentsDetailTop">
        <div className="studentsDetailSummary">
          <div className="studentsInfoRow">
            <span>Nombre</span>
            <div className="studentsInfoValue studentsNameValue">
              <strong>{selectedAlumno.nombre}</strong>
              <StudentStatusBadge
                label={paymentSnapshot?.badgeLabel || 'No pagó'}
                tone={paymentSnapshot?.badgeTone || 'unpaid'}
                compact
              />
            </div>
          </div>

          <div className="studentsInfoRow">
            <span>Telefono</span>
            <div className="studentsInfoValue">
              <strong>{selectedAlumno.telefono || '-'}</strong>
            </div>
          </div>

          <div className="studentsInfoRow studentsInfoRowNotes">
            <span>Observaciones</span>
            <div className="studentsInfoValue studentsInfoNotes">
              <strong>{selectedAlumno.observaciones || 'Sin observaciones'}</strong>
            </div>
          </div>
        </div>

        <div className="studentsRoutineMiniCard">
          <h4>Rutina actual</h4>
          {currentRoutine ? (
            <>
              <strong>{currentRoutine.nombre || 'Rutina actual'}</strong>
              {currentRoutine.objetivo && <span>{currentRoutine.objetivo}</span>}
              <pre>{currentRoutine.ejercicios || '-'}</pre>
              {currentRoutine.observaciones && <p>{currentRoutine.observaciones}</p>}
            </>
          ) : (
            <p>Sin rutina cargada.</p>
          )}
        </div>
      </div>

      <div className="studentsDetailActionBar">
        <button type="button" className="studentsMiniButton" onClick={onEditAlumno}>
          Editar alumno
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
                  <span>{pago.fecha_pago || '-'}</span>
                  <span className="studentsHistoryPill">
                    {pago.medio_pago || '-'}
                  </span>
                  <strong>${Number(pago.monto || 0).toLocaleString('es-AR')}</strong>
                  <button
                    type="button"
                    className="studentsDeletePaymentButton"
                    onClick={() => handleDeletePago(pago.id)}
                    aria-label="Eliminar pago"
                  >
                    ×
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
