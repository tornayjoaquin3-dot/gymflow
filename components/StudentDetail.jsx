import StudentStatusBadge from './StudentStatusBadge'
import { getMonthLabel } from '../lib/student-utils'

export default function StudentDetail({
  selectedAlumno,
  pagosDelAlumno,
  rutinasDelAlumno,
  totalPagadoAlumno,
  setActiveSection,
  selectedPaymentMonth,
  paymentSnapshot,
}) {
  return (
    <section className="section sectionDense">
      <div className="detailHeader">
        <div className="detailHeaderMain">
          <button
            type="button"
            className="ghostButton compactButton"
            onClick={() => setActiveSection('alumnos')}
          >
            Volver
          </button>

          <div>
            <h2>{selectedAlumno.nombre}</h2>
            <p>Ficha compacta con estado del mes, historial y rutina visible.</p>
          </div>
        </div>

        <StudentStatusBadge
          label={paymentSnapshot?.badgeLabel || 'Pendiente'}
          tone={paymentSnapshot?.badgeTone || 'pending'}
          helperText={paymentSnapshot?.helperText}
        />
      </div>

      <div className="detailSummaryGrid">
        <article className="summaryCard">
          <span>Estado del mes</span>
          <strong>{getMonthLabel(selectedPaymentMonth)}</strong>
          <small>
            {paymentSnapshot?.paymentsForMonth.length
              ? `${paymentSnapshot.paymentsForMonth.length} pago(s) registrado(s)`
              : 'Sin movimientos cargados'}
          </small>
        </article>

        <article className="summaryCard">
          <span>Total pagado</span>
          <strong>${totalPagadoAlumno.toLocaleString('es-AR')}</strong>
          <small>{pagosDelAlumno.length} pagos historicos</small>
        </article>

        <article className="summaryCard">
          <span>Rutinas</span>
          <strong>{rutinasDelAlumno.length}</strong>
          <small>
            {rutinasDelAlumno.length === 1
              ? 'Rutina visible'
              : 'Rutinas disponibles'}
          </small>
        </article>

        <article className="summaryCard">
          <span>Contacto</span>
          <strong>{selectedAlumno.telefono || 'Sin telefono'}</strong>
          <small>{selectedAlumno.estado || 'activo'}</small>
        </article>
      </div>

      <div className="detailGrid">
        <article className="detailPanel">
          <div className="detailPanelHeader">
            <h3>Datos del alumno</h3>
          </div>

          <div className="compactInfoList">
            <div>
              <span>Telefono</span>
              <strong>{selectedAlumno.telefono || '-'}</strong>
            </div>

            <div>
              <span>Estado</span>
              <strong>{selectedAlumno.estado || 'activo'}</strong>
            </div>

            <div className="fullWidth">
              <span>Observaciones</span>
              <strong>{selectedAlumno.observaciones || 'Sin observaciones'}</strong>
            </div>
          </div>
        </article>

        <article className="detailPanel">
          <div className="detailPanelHeader">
            <h3>Historial de pagos</h3>
            <small>{pagosDelAlumno.length} registros</small>
          </div>

          <div className="miniList">
            {pagosDelAlumno.length === 0 ? (
              <p className="emptyInline">No hay pagos registrados.</p>
            ) : (
              pagosDelAlumno.map((pago) => (
                <div key={pago.id} className="miniRow">
                  <div>
                    <strong>${Number(pago.monto || 0).toLocaleString('es-AR')}</strong>
                    <span>{pago.plan || '-'}</span>
                  </div>

                  <div>
                    <strong>{pago.fecha_pago || '-'}</strong>
                    <span>
                      {pago.mes || '-'} · {pago.medio_pago || '-'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="detailPanel detailPanelWide">
          <div className="detailPanelHeader">
            <h3>Rutinas</h3>
            <small>{rutinasDelAlumno.length} visibles</small>
          </div>

          <div className="routineCompactList">
            {rutinasDelAlumno.length === 0 ? (
              <p className="emptyInline">No hay rutinas registradas.</p>
            ) : (
              rutinasDelAlumno.map((rutina) => (
                <div key={rutina.id} className="routineCompactCard">
                  <div className="routineCompactHeader">
                    <div>
                      <strong>{rutina.nombre || 'Rutina sin nombre'}</strong>
                      <span>{rutina.objetivo || 'Sin objetivo definido'}</span>
                    </div>
                  </div>

                  <pre>{rutina.ejercicios || '-'}</pre>

                  {rutina.observaciones && (
                    <p className="routineNotes">{rutina.observaciones}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </article>
      </div>
    </section>
  )
}
