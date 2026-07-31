'use client'

import { useMemo } from 'react'
import { buildRoutineBlocks } from '../lib/routine-parser'
import { parseStructuredRoutine } from '../lib/routine-format'

function blocksFromDias(dias) {
  const blocks = []

  dias.forEach((dia, index) => {
    // El dia siempre se muestra, aunque no se haya escrito un titulo --
    // si no, un recuadro de ejercicios queda sin decir a que dia pertenece.
    blocks.push({ type: 'heading', text: dia.titulo || `Dia ${index + 1}` })

    if (dia.ejercicios.length > 0) {
      blocks.push({ type: 'exerciseTable', rows: dia.ejercicios })
    }
  })

  return blocks
}

export default function RoutineDisplay({ ejercicios }) {
  const rawRoutineText =
    typeof ejercicios === 'string'
      ? ejercicios
      : ejercicios != null
        ? String(ejercicios)
        : ''

  const rutinaEstructurada = useMemo(() => parseStructuredRoutine(rawRoutineText), [rawRoutineText])

  const routineBlocks = useMemo(() => {
    if (rutinaEstructurada) {
      return blocksFromDias(rutinaEstructurada.dias)
    }

    return buildRoutineBlocks(rawRoutineText)
  }, [rutinaEstructurada, rawRoutineText])

  const hasStructuredRoutineBlocks = Array.isArray(routineBlocks) && routineBlocks.length > 0

  return (
    <div className="studentsRoutineScrollArea">
      {hasStructuredRoutineBlocks ? (
        <div className="studentsRoutineRichContent">
          {routineBlocks.map((block, index) => {
            if (block?.type === 'heading') {
              return (
                <div
                  key={`${block.type}-${index}-${block.text || 'heading'}`}
                  className="studentsRoutineHeading"
                >
                  {block.text}
                </div>
              )
            }

            if (block?.type === 'exerciseTable' && Array.isArray(block.rows)) {
              return (
                <div key={`${block.type}-${index}`} className="studentsRoutineTableWrap">
                  <div className="studentsRoutineTableHeader">
                    <span>Ejercicio</span>
                    <span>Series/Reps</span>
                    <span>Peso</span>
                  </div>
                  <div className="studentsRoutineTableBody">
                    {block.rows.map((row, rowIndex) => (
                      <div
                        key={`${row?.ejercicio || 'row'}-${rowIndex}`}
                        className="studentsRoutineTableRow"
                      >
                        <span>{row?.ejercicio || '-'}</span>
                        <strong>{row?.series || '-'}</strong>
                        <em>{row?.peso || '-'}</em>
                      </div>
                    ))}
                  </div>
                </div>
              )
            }

            return (
              <p
                key={`${block?.type || 'text'}-${index}-${block?.text || ''}`}
                className="studentsRoutineParagraph"
              >
                {block?.text || ''}
              </p>
            )
          })}
        </div>
      ) : rawRoutineText ? (
        <pre>{rawRoutineText}</pre>
      ) : (
        <pre>-</pre>
      )}
    </div>
  )
}
