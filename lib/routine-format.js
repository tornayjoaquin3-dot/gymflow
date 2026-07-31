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

function filaVacia(fila) {
  return !fila.ejercicio.trim() && !fila.series.trim() && !fila.peso.trim()
}

// Se llama justo antes de guardar. Si es texto libre no hay nada que
// validar. Si es estructurado: saca las filas de ejercicio completamente
// vacias (no cuentan como carga real) y no deja pasar un dia que se quede
// sin ningun ejercicio despues de esa limpieza.
export function validateAndCleanStructuredRoutine(ejerciciosText) {
  const estructurada = parseStructuredRoutine(ejerciciosText)

  if (!estructurada || estructurada.dias.length === 0) {
    return { ejercicios: ejerciciosText, error: null }
  }

  const diasLimpios = estructurada.dias.map((dia) => ({
    titulo: dia.titulo,
    ejercicios: dia.ejercicios.filter((fila) => !filaVacia(fila)),
  }))

  const indiceDiaVacio = diasLimpios.findIndex((dia) => dia.ejercicios.length === 0)

  if (indiceDiaVacio !== -1) {
    const nombreDia = estructurada.dias[indiceDiaVacio].titulo || `Dia ${indiceDiaVacio + 1}`
    return {
      ejercicios: null,
      error: `"${nombreDia}" no tiene ningun ejercicio cargado. Agrega uno o eliminalo.`,
    }
  }

  return { ejercicios: serializeStructuredRoutine(diasLimpios), error: null }
}
