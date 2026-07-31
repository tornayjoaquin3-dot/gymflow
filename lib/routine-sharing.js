import { parseStructuredRoutine } from './routine-format'

function formatExercisesForSharing(ejercicios) {
  const estructurada = parseStructuredRoutine(ejercicios)

  if (!estructurada) {
    return ejercicios || '-'
  }

  const lineas = []

  estructurada.dias.forEach((dia) => {
    if (dia.titulo) {
      lineas.push(dia.titulo)
    }

    dia.ejercicios.forEach((fila) => {
      const partes = [fila.ejercicio || '-']
      if (fila.series) partes.push(fila.series)
      if (fila.peso) partes.push(fila.peso)
      lineas.push(`- ${partes.join(' - ')}`)
    })

    lineas.push('')
  })

  return lineas.join('\n').trim() || '-'
}

export function buildRoutineShareText(studentName, routine) {
  const safeName = studentName || 'alumno'
  const routineName = routine?.nombre || 'Rutina actual'
  const objective = routine?.objetivo || 'Sin objetivo definido'
  const exercises = formatExercisesForSharing(routine?.ejercicios)

  return [
    `Hola ${safeName}, te comparto tu rutina actual:`,
    '',
    routineName,
    `Objetivo: ${objective}`,
    '',
    'Ejercicios:',
    exercises,
    '',
    'Cualquier duda, consultame.',
  ].join('\n')
}

export function normalizeWhatsappPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '')

  if (!digits) {
    return ''
  }

  if (digits.startsWith('549')) {
    return digits
  }

  if (digits.startsWith('54')) {
    return `549${digits.slice(2)}`
  }

  if (digits.startsWith('0')) {
    return `549${digits.slice(1)}`
  }

  if (digits.length === 10 || digits.length === 11) {
    return `549${digits}`
  }

  return digits.length >= 8 ? digits : ''
}

export function getRoutineWhatsappUrl(studentName, phone, routine) {
  const text = buildRoutineShareText(studentName, routine)
  const normalizedPhone = normalizeWhatsappPhone(phone)
  const encodedText = encodeURIComponent(text)

  if (normalizedPhone) {
    return `https://wa.me/${normalizedPhone}?text=${encodedText}`
  }

  return `https://wa.me/?text=${encodedText}`
}
