'use client'

import { useMemo, useState } from 'react'

function formatMoney(value) {
  return `$${Number(value || 0).toLocaleString('es-AR')}`
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

function esAlumnoActivo(alumno) {
  return (alumno.estado || 'activo') === 'activo'
}

function obtenerIdsConPago(pagosLista) {
  const ids = new Set()

  pagosLista.forEach((pago) => {
    if (pago.alumno_id) ids.add(pago.alumno_id)
  })

  return ids
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
  alumnos,
  pagos,
  costos,
}) {
  const [periodo, setPeriodo] = useState('total')

  const mesesDisponibles = useMemo(
    () => obtenerMesesDisponibles(pagos, costos),
    [pagos, costos]
  )

  const alumnosActivos = useMemo(
    () => alumnos.filter(esAlumnoActivo),
    [alumnos]
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

  const estadoCuotas = useMemo(() => {
    if (esTotal) {
      const idsConPago = obtenerIdsConPago(pagos)
      const conPago = alumnosActivos.filter((alumno) => idsConPago.has(alumno.id))
      const sinPago = alumnosActivos.filter((alumno) => !idsConPago.has(alumno.id))

      return {
        modo: 'total',
        conPago,
        sinPago,
        totalActivos: alumnosActivos.length,
      }
    }

    const idsConPagoMes = obtenerIdsConPago(pagosPeriodo)
    const alDia = alumnosActivos.filter((alumno) => idsConPagoMes.has(alumno.id))
    const pendientes = alumnosActivos.filter(
      (alumno) => !idsConPagoMes.has(alumno.id)
    )

    return {
      modo: 'mes',
      alDia,
      pendientes,
    }
  }, [esTotal, pagos, pagosPeriodo, alumnosActivos])

  const maxComparacion = useMemo(() => {
    if (resumenesMensuales.length === 0) return 1

    return Math.max(
      ...resumenesMensuales.flatMap((mes) => [mes.ingresos, mes.costos]),
      1
    )
  }, [resumenesMensuales])

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

  if (alumnosActivos.length === 0) {
    alertas.push({
      tipo: 'info',
      titulo: 'Sin alumnos activos',
      mensaje:
        'No hay alumnos activos cargados. Revisá el alta en la sección Alumnos.',
    })
  }

  const metricas = [
    {
      label: esTotal ? 'Ingresos' : 'Ingresos del mes',
      value: formatMoney(ingresosPeriodo),
      tone: 'positive',
    },
    {
      label: esTotal ? 'Costos' : 'Costos del mes',
      value: formatMoney(costosPeriodoTotal),
      tone: 'negative',
    },
    {
      label: esTotal ? 'Ganancia' : 'Ganancia del mes',
      value: formatMoney(gananciaPeriodo),
      tone: gananciaPeriodo >= 0 ? 'positive' : 'negative',
    },
    {
      label: esTotal ? 'Alumnos cobrados' : 'Alumnos cobrados',
      value: alumnosCobradosPeriodo,
      tone: 'accent',
    },
  ]

  return (
    <section className="section dashboardSection">
      <div className="dashboardHero dashboardHero--compact">
        <div>
          <p className="dashboardEyebrow">Panel de gestión</p>
          <h2>Dashboard</h2>
          <p className="dashboardSubtitle">
            {esTotal
              ? 'Vista acumulada del gimnasio.'
              : `Vista de ${formatMesLabel(periodo)}.`}
          </p>
        </div>

        <div
          className={`dashboardResultBadge dashboardResultBadge--compact ${
            gananciaPeriodo >= 0 ? 'isPositive' : 'isNegative'
          }`}
        >
          <span>{esTotal ? 'Ganancia neta' : 'Ganancia del mes'}</span>
          <strong>{formatMoney(gananciaPeriodo)}</strong>
        </div>
      </div>

      <div className="dashboardBlock dashboardBlock--compact">
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
            Registrá pagos o costos para habilitar filtros mensuales.
          </p>
        )}
      </div>

      <div className="dashboardMetrics dashboardMetrics--compact">
        {metricas.map((metrica) => (
          <article
            key={metrica.label}
            className={`dashboardMetricCard dashboardMetricCard--compact dashboardMetricCard--${metrica.tone}`}
          >
            <span className="dashboardMetricLabel">{metrica.label}</span>
            <strong className="dashboardMetricValue">{metrica.value}</strong>
          </article>
        ))}
      </div>

      <div className="dashboardBlock dashboardBlock--compact">
        <div className="dashboardBlockHeader dashboardBlockHeader--compact">
          <h3>Estado de cuotas</h3>
          <p>
            {esTotal
              ? 'Resumen de cobros por alumno activo.'
              : `Seguimiento de cuotas en ${formatMesLabel(periodo)}.`}
          </p>
        </div>

        {estadoCuotas.modo === 'mes' ? (
          <>
            <div className="dashboardDuesStats">
              <article className="dashboardDuesStat dashboardDuesStat--ok">
                <span>Alumnos al día</span>
                <strong>{estadoCuotas.alDia.length}</strong>
              </article>
              <article className="dashboardDuesStat dashboardDuesStat--pending">
                <span>Pendientes</span>
                <strong>{estadoCuotas.pendientes.length}</strong>
              </article>
            </div>

            {estadoCuotas.pendientes.length === 0 ? (
              <p className="dashboardDuesMessage">
                Todos los alumnos tienen pago registrado en este período.
              </p>
            ) : (
              <ul className="dashboardDuesList">
                {estadoCuotas.pendientes.slice(0, 8).map((alumno) => (
                  <li key={alumno.id}>{alumno.nombre}</li>
                ))}
                {estadoCuotas.pendientes.length > 8 && (
                  <li className="dashboardDuesMore">
                    +{estadoCuotas.pendientes.length - 8} más
                  </li>
                )}
              </ul>
            )}
          </>
        ) : (
          <>
            <div className="dashboardDuesStats dashboardDuesStats--total">
              <article className="dashboardDuesStat">
                <span>Con pagos registrados</span>
                <strong>{estadoCuotas.conPago.length}</strong>
              </article>
              <article className="dashboardDuesStat dashboardDuesStat--pending">
                <span>Sin ningún pago</span>
                <strong>{estadoCuotas.sinPago.length}</strong>
              </article>
              <article className="dashboardDuesStat">
                <span>Alumnos activos</span>
                <strong>{estadoCuotas.totalActivos}</strong>
              </article>
            </div>

            {estadoCuotas.sinPago.length === 0 ? (
              <p className="dashboardDuesMessage">
                Todos los alumnos activos tienen al menos un pago registrado.
              </p>
            ) : (
              <>
                <p className="dashboardDuesListTitle">Alumnos sin pago registrado</p>
                <ul className="dashboardDuesList">
                  {estadoCuotas.sinPago.slice(0, 8).map((alumno) => (
                    <li key={alumno.id}>{alumno.nombre}</li>
                  ))}
                  {estadoCuotas.sinPago.length > 8 && (
                    <li className="dashboardDuesMore">
                      +{estadoCuotas.sinPago.length - 8} más
                    </li>
                  )}
                </ul>
              </>
            )}
          </>
        )}
      </div>

      <div className="dashboardBlock dashboardBlock--compact">
        <div className="dashboardBlockHeader dashboardBlockHeader--compact">
          <h3>Comparativa mensual</h3>
          <p>Ingresos, costos y ganancia por mes.</p>
        </div>

        {resumenesMensuales.length === 0 ? (
          <p className="dashboardEmpty">No hay datos mensuales para comparar.</p>
        ) : (
          <div className="dashboardCompareList dashboardCompareList--compact">
            {resumenesMensuales.map((mes) => (
              <article key={mes.clave} className="dashboardCompareRow dashboardCompareRow--compact">
                <div className="dashboardCompareMonth">
                  <strong>{mes.label}</strong>
                </div>

                <div className="dashboardCompareBars">
                  <div className="dashboardBarRow">
                    <span className="dashboardBarLabel">Ing.</span>
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
                    <span className="dashboardBarLabel">Cost.</span>
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
                  className={`dashboardCompareResult dashboardCompareResult--compact ${
                    mes.ganancia >= 0 ? 'isPositive' : 'isNegative'
                  }`}
                >
                  <strong>{formatMoney(mes.ganancia)}</strong>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {alertas.length > 0 && (
        <div className="dashboardBlock dashboardBlock--compact">
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
        </div>
      )}
    </section>
  )
}
