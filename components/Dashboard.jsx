import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  TOTAL_PERIOD_VALUE,
  compareMonthKeys,
  getMonthKey,
  getMonthLabel,
} from '../lib/student-utils'

function formatCurrency(value) {
  return `$${Number(value || 0).toLocaleString('es-AR')}`
}

function DashboardTooltip({ active, payload, label }) {
  if (!active || !payload?.length) {
    return null
  }

  return (
    <div className="dashboardTooltip">
      <strong>{label}</strong>
      {payload.map((entry) => (
        <div className="dashboardTooltipRow" key={entry.dataKey}>
          <span>{entry.name}</span>
          <b>{formatCurrency(entry.value)}</b>
        </div>
      ))}
    </div>
  )
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

  const chartData = useMemo(() => {
    return monthlyBreakdown.map((item) => ({
      ...item,
      gananciaColor: item.ganancia >= 0 ? '#2563eb' : '#e1524a',
    }))
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
          <div className="dashboardChartCanvas">
            <ResponsiveContainer width="100%" height={Math.max(320, chartData.length * 72)}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 8, right: 24, left: 12, bottom: 8 }}
                barCategoryGap={16}
              >
                <CartesianGrid stroke="#edf0f3" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={(value) => formatCurrency(value)}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  tick={{ fill: '#475569', fontSize: 13 }}
                  axisLine={false}
                  tickLine={false}
                  width={96}
                />
                <Tooltip content={<DashboardTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Legend
                  wrapperStyle={{ paddingTop: 8 }}
                  iconType="circle"
                  formatter={(value) => (
                    <span className="dashboardLegendText">{value}</span>
                  )}
                />
                <Bar
                  dataKey="ingresos"
                  name="Ingresos"
                  fill="#1f9d73"
                  radius={[0, 999, 999, 0]}
                  maxBarSize={16}
                />
                <Bar
                  dataKey="costos"
                  name="Costos"
                  fill="#f08b82"
                  radius={[0, 999, 999, 0]}
                  maxBarSize={16}
                />
                <Bar
                  dataKey="ganancia"
                  name="Ganancia"
                  radius={[0, 999, 999, 0]}
                  maxBarSize={16}
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.monthKey} fill={entry.gananciaColor} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </section>
  )
}
