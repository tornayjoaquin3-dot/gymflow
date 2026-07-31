'use client'

import { useMemo, useState } from 'react'
import { formatFechaCorta, formatHora } from '../lib/turnos-utils'

export default function ReservarTurnoFlow({
  disponibles,
  cargando,
  fechasBloqueadas,
  reservando,
  onConfirmar,
  onClose,
}) {
  const [paso, setPaso] = useState('dia')
  const [fechaElegida, setFechaElegida] = useState(null)
  const [turnoElegido, setTurnoElegido] = useState(null)

  const fechasDisponibles = useMemo(() => {
    const vistas = new Set()
    const fechas = []

    disponibles.forEach((turno) => {
      if (fechasBloqueadas.has(turno.fecha) || vistas.has(turno.fecha)) return
      vistas.add(turno.fecha)
      fechas.push(turno.fecha)
    })

    return fechas.sort()
  }, [disponibles, fechasBloqueadas])

  const horariosDelDia = useMemo(() => {
    if (!fechaElegida) return []
    return disponibles
      .filter((turno) => turno.fecha === fechaElegida)
      .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
  }, [disponibles, fechaElegida])

  function elegirFecha(fecha) {
    setFechaElegida(fecha)
    setPaso('horario')
  }

  function elegirTurno(turno) {
    setTurnoElegido(turno)
    setPaso('confirmar')
  }

  function volver() {
    if (paso === 'horario') {
      setPaso('dia')
      setFechaElegida(null)
      return
    }

    if (paso === 'confirmar') {
      setPaso('horario')
      setTurnoElegido(null)
      return
    }

    onClose()
  }

  return (
    <div className="reservarFlowOverlay">
      <div className="reservarFlowHeader">
        <button type="button" className="reservarFlowBack" onClick={volver}>
          {'<-'} {paso === 'dia' ? 'Cerrar' : 'Volver'}
        </button>
        <h3>Reservar turno</h3>
      </div>

      <div className="reservarFlowStep">
        {paso === 'dia' && (
          <>
            <p className="reservarFlowStepLabel">Elegi el dia</p>

            {cargando ? (
              <p className="reservarFlowEmpty">Cargando turnos...</p>
            ) : fechasDisponibles.length === 0 ? (
              <p className="reservarFlowEmpty">
                No hay turnos para reservar en los proximos dias.
              </p>
            ) : (
              <div className="reservarFlowDateGrid">
                {fechasDisponibles.map((fecha) => (
                  <button
                    key={fecha}
                    type="button"
                    className="reservarFlowDateChip"
                    onClick={() => elegirFecha(fecha)}
                  >
                    {formatFechaCorta(fecha)}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {paso === 'horario' && (
          <>
            <p className="reservarFlowStepLabel">
              {formatFechaCorta(fechaElegida)} — elegi el horario
            </p>

            <div className="reservarFlowSlotList">
              {horariosDelDia.map((turno) => (
                <button
                  key={turno.id}
                  type="button"
                  className="reservarFlowSlotButton"
                  onClick={() => elegirTurno(turno)}
                >
                  {formatHora(turno.hora_inicio)} - {formatHora(turno.hora_fin)}
                </button>
              ))}
            </div>
          </>
        )}

        {paso === 'confirmar' && turnoElegido && (
          <>
            <p className="reservarFlowStepLabel">Confirma tu turno</p>

            <div className="reservarFlowSummary">
              <strong>{formatFechaCorta(turnoElegido.fecha)}</strong>
              <span>
                {formatHora(turnoElegido.hora_inicio)} - {formatHora(turnoElegido.hora_fin)}
              </span>
            </div>

            <button
              type="button"
              className="reservarFlowConfirmButton"
              disabled={reservando}
              onClick={() => onConfirmar(turnoElegido)}
            >
              {reservando ? 'Reservando...' : 'Confirmar reserva'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
