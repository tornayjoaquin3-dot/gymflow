import { useEffect, useMemo, useState } from 'react'
import StudentStatusBadge from './StudentStatusBadge'
import {
  getMonthLabel,
  getPaymentPeriodLabel,
  TOTAL_PERIOD_VALUE,
} from '../lib/student-utils'

const EMPTY_ROUTINE_FORM = {
  id: null,
  nombre: '',
  objetivo: '',
  ejercicios: '',
  observaciones: '',
}

const EMPTY_STUDENT_FORM = {
  nombre: '',
  telefono: '',
  observaciones: '',
}

export default function StudentDetail({
  selectedAlumno,
  pagosDelAlumno,
  rutinasDelAlumno,
  totalPagadoAlumno,
  selectedPaymentMonth,
  paymentSnapshot,
  onUpdateAlumno,
  onRegisterPago,
  onSaveRutina,
}) {
  const currentRoutine = rutinasDelAlumno[0] || null
  const [activeEditor, setActiveEditor] = useState('')
  const [studentForm, setStudentForm] = useState(EMPTY_STUDENT_FORM)
  const [paymentForm, setPaymentForm] = useState({
    monto: '',
    medio_pago: 'efectivo',
    fecha_pago: new Date().toISOString().slice(0, 10),
    plan: 'mensual',
    mes: getPaymentPeriodLabel(selectedPaymentMonth),
  })
  const [routineForm, setRoutineForm] = useState(EMPTY_ROUTINE_FORM)

  useEffect(() => {
    if (!selectedAlumno) return

    setStudentForm({
      nombre: selectedAlumno.nombre || '',
      telefono: selectedAlumno.telefono || '',
      observaciones: selectedAlumno.observaciones || '',
    })
  }, [selectedAlumno])

  useEffect(() => {
    setPaymentForm((current) => ({
      ...current,
      fecha_pago: new Date().toISOString().slice(0, 10),
      mes: getPaymentPeriodLabel(selectedPaymentMonth),
    }))
  }, [selectedPaymentMonth, selectedAlumno?.id])

  useEffect(() => {
    setRoutineForm({
      id: currentRoutine?.id || null,
      nombre: currentRoutine?.nombre || '',
      objetivo: currentRoutine?.objetivo || '',
      ejercicios: currentRoutine?.ejercicios || '',
      observaciones: currentRoutine?.observaciones || '',
    })
  }, [currentRoutine, selectedAlumno?.id])

  const paymentsForPanel = paymentSnapshot?.paymentsForMonth || []
  const lastPayment = paymentSnapshot?.latestPayment || null

  const monthPaymentsTitle = useMemo(() => {
    if (selectedPaymentMonth === TOTAL_PERIOD_VALUE) {
      return 'Historial de pagos'
    }

    return `Pagos de ${getMonthLabel(selectedPaymentMonth)}`
  }, [selectedPaymentMonth])

  if (!selectedAlumno) {
    return (
      <aside className="studentsDetailCard studentsDetailEmpty">
        <div>
          <h3>Selecciona un alumno</h3>
          <p>La ficha lateral muestra pagos, rutina y acciones rapidas.</p>
        </div>
      </aside>
    )
  }

  async function handleStudentSubmit(event) {
    event.preventDefault()
    await onUpdateAlumno({
      id: selectedAlumno.id,
      ...studentForm,
    })
    setActiveEditor('')
  }

  async function handlePaymentSubmit(event) {
    event.preventDefault()
    await onRegisterPago({
      alumno_id: selectedAlumno.id,
      monto: paymentForm.monto,
      medio_pago: paymentForm.medio_pago,
      fecha_pago: paymentForm.fecha_pago,
      plan: paymentForm.plan,
      mes: paymentForm.mes,
    })
    setPaymentForm({
      monto: '',
      medio_pago: 'efectivo',
      fecha_pago: new Date().toISOString().slice(0, 10),
      plan: 'mensual',
      mes: getPaymentPeriodLabel(selectedPaymentMonth),
    })
    setActiveEditor('')
  }

  async function handleRoutineSubmit(event) {
    event.preventDefault()
    await onSaveRutina({
      id: routineForm.id,
      alumno_id: selectedAlumno.id,
      ...routineForm,
    })
    setActiveEditor('')
  }

  return (
    <aside className="studentsDetailCard">
      <div className="studentsDetailHeader">
        <div>
          <p className="studentsEyebrow">Ficha del alumno</p>
          <h3>{selectedAlumno.nombre}</h3>
          <span className="studentsDetailPhone">
            {selectedAlumno.telefono || 'Sin telefono'}
          </span>
        </div>

        <StudentStatusBadge
          label={paymentSnapshot?.badgeLabel || 'No pago'}
          tone={paymentSnapshot?.badgeTone || 'unpaid'}
          helperText={paymentSnapshot?.helperText}
        />
      </div>

      <div className="studentsDetailActions">
        <button
          type="button"
          className="studentsInlineButton"
          onClick={() =>
            setActiveEditor(activeEditor === 'student' ? '' : 'student')
          }
        >
          Editar alumno
        </button>
        <button
          type="button"
          className="studentsInlineButton"
          onClick={() =>
            setActiveEditor(activeEditor === 'routine' ? '' : 'routine')
          }
        >
          {currentRoutine ? 'Editar rutina' : 'Crear rutina'}
        </button>
        <button
          type="button"
          className="studentsInlineButton studentsInlineButtonPrimary"
          onClick={() =>
            setActiveEditor(activeEditor === 'payment' ? '' : 'payment')
          }
        >
          Registrar pago
        </button>
      </div>

      {activeEditor === 'student' && (
        <form onSubmit={handleStudentSubmit} className="studentsEditorCard">
          <div className="studentsEditorHeader">
            <h4>Editar alumno</h4>
          </div>

          <div className="studentsEditorFields">
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
          </div>

          <div className="studentsEditorActions">
            <button type="submit" className="studentsInlineButtonPrimary">
              Guardar alumno
            </button>
          </div>
        </form>
      )}

      {activeEditor === 'payment' && (
        <form onSubmit={handlePaymentSubmit} className="studentsEditorCard">
          <div className="studentsEditorHeader">
            <h4>Registrar pago</h4>
            <span>{getPaymentPeriodLabel(selectedPaymentMonth)}</span>
          </div>

          <div className="studentsEditorFields studentsEditorFieldsTwoCols">
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

          <div className="studentsPeriodHint">
            Periodo: <strong>{paymentForm.mes}</strong>
          </div>

          <div className="studentsEditorActions">
            <button type="submit" className="studentsInlineButtonPrimary">
              Guardar pago
            </button>
          </div>
        </form>
      )}

      {activeEditor === 'routine' && (
        <form onSubmit={handleRoutineSubmit} className="studentsEditorCard">
          <div className="studentsEditorHeader">
            <h4>{currentRoutine ? 'Editar rutina actual' : 'Crear rutina'}</h4>
          </div>

          <div className="studentsEditorFields">
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
          </div>

          <div className="studentsEditorActions">
            <button type="submit" className="studentsInlineButtonPrimary">
              Guardar rutina
            </button>
          </div>
        </form>
      )}

      <div className="studentsDetailGrid">
        <article className="studentsInfoCard">
          <span>Telefono</span>
          <strong>{selectedAlumno.telefono || 'Sin telefono'}</strong>
        </article>
        <article className="studentsInfoCard">
          <span>Total abonado</span>
          <strong>${totalPagadoAlumno.toLocaleString('es-AR')}</strong>
        </article>
        <article className="studentsInfoCard">
          <span>Ultimo pago</span>
          <strong>{lastPayment?.fecha_pago || 'Sin registro'}</strong>
        </article>
        <article className="studentsInfoCard">
          <span>Meses pagos</span>
          <strong>{paymentSnapshot?.paidMonthCount || 0}</strong>
        </article>
      </div>

      <article className="studentsDetailBlock">
        <div className="studentsBlockHeader">
          <h4>Observaciones</h4>
        </div>
        <p>{selectedAlumno.observaciones || 'Sin observaciones cargadas.'}</p>
      </article>

      <article className="studentsDetailBlock">
        <div className="studentsBlockHeader">
          <h4>{monthPaymentsTitle}</h4>
          <span>{paymentsForPanel.length} registro(s)</span>
        </div>

        {paymentsForPanel.length === 0 ? (
          <p className="studentsBlockEmpty">
            No hay pagos para {getMonthLabel(selectedPaymentMonth)}.
          </p>
        ) : (
          <div className="studentsPaymentsList">
            {paymentsForPanel.map((pago) => (
              <div key={pago.id} className="studentsPaymentRow">
                <div>
                  <strong>${Number(pago.monto || 0).toLocaleString('es-AR')}</strong>
                  <span>{pago.plan || 'Sin plan'}</span>
                </div>
                <div>
                  <strong>{pago.fecha_pago || '-'}</strong>
                  <span>{pago.medio_pago || '-'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </article>

      <article className="studentsDetailBlock">
        <div className="studentsBlockHeader">
          <h4>Rutina actual</h4>
          <span>{currentRoutine ? 'Activa' : 'Sin rutina'}</span>
        </div>

        {currentRoutine ? (
          <div className="studentsRoutineCard">
            <strong>{currentRoutine.nombre || 'Rutina sin nombre'}</strong>
            <span>{currentRoutine.objetivo || 'Sin objetivo definido'}</span>
            <pre>{currentRoutine.ejercicios || '-'}</pre>
            {currentRoutine.observaciones && <p>{currentRoutine.observaciones}</p>}
          </div>
        ) : (
          <p className="studentsBlockEmpty">
            Todavia no hay una rutina cargada para este alumno.
          </p>
        )}
      </article>
    </aside>
  )
}
