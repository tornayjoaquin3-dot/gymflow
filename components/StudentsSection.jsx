import { useEffect, useMemo, useState } from 'react'
import StudentDetail from './StudentDetail'
import StudentStatusBadge from './StudentStatusBadge'
import {
  getPaymentPeriodLabel,
  getStudentPaymentSnapshot,
  normalizeText,
} from '../lib/student-utils'

function getStudentStartDate(alumno, studentPayments) {
  if (alumno?.creado_en) {
    return alumno.creado_en.slice(0, 10)
  }

  const oldestPayment = [...studentPayments].sort((left, right) => {
    const leftTime = new Date(left?.fecha_pago || 0).getTime()
    const rightTime = new Date(right?.fecha_pago || 0).getTime()
    return leftTime - rightTime
  })[0]

  return oldestPayment?.fecha_pago || '-'
}

const EMPTY_STUDENT_FORM = {
  nombre: '',
  telefono: '',
  observaciones: '',
}

const EMPTY_ROUTINE_FORM = {
  id: null,
  nombre: '',
  objetivo: '',
  ejercicios: '',
  observaciones: '',
}

const EMPTY_PAYMENT_FORM = {
  alumno_id: '',
  monto: '',
  medio_pago: 'efectivo',
  fecha_pago: new Date().toISOString().slice(0, 10),
  plan: 'mensual',
  mes: '',
}

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
  selectedPaymentMonth,
  setSelectedPaymentMonth,
  paymentMonthOptions,
  onUpdateAlumno,
  onRegisterPago,
  onSaveRutina,
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeModal, setActiveModal] = useState('')
  const [studentForm, setStudentForm] = useState(EMPTY_STUDENT_FORM)
  const [routineForm, setRoutineForm] = useState(EMPTY_ROUTINE_FORM)
  const [paymentForm, setPaymentForm] = useState(EMPTY_PAYMENT_FORM)

  const normalizedSearch = normalizeText(searchTerm)

  const rows = useMemo(() => {
    return alumnos
      .map((alumno) => {
        const studentPayments = pagos.filter(
          (pago) => pago.alumno_id === alumno.id
        )
        const paymentSnapshot = getStudentPaymentSnapshot(
          alumno,
          pagos,
          selectedPaymentMonth
        )

        return {
          alumno,
          alta: getStudentStartDate(alumno, studentPayments),
          paymentSnapshot,
          searchable: normalizeText([alumno.nombre, alumno.telefono].join(' ')),
          studentPayments,
        }
      })
      .filter((row) => {
        return !normalizedSearch || row.searchable.includes(normalizedSearch)
      })
  }, [alumnos, normalizedSearch, pagos, selectedPaymentMonth])

  useEffect(() => {
    if (!rows.length) {
      if (selectedAlumnoId) {
        setSelectedAlumnoId(null)
      }
      return
    }

    const visibleSelected = rows.some(
      (row) => row.alumno.id === selectedAlumnoId
    )

    if (!selectedAlumnoId || !visibleSelected) {
      setSelectedAlumnoId(rows[0].alumno.id)
    }
  }, [rows, selectedAlumnoId, setSelectedAlumnoId])

  const selectedRow = useMemo(() => {
    return rows.find((row) => row.alumno.id === selectedAlumnoId) || null
  }, [rows, selectedAlumnoId])

  const selectedAlumno = selectedRow?.alumno || null
  const pagosDelAlumno = useMemo(() => {
    return [...(selectedRow?.studentPayments || [])].sort((left, right) => {
      const leftTime = new Date(left?.fecha_pago || 0).getTime()
      const rightTime = new Date(right?.fecha_pago || 0).getTime()
      return rightTime - leftTime
    })
  }, [selectedRow])

  const rutinasDelAlumno = useMemo(() => {
    return rutinas.filter((rutina) => rutina.alumno_id === selectedAlumnoId)
  }, [rutinas, selectedAlumnoId])

  const currentRoutine = rutinasDelAlumno[0] || null

  function closeModal() {
    setActiveModal('')
  }

  function openCreateModal() {
    setNuevoAlumno({
      nombre: '',
      telefono: '',
      observaciones: '',
    })
    setActiveModal('create')
  }

  function openStudentModal() {
    if (!selectedAlumno) return

    setStudentForm({
      nombre: selectedAlumno.nombre || '',
      telefono: selectedAlumno.telefono || '',
      observaciones: selectedAlumno.observaciones || '',
    })
    setActiveModal('student')
  }

  function openRoutineModal() {
    setRoutineForm({
      id: currentRoutine?.id || null,
      nombre: currentRoutine?.nombre || '',
      objetivo: currentRoutine?.objetivo || '',
      ejercicios: currentRoutine?.ejercicios || '',
      observaciones: currentRoutine?.observaciones || '',
    })
    setActiveModal('routine')
  }

  function openPaymentModal() {
    if (!selectedAlumno) return

    setPaymentForm({
      alumno_id: selectedAlumno.id,
      monto: '',
      medio_pago: 'efectivo',
      fecha_pago: new Date().toISOString().slice(0, 10),
      plan: 'mensual',
      mes: getPaymentPeriodLabel(selectedPaymentMonth),
    })
    setActiveModal('payment')
  }

  async function handleCreateAlumno(event) {
    const success = await crearAlumno(event)

    if (success) {
      closeModal()
    }
  }

  async function handleUpdateAlumno(event) {
    event.preventDefault()

    if (!selectedAlumno) return

    const success = await onUpdateAlumno({
      id: selectedAlumno.id,
      ...studentForm,
    })

    if (success) {
      closeModal()
    }
  }

  async function handleSaveRutina(event) {
    event.preventDefault()

    if (!selectedAlumno) return

    const success = await onSaveRutina({
      id: routineForm.id,
      alumno_id: selectedAlumno.id,
      nombre: routineForm.nombre,
      objetivo: routineForm.objetivo,
      ejercicios: routineForm.ejercicios,
      observaciones: routineForm.observaciones,
    })

    if (success) {
      closeModal()
    }
  }

  async function handleRegisterPago(event) {
    event.preventDefault()

    const success = await onRegisterPago(paymentForm)

    if (success) {
      closeModal()
    }
  }

  async function handleDeleteAlumno() {
    if (!selectedAlumno) return

    const success = await eliminarAlumno(selectedAlumno.id)

    if (success) {
      closeModal()
    }
  }

  return (
    <section className="studentsWorkspaceMockup">
      <div className="studentsHero">
        <div>
          <h2>Alumnos</h2>
          <p>Ficha completa, historial de pagos y rutina.</p>
        </div>

        <div className="studentsHeroActions">
          <button
            type="button"
            className="studentsButton studentsButtonPrimary"
            onClick={openCreateModal}
          >
            + Nuevo alumno
          </button>
          <button
            type="button"
            className="studentsButton"
            onClick={openPaymentModal}
          >
            + Pago
          </button>
        </div>
      </div>

      <div className="studentsSearchBar">
        <input
          placeholder="Buscar alumno..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      </div>

      <div className="studentsMockupGrid">
        <div className="studentsPanel">
          <div className="studentsPanelTop">
            <h3>LISTADO</h3>
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
          </div>

          <div className="studentsTable">
            <div className="studentsTableHeader">
              <span>NOMBRE</span>
              <span>PAGO MES</span>
              <span>ALTA</span>
              <span />
            </div>

            <div className="studentsTableBody">
              {rows.length === 0 ? (
                <div className="studentsTableEmpty">
                  No encontramos alumnos para esa busqueda.
                </div>
              ) : (
                rows.map(({ alumno, alta, paymentSnapshot }) => (
                  <div
                    key={alumno.id}
                    className={`studentsTableRow ${
                      alumno.id === selectedAlumnoId ? 'isSelected' : ''
                    }`}
                    onClick={() => setSelectedAlumnoId(alumno.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        setSelectedAlumnoId(alumno.id)
                      }
                    }}
                  >
                    <div className="studentsNameCell">
                      <strong>{alumno.nombre}</strong>
                      {alumno.telefono && <span>{alumno.telefono}</span>}
                    </div>

                    <div className="studentsStateCell">
                      <StudentStatusBadge
                        label={paymentSnapshot.badgeLabel}
                        tone={paymentSnapshot.badgeTone}
                        compact
                      />
                    </div>

                    <span className="studentsDateCell">{alta}</span>

                    <button
                      type="button"
                      className="studentsRowAction"
                      onClick={(event) => {
                        event.stopPropagation()
                        setSelectedAlumnoId(alumno.id)
                      }}
                    >
                      Ver
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <StudentDetail
          selectedAlumno={selectedAlumno}
          pagosDelAlumno={pagosDelAlumno}
          rutinasDelAlumno={rutinasDelAlumno}
          selectedPaymentMonth={selectedPaymentMonth}
          paymentSnapshot={selectedRow?.paymentSnapshot || null}
          onEditAlumno={openStudentModal}
          onEditRutina={openRoutineModal}
          onRegisterPago={openPaymentModal}
          onDeleteAlumno={handleDeleteAlumno}
        />
      </div>

      {activeModal === 'create' && (
        <div className="studentsModalBackdrop" onClick={closeModal}>
          <div
            className="studentsModalCard"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="studentsModalHeader">
              <h4>Nuevo alumno</h4>
              <button type="button" onClick={closeModal}>
                Cerrar
              </button>
            </div>

            <form onSubmit={handleCreateAlumno} className="studentsModalForm">
              <input
                placeholder="Nombre"
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
              <textarea
                placeholder="Observaciones"
                value={nuevoAlumno.observaciones}
                onChange={(event) =>
                  setNuevoAlumno({
                    ...nuevoAlumno,
                    observaciones: event.target.value,
                  })
                }
              />
              <div className="studentsModalActions">
                <button type="submit" className="studentsButton studentsButtonPrimary">
                  Guardar alumno
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeModal === 'student' && (
        <div className="studentsModalBackdrop" onClick={closeModal}>
          <div
            className="studentsModalCard"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="studentsModalHeader">
              <h4>Editar alumno</h4>
              <button type="button" onClick={closeModal}>
                Cerrar
              </button>
            </div>

            <form onSubmit={handleUpdateAlumno} className="studentsModalForm">
              <input
                placeholder="Nombre"
                value={studentForm.nombre}
                onChange={(event) =>
                  setStudentForm({
                    ...studentForm,
                    nombre: event.target.value,
                  })
                }
              />
              <input
                placeholder="Telefono"
                value={studentForm.telefono}
                onChange={(event) =>
                  setStudentForm({
                    ...studentForm,
                    telefono: event.target.value,
                  })
                }
              />
              <textarea
                placeholder="Observaciones"
                value={studentForm.observaciones}
                onChange={(event) =>
                  setStudentForm({
                    ...studentForm,
                    observaciones: event.target.value,
                  })
                }
              />
              <div className="studentsModalActions">
                <button type="submit" className="studentsButton studentsButtonPrimary">
                  Guardar cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeModal === 'payment' && (
        <div className="studentsModalBackdrop" onClick={closeModal}>
          <div
            className="studentsModalCard"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="studentsModalHeader">
              <h4>Registrar pago</h4>
              <button type="button" onClick={closeModal}>
                Cerrar
              </button>
            </div>

            <form onSubmit={handleRegisterPago} className="studentsModalForm">
              <input value={selectedAlumno?.nombre || ''} disabled />
              <div className="studentsModalGridTwo">
                <input
                  placeholder="Monto"
                  type="number"
                  min="0"
                  value={paymentForm.monto}
                  onChange={(event) =>
                    setPaymentForm({
                      ...paymentForm,
                      monto: event.target.value,
                    })
                  }
                />
                <select
                  value={paymentForm.medio_pago}
                  onChange={(event) =>
                    setPaymentForm({
                      ...paymentForm,
                      medio_pago: event.target.value,
                    })
                  }
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="mercado_pago">Mercado Pago</option>
                  <option value="otro">Otro</option>
                </select>
                <input
                  type="date"
                  value={paymentForm.fecha_pago}
                  onChange={(event) =>
                    setPaymentForm({
                      ...paymentForm,
                      fecha_pago: event.target.value,
                    })
                  }
                />
                <input
                  placeholder="Plan / periodo"
                  value={paymentForm.plan}
                  onChange={(event) =>
                    setPaymentForm({
                      ...paymentForm,
                      plan: event.target.value,
                    })
                  }
                />
              </div>
              <input value={paymentForm.mes} disabled />
              <div className="studentsModalActions">
                <button type="submit" className="studentsButton studentsButtonPrimary">
                  Guardar pago
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeModal === 'routine' && (
        <div className="studentsModalBackdrop" onClick={closeModal}>
          <div
            className="studentsModalCard"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="studentsModalHeader">
              <h4>{currentRoutine ? 'Editar rutina' : 'Crear rutina'}</h4>
              <button type="button" onClick={closeModal}>
                Cerrar
              </button>
            </div>

            <form onSubmit={handleSaveRutina} className="studentsModalForm">
              <input
                placeholder="Nombre rutina"
                value={routineForm.nombre}
                onChange={(event) =>
                  setRoutineForm({
                    ...routineForm,
                    nombre: event.target.value,
                  })
                }
              />
              <input
                placeholder="Objetivo"
                value={routineForm.objetivo}
                onChange={(event) =>
                  setRoutineForm({
                    ...routineForm,
                    objetivo: event.target.value,
                  })
                }
              />
              <textarea
                placeholder="Ejercicios"
                value={routineForm.ejercicios}
                onChange={(event) =>
                  setRoutineForm({
                    ...routineForm,
                    ejercicios: event.target.value,
                  })
                }
              />
              <textarea
                placeholder="Observaciones"
                value={routineForm.observaciones}
                onChange={(event) =>
                  setRoutineForm({
                    ...routineForm,
                    observaciones: event.target.value,
                  })
                }
              />
              <div className="studentsModalActions">
                <button type="submit" className="studentsButton studentsButtonPrimary">
                  Guardar rutina
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
