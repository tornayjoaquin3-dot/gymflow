'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [email, setEmail] = useState('socio@gymflow.com')
  const [password, setPassword] = useState('123456')

  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)

  const [alumnos, setAlumnos] = useState([])
  const [pagos, setPagos] = useState([])

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [nuevoAlumno, setNuevoAlumno] = useState({
    nombre: '',
    telefono: '',
    observaciones: '',
  })

  const [nuevoPago, setNuevoPago] = useState({
    alumno_id: '',
    monto: '',
    medio_pago: 'efectivo',
    plan: 'mensual',
    mes: new Date().toLocaleString('es-AR', { month: 'long' }),
  })

  async function login(event) {
    event.preventDefault()

    setLoading(true)
    setError('')

    const { data, error: loginError } =
      await supabase.auth.signInWithPassword({
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
      setError('No se pudo cargar el perfil.')
      setLoading(false)
      return
    }

    setUser(data.user)
    setProfile(profileData)

    await cargarAlumnos()
    await cargarPagos()

    setLoading(false)
  }

  async function logout() {
    await supabase.auth.signOut()

    setUser(null)
    setProfile(null)
    setAlumnos([])
    setPagos([])
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

  async function cargarPagos() {
    const { data, error } = await supabase
      .from('pagos')
      .select(`
        *,
        alumnos (
          nombre
        )
      `)
      .order('fecha_pago', { ascending: false })

    if (error) {
      setError('No se pudieron cargar los pagos.')
      return
    }

    setPagos(data || [])
  }

  async function crearAlumno(event) {
    event.preventDefault()

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

  async function crearPago(event) {
    event.preventDefault()

    const { error } = await supabase.from('pagos').insert([
      {
        alumno_id: nuevoPago.alumno_id,
        monto: Number(nuevoPago.monto),
        medio_pago: nuevoPago.medio_pago,
        plan: nuevoPago.plan,
        mes: nuevoPago.mes,
      },
    ])

    if (error) {
      setError('No se pudo registrar el pago.')
      return
    }

    setNuevoPago({
      alumno_id: '',
      monto: '',
      medio_pago: 'efectivo',
      plan: 'mensual',
      mes: new Date().toLocaleString('es-AR', { month: 'long' }),
    })

    await cargarPagos()
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
        await cargarPagos()
      }
    }

    verificarSesion()
  }, [])

  const totalIngresos = useMemo(() => {
    return pagos.reduce((acc, pago) => acc + Number(pago.monto || 0), 0)
  }, [pagos])

  if (!user) {
    return (
      <main className="page">
        <section className="panel loginPanel">
          <h1>GymFlow</h1>

          <p>Ingresá con un usuario socio o profesor.</p>

          <form onSubmit={login} className="form">
            <label>Email</label>

            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

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
              <span>Ingresos totales</span>

              <b className="money">
                ${totalIngresos.toLocaleString('es-AR')}
              </b>
            </article>
          )}

          <article>
            <span>Alumnos</span>

            <b>{alumnos.length} registrados</b>
          </article>

          <article>
            <span>Pagos</span>

            <b>{pagos.length} registrados</b>
          </article>

          <article>
            <span>Rutinas</span>

            <b>Rutinas por alumno</b>
          </article>
        </div>

        <section className="section">
          <div className="sectionHeader">
            <h2>Alumnos</h2>
          </div>

          <form onSubmit={crearAlumno} className="studentForm">
            <input
              placeholder="Nombre completo"
              value={nuevoAlumno.nombre}
              onChange={(e) =>
                setNuevoAlumno({
                  ...nuevoAlumno,
                  nombre: e.target.value,
                })
              }
            />

            <input
              placeholder="Teléfono"
              value={nuevoAlumno.telefono}
              onChange={(e) =>
                setNuevoAlumno({
                  ...nuevoAlumno,
                  telefono: e.target.value,
                })
              }
            />

            <input
              placeholder="Observaciones"
              value={nuevoAlumno.observaciones}
              onChange={(e) =>
                setNuevoAlumno({
                  ...nuevoAlumno,
                  observaciones: e.target.value,
                })
              }
            />

            <button>Crear alumno</button>
          </form>
        </section>

        {!isProfesor && (
          <section className="section">
            <div className="sectionHeader">
              <h2>Registrar pago</h2>
            </div>

            <form onSubmit={crearPago} className="paymentForm">
              <select
                value={nuevoPago.alumno_id}
                onChange={(e) =>
                  setNuevoPago({
                    ...nuevoPago,
                    alumno_id: e.target.value,
                  })
                }
              >
                <option value="">Seleccionar alumno</option>

                {alumnos.map((alumno) => (
                  <option key={alumno.id} value={alumno.id}>
                    {alumno.nombre}
                  </option>
                ))}
              </select>

              <input
                placeholder="Monto"
                type="number"
                value={nuevoPago.monto}
                onChange={(e) =>
                  setNuevoPago({
                    ...nuevoPago,
                    monto: e.target.value,
                  })
                }
              />

              <select
                value={nuevoPago.medio_pago}
                onChange={(e) =>
                  setNuevoPago({
                    ...nuevoPago,
                    medio_pago: e.target.value,
                  })
                }
              >
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
                <option value="tarjeta">Tarjeta</option>
              </select>

              <input
                placeholder="Plan"
                value={nuevoPago.plan}
                onChange={(e) =>
                  setNuevoPago({
                    ...nuevoPago,
                    plan: e.target.value,
                  })
                }
              />

              <input
                placeholder="Mes"
                value={nuevoPago.mes}
                onChange={(e) =>
                  setNuevoPago({
                    ...nuevoPago,
                    mes: e.target.value,
                  })
                }
              />

              <button>Registrar pago</button>
            </form>

            <div className="table">
              <div className="tableHeader paymentTableHeader">
                <span>Alumno</span>
                <span>Monto</span>
                <span>Plan</span>
                <span>Mes</span>
                <span>Medio</span>
                <span>Fecha</span>
              </div>

              {pagos.map((pago) => (
                <div
                  className="tableRow paymentTableRow"
                  key={pago.id}
                >
                  <span>{pago.alumnos?.nombre}</span>

                  <span className="money">
                    ${Number(pago.monto).toLocaleString('es-AR')}
                  </span>

                  <span>{pago.plan}</span>

                  <span>{pago.mes}</span>

                  <span>{pago.medio_pago}</span>

                  <span>
                    {new Date(pago.fecha_pago).toLocaleDateString('es-AR')}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </section>
    </main>
  )
}
