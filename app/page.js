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

  const [nuevoAlumno, setNuevoAlumno] = useState({
    nombre: '',
    telefono: '',
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
            <p>Alta y seguimiento de alumnos del gimnasio.</p>
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
            <div className="tableHeader">
              <span>Nombre</span>
              <span>Teléfono</span>
              <span>Estado</span>
              <span>Observaciones</span>
            </div>

            {alumnos.length === 0 ? (
              <div className="empty">Todavía no hay alumnos cargados.</div>
            ) : (
              alumnos.map((alumno) => (
                <div className="tableRow" key={alumno.id}>
                  <span>{alumno.nombre}</span>
                  <span>{alumno.telefono || '-'}</span>
                  <span>{alumno.estado || 'activo'}</span>
                  <span>{alumno.observaciones || '-'}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </section>
    </main>
  )
}
