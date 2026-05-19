export default function PaymentsSection({
  alumnos,
  pagos,
  nuevoPago,
  setNuevoPago,
  guardarPago,
  pagoEditandoId,
  editarPago,
  cancelarEdicionPago,
  eliminarPago,
}) {
  return (
    <section className="section">
      <div className="sectionHeader">
        <h2>Pagos</h2>
        <p>
          {pagoEditandoId
            ? 'Editando datos del pago.'
            : 'Registro de cuotas e ingresos.'}
        </p>
      </div>

      <form onSubmit={guardarPago} className="paymentForm">
        <select
          value={nuevoPago.alumno_id}
          onChange={(e) =>
            setNuevoPago({ ...nuevoPago, alumno_id: e.target.value })
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
          placeholder="Monto"
          type="number"
          value={nuevoPago.monto}
          onChange={(e) =>
            setNuevoPago({ ...nuevoPago, monto: e.target.value })
          }
        />

        <select
          value={nuevoPago.medio_pago}
          onChange={(e) =>
            setNuevoPago({ ...nuevoPago, medio_pago: e.target.value })
          }
        >
          <option value="efectivo">Efectivo</option>
          <option value="transferencia">Transferencia</option>
          <option value="tarjeta">Tarjeta</option>
        </select>

        <input
          placeholder="Plan"
          value={nuevoPago.plan}
          onChange={(e) =>
            setNuevoPago({ ...nuevoPago, plan: e.target.value })
          }
        />

        <input
          placeholder="Mes"
          value={nuevoPago.mes}
          onChange={(e) =>
            setNuevoPago({ ...nuevoPago, mes: e.target.value })
          }
        />

        <button>
          {pagoEditandoId ? 'Guardar cambios' : 'Registrar pago'}
        </button>

        {pagoEditandoId && (
          <button
            type="button"
            className="secondaryButton"
            onClick={cancelarEdicionPago}
          >
            Cancelar edición
          </button>
        )}
      </form>

      <div className="simpleList">
        {pagos.length === 0 ? (
          <div className="empty">Todavía no hay pagos cargados.</div>
        ) : (
          pagos.map((pago) => (
            <article className="listCard" key={pago.id}>
              <h3>{pago.alumnos?.nombre || 'Sin alumno'}</h3>

              <p className="money">
                ${Number(pago.monto || 0).toLocaleString('es-AR')}
              </p>

              <p>Plan: {pago.plan || '-'}</p>
              <p>Mes: {pago.mes || '-'}</p>
              <p>Medio: {pago.medio_pago || '-'}</p>

              <div className="buttonGroup">
                <button
                  className="smallButton"
                  onClick={() => editarPago(pago)}
                >
                  Editar
                </button>

                <button
                  className="smallButton dangerButton"
                  onClick={() => eliminarPago(pago.id)}
                >
                  Eliminar
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  )
}
