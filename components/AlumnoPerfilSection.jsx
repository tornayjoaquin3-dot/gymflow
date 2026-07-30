'use client'

import { useEffect, useState } from 'react'

export default function AlumnoPerfilSection({ supabase, profile, setError }) {
  const [alumno, setAlumno] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    telefono: '',
    email: '',
    dni: '',
  })

  useEffect(() => {
    async function cargarFicha() {
      if (!supabase || !profile?.alumnoId) {
        setLoading(false)
        return
      }

      setLoading(true)

      const { data, error: fetchError } = await supabase
        .from('alumnos')
        .select('id,nombre,apellido,telefono,email,dni')
        .eq('id', profile.alumnoId)
        .maybeSingle()

      if (fetchError) {
        setError?.('No se pudo cargar tu ficha. Intenta de nuevo mas tarde.')
      } else if (data) {
        setAlumno(data)
        setForm({
          nombre: data.nombre || '',
          apellido: data.apellido || '',
          telefono: data.telefono || '',
          email: data.email || '',
          dni: data.dni || '',
        })
      }

      setLoading(false)
    }

    cargarFicha()
  }, [supabase, profile?.alumnoId])

  async function guardarPerfil(event) {
    event.preventDefault()
    setSaving(true)
    setSaved(false)
    setError?.('')

    const { error: updateError } = await supabase
      .from('alumnos')
      .update({
        nombre: form.nombre,
        apellido: form.apellido,
        telefono: form.telefono,
        email: form.email,
        dni: form.dni,
      })
      .eq('id', profile.alumnoId)

    setSaving(false)

    if (updateError) {
      setError?.('No se pudieron guardar los cambios.')
      return
    }

    setSaved(true)
  }

  if (loading) {
    return (
      <section className="section">
        <div className="sectionHeader">
          <h2>Mi perfil</h2>
        </div>
        <p>Cargando...</p>
      </section>
    )
  }

  if (!profile?.alumnoId) {
    return (
      <section className="section">
        <div className="sectionHeader">
          <h2>Mi perfil</h2>
          <p>Tu cuenta todavia no esta vinculada a una ficha.</p>
        </div>
        <div className="hint">
          Tu cuenta fue creada correctamente, pero todavia no encontramos tu
          ficha en el sistema del gimnasio (puede ser que el telefono
          cargado no coincida). Avisale al gimnasio para que te vinculen
          manualmente. Mientras tanto no vas a poder ver rutinas ni sacar
          turnos.
        </div>
      </section>
    )
  }

  return (
    <section className="section">
      <div className="sectionHeader">
        <h2>Mi perfil</h2>
        <p>Completa o corrige tus datos personales.</p>
      </div>

      <form onSubmit={guardarPerfil} className="form">
        <label>Nombre</label>
        <input
          value={form.nombre}
          onChange={(event) => setForm({ ...form, nombre: event.target.value })}
        />

        <label>Apellido</label>
        <input
          value={form.apellido}
          onChange={(event) => setForm({ ...form, apellido: event.target.value })}
        />

        <label>DNI</label>
        <input
          value={form.dni}
          onChange={(event) => setForm({ ...form, dni: event.target.value })}
        />

        <label>Telefono</label>
        <input
          value={form.telefono}
          onChange={(event) => setForm({ ...form, telefono: event.target.value })}
        />

        <label>Email</label>
        <input
          type="email"
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
        />

        {saved && <div className="success">Datos guardados.</div>}

        <button disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
      </form>
    </section>
  )
}
