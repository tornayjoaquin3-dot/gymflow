'use client'

import { useEffect, useState } from 'react'
import RoutineDisplay from './RoutineDisplay'

export default function AlumnoRutinaSection({ supabase }) {
  const [rutina, setRutina] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function cargarRutina() {
      if (!supabase) return

      setLoading(true)

      const { data, error: fetchError } = await supabase
        .from('rutinas')
        .select('*')
        .order('creado_en', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (fetchError) {
        setError('No se pudo cargar tu rutina.')
      } else {
        setRutina(data)
      }

      setLoading(false)
    }

    cargarRutina()
  }, [supabase])

  return (
    <section className="section">
      <div className="sectionHeader">
        <h2>Mi rutina</h2>
        <p>Tu rutina actual, cargada por el gimnasio.</p>
      </div>

      {error && <div className="error">{error}</div>}

      {loading ? (
        <div className="studentsRoutineBody">
          <span className="studentsRoutineBodyLabel">Detalle de rutina</span>
          <div className="studentsRoutineScrollArea studentsRoutineScrollAreaEmpty">
            <p>Cargando...</p>
          </div>
        </div>
      ) : !rutina ? (
        <div className="studentsRoutineBody">
          <span className="studentsRoutineBodyLabel">Detalle de rutina</span>
          <div className="studentsRoutineScrollArea studentsRoutineScrollAreaEmpty">
            <p>Todavia no tenes una rutina cargada.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="studentsRoutineMeta">
            <strong>{rutina.nombre || 'Rutina actual'}</strong>
            {rutina.objetivo && (
              <p className="studentsRoutineObjective">{rutina.objetivo}</p>
            )}
          </div>

          <div className="studentsRoutineBody">
            <span className="studentsRoutineBodyLabel">Detalle de rutina</span>
            <RoutineDisplay ejercicios={rutina.ejercicios} />
          </div>

          {rutina.observaciones && (
            <div className="studentsRoutineNotesBlock">
              <span className="studentsRoutineBodyLabel">Observaciones</span>
              <p>{rutina.observaciones}</p>
            </div>
          )}
        </>
      )}
    </section>
  )
}
