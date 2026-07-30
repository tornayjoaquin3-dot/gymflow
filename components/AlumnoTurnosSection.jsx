'use client'

import { useEffect, useState } from 'react'
import { formatHora } from '../lib/turnos-utils'

const DOS_HORAS_MS = 2 * 60 * 60 * 1000

export default function AlumnoTurnosSection({ supabase }) {
  const [disponibles, setDisponibles] = useState([])
  const [misReservas, setMisReservas] = useState([])
  const [loadingDisponibles, setLoadingDisponibles] = useState(true)
  const [loadingMisReservas, setLoadingMisReservas] = useState(true)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [procesandoId, setProcesandoId] = useState('')

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

  useEffect(() => {
    cargarDisponibles()
    cargarMisReservas()
  }, [supabase])

  const fechasConReservaActiva = new Set(misReservas.map((reserva) => reserva.fecha))

  async function reservar(turno) {
    setError('')
    setMensaje('')
    setProcesandoId(turno.id)

    const { error: rpcError } = await supabase.rpc('reservar_turno', {
      p_turno_id: turno.id,
    })

    setProcesandoId('')

    if (rpcError) {
      setError(rpcError.message)
      return
    }

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

  function motivoNoReservable(turno) {
    if (turno.estado !== 'abierto') {
      return 'No disponible'
    }

    if (turno.cupo_ocupado >= turno.cupo_maximo) {
      return 'Turno completo'
    }

    if (fechasConReservaActiva.has(turno.fecha)) {
      return 'Ya tenes un turno ese dia'
    }

    return ''
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
        <p>Reserva un turno para los proximos 7 dias o cancela uno que ya tengas.</p>
      </div>

      {error && <div className="error">{error}</div>}
      {mensaje && <div className="success">{mensaje}</div>}

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

      <h3>Turnos disponibles</h3>

      <div className="dataPanel">
        <div className="dataTableHeader turnosTableGrid">
          <span>Fecha</span>
          <span>Horario</span>
          <span>Cupo</span>
          <span>Estado</span>
          <span>Acciones</span>
        </div>

        <div className="dataTableBody">
          {loadingDisponibles ? (
            <div className="studentsTableEmpty">Cargando turnos...</div>
          ) : disponibles.length === 0 ? (
            <div className="studentsTableEmpty">No hay turnos disponibles por ahora.</div>
          ) : (
            disponibles.map((turno) => {
              const motivo = motivoNoReservable(turno)

              return (
                <div key={turno.id} className="dataRow dataRowCompact turnosTableGrid">
                  <span data-label="Fecha">{turno.fecha}</span>
                  <span data-label="Horario">
                    {formatHora(turno.hora_inicio)} - {formatHora(turno.hora_fin)}
                  </span>
                  <span data-label="Cupo">
                    {turno.cupo_ocupado} / {turno.cupo_maximo}
                  </span>
                  <span data-label="Estado">{turno.estado}</span>
                  <div className="rowActions rowActionsCompact" data-label="Acciones">
                    {motivo ? (
                      <span className="rowNote">{motivo}</span>
                    ) : (
                      <button
                        type="button"
                        className="smallButton smallButtonCompact"
                        disabled={procesandoId === turno.id}
                        onClick={() => reservar(turno)}
                      >
                        {procesandoId === turno.id ? 'Reservando...' : 'Reservar'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </section>
  )
}
