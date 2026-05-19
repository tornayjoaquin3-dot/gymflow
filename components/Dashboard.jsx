'use client'

import { useMemo, useState } from 'react'

function formatMoney(value) {
  return `$${Number(value || 0).toLocaleString('es-AR')}`
}

function formatFecha(fecha) {
  if (!fecha) return '-'

  const parsed = parseFecha(fecha)
  if (!parsed) return '-'

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

function obtenerClaveMes(fecha) {
  const parsed = parseFecha(fecha)
  if (!parsed) return null

  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function formatMesLabel(clave) {
  const [year, month] = clave.split('-')
  const fecha = new Date(Number(year), Number(month) - 1, 1)
  const label = fecha.toLocaleDateString('es-AR', {
    month: 'long',
    year: 'numeric',
  })

  return label.charAt(0).toUpperCase() + label.slice(1)
}

function obtenerMesesDisponibles(pagos, costos) {
  const claves = new Set()

  pagos.forEach((pago) => {
    const clave = obtenerClaveMes(pago.fecha_pago)
    if (clave) claves.add(clave)
  })

  costos.forEach((costo) => {
    const clave = obtenerClaveMes(costo.fecha)
    if (clave) claves.add(clave)
  })

  return Array.from(claves).sort((a, b) => b.localeCompare(a))
}

function filtrarPorMes(items, campoFecha, claveMes) {
  return items.filter(
    (item) => obtenerClaveMes(item[campoFecha]) === claveMes
  )
}

function sumarMontos(items) {
  return items.reduce((acc, item) => acc + Number(item.monto || 0), 0)
}

function contarAlumnosCobrados(pagosLista) {
  const ids = new Set()

  pagosLista.forEach((pago) => {
    if (pago.alumno_id) ids.add(pago.alumno_id)
  })

  return ids.size
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

function ordenarPorFechaDesc(items, campoFecha) {
  return [...items].sort((a, b) => {
    const fechaA = parseFecha(a[campoFecha])
    const fechaB = parseFecha(b[campoFecha])

    if (!fechaA && !fechaB) return 0
    if (!fechaA) return 1
    if (!fechaB) return -1

    return fechaB - fechaA
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
  const [periodo, setPeriodo] = useState('total')

  const mesesDisponibles = useMemo(
    () => obtenerMesesDisponibles(pagos, costos),
    [pagos, costos]
  )

  const resumenesMensuales = useMemo(() => {
    return mesesDisponibles
      .map((clave) => {
        const pagosMes = filtrarPorMes(pagos, 'fecha_pago', clave)
        const costosMes = filtrarPorMes(costos, 'fecha', clave)
        const ingresos = sumarMontos(pagosMes)
        const costosTotal = sumarMontos(costosMes)

        return {
          clave,
          label: formatMesLabel(clave),
          ingresos,
          costos: costosTotal,
          ganancia: ingresos - costosTotal,
          alumnosCobrados: contarAlumnosCobrados(pagosMes),
        }
      })
      .sort((a, b) => a.clave.localeCompare(b.clave))
  }, [mesesDisponibles, pagos, costos])

  const pagosPeriodo = useMemo(() => {
    if (periodo === 'total') return pagos
    return filtrarPorMes(pagos, 'fecha_pago', periodo)
  }, [periodo, pagos])

  const costosPeriodo = useMemo(() => {
    if (periodo === 'total') return costos
    return filtrarPorMes(costos, 'fecha', periodo)
  }, [periodo, costos])

  const ingresosPeriodo = useMemo(() => {
    if (periodo === 'total') return totalIngresos
    return sumarMontos(pagosPeriodo)
  }, [periodo, totalIngresos, pagosPeriodo])

  const costosPeriodoTotal = useMemo(() => {
    if (periodo === 'total') return totalCostos
    return sumarMontos(costosPeriodo)
  }, [periodo, totalCostos, costosPeriodo])

  const gananciaPeriodo = ingresosPeriodo - costosPeriodoTotal
  const alumnosCobradosPeriodo = contarAlumnosCobrados(pagosPeriodo)
  const esTotal = periodo === 'total'
  const promedioPagoPorAlumno =
    alumnos.length > 0 ? totalIngresos / alumnos.length : 0

  const maxComparacion = useMemo(() => {
    if (resumenesMensuales.length === 0) return 1

    return Math.max(
      ...resumenesMensuales.flatMap((mes) => [mes.ingresos, mes.costos]),
      1
    )
  }, [resumenesMensuales])

  const ultimosPagosTabla = useMemo(
    () => ordenarPorFechaDesc(pagos, 'fecha_pago').slice(0, 8),
    [pagos]
  )

  const ultimosCostos = useMemo(
    () => ordenarPorFechaDesc(costos, 'fecha').slice(0, 5),
    [costos]
  )

  const alertas = []

  if (!hayPagosEnUltimosDias(pagos)) {
    alertas.push({
      tipo: 'warning',
      titulo: 'Sin cobros recientes',
      mensaje:
        'No se registraron pagos en los últimos 7 días. Revisá el seguimiento de cuotas.',
    })
  }

  if (costosPeriodoTotal > ingresosPeriodo) {
    alertas.push({
      tipo: 'danger',
      titulo: esTotal ? 'Costos superan ingresos' : 'Costos superan ingresos del período',
      mensaje: `Los egresos (${formatMoney(costosPeriodoTotal)}) superan los ingresos (${formatMoney(ingresosPeriodo)})${esTotal ? '' : ` de ${formatMesLabel(periodo)}`}.`,
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

  const metricas = esTotal
    ? [
        {
          label: 'Ingresos totales',
          value: formatMoney(ingresosPeriodo),
          tone: 'positive',
          hint: 'Suma de todos los pagos',
        },
        {
          label: 'Costos totales',
          value: formatMoney(costosPeriodoTotal),
          tone: 'negative',
          hint: 'Suma de todos los egresos',
        },
        {
          label: 'Ganancia neta',
          value: formatMoney(gananciaPeriodo),
          tone: gananciaPeriodo >= 0 ? 'positive' : 'negative',
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
    : [
        {
          label: 'Ingresos del mes',
          value: formatMoney(ingresosPeriodo),
          tone: 'positive',
          hint: `Pagos de ${formatMesLabel(periodo)}`,
        },
        {
          label: 'Costos del mes',
          value: formatMoney(costosPeriodoTotal),
          tone: 'negative',
          hint: `Egresos de ${formatMesLabel(periodo)}`,
        },
        {
          label: 'Ganancia del mes',
          value: formatMoney(gananciaPeriodo),
          tone: gananciaPeriodo >= 0 ? 'positive' : 'negative',
          hint: 'Resultado del período seleccionado',
        },
        {
          label: 'Alumnos cobrados',
          value: alumnosCobradosPeriodo,
          tone: 'accent',
          hint: 'Socios con al menos un pago en el mes',
        },
      ]

  return (
    <section className="section dashboardSection">
      <div className="dashboardHero">
        <div>
          <p className="dashboardEyebrow">Panel de gestión</p>
          <h2>Dashboard</h2>
          <p className="dashboardSubtitle">
            {esTotal
              ? 'Resumen financiero acumulado del gimnasio.'
              : `Resumen financiero de ${formatMesLabel(periodo)}.`}
          </p>
        </div>

        <div
          className={`dashboardResultBadge ${
            gananciaPeriodo >= 0 ? 'isPositive' : 'isNegative'
          }`}
        >
          <span>{esTotal ? 'Resultado neto' : 'Ganancia del período'}</span>
          <strong>{formatMoney(gananciaPeriodo)}</strong>
        </div>
      </div>

      <div className="dashboardBlock">
        <div className="dashboardBlockHeader">
          <h3>Período</h3>
          <p>Filtrá las métricas por mes o consultá el total acumulado.</p>
        </div>

        <div className="dashboardPeriodFilters">
          <button
            type="button"
            className={`dashboardPeriodBtn ${
              periodo === 'total' ? 'isActive' : ''
            }`}
            onClick={() => setPeriodo('total')}
          >
            Total acumulado
          </button>

          {mesesDisponibles.map((clave) => (
            <button
              key={clave}
              type="button"
              className={`dashboardPeriodBtn ${
                periodo === clave ? 'isActive' : ''
              }`}
              onClick={() => setPeriodo(clave)}
            >
              {formatMesLabel(clave)}
            </button>
          ))}
        </div>

        {mesesDisponibles.length === 0 && (
          <p className="dashboardEmpty dashboardEmptyInline">
            Todavía no hay meses con movimientos. Registrá pagos o costos para
            habilitar filtros mensuales.
          </p>
        )}
      </div>

      <div className="dashboardBlock">
        <div className="dashboardBlockHeader">
          <h3>Métricas clave</h3>
          <p>
            {esTotal
              ? 'Indicadores acumulados de todo el historial.'
              : `Indicadores del período ${formatMesLabel(periodo)}.`}
          </p>
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

      <div className="dashboardBlock">
        <div className="dashboardBlockHeader">
          <h3>Comparativa mensual</h3>
          <p>Ingresos, costos y ganancia por cada mes con movimientos.</p>
        </div>

        {resumenesMensuales.length === 0 ? (
          <p className="dashboardEmpty">
            No hay datos mensuales para comparar todavía.
          </p>
        ) : (
          <div className="dashboardCompareList">
            {resumenesMensuales.map((mes) => (
              <article key={mes.clave} className="dashboardCompareRow">
                <div className="dashboardCompareMonth">
                  <strong>{mes.label}</strong>
                  <span>{mes.alumnosCobrados} alumnos cobrados</span>
                </div>

                <div className="dashboardCompareBars">
                  <div className="dashboardBarRow">
                    <span className="dashboardBarLabel">Ingresos</span>
                    <div className="dashboardBarTrack">
                      <div
                        className="dashboardBar dashboardBar--income"
                        style={{
                          width: `${(mes.ingresos / maxComparacion) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="dashboardBarValue money">
                      {formatMoney(mes.ingresos)}
                    </span>
                  </div>

                  <div className="dashboardBarRow">
                    <span className="dashboardBarLabel">Costos</span>
                    <div className="dashboardBarTrack">
                      <div
                        className="dashboardBar dashboardBar--cost"
                        style={{
                          width: `${(mes.costos / maxComparacion) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="dashboardBarValue dangerText">
                      {formatMoney(mes.costos)}
                    </span>
                  </div>
                </div>

                <div
                  className={`dashboardCompareResult ${
                    mes.ganancia >= 0 ? 'isPositive' : 'isNegative'
                  }`}
                >
                  <span>Ganancia</span>
                  <strong>{formatMoney(mes.ganancia)}</strong>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="dashboardBlock">
        <div className="dashboardBlockHeader">
          <h3>Últimos pagos</h3>
          <p>Los 8 cobros más recientes registrados en el sistema.</p>
        </div>

        {ultimosPagosTabla.length === 0 ? (
          <p className="dashboardEmpty">No hay pagos cargados.</p>
        ) : (
          <div className="dashboardTableWrap">
            <div className="dashboardTableHeader">
              <span>Alumno</span>
              <span>Monto</span>
              <span>Medio de pago</span>
              <span>Fecha</span>
            </div>

            {ultimosPagosTabla.map((pago) => (
              <div key={pago.id} className="dashboardTableRow">
                <span>{pago.alumnos?.nombre || 'Sin alumno'}</span>
                <span className="money">{formatMoney(pago.monto)}</span>
                <span>{pago.medio_pago || '-'}</span>
                <span>{formatFecha(pago.fecha_pago)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="dashboardColumns">
        <div className="dashboardBlock">
          <div className="dashboardBlockHeader">
            <h3>Últimos costos</h3>
            <p>Egresos más recientes del gimnasio.</p>
          </div>

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
