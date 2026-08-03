'use client'

import { useEffect, useState } from 'react'
import { formatStudentName } from '../lib/student-utils'

export default function PendingAlumnoAccounts({ supabase, alumnos, onCountChange }) {
  const [pendientes, setPendientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [seleccion, setSeleccion] = useState({})
  const [vinculando, setVinculando] = useState('')
  const [mensaje, setMensaje] = useState('')

  async function cargarPendientes() {
    if (!supabase) {
      setLoading(false)
      return
    }

    setLoading(true)

    const { data, error } = await supabase
      .from('profiles')
      .select('user_id,email,nombre,role,alumno_id')
      .eq('role', 'alumno')
      .is('alumno_id', null)

    if (!error) {
      setPendientes(data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    cargarPendientes()
  }, [supabase])

  useEffect(() => {
    if (!loading) {
      onCountChange?.(pendientes.length)
    }
  }, [loading, pendientes, onCountChange])

  async function vincular(userId) {
    const alumnoId = seleccion[userId]

    if (!alumnoId) {
      setMensaje('Elegi un alumno para vincular.')
      return
    }

    setVinculando(userId)
    setMensaje('')

    const { error } = await supabase
      .from('profiles')
      .update({ alumno_id: alumnoId })
      .eq('user_id', userId)

    setVinculando('')

    if (error) {
      setMensaje('No se pudo vincular la cuenta.')
      return
    }

    await cargarPendientes()
  }

  if (loading || pendientes.length === 0) {
    return null
  }

  return (
    <div className="pendingDrawerContent">
      <p className="pendingDrawerHint">
        Se registraron pero no encontramos una ficha con su telefono.
        Elegi manualmente a que alumno corresponden.
      </p>

      {mensaje && <div className="error">{mensaje}</div>}

      <div className="simpleList">
        {pendientes.map((pendiente) => (
          <article className="listCard" key={pendiente.user_id}>
            <h3>{pendiente.nombre || pendiente.email}</h3>
            <p>{pendiente.email}</p>

            <select
              value={seleccion[pendiente.user_id] || ''}
              onChange={(event) =>
                setSeleccion({ ...seleccion, [pendiente.user_id]: event.target.value })
              }
            >
              <option value="">Seleccionar alumno</option>
              {alumnos.map((alumno) => (
                <option key={alumno.id} value={alumno.id}>
                  {formatStudentName(alumno)}
                </option>
              ))}
            </select>

            <button
              type="button"
              disabled={vinculando === pendiente.user_id}
              onClick={() => vincular(pendiente.user_id)}
            >
              {vinculando === pendiente.user_id ? 'Vinculando...' : 'Vincular'}
            </button>
          </article>
        ))}
      </div>
    </div>
  )
}
