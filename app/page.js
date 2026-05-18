'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [email, setEmail] = useState('socio@gymflow.com')
  const [password, setPassword] = useState('123456')
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
    setLoading(false)
  }

  async function logout() {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

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
              {profile.nombre} · {profile.email}
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
            <b>Listado e historial</b>
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
      </section>
    </main>
  )
}
