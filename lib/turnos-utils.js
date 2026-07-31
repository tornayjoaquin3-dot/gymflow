// Indice 0 = domingo, igual que extract(dow from date) en Postgres, que es
// lo que usa la funcion generar_turnos para saber que dia es cada fecha.
export const DIAS_SEMANA = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miercoles',
  'Jueves',
  'Viernes',
  'Sabado',
]

export function formatHora(valorTime = '') {
  return String(valorTime || '').slice(0, 5)
}

const DIAS_SEMANA_CORTO = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab']

// new Date('YYYY-MM-DD') parsea como UTC medianoche, lo que en Argentina
// (UTC-3) puede mostrar el dia anterior. Construir la fecha con los
// componentes locales evita ese corrimiento.
function parseFechaLocal(fecha) {
  const [year, month, day] = String(fecha || '').split('-').map(Number)
  return new Date(year || 1970, (month || 1) - 1, day || 1)
}

export function formatFechaCorta(fecha) {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  const manana = new Date(hoy)
  manana.setDate(hoy.getDate() + 1)

  const fechaDate = parseFechaLocal(fecha)
  fechaDate.setHours(0, 0, 0, 0)

  if (fechaDate.getTime() === hoy.getTime()) return 'Hoy'
  if (fechaDate.getTime() === manana.getTime()) return 'Manana'

  const diaCorto = DIAS_SEMANA_CORTO[fechaDate.getDay()]
  const dd = String(fechaDate.getDate()).padStart(2, '0')
  const mm = String(fechaDate.getMonth() + 1).padStart(2, '0')
  return `${diaCorto} ${dd}/${mm}`
}
