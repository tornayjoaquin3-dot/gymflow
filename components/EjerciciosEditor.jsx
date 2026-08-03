'use client'

import { useState } from 'react'
import { parseStructuredRoutine, serializeStructuredRoutine } from '../lib/routine-format'

const DIA_VACIO = () => ({ titulo: '', ejercicios: [] })
const FILA_VACIA = () => ({ ejercicio: '', series: '', peso: '' })

export default function EjerciciosEditor({ value, onChange }) {
  const estructuraInicial = parseStructuredRoutine(value)

  const [modo, setModo] = useState(estructuraInicial ? 'dia' : 'texto')
  const [dias, setDias] = useState(estructuraInicial?.dias || [])

  function emitirDias(nuevosDias) {
    setDias(nuevosDias)

    // Si todavia no cargaron ningun dia, no pisamos el texto libre que
    // pueda haber -- evita perder una rutina vieja solo por mirar la
    // pestana "Por dia" sin llegar a cargar nada.
    if (nuevosDias.length > 0) {
      onChange(serializeStructuredRoutine(nuevosDias))
    }
  }

  function cambiarModo(nuevoModo) {
    setModo(nuevoModo)
  }

  function agregarDia() {
    emitirDias([...dias, DIA_VACIO()])
  }

  function eliminarDia(indiceDia) {
    emitirDias(dias.filter((_, i) => i !== indiceDia))
  }

  function actualizarTituloDia(indiceDia, titulo) {
    emitirDias(dias.map((dia, i) => (i === indiceDia ? { ...dia, titulo } : dia)))
  }

  function agregarFila(indiceDia) {
    emitirDias(
      dias.map((dia, i) =>
        i === indiceDia ? { ...dia, ejercicios: [...dia.ejercicios, FILA_VACIA()] } : dia
      )
    )
  }

  function eliminarFila(indiceDia, indiceFila) {
    emitirDias(
      dias.map((dia, i) =>
        i === indiceDia
          ? { ...dia, ejercicios: dia.ejercicios.filter((_, j) => j !== indiceFila) }
          : dia
      )
    )
  }

  function actualizarFila(indiceDia, indiceFila, campo, valor) {
    emitirDias(
      dias.map((dia, i) =>
        i === indiceDia
          ? {
              ...dia,
              ejercicios: dia.ejercicios.map((fila, j) =>
                j === indiceFila ? { ...fila, [campo]: valor } : fila
              ),
            }
          : dia
      )
    )
  }

  return (
    <div className="ejerciciosEditor">
      <span className="routineFieldLabel">Formato de rutina</span>

      <div className="ejerciciosEditorTabs" role="radiogroup" aria-label="Formato de rutina">
        <button
          type="button"
          role="radio"
          aria-checked={modo === 'texto'}
          className={`ejerciciosEditorTab${modo === 'texto' ? ' isSelected' : ''}`}
          onClick={() => cambiarModo('texto')}
        >
          <span className="ejerciciosEditorTabDot" />
          Texto libre
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={modo === 'dia'}
          className={`ejerciciosEditorTab${modo === 'dia' ? ' isSelected' : ''}`}
          onClick={() => cambiarModo('dia')}
        >
          <span className="ejerciciosEditorTabDot" />
          Rutina estructurada
        </button>
      </div>

      {modo === 'texto' ? (
        <textarea
          placeholder="Ejercicios"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <div className="ejerciciosEditorDias">
          {dias.length === 0 && (
            <p className="ejerciciosEditorAviso">
              Todavia no agregaste ningun dia. Si esta rutina ya tenia texto
              libre cargado, va a reemplazarse recien cuando agregues el
              primer dia.
            </p>
          )}

          {dias.map((dia, indiceDia) => (
            <div key={indiceDia} className="ejerciciosEditorDiaCard">
              <div className="ejerciciosEditorDiaHeader">
                <input
                  placeholder={`Dia ${indiceDia + 1}`}
                  value={dia.titulo}
                  onChange={(event) => actualizarTituloDia(indiceDia, event.target.value)}
                />
                <button
                  type="button"
                  className="smallButton dangerButton"
                  onClick={() => eliminarDia(indiceDia)}
                >
                  Eliminar dia
                </button>
              </div>

              <div className="ejerciciosEditorFilas">
                {dia.ejercicios.map((fila, indiceFila) => (
                  <div key={indiceFila} className="ejerciciosEditorFila">
                    <input
                      placeholder="Ejercicio"
                      value={fila.ejercicio}
                      onChange={(event) =>
                        actualizarFila(indiceDia, indiceFila, 'ejercicio', event.target.value)
                      }
                    />
                    <input
                      placeholder="Series"
                      value={fila.series}
                      onChange={(event) =>
                        actualizarFila(indiceDia, indiceFila, 'series', event.target.value)
                      }
                    />
                    <input
                      placeholder="Peso"
                      value={fila.peso}
                      onChange={(event) =>
                        actualizarFila(indiceDia, indiceFila, 'peso', event.target.value)
                      }
                    />
                    <button
                      type="button"
                      className="smallButton dangerButton"
                      onClick={() => eliminarFila(indiceDia, indiceFila)}
                    >
                      X
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="smallButton"
                onClick={() => agregarFila(indiceDia)}
              >
                + Agregar ejercicio
              </button>
            </div>
          ))}

          <button type="button" className="smallButton" onClick={agregarDia}>
            + Agregar dia
          </button>
        </div>
      )}
    </div>
  )
}
