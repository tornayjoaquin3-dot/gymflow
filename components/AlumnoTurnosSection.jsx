'use client'

import { useEffect, useState } from 'react'
import { formatHora } from '../lib/turnos-utils'
import { getMonthKey, getStudentPaymentSnapshot } from '../lib/student-utils'
import ReservarTurnoFlow from './ReservarTurnoFlow'

const DOS_HORAS_MS = 2 * 60 * 60 * 1000

function mesActualCapitalizado() {
  const mes = new Intl.DateTimeFormat('es-AR', { month: 'long' }).format(new Date())
  return mes.charAt(0).toUpperCase() + mes.slice(1)
}

export default function AlumnoTurnosSection({ supabase, profile }) {
  const [disponibles, setDisponibles] = useState([])
  const [loadingDisponibles, setLoadingDisponibles] = useState(true)
  const [misReservas, setMisReservas] = useState([])
  const [loadingMisReservas, setLoadingMisReservas] = useState(true)
  const [pagos, setPagos] = useState([])
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [procesandoId, setProcesandoId] = useState('')
  const [mostrarFlujoReserva, setMostrarFlujoReserva] = useState(false)
  const [reservando, setReservando] = useState(false)

  async function cargarDisponibles() {
    if (!supabase) return

    setLoadingDisponibles(true)

    const { data, error: fetchError } = await supabase.rpc('turnos_disponibles')

    if (fetchError) {
      setError('No se pudieron cargar los turnos disponibles.')
    } else {
      setDisponibles(data || [])
    }

    setLoadingDisponibles(false)
  }

  async function cargarMisReservas() {
    if (!supabase) return

    setLoadingMisReservas(true)

    const { data, error: fetchError } = await supabase
      .from('reservas')
      .select('id, fecha, turnos ( fecha, hora_inicio, hora_fin, estado )')
      .eq('estado', 'reservado')
      .order('fecha')

    if (fetchError) {
      setError('No se pudieron cargar tus turnos.')
    } else {
      setMisReservas(data || [])
    }

    setLoadingMisReservas(false)
  }

  async function cargarPagos() {
    if (!supabase) return

    const { data, error: fetchError } = await supabase.from('pagos').select('*')

    if (!fetchError) {
      setPagos(data || [])
    }
  }

  useEffect(() => {
    cargarDisponibles()
    cargarMisReservas()
    cargarPagos()
  }, [supabase])

  const fechasConReservaActiva = new Set(misReservas.map((reserva) => reserva.fecha))
  const estadoCuota = getStudentPaymentSnapshot({ id: profile?.alumnoId }, pagos, getMonthKey())
  const cuotaAlDia = estadoCuota.filterStatus === 'paid'
  const reservables = disponibles.filter((turno) => turno.estado === 'abierto' && turno.disponible)

  async function confirmarReserva(turno) {
    setError('')
    setMensaje('')
    setReservando(true)

    const { error: rpcError } = await supabase.rpc('reservar_turno', {
      p_turno_id: turno.id,
    })

    setReservando(false)

    if (rpcError) {
      setError(rpcError.message)
      return
    }

    setMostrarFlujoReserva(false)
    setMensaje('Turno reservado.')
    await Promise.all([cargarDisponibles(), cargarMisReservas()])
  }

  async function cancelar(reserva) {
    setError('')
    setMensaje('')
    setProcesandoId(reserva.id)

    const { error: rpcError } = await supabase.rpc('cancelar_reserva', {
      p_reserva_id: reserva.id,
    })

    setProcesandoId('')

    if (rpcError) {
      setError(rpcError.message)
      return
    }

    setMensaje('Reserva cancelada.')
    await Promise.all([cargarDisponibles(), cargarMisReservas()])
  }

  function faltanMenosDeDosHoras(reserva) {
    const turno = reserva.turnos

    if (!turno) return false

    const inicio = new Date(`${turno.fecha}T${turno.hora_inicio}`)
    return inicio.getTime() - Date.now() < DOS_HORAS_MS
  }

  return (
    <section className="section">
      <div className="sectionHeader">
        <h2>Turnos</h2>
        <p>Tus proximos turnos y la opcion de reservar uno nuevo.</p>
      </div>

      {error && <div className="error">{error}</div>}
      {mensaje && <div className="success">{mensaje}</div>}

      <button
        type="button"
        className="reservarTurnoButton"
        onClick={() => setMostrarFlujoReserva(true)}
      >
        + Reservar turno
      </button>

      <div className={cuotaAlDia ? 'success' : 'error'}>
        {cuotaAlDia
          ? `Se encuentra registrado el pago correspondiente al mes de ${mesActualCapitalizado()}.`
          : `Aun no se registro el pago correspondiente al mes de ${mesActualCapitalizado()}.`}
      </div>

      <h3>Mis turnos</h3>

      <div className="dataPanel">
        <div className="dataTableHeader misTurnosGrid">
          <span>Fecha</span>
          <span>Horario</span>
          <span>Estado</span>
          <span>Acciones</span>
        </div>

        <div className="dataTableBody">
          {loadingMisReservas ? (
            <div className="studentsTableEmpty">Cargando tus turnos...</div>
          ) : misReservas.length === 0 ? (
            <div className="studentsTableEmpty">Todavia no tenes turnos reservados.</div>
          ) : (
            misReservas.map((reserva) => {
              const bloqueadoPorTiempo = faltanMenosDeDosHoras(reserva)

              return (
                <div key={reserva.id} className="dataRow dataRowCompact misTurnosGrid">
                  <span data-label="Fecha">{reserva.turnos?.fecha}</span>
                  <span data-label="Horario">
                    {formatHora(reserva.turnos?.hora_inicio)} - {formatHora(reserva.turnos?.hora_fin)}
                  </span>
                  <span data-label="Estado">Reservado</span>
                  <div className="rowActions rowActionsCompact" data-label="Acciones">
                    {bloqueadoPorTiempo ? (
                      <span className="rowNote">No se puede cancelar (falta menos de 2hs)</span>
                    ) : (
                      <button
                        type="button"
                        className="smallButton smallButtonCompact dangerButton"
                        disabled={procesandoId === reserva.id}
                        onClick={() => cancelar(reserva)}
                      >
                        {procesandoId === reserva.id ? 'Cancelando...' : 'Cancelar'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {mostrarFlujoReserva && (
        <ReservarTurnoFlow
          disponibles={reservables}
          cargando={loadingDisponibles}
          fechasBloqueadas={fechasConReservaActiva}
          reservando={reservando}
          onConfirmar={confirmarReserva}
          onClose={() => setMostrarFlujoReserva(false)}
        />
      )}
    </section>
  )
}
