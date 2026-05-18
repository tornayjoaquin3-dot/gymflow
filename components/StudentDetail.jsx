export default function StudentDetail({
  selectedAlumno,
  pagosDelAlumno,
  rutinasDelAlumno,
  totalPagadoAlumno,
  setActiveSection,
}) {
  return (
    <section className="section">
      <div className="sectionHeader">
        <h2>Ficha de {selectedAlumno.nombre}</h2>
        <p>Historial completo del alumno.</p>
      </div>

      <div className="cards">
        <article>
          <span>Estado</span>
          <b>{selectedAlumno.estado || 'activo'}</b>
        </article>

        <article>
          <span>Total pagado</span>
          <b className="money">
            ${totalPagadoAlumno.toLocaleString('es-AR')}
          </b>
        </article>

        <article>
          <span>Pagos registrados</span>
          <b>{pagosDelAlumno.length}</b>
        </article>

        <article>
          <span>Rutinas cargadas</span>
          <b>{rutinasDelAlumno.length}</b>
        </article>
      </div>

      <div className="studentDetail">
        <article className="listCard">
          <h3>Datos del alumno</h3>
          <p>Teléfono: {selectedAlumno.telefono || '-'}</p>
          <p>Estado: {selectedAlumno.estado || 'activo'}</p>
          <p>Observaciones: {selectedAlumno.observaciones || '-'}</p>
        </article>

        <article className="listCard">
          <h3>Pagos del alumno</h3>

          {pagosDelAlumno.length === 0 ? (
            <p>No hay pagos registrados.</p>
          ) : (
            pagosDelAlumno.map((pago) => (
              <div key={pago.id} className="miniItem">
                <b>${Number(pago.monto || 0).toLocaleString('es-AR')}</b>
                <span>Mes: {pago.mes || '-'}</span>
                <span>Plan: {pago.plan || '-'}</span>
                <span>Medio: {pago.medio_pago || '-'}</span>
              </div>
            ))
          )}
        </article>

        <article className="listCard">
          <h3>Rutinas del alumno</h3>

          {rutinasDelAlumno.length === 0 ? (
            <p>No hay rutinas registradas.</p>
          ) : (
            rutinasDelAlumno.map((rutina) => (
              <div key={rutina.id} className="miniItem">
                <b>{rutina.nombre || 'Rutina sin nombre'}</b>
                <span>Objetivo: {rutina.objetivo || '-'}</span>
                <pre>{rutina.ejercicios || '-'}</pre>
              </div>
            ))
          )}
        </article>
      </div>

      <button
        className="smallButton"
        onClick={() => setActiveSection('alumnos')}
      >
        Volver a alumnos
      </button>
    </section>
  )
}
