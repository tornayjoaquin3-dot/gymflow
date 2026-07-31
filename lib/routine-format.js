const FORMATO_ESTRUCTURADO = 'estructurado_v1'

// Nunca tira excepcion hacia afuera -- mismo criterio defensivo que
// buildRoutineBlocks en lib/routine-parser.js. Devuelve null para
// cualquier texto libre (la inmensa mayoria de las rutinas existentes).
export function parseStructuredRoutine(ejerciciosText) {
  if (typeof ejerciciosText !== 'string' || !ejerciciosText.trim()) {
    return null
  }

  try {
    const parsed = JSON.parse(ejerciciosText)

    if (!parsed || parsed.formato !== FORMATO_ESTRUCTURADO || !Array.isArray(parsed.dias)) {
      return null
    }

    const dias = parsed.dias.map((dia) => ({
      titulo: typeof dia?.titulo === 'string' ? dia.titulo : '',
      ejercicios: Array.isArray(dia?.ejercicios)
        ? dia.ejercicios.map((fila) => ({
            ejercicio: typeof fila?.ejercicio === 'string' ? fila.ejercicio : '',
            series: typeof fila?.series === 'string' ? fila.series : '',
            peso: typeof fila?.peso === 'string' ? fila.peso : '',
          }))
        : [],
    }))

    return { dias }
  } catch (error) {
    return null
  }
}

export function serializeStructuredRoutine(dias) {
  return JSON.stringify({
    formato: FORMATO_ESTRUCTURADO,
    dias: Array.isArray(dias) ? dias : [],
  })
}
