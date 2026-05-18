'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [email, setEmail] = useState('socio@gymflow.com')
  const [password, setPassword] = useState('123456')
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [alumnos, setAlumnos] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const [nuevoAlumno, setNuevoAlumno] = useState({
    nombre: '',
    telefono: '',
    observaciones: '',
  })

  const [editAlumno, setEditAlumno] = useState({
    nombre: '',
    telefono: '',
    estado: 'activo',
    observaciones: '',
  })

  async function login(event) {
    event.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (loginError) {
      setError(loginError.message)
      setLoading(false)
      return
    }

    const { data: profileData, error: profileError } = await supabase
      .from('usuarios')
      .select('nombre,email,rol')
      .eq('email', data.user.email)
      .single()

    if (profileError) {
      setError('El usuario existe, pero no tiene rol cargado en la tabla usuarios.')
      setLoading(false)
      return
    }

    setUser(data.user)
    setProfile(profileData)
    await cargarAlumnos()
    setLoading(false)
  }

  async function logout() {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setAlumnos([])
    setEditingId(null)
  }

  async function cargarAlumnos() {
    const { data, error } = await supabase
      .from('alumnos')
      .select('*')
      .order('creado_en', { ascending: false })

    if (error) {
      setError('No se pudieron cargar los alumnos.')
      return
    }

    setAlumnos(data || [])
  }

  async function crearAlumno(event) {
    event.preventDefault()
    setError('')

    if (!nuevoAlumno.nombre.trim()) {
      setError('El nombre del alumno es obligatorio.')
      return
    }

    const { error } = await supabase.from('alumnos').insert([
      {
        nombre: nuevoAlumno.nombre,
        telefono: nuevoAlumno.telefono,
        observaciones: nuevoAlumno.observaciones,
        estado: 'activo',
      },
    ])

    if (error) {
      setError('No se pudo crear el alumno.')
      return
    }

    setNuevoAlumno({
      nombre: '',
      telefono: '',
      observaciones: '',
    })

    await cargarAlumnos()
  }

  function iniciarEdicion(alumno) {
    setEditingId(alumno.id)
    setEditAlumno({
      nombre: alumno.nombre || '',
      telefono: alumno.telefono || '',
      estado: alumno.estado || 'activo',
      observaciones: alumno.observaciones || '',
    })
  }

  function cancelarEdicion() {
    setEditingId(null)
    setEditAlumno({
      nombre: '',
      telefono: '',
      estado: 'activo',
      observaciones: '',
    })
  }

  async function guardarEdicion(id) {
    setError('')

    if (!editAlumno.nombre.trim()) {
      setError('El nombre del alumno es obligatorio.')
      return
    }

    const { error } = await supabase
      .from('alumnos')
      .update({
        nombre: editAlumno.nombre,
        telefono: editAlumno.telefono,
        estado: editAlumno.estado,
        observaciones: editAlumno.observaciones,
      })
      .eq('id', id)

    if (error) {
      setError('No se pudo actualizar el alumno.')
      return
    }

    cancelarEdicion()
    await cargarAlumnos()
  }

  async function eliminarAlumno(id) {
    const confirmar = window.confirm('¿Seguro que querés eliminar este alumno?')

    if (!confirmar) return

    const { error } = await supabase.from('alumnos').delete().eq('id', id)

    if (error) {
      setError('No se pudo eliminar el alumno.')
      return
    }

    await cargarAlumnos()
  }

  useEffect(() => {
    async function verificarSesion() {
      const { data } = await supabase.auth.getSession()

      if (data.session?.user) {
        setUser(data.session.user)

        const { data: profileData } = await supabase
          .from('usuarios')
          .select('nombre,email,rol')
          .eq('email', data.session.user.email)
          .single()

        setProfile(profileData)
        await cargarAlumnos()
      }
    }

    verificarSesion()
  }, [])

  if (!user) {
    return (
      <main className="page">
        <section className="panel loginPanel">
          <h1>GymFlow</h1>
          <p>Ingresá con un usuario socio o profesor.</p>

          <form onSubmit={login} className="form">
            <label>Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} />

            <label>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {error && <div className="error">{error}</div>}

            <button disabled={loading}>
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <div className="hint">
            <b>Demo:</b>
            <br />
            socio@gymflow.com / 123456
            <br />
            profesor@gymflow.com / 123456
          </div>
        </section>
      </main>
    )
  }

  const isProfesor = profile?.rol === 'profesor'

  return (
    <main className="app">
      <aside className="sidebar">
        <h2>GymFlow</h2>
        {!isProfesor && <button>Dashboard</button>}
        <button>Alumnos</button>
        <button>Rutinas</button>
        {!isProfesor && <button>Costos</button>}
      </aside>

      <section className="main">
        <header className="topbar">
          <div>
            <h1>Panel {isProfesor ? 'Profesor' : 'Socio'}</h1>
            <p>
              {profile?.nombre} · {profile?.email}
            </p>
          </div>

          <button onClick={logout}>Cerrar sesión</button>
        </header>

        <div className="cards">
          {!isProfesor && (
            <article>
              <span>Dashboard</span>
              <b>Ingresos, costos y ganancia</b>
            </article>
          )}

          <article>
            <span>Alumnos</span>
            <b>{alumnos.length} alumnos registrados</b>
          </article>

          <article>
            <span>Rutinas</span>
            <b>Rutinas por alumno</b>
          </article>

          {!isProfesor && (
            <article>
              <span>Costos</span>
              <b>Egresos del gimnasio</b>
            </article>
          )}
        </div>

        <section className="section">
          <div className="sectionHeader">
            <h2>Alumnos</h2>
            <p>Alta, edición y seguimiento de alumnos del gimnasio.</p>
          </div>

          <form onSubmit={crearAlumno} className="studentForm">
            <input
              placeholder="Nombre completo"
              value={nuevoAlumno.nombre}
              onChange={(e) =>
                setNuevoAlumno({ ...nuevoAlumno, nombre: e.target.value })
              }
            />

            <input
              placeholder="Teléfono"
              value={nuevoAlumno.telefono}
              onChange={(e) =>
                setNuevoAlumno({ ...nuevoAlumno, telefono: e.target.value })
              }
            />

            <input
              placeholder="Observaciones"
              value={nuevoAlumno.observaciones}
              onChange={(e) =>
                setNuevoAlumno({ ...nuevoAlumno, observaciones: e.target.value })
              }
            />

            <button>Crear alumno</button>
          </form>

          {error && <div className="error">{error}</div>}

          <div className="table">
            <div className="tableHeader studentTableHeader">
              <span>Nombre</span>
              <span>Teléfono</span>
              <span>Estado</span>
              <span>Observaciones</span>
              <span>Acciones</span>
            </div>

            {alumnos.length === 0 ? (
              <div className="empty">Todavía no hay alumnos cargados.</div>
            ) : (
              alumnos.map((alumno) => {
                const isEditing = editingId === alumno.id

                return (
                  <div className="tableRow studentTableRow" key={alumno.id}>
                    {isEditing ? (
                      <>
                        <input
                          value={editAlumno.nombre}
                          onChange={(e) =>
                            setEditAlumno({ ...editAlumno, nombre: e.target.value })
                          }
                        />

                        <input
                          value={editAlumno.telefono}
                          onChange={(e) =>
                            setEditAlumno({ ...editAlumno, telefono: e.target.value })
                          }
                        />

                        <select
                          value={editAlumno.estado}
                          onChange={(e) =>
                            setEditAlumno({ ...editAlumno, estado: e.target.value })
                          }
                        >
                          <option value="activo">activo</option>
                          <option value="inactivo">inactivo</option>
                          <option value="baja">baja</option>
                        </select>

                        <input
                          value={editAlumno.observaciones}
                          onChange={(e) =>
                            setEditAlumno({
                              ...editAlumno,
                              observaciones: e.target.value,
                            })
                          }
                        />

                        <div className="actions">
                          <button onClick={() => guardarEdicion(alumno.id)}>
                            Guardar
                          </button>
                          <button className="secondary" onClick={cancelarEdicion}>
                            Cancelar
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <span>{alumno.nombre}</span>
                        <span>{alumno.telefono || '-'}</span>
                        <span className={`status ${alumno.estado || 'activo'}`}>
                          {alumno.estado || 'activo'}
                        </span>
                        <span>{alumno.observaciones || '-'}</span>

                        <div className="actions">
                          <button onClick={() => iniciarEdicion(alumno)}>
                            Editar
                          </button>
                          <button
                            className="danger"
                            onClick={() => eliminarAlumno(alumno.id)}
                          >
                            Eliminar
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </section>
      </section>
    </main>
  )
}
