function formatMoney(value) {
  return `$${Number(value || 0).toLocaleString('es-AR')}`
}

function formatFecha(fecha) {
  if (!fecha) return '-'

  const parsed = new Date(
    fecha.includes('T') ? fecha : `${fecha}T12:00:00`
  )

  if (Number.isNaN(parsed.getTime())) return fecha

  return parsed.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function parseFecha(fecha) {
  if (!fecha) return null

  const parsed = new Date(
    fecha.includes('T') ? fecha : `${fecha}T12:00:00`
  )

  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function hayPagosEnUltimosDias(pagos, dias = 7) {
  const limite = new Date()
  limite.setDate(limite.getDate() - dias)
  limite.setHours(0, 0, 0, 0)

  return pagos.some((pago) => {
    const fecha = parseFecha(pago.fecha_pago)
    return fecha && fecha >= limite
  })
}

export default function Dashboard({
  totalIngresos,
  totalCostos,
  ganancia,
  alumnos,
  pagos,
  costos,
  rutinas,
}) {
  const promedioPagoPorAlumno =
    alumnos.length > 0 ? totalIngresos / alumnos.length : 0

  const ultimosPagos = pagos.slice(0, 5)
  const ultimosCostos = costos.slice(0, 5)

  const alertas = []

  if (!hayPagosEnUltimosDias(pagos)) {
    alertas.push({
      tipo: 'warning',
      titulo: 'Sin cobros recientes',
      mensaje:
        'No se registraron pagos en los últimos 7 días. Revisá el seguimiento de cuotas.',
    })
  }

  if (totalCostos > totalIngresos) {
    alertas.push({
      tipo: 'danger',
      titulo: 'Costos superan ingresos',
      mensaje: `Los egresos (${formatMoney(totalCostos)}) superan los ingresos (${formatMoney(totalIngresos)}).`,
    })
  }

  if (alumnos.length === 0) {
    alertas.push({
      tipo: 'info',
      titulo: 'Sin alumnos registrados',
      mensaje:
        'Todavía no hay alumnos cargados. Empezá por dar de alta socios en la sección Alumnos.',
    })
  }

  const metricas = [
    {
      label: 'Ingresos totales',
      value: formatMoney(totalIngresos),
      tone: 'positive',
      hint: 'Suma de todos los pagos',
    },
    {
      label: 'Costos totales',
      value: formatMoney(totalCostos),
      tone: 'negative',
      hint: 'Suma de todos los egresos',
    },
    {
      label: 'Ganancia neta',
      value: formatMoney(ganancia),
      tone: ganancia >= 0 ? 'positive' : 'negative',
      hint: 'Ingresos menos costos',
    },
    {
      label: 'Alumnos',
      value: alumnos.length,
      tone: 'neutral',
      hint: 'Socios registrados',
    },
    {
      label: 'Pagos',
      value: pagos.length,
      tone: 'neutral',
      hint: 'Cuotas registradas',
    },
    {
      label: 'Rutinas',
      value: rutinas.length,
      tone: 'neutral',
      hint: 'Planes de entrenamiento',
    },
    {
      label: 'Promedio por alumno',
      value: formatMoney(promedioPagoPorAlumno),
      tone: 'accent',
      hint: 'Ingresos totales / cantidad de alumnos',
    },
  ]

  return (
    <section className="section dashboardSection">
      <div className="dashboardHero">
        <div>
          <p className="dashboardEyebrow">Panel de gestión</p>
          <h2>Dashboard</h2>
          <p className="dashboardSubtitle">
            Resumen financiero y operativo del gimnasio en tiempo real.
          </p>
        </div>

        <div
          className={`dashboardResultBadge ${
            ganancia >= 0 ? 'isPositive' : 'isNegative'
          }`}
        >
          <span>Resultado neto</span>
          <strong>{formatMoney(ganancia)}</strong>
        </div>
      </div>

      <div className="dashboardBlock">
        <div className="dashboardBlockHeader">
          <h3>Métricas clave</h3>
          <p>Indicadores calculados con los datos actuales del sistema.</p>
        </div>

        <div className="dashboardMetrics">
          {metricas.map((metrica) => (
            <article
              key={metrica.label}
              className={`dashboardMetricCard dashboardMetricCard--${metrica.tone}`}
            >
              <span className="dashboardMetricLabel">{metrica.label}</span>
              <strong className="dashboardMetricValue">{metrica.value}</strong>
              <p className="dashboardMetricHint">{metrica.hint}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="dashboardColumns">
        <div className="dashboardBlock">
          <div className="dashboardBlockHeader">
            <h3>Actividad reciente</h3>
            <p>Últimos movimientos registrados en el sistema.</p>
          </div>

          <div className="dashboardActivityGrid">
            <div className="dashboardActivityPanel">
              <h4>Últimos pagos</h4>

              {ultimosPagos.length === 0 ? (
                <p className="dashboardEmpty">No hay pagos cargados.</p>
              ) : (
                <ul className="dashboardActivityList">
                  {ultimosPagos.map((pago) => (
                    <li key={pago.id} className="dashboardActivityItem">
                      <div>
                        <strong>
                          {pago.alumnos?.nombre || 'Sin alumno'}
                        </strong>
                        <span>{formatFecha(pago.fecha_pago)}</span>
                      </div>
                      <b className="money">{formatMoney(pago.monto)}</b>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="dashboardActivityPanel">
              <h4>Últimos costos</h4>

              {ultimosCostos.length === 0 ? (
                <p className="dashboardEmpty">No hay costos cargados.</p>
              ) : (
                <ul className="dashboardActivityList">
                  {ultimosCostos.map((costo) => (
                    <li key={costo.id} className="dashboardActivityItem">
                      <div>
                        <strong>{costo.descripcion || 'Sin descripción'}</strong>
                        <span>{formatFecha(costo.fecha)}</span>
                      </div>
                      <b className="dangerText">{formatMoney(costo.monto)}</b>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="dashboardBlock dashboardAlertsBlock">
          <div className="dashboardBlockHeader">
            <h3>Alertas</h3>
            <p>Señales importantes para la operación diaria.</p>
          </div>

          {alertas.length === 0 ? (
            <div className="dashboardAlert dashboardAlert--ok">
              <strong>Todo en orden</strong>
              <p>No hay alertas activas en este momento.</p>
            </div>
          ) : (
            <ul className="dashboardAlertsList">
              {alertas.map((alerta) => (
                <li
                  key={alerta.titulo}
                  className={`dashboardAlert dashboardAlert--${alerta.tipo}`}
                >
                  <strong>{alerta.titulo}</strong>
                  <p>{alerta.mensaje}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
