import { useEffect, useMemo, useState } from 'react'
import StudentDetail from './StudentDetail'
import StudentStatusBadge from './StudentStatusBadge'
import {
  getStudentPaymentSnapshot,
  normalizeText,
} from '../lib/student-utils'

export default function StudentsSection({
  alumnos,
  pagos,
  rutinas,
  nuevoAlumno,
  setNuevoAlumno,
  crearAlumno,
  selectedAlumnoId,
  setSelectedAlumnoId,
  selectedPaymentMonth,
  setSelectedPaymentMonth,
  paymentMonthOptions,
  onUpdateAlumno,
  onRegisterPago,
  onSaveRutina,
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)

  const normalizedSearch = normalizeText(searchTerm)

  const rows = useMemo(() => {
    return alumnos
      .map((alumno) => {
        const paymentSnapshot = getStudentPaymentSnapshot(
          alumno,
          pagos,
          selectedPaymentMonth
        )

        return {
          alumno,
          paymentSnapshot,
          searchable: normalizeText([alumno.nombre, alumno.telefono].join(' ')),
        }
      })
      .filter((row) => {
        return (
          !normalizedSearch || row.searchable.includes(normalizedSearch)
        )
      })
  }, [alumnos, normalizedSearch, pagos, selectedPaymentMonth])

  useEffect(() => {
    if (!rows.length) {
      if (selectedAlumnoId) {
        setSelectedAlumnoId(null)
      }
      return
    }

    const selectedStillVisible = rows.some(
      (row) => row.alumno.id === selectedAlumnoId
    )

    if (!selectedAlumnoId || !selectedStillVisible) {
      setSelectedAlumnoId(rows[0].alumno.id)
    }
  }, [rows, selectedAlumnoId, setSelectedAlumnoId])

  const selectedAlumno = useMemo(() => {
    return alumnos.find((alumno) => alumno.id === selectedAlumnoId) || null
  }, [alumnos, selectedAlumnoId])

  const pagosDelAlumno = useMemo(() => {
    return pagos.filter((pago) => pago.alumno_id === selectedAlumnoId)
  }, [pagos, selectedAlumnoId])

  const rutinasDelAlumno = useMemo(() => {
    return rutinas.filter((rutina) => rutina.alumno_id === selectedAlumnoId)
  }, [rutinas, selectedAlumnoId])

  const totalPagadoAlumno = useMemo(() => {
    return pagosDelAlumno.reduce(
      (accumulator, pago) => accumulator + Number(pago.monto || 0),
      0
    )
  }, [pagosDelAlumno])

  const selectedPaymentSnapshot = useMemo(() => {
    return selectedAlumno
      ? getStudentPaymentSnapshot(selectedAlumno, pagos, selectedPaymentMonth)
      : null
  }, [pagos, selectedAlumno, selectedPaymentMonth])

  async function handleCreateAlumno(event) {
    await crearAlumno(event)
    setShowCreateForm(false)
  }

  return (
    <section className="studentsWorkspace">
      <div className="studentsWorkspaceHeader">
        <div>
          <h2>Alumnos</h2>
          <p>Pantalla operativa para cuotas, ficha y rutina diaria.</p>
        </div>

        <div className="studentsWorkspaceControls">
          <label className="studentsPeriodControl">
            <span>Periodo</span>
            <select
              value={selectedPaymentMonth}
              onChange={(event) => setSelectedPaymentMonth(event.target.value)}
            >
              {paymentMonthOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="studentsPrimaryAction"
            onClick={() => setShowCreateForm((current) => !current)}
          >
            + Nuevo alumno
          </button>
        </div>
      </div>

      <div className="studentsSearchRow">
        <input
          className="studentsSearchInput"
          placeholder="Buscar alumno por nombre o telefono..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      </div>

      {showCreateForm && (
        <form onSubmit={handleCreateAlumno} className="studentsCreatePanel">
          <input
            placeholder="Nombre completo"
            value={nuevoAlumno.nombre}
            onChange={(event) =>
              setNuevoAlumno({
                ...nuevoAlumno,
                nombre: event.target.value,
              })
            }
          />
          <input
            placeholder="Telefono"
            value={nuevoAlumno.telefono}
            onChange={(event) =>
              setNuevoAlumno({
                ...nuevoAlumno,
                telefono: event.target.value,
              })
            }
          />
          <input
            placeholder="Observaciones"
            value={nuevoAlumno.observaciones}
            onChange={(event) =>
              setNuevoAlumno({
                ...nuevoAlumno,
                observaciones: event.target.value,
              })
            }
          />
          <button type="submit" className="studentsPrimaryAction">
            Guardar alumno
          </button>
        </form>
      )}

      <div className="studentsWorkspaceGrid">
        <div className="studentsListCard">
          <div className="studentsListHeader">
            <p className="studentsEyebrow">Listado</p>
            <span>
              {rows.length} de {alumnos.length}
            </span>
          </div>

          <div className="studentsRows">
            {rows.length === 0 ? (
              <div className="studentsEmptyState">
                No encontramos alumnos con ese criterio de busqueda.
              </div>
            ) : (
              rows.map(({ alumno, paymentSnapshot }) => (
                <button
                  key={alumno.id}
                  type="button"
                  className={`studentsRow ${
                    alumno.id === selectedAlumnoId ? 'isSelected' : ''
                  }`}
                  onClick={() => setSelectedAlumnoId(alumno.id)}
                >
                  <div className="studentsRowIdentity">
                    <strong>{alumno.nombre}</strong>
                    <span>{alumno.telefono || 'Sin telefono'}</span>
                  </div>

                  <div className="studentsRowStatus">
                    <StudentStatusBadge
                      label={paymentSnapshot.badgeLabel}
                      tone={paymentSnapshot.badgeTone}
                      compact
                    />
                  </div>

                  <span className="studentsRowLink">Ver</span>
                </button>
              ))
            )}
          </div>
        </div>

        <StudentDetail
          selectedAlumno={selectedAlumno}
          pagosDelAlumno={pagosDelAlumno}
          rutinasDelAlumno={rutinasDelAlumno}
          totalPagadoAlumno={totalPagadoAlumno}
          selectedPaymentMonth={selectedPaymentMonth}
          paymentSnapshot={selectedPaymentSnapshot}
          onUpdateAlumno={onUpdateAlumno}
          onRegisterPago={onRegisterPago}
          onSaveRutina={onSaveRutina}
        />
      </div>
    </section>
  )
}
