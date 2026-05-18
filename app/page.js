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

  async function login(event) {
    event.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: loginError } =
      await supabase.auth.signInWithPassword({ email, password })

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
  }

  async function cargarDatos() {
    await Promise.all([
      cargarAlumnos(),
      cargarPagos(),
      cargarCostos(),
    ])
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

  async function cargarCostos() {
    const { data, error } = await supabase
      .from('costos')
      .select('*')
      .order('fecha', { ascending: false })

    if (error) {
      setError('No se pudieron cargar los costos.')
      return
    }

    setCostos(data || [])
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

  async function crearPago(event) {
    event.preventDefault()
    setError('')

    if (!nuevoPago.alumno_id || !nuevoPago.monto) {
      setError('Seleccioná un alumno y cargá el monto del pago.')
      return
    }

    const { error } = await supabase.from('pagos').insert([
      {
        alumno_id: nuevoPago.alumno_id,
        monto: Number(nuevoPago.monto),
        medio_pago: nuevoPago.medio_pago,
        plan: nuevoPago.plan,
        mes: nuevoPago.mes,
        fecha_pago: new Date().toISOString().slice(0, 10),
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

  async function crearCosto(event) {
    event.preventDefault()
    setError('')

    if (!nuevoCosto.descripcion.trim() || !nuevoCosto.monto) {
      setError('Completá la descripción y el monto del costo.')
      return
    }

    const { error } = await supabase.from('costos').insert([
      {
        descripcion: nuevoCosto.descripcion,
        categoria: nuevoCosto.categoria,
        monto: Number(nuevoCosto.monto),
        observaciones: nuevoCosto.observaciones,
        fecha: new Date().toISOString().slice(0, 10),
      },
    ])

    if (error) {
      setError('No se pudo registrar el costo.')
      return
    }

    setNuevoCosto({
      descripcion: '',
      categoria: 'alquiler',
      monto: '',
      observaciones: '',
    })

    await cargarCostos()
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
            <p>{profile?.nombre} · {profile?.email}</p>
          </div>

          <button onClick={logout}>Cerrar sesión</button>
        </header>

        <div className="cards">
          {!isProfesor && (
            <>
              <article>
                <span>Ingresos totales</span>
                <b className="money">${totalIngresos.toLocaleString('es-AR')}</b>
              </article>

              <article>
                <span>Costos totales</span>
                <b className="dangerText">${totalCostos.toLocaleString('es-AR')}</b>
              </article>

              <article>
                <span>Ganancia</span>
                <b className={ganancia >= 0 ? 'money' : 'dangerText'}>
                  ${ganancia.toLocaleString('es-AR')}
                </b>
              </article>
            </>
          )}

          <article>
            <span>Alumnos</span>
            <b>{alumnos.length} registrados</b>
          </article>

          <article>
            <span>Pagos</span>
            <b>{pagos.length} registrados</b>
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
        </section>

        {!isProfesor && (
          <>
            <section className="section">
              <div className="sectionHeader">
                <h2>Registrar pago</h2>
              </div>

              <form onSubmit={crearPago} className="paymentForm">
                <select
                  value={nuevoPago.alumno_id}
                  onChange={(e) =>
                    setNuevoPago({ ...nuevoPago, alumno_id: e.target.value })
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
                    setNuevoPago({ ...nuevoPago, monto: e.target.value })
                  }
                />

                <select
                  value={nuevoPago.medio_pago}
                  onChange={(e) =>
                    setNuevoPago({ ...nuevoPago, medio_pago: e.target.value })
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
                    setNuevoPago({ ...nuevoPago, plan: e.target.value })
                  }
                />

                <input
                  placeholder="Mes"
                  value={nuevoPago.mes}
                  onChange={(e) =>
                    setNuevoPago({ ...nuevoPago, mes: e.target.value })
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
                  <div className="tableRow paymentTableRow" key={pago.id}>
                    <span>{pago.alumnos?.nombre}</span>
                    <span className="money">
                      ${Number(pago.monto).toLocaleString('es-AR')}
                    </span>
                    <span>{pago.plan}</span>
                    <span>{pago.mes}</span>
                    <span>{pago.medio_pago}</span>
                    <span>
                      {pago.fecha_pago
                        ? new Date(pago.fecha_pago).toLocaleDateString('es-AR')
                        : '-'}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="section">
              <div className="sectionHeader">
                <h2>Costos</h2>
                <p>Cargá los egresos para calcular la ganancia real.</p>
              </div>

              <form onSubmit={crearCosto} className="costForm">
                <input
                  placeholder="Descripción"
                  value={nuevoCosto.descripcion}
                  onChange={(e) =>
                    setNuevoCosto({ ...nuevoCosto, descripcion: e.target.value })
                  }
                />

                <select
                  value={nuevoCosto.categoria}
                  onChange={(e) =>
                    setNuevoCosto({ ...nuevoCosto, categoria: e.target.value })
                  }
                >
                  <option value="alquiler">Alquiler</option>
                  <option value="sueldos">Sueldos</option>
                  <option value="servicios">Servicios</option>
                  <option value="equipamiento">Equipamiento</option>
                  <option value="marketing">Marketing</option>
                  <option value="otros">Otros</option>
                </select>

                <input
                  placeholder="Monto"
                  type="number"
                  value={nuevoCosto.monto}
                  onChange={(e) =>
                    setNuevoCosto({ ...nuevoCosto, monto: e.target.value })
                  }
                />

                <input
                  placeholder="Observaciones"
                  value={nuevoCosto.observaciones}
                  onChange={(e) =>
                    setNuevoCosto({ ...nuevoCosto, observaciones: e.target.value })
                  }
                />

                <button>Registrar costo</button>
              </form>

              <div className="table">
                <div className="tableHeader costTableHeader">
                  <span>Descripción</span>
                  <span>Categoría</span>
                  <span>Monto</span>
                  <span>Fecha</span>
                  <span>Observaciones</span>
                </div>

                {costos.map((costo) => (
                  <div className="tableRow costTableRow" key={costo.id}>
                    <span>{costo.descripcion}</span>
                    <span>{costo.categoria}</span>
                    <span className="dangerText">
                      ${Number(costo.monto).toLocaleString('es-AR')}
                    </span>
                    <span>
                      {costo.fecha
                        ? new Date(costo.fecha).toLocaleDateString('es-AR')
                        : '-'}
                    </span>
                    <span>{costo.observaciones || '-'}</span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {error && <div className="error">{error}</div>}
      </section>
    </main>
  )
}
