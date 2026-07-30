const ROUTINE_TITLE_PATTERNS = [
  /^dia\s*\d+/i,
  /^activacion\b/i,
  /^core\b/i,
  /^bloque\b/i,
  /^semana\b/i,
  /^observaciones\b/i,
]

function normalizeRoutineLine(line) {
  return String(line || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function isRoutineHeading(line) {
  const normalizedLine = normalizeRoutineLine(line)
  return ROUTINE_TITLE_PATTERNS.some((pattern) => pattern.test(normalizedLine))
}

function parseExerciseLine(line) {
  const normalizedLine = String(line || '')
    .replace(/\t+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()

  const seriesMatch = normalizedLine.match(
    /(\d+\s*[xX]\s*\d+(?:\s*[xX]\s*\d+)?(?:\s*(?:seg|min|rep|reps|series))?)(?:\s+|$)/i
  )

  if (!seriesMatch) {
    return null
  }

  const series = seriesMatch[1].trim()
  const beforeSeries = normalizedLine.slice(0, seriesMatch.index).trim()
  const afterSeries = normalizedLine
    .slice((seriesMatch.index || 0) + seriesMatch[0].length)
    .trim()
  const ejercicio = beforeSeries.replace(/[-:]+$/, '').trim()

  if (!ejercicio) {
    return null
  }

  let peso = '-'
  const weightMatch = afterSeries.match(
    /((?:c\/)?\s*\d+(?:[.,]\d+)?\s*(?:kg|kgs|k|lb|lbs|%)|(?:carga|peso)\s*:?\s*[^,.;]+)/i
  )

  if (weightMatch) {
    peso = weightMatch[1].trim()
  }

  return { ejercicio, series, peso }
}

export function buildRoutineBlocks(routineText) {
  try {
    const lines = String(routineText || '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)

    const blocks = []
    let exerciseRows = []

    function flushExerciseRows() {
      if (!exerciseRows.length) return
      blocks.push({
        type: 'exerciseTable',
        rows: exerciseRows,
      })
      exerciseRows = []
    }

    lines.forEach((line) => {
      if (isRoutineHeading(line)) {
        flushExerciseRows()
        blocks.push({
          type: 'heading',
          text: line,
        })
        return
      }

      const exerciseLine = parseExerciseLine(line)

      if (exerciseLine) {
        exerciseRows.push(exerciseLine)
        return
      }

      flushExerciseRows()
      blocks.push({
        type: 'text',
        text: line,
      })
    })

    flushExerciseRows()

    return Array.isArray(blocks) ? blocks : []
  } catch (error) {
    return []
  }
}
