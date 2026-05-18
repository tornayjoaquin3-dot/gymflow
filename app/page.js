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
  const [costos, setCostos] = useState([])

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [nuevoAlumno, setNuevoAlumno] = useState({
    nombre: '',
    telefono: '',
    observaciones: '',
  })

  const [nuevoPago, setNuevoPago] = useState({
    alumno_id: '','use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [email, setEmail] = useState('socio@gymflow.com')
  const [password, setPassword] = useState('123456')

  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)

  const [alumnos, setAlumnos] = useState([])
  const [pagos, setPagos] = useState([])
  const [costos, setCostos] = useState([])
  const [rutinas, setRutinas] = useState([])

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

  const [nuevoCosto, setNuevoCosto] = useState({
    descripcion: '',
    categoria: 'alquiler',
    monto: '',
    observaciones: '',
  })

  const [nuevaRutina, setNuevaRutina] = useState({
    alumno_id: '',
    nombre: '',
    objetivo: '',
    ejercicios: '',
    observaciones: '',
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

    await cargarDatos()

    setLoading(false)
  }

  async function logout() {
    await supabase.auth.signOut()

    setUser(null)
    setProfile(null)

    setAlumnos([])
    setPagos([])
    setCostos([])
    setRutinas([])
  }

  async function cargarDatos() {
    await Promise.all([
      cargarAlumnos(),
      cargarPagos(),
      cargarCostos(),
      cargarRutinas(),
    ])
  }

  async function cargarAlumnos() {
    const { data } = await supabase
      .from('alumnos')
      .select('*')
      .order('creado_en', { ascending: false })

    setAlumnos(data || [])
  }

  async function cargarPagos() {
    const { data } = await supabase
      .from('pagos')
      .select(`
        *,
        alumnos (
          nombre
        )
      `)
      .order('fecha_pago', { ascending: false })

    setPagos(data || [])
  }

  async function cargarCostos() {
    const { data } = await supabase
      .from('costos')
      .select('*')
      .order('fecha', { ascending: false })

    setCostos(data || [])
  }

  async function cargarRutinas() {
    const { data } = await supabase
      .from('rutinas')
      .select(`
        *,
        alumnos (
          nombre
        )
      `)
      .order('creado_en', { ascending: false })

    setRutinas(data || [])
  }

  async function crearAlumno(event) {
    event.preventDefault()

    await supabase.from('alumnos').insert([
      {
        nombre: nuevoAlumno.nombre,
        telefono: nuevoAlumno.telefono,
        observaciones: nuevoAlumno.observaciones,
        estado: 'activo',
      },
    ])

    setNuevoAlumno({
      nombre: '',
      telefono: '',
      observaciones: '',
    })

    await cargarAlumnos()
  }

  async function crearPago(event) {
    event.preventDefault()

    await supabase.from('pagos').insert([
      {
        alumno_id: nuevoPago.alumno_id,
        monto: Number(nuevoPago.monto),
        medio_pago: nuevoPago.medio_pago,
        plan: nuevoPago.plan,
        mes: nuevoPago.mes,
        fecha_pago: new Date().toISOString().slice(0, 10),
      },
    ])

    setNuevoPago({
      alumno_id: '',
      monto: '',
      medio_pago: 'efectivo',
      plan: 'mensual',
      mes: new Date().toLocaleString('es-AR', { month: 'long' }),
    })

    await cargarPagos()
  }

  async function crearCosto(event) {
    event.preventDefault()

    await supabase.from('costos').insert([
      {
        descripcion: nuevoCosto.descripcion,
        categoria: nuevoCosto.categoria,
        monto: Number(nuevoCosto.monto),
        observaciones: nuevoCosto.observaciones,
        fecha: new Date().toISOString().slice(0, 10),
      },
    ])

    setNuevoCosto({
      descripcion: '',
      categoria: 'alquiler',
      monto: '',
      observaciones: '',
    })

    await cargarCostos()
  }

  async function crearRutina(event) {
    event.preventDefault()

    await supabase.from('rutinas').insert([
      {
        alumno_id: nuevaRutina.alumno_id,
        nombre: nuevaRutina.nombre,
        objetivo: nuevaRutina.objetivo,
        ejercicios: nuevaRutina.ejercicios,
        observaciones: nuevaRutina.observaciones,
      },
    ])

    setNuevaRutina({
      alumno_id: '',
      nombre: '',
      objetivo: '',
      ejercicios: '',
      observaciones: '',
    })

    await cargarRutinas()
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

        await cargarDatos()
      }
    }

    verificarSesion()
  }, [])

  const totalIngresos = useMemo(() => {
    return pagos.reduce((acc, pago) => acc + Number(pago.monto || 0), 0)
  }, [pagos])

  const totalCostos = useMemo(() => {
    return costos.reduce((acc, costo) => acc + Number(costo.monto || 0), 0)
  }, [costos])

  const ganancia = totalIngresos - totalCostos

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

        {!isProfesor && (
          <div className="cards">
            <article>
              <span>Ingresos</span>

              <b className="money">
                ${totalIngresos.toLocaleString('es-AR')}
              </b>
            </article>

            <article>
              <span>Costos</span>

              <b className="dangerText">
                ${totalCostos.toLocaleString('es-AR')}
              </b>
            </article>

            <article>
              <span>Ganancia</span>

              <b className={ganancia >= 0 ? 'money' : 'dangerText'}>
                ${ganancia.toLocaleString('es-AR')}
              </b>
            </article>
          </div>
        )}

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
          <>
            <section className="section">
              <div className="sectionHeader">
                <h2>Pagos</h2>
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

                <button>Registrar pago</button>
              </form>
            </section>

            <section className="section">
              <div className="sectionHeader">
                <h2>Costos</h2>
              </div>

              <form onSubmit={crearCosto} className="costForm">
                <input
                  placeholder="Descripción"
                  value={nuevoCosto.descripcion}
                  onChange={(e) =>
                    setNuevoCosto({
                      ...nuevoCosto,
                      descripcion: e.target.value,
                    })
                  }
                />

                <input
                  placeholder="Monto"
                  type="number"
                  value={nuevoCosto.monto}
                  onChange={(e) =>
                    setNuevoCosto({
                      ...nuevoCosto,
                      monto: e.target.value,
                    })
                  }
                />

                <button>Registrar costo</button>
              </form>
            </section>
          </>
        )}

        <section className="section">
          <div className="sectionHeader">
            <h2>Rutinas</h2>

            <p>
              Los profesores pueden crear y visualizar rutinas.
            </p>
          </div>

          <form onSubmit={crearRutina} className="routineForm">
            <select
              value={nuevaRutina.alumno_id}
              onChange={(e) =>
                setNuevaRutina({
                  ...nuevaRutina,
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
              placeholder="Nombre rutina"
              value={nuevaRutina.nombre}
              onChange={(e) =>
                setNuevaRutina({
                  ...nuevaRutina,
                  nombre: e.target.value,
                })
              }
            />

            <input
              placeholder="Objetivo"
              value={nuevaRutina.objetivo}
              onChange={(e) =>
                setNuevaRutina({
                  ...nuevaRutina,
                  objetivo: e.target.value,
                })
              }
            />

            <textarea
              placeholder="Ejercicios"
              value={nuevaRutina.ejercicios}
              onChange={(e) =>
                setNuevaRutina({
                  ...nuevaRutina,
                  ejercicios: e.target.value,
                })
              }
            />

            <textarea
              placeholder="Observaciones"
              value={nuevaRutina.observaciones}
              onChange={(e) =>
                setNuevaRutina({
                  ...nuevaRutina,
                  observaciones: e.target.value,
                })
              }
            />

            <button>Crear rutina</button>
          </form>

          <div className="routineGrid">
            {rutinas.map((rutina) => (
              <article className="routineCard" key={rutina.id}>
                <span>{rutina.alumnos?.nombre}</span>

                <h3>{rutina.nombre}</h3>

                <p>
                  <b>Objetivo:</b> {rutina.objetivo}
                </p>

                <p>
                  <b>Ejercicios:</b>
                </p>

                <pre>{rutina.ejercicios}</pre>

                {rutina.observaciones && (
                  <p>
                    <b>Observaciones:</b> {rutina.observaciones}
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>

        {error && <div className="error">{error}</div>}
      </section>
    </main>
  )
}
