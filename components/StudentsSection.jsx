import { useMemo, useState } from 'react'
import StudentStatusBadge from './StudentStatusBadge'
import { getMonthLabel, getStudentPaymentSnapshot, normalizeText } from '../lib/student-utils'

const FILTER_OPTIONS = [
  { value: 'todos', label: 'Todos' },
  { value: 'al_dia', label: 'Al dia' },
  { value: 'pendientes', label: 'Pendientes' },
  { value: 'sin_pagos', label: 'Sin pagos' },
]

export default function StudentsSection({
  alumnos,
  pagos,
  rutinas,
  nuevoAlumno,
  setNuevoAlumno,
  crearAlumno,
  eliminarAlumno,
  selectedAlumnoId,
  setSelectedAlumnoId,
  setActiveSection,
  selectedPaymentMonth,
  setSelectedPaymentMonth,
  paymentMonthOptions,
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')

  const normalizedSearch = normalizeText(searchTerm)

  const rows = useMemo(() => {
    return alumnos
      .map((alumno) => {
        const paymentSnapshot = getStudentPaymentSnapshot(
          alumno,
          pagos,
          selectedPaymentMonth
        )

        const routineCount = rutinas.filter(
          (rutina) => rutina.alumno_id === alumno.id
        ).length

        const searchable = normalizeText(
          [alumno.nombre, alumno.telefono, alumno.observaciones, alumno.estado]
            .filter(Boolean)
            .join(' ')
        )

        return {
          alumno,
          paymentSnapshot,
          routineCount,
          searchable,
        }
      })
      .filter((row) => {
        const matchesSearch =
          !normalizedSearch || row.searchable.includes(normalizedSearch)

        const matchesStatus =
          statusFilter === 'todos' ||
          row.paymentSnapshot.filterStatus === statusFilter

        return matchesSearch && matchesStatus
      })
  }, [alumnos, normalizedSearch, pagos, rutinas, selectedPaymentMonth, statusFilter])

  return (
    <section className="section sectionDense">
      <div className="sectionHeader sectionHeaderInline">
        <div>
          <h2>Alumnos</h2>
          <p>Vista operativa para seguimiento rapido y consulta diaria.</p>
        </div>

        <div className="sectionMeta">
          <span>{rows.length} visibles</span>
          <span>{alumnos.length} totales</span>
        </div>
      </div>

      <form onSubmit={crearAlumno} className="adminForm adminFormStudents">
        <input
          placeholder="Nombre completo"
          value={nuevoAlumno.nombre}
          onChange={(e) =>
            setNuevoAlumno({ ...nuevoAlumno, nombre: e.target.value })
          }
        />

        <input
          placeholder="Telefono"
          value={nuevoAlumno.telefono}
          onChange={(e) =>
            setNuevoAlumno({ ...nuevoAlumno, telefono: e.target.value })
          }
        />

        <input
          placeholder="Observaciones"
          value={nuevoAlumno.observaciones}
          onChange={(e) =>
            setNuevoAlumno({
              ...nuevoAlumno,
              observaciones: e.target.value,
            })
          }
        />

        <button className="primaryButton compactButton">Crear alumno</button>
      </form>

      <div className="toolbarPanel">
        <label className="toolbarField searchField">
          <span>Buscar</span>
          <input
            placeholder="Nombre, telefono u observaciones"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </label>

        <label className="toolbarField">
          <span>Mes</span>
          <select
            value={selectedPaymentMonth}
            onChange={(e) => setSelectedPaymentMonth(e.target.value)}
          >
            {paymentMonthOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="toolbarField">
          <span>Estado</span>
          <div className="segmentedControl">
            {FILTER_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={statusFilter === option.value ? 'active' : ''}
                onClick={() => setStatusFilter(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="dataPanel">
        <div className="dataTableHeader studentsGrid">
          <span>Alumno</span>
          <span>Estado {getMonthLabel(selectedPaymentMonth)}</span>
          <span>Ultimo pago</span>
          <span>Rutinas</span>
          <span>Acciones</span>
        </div>

        <div className="dataTableBody">
          {rows.length === 0 ? (
            <div className="empty">
              No encontramos alumnos con ese criterio de busqueda.
            </div>
          ) : (
            rows.map(({ alumno, paymentSnapshot, routineCount }) => (
              <article
                key={alumno.id}
                className={`dataRow studentsGrid ${
                  selectedAlumnoId === alumno.id ? 'isSelected' : ''
                }`}
              >
                <div className="studentIdentity">
                  <button
                    type="button"
                    className="rowLink"
                    onClick={() => {
                      setSelectedAlumnoId(alumno.id)
                      setActiveSection('fichaAlumno')
                    }}
                  >
                    {alumno.nombre}
                  </button>

                  <div className="studentMeta">
                    <span>{alumno.telefono || 'Sin telefono'}</span>
                    <span>{alumno.observaciones || 'Sin observaciones'}</span>
                  </div>
                </div>

                <StudentStatusBadge
                  label={paymentSnapshot.badgeLabel}
                  tone={paymentSnapshot.badgeTone}
                  helperText={paymentSnapshot.helperText}
                  compact
                />

                <div className="cellStack">
                  <strong>
                    {paymentSnapshot.latestPayment
                      ? `$${Number(
                          paymentSnapshot.latestPayment.monto || 0
                        ).toLocaleString('es-AR')}`
                      : '-'}
                  </strong>
                  <span>
                    {paymentSnapshot.latestPayment?.fecha_pago || 'Sin registro'}
                  </span>
                </div>

                <div className="cellStack">
                  <strong>{routineCount}</strong>
                  <span>{routineCount === 1 ? 'Rutina activa' : 'Rutinas'}</span>
                </div>

                <div className="rowActions">
                  <button
                    type="button"
                    className="ghostButton compactButton"
                    onClick={() => {
                      setSelectedAlumnoId(alumno.id)
                      setActiveSection('fichaAlumno')
                    }}
                  >
                    Ver ficha
                  </button>

                  <button
                    type="button"
                    className="dangerGhostButton compactButton"
                    onClick={() => eliminarAlumno(alumno.id)}
                  >
                    Eliminar
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  )
}
