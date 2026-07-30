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
