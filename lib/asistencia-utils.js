export { formatFechaCorta, formatHora } from './turnos-utils'

// turnos ya llega ordenado por fecha/hora_inicio (misma query que
// TurnosSection.jsx), asi que agrupar preserva el orden cronologico dentro
// de cada dia.
export function agruparTurnosPorFecha(turnos) {
  return turnos.reduce((acc, turno) => {
    const fecha = turno.fecha
    if (!acc[fecha]) acc[fecha] = []
    acc[fecha].push(turno)
    return acc
  }, {})
}

export const ESTADOS_ASISTENCIA = {
  PRESENTE: 'presente',
  AUSENTE: 'ausente',
  SIN_RESERVA: 'sin_reserva',
}
