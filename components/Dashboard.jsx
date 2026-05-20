import { useMemo, useState } from 'react'
import {
  TOTAL_PERIOD_VALUE,
  compareMonthKeys,
  getMonthKey,
  getMonthLabel,
} from '../lib/student-utils'

function formatCurrency(value) {
  return `$${Number(value || 0).toLocaleString('es-AR')}`
}

function getDashboardMonthOptions(pagos, costos) {
  const monthKeys = new Set()

  pagos.forEach((pago) => {
    if (pago?.fecha_pago) {
      monthKeys.add(getMonthKey(pago.fecha_pago))
    }
  })

  costos.forEach((costo) => {
    if (costo?.fecha) {
      monthKeys.add(getMonthKey(costo.fecha))
    }
  })

  return [
    { value: TOTAL_PERIOD_VALUE, label: 'Total acumulado' },
    ...[...monthKeys]
      .filter(Boolean)
      .sort(compareMonthKeys)
      .map((value) => ({
        value,
        label: getMonthLabel(value),
      })),
  ]
}

function getMonthBreakdown(monthKey, pagos, costos) {
  const pagosMes = pagos.filter(
    (pago) => pago?.fecha_pago && getMonthKey(pago.fecha_pago) === monthKey
  )
  const costosMes = costos.filter(
    (costo) => costo?.fecha && getMonthKey(costo.fecha) === monthKey
  )
  const ingresos = pagosMes.reduce((acc, pago) => acc + Number(pago.monto || 0), 0)
  const egresos = costosMes.reduce((acc, costo) => acc + Number(costo.monto || 0), 0)

  return {
    monthKey,
    label: getMonthLabel(monthKey),
    ingresos,
    costos: egresos,
    ganancia: ingresos - egresos,
    alumnosCobrados: new Set(pagosMes.map((pago) => pago.alumno_id).filter(Boolean))
      .size,
    pagosCount: pagosMes.length,
    costosCount: costosMes.length,
  }
}

export default function Dashboard({ alumnos, pagos, costos }) {
  const monthOptions = useMemo(
    () => getDashboardMonthOptions(pagos, costos),
    [pagos, costos]
  )
  const [selectedPeriod, setSelectedPeriod] = useState(TOTAL_PERIOD_VALUE)

  const monthlyBreakdown = useMemo(() => {
    return monthOptions
      .filter((option) => option.value !== TOTAL_PERIOD_VALUE)
      .map((option) => getMonthBreakdown(option.value, pagos, costos))
  }, [monthOptions, pagos, costos])

  const summary = useMemo(() => {
    if (selectedPeriod === TOTAL_PERIOD_VALUE) {
      const ingresos = pagos.reduce(
        (acc, pago) => acc + Number(pago.monto || 0),
        0
      )
      const egresos = costos.reduce(
        (acc, costo) => acc + Number(costo.monto || 0),
        0
      )

      return {
        ingresos,
        costos: egresos,
        ganancia: ingresos - egresos,
        alumnosCobrados: new Set(
          pagos.map((pago) => pago.alumno_id).filter(Boolean)
        ).size,
        pagosCount: pagos.length,
        costosCount: costos.length,
      }
    }

    return getMonthBreakdown(selectedPeriod, pagos, costos)
  }, [selectedPeriod, pagos, costos])

  const chartMaxValue = useMemo(() => {
    const values = monthlyBreakdown.flatMap((item) => [
      item.ingresos,
      item.costos,
      Math.abs(item.ganancia),
    ])

    return Math.max(...values, 1)
  }, [monthlyBreakdown])

  return (
    <section className="dashboardWorkspace">
      <div className="dashboardHero">
        <div>
          <h2>Dashboard</h2>
          <p>Lectura rapida del rendimiento mensual y acumulado.</p>
        </div>
      </div>

      <div className="dashboardFilterRow">
        {monthOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`dashboardFilterButton${
              selectedPeriod === option.value ? ' isActive' : ''
            }`}
            onClick={() => setSelectedPeriod(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="dashboardMetricGrid">
        <article className="dashboardMetricCard">
          <span>Ingresos</span>
          <strong>{formatCurrency(summary.ingresos)}</strong>
          <small>{summary.pagosCount} pagos</small>
        </article>

        <article className="dashboardMetricCard">
          <span>Costos</span>
          <strong>{formatCurrency(summary.costos)}</strong>
          <small>{summary.costosCount} items</small>
        </article>

        <article className="dashboardMetricCard">
          <span>Ganancia</span>
          <strong className={summary.ganancia >= 0 ? 'money' : 'dangerText'}>
            {formatCurrency(summary.ganancia)}
          </strong>
          <small>
            {summary.ganancia >= 0 ? 'Resultado positivo' : 'Resultado negativo'}
          </small>
        </article>

        <article className="dashboardMetricCard">
          <span>Alumnos cobrados</span>
          <strong>{summary.alumnosCobrados}</strong>
          <small>
            {selectedPeriod === TOTAL_PERIOD_VALUE ? 'En total' : 'En el periodo'}
          </small>
        </article>
      </div>

      <div className="dashboardChartCard">
        <div className="dashboardChartHeader">
          <h3>Comparativo ingresos / costos / ganancia</h3>
          <small>{alumnos.length} alumnos registrados</small>
        </div>

        {monthlyBreakdown.length === 0 ? (
          <div className="empty">Todavia no hay pagos o costos para comparar.</div>
        ) : (
          <div className="dashboardChartList">
            {monthlyBreakdown.map((item) => (
              <div className="dashboardChartRow" key={item.monthKey}>
                <div className="dashboardChartMonth">{item.label}</div>

                <div className="dashboardChartBars">
                  <div className="dashboardBarTrack">
                    <div
                      className="dashboardBar dashboardBarIncome"
                      style={{
                        width: `${(item.ingresos / chartMaxValue) * 100}%`,
                      }}
                    />
                  </div>

                  <div className="dashboardBarTrack">
                    <div
                      className="dashboardBar dashboardBarCost"
                      style={{
                        width: `${(item.costos / chartMaxValue) * 100}%`,
                      }}
                    />
                  </div>

                  <div className="dashboardBarTrack">
                    <div
                      className={`dashboardBar ${
                        item.ganancia >= 0
                          ? 'dashboardBarProfit'
                          : 'dashboardBarLoss'
                      }`}
                      style={{
                        width: `${(Math.abs(item.ganancia) / chartMaxValue) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="dashboardChartValue">
                  {formatCurrency(item.ganancia)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
