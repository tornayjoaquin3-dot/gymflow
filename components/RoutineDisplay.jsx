'use client'

import { useMemo } from 'react'
import { buildRoutineBlocks } from '../lib/routine-parser'

export default function RoutineDisplay({ ejercicios }) {
  const rawRoutineText =
    typeof ejercicios === 'string'
      ? ejercicios
      : ejercicios != null
        ? String(ejercicios)
        : ''

  const routineBlocks = useMemo(() => buildRoutineBlocks(rawRoutineText), [rawRoutineText])
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
