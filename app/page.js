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
  const [rutinas, setRutinas] = useState([])

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeSection, setActiveSection] = useState('alumnos')
  const [selectedAlumnoId, setSelectedAlumnoId] = useState(null)

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
      setError('No se pudo cargar el perfil del usuario.')
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
    setActiveSection('alumnos')
    setSelectedAlumnoId(null)
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
      setError('Seleccioná un alumno y cargá el monto.')
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
      setError('Completá descripción y monto del costo.')
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

  async function crearRutina(event) {
    event.preventDefault()
    setError('')

    if (!nuevaRutina.alumno_id || !nuevaRutina.nombre.trim()) {
      setError('Seleccioná un alumno y cargá el nombre de la rutina.')
      return
    }

    const { error } = await supabase.from('rutinas').insert([
      {
        alumno_id: nuevaRutina.alumno_id,
        nombre: nuevaRutina.nombre,
        objetivo: nuevaRutina.objetivo,
        ejercicios: nuevaRutina.ejercicios,
        observaciones: nuevaRutina.observaciones,
      },
    ])

    if (error) {
      setError('No se pudo crear la rutina.')
      return
    }

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
  const isProfesor = profile?.rol === 'profesor'

  const selectedAlumno = alumnos.find((alumno) => alumno.id === selectedAlumnoId)

  const pagosDelAlumno = pagos.filter(
    (pago) => pago.alumno_id === selectedAlumnoId
  )

  const rutinasDelAlumno = rutinas.filter(
    (rutina) => rutina.alumno_id === selectedAlumnoId
  )

  const totalPagadoAlumno = pagosDelAlumno.reduce(
    (acc, pago) => acc + Number(pago.monto || 0),
    0
  )

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
            <b>Usuarios demo:</b>
            <br />
            socio@gymflow.com / 123456
            <br />
            profesor@gymflow.com / 123456
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="app">
      <aside className="sidebar">
        <h2>GymFlow</h2>

        {!isProfesor && (
          <button onClick={() => setActiveSection('dashboard')}>
            Dashboard
          </button>
        )}

        <button onClick={() => setActiveSection('alumnos')}>Alumnos</button>
        <button onClick={() => setActiveSection('rutinas')}>Rutinas</button>

        {!isProfesor && (
          <>
            <button onClick={() => setActiveSection('pagos')}>Pagos</button>
            <button onClick={() => setActiveSection('costos')}>Costos</button>
          </>
        )}
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
              <b className="money">${totalIngresos.toLocaleString('es-AR')}</b>
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

            <article>
              <span>Alumnos</span>
              <b>{alumnos.length} registrados</b>
            </article>
          </div>
        )}

        {error && <div className="error">{error}</div>}

        {activeSection === 'dashboard' && !isProfesor && (
          <section className="section">
            <div className="sectionHeader">
              <h2>Dashboard</h2>
              <p>Resumen económico general del gimnasio.</p>
            </div>

            <div className="cards">
              <article>
                <span>Total ingresos</span>
                <b className="money">${totalIngresos.toLocaleString('es-AR')}</b>
              </article>

              <article>
                <span>Total costos</span>
                <b className="dangerText">
                  ${totalCostos.toLocaleString('es-AR')}
                </b>
              </article>

              <article>
                <span>Resultado</span>
                <b className={ganancia >= 0 ? 'money' : 'dangerText'}>
                  ${ganancia.toLocaleString('es-AR')}
                </b>
              </article>
            </div>
          </section>
        )}

        {activeSection === 'alumnos' && (
          <section className="section">
            <div className="sectionHeader">
              <h2>Alumnos</h2>
              <p>Alta y listado de alumnos.</p>
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
                  setNuevoAlumno({
                    ...nuevoAlumno,
                    observaciones: e.target.value,
                  })
                }
              />

              <button>Crear alumno</button>
            </form>

            <div className="simpleList">
              {alumnos.length === 0 ? (
                <div className="empty">Todavía no hay alumnos cargados.</div>
              ) : (
                alumnos.map((alumno) => (
                  <article key={alumno.id} className="listCard">
                    <h3>{alumno.nombre}</h3>
                    <p>Teléfono: {alumno.telefono || '-'}</p>
                    <p>Estado: {alumno.estado || 'activo'}</p>
                    <p>Observaciones: {alumno.observaciones || '-'}</p>

                    <button
                      className="smallButton"
                      onClick={() => {
                        setSelectedAlumnoId(alumno.id)
                        setActiveSection('fichaAlumno')
                      }}
                    >
                      Ver ficha
                    </button>
                  </article>
                ))
              )}
            </div>
          </section>
        )}

        {activeSection === 'fichaAlumno' && selectedAlumno && (
          <section className="section">
            <div className="sectionHeader">
              <h2>Ficha de {selectedAlumno.nombre}</h2>
              <p>Historial completo del alumno.</p>
            </div>

            <div className="cards">
              <article>
                <span>Estado</span>
                <b>{selectedAlumno.estado || 'activo'}</b>
              </article>

              <article>
                <span>Total pagado</span>
                <b className="money">
                  ${totalPagadoAlumno.toLocaleString('es-AR')}
                </b>
              </article>

              <article>
                <span>Pagos registrados</span>
                <b>{pagosDelAlumno.length}</b>
              </article>

              <article>
                <span>Rutinas cargadas</span>
                <b>{rutinasDelAlumno.length}</b>
              </article>
            </div>

            <div className="studentDetail">
              <article className="listCard">
                <h3>Datos del alumno</h3>
                <p>Teléfono: {selectedAlumno.telefono || '-'}</p>
                <p>Estado: {selectedAlumno.estado || 'activo'}</p>
                <p>Observaciones: {selectedAlumno.observaciones || '-'}</p>
              </article>

              <article className="listCard">
                <h3>Pagos del alumno</h3>

                {pagosDelAlumno.length === 0 ? (
                  <p>No hay pagos registrados.</p>
                ) : (
                  pagosDelAlumno.map((pago) => (
                    <div key={pago.id} className="miniItem">
                      <b>${Number(pago.monto || 0).toLocaleString('es-AR')}</b>
                      <span>Mes: {pago.mes || '-'}</span>
                      <span>Plan: {pago.plan || '-'}</span>
                      <span>Medio: {pago.medio_pago || '-'}</span>
                    </div>
                  ))
                )}
              </article>

              <article className="listCard">
                <h3>Rutinas del alumno</h3>

                {rutinasDelAlumno.length === 0 ? (
                  <p>No hay rutinas registradas.</p>
                ) : (
                  rutinasDelAlumno.map((rutina) => (
                    <div key={rutina.id} className="miniItem">
                      <b>{rutina.nombre || 'Rutina sin nombre'}</b>
                      <span>Objetivo: {rutina.objetivo || '-'}</span>
                      <pre>{rutina.ejercicios || '-'}</pre>
                    </div>
                  ))
                )}
              </article>
            </div>

            <button
              className="smallButton"
              onClick={() => setActiveSection('alumnos')}
            >
              Volver a alumnos
            </button>
          </section>
        )}

        {activeSection === 'rutinas' && (
          <section className="section">
            <div className="sectionHeader">
              <h2>Rutinas</h2>
              <p>Los profesores pueden crear y visualizar rutinas.</p>
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
                  setNuevaRutina({ ...nuevaRutina, nombre: e.target.value })
                }
              />

              <input
                placeholder="Objetivo"
                value={nuevaRutina.objetivo}
                onChange={(e) =>
                  setNuevaRutina({ ...nuevaRutina, objetivo: e.target.value })
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
              {rutinas.length === 0 ? (
                <div className="empty">Todavía no hay rutinas cargadas.</div>
              ) : (
                rutinas.map((rutina) => (
                  <article className="routineCard" key={rutina.id}>
                    <span>{rutina.alumnos?.nombre || 'Sin alumno'}</span>
                    <h3>{rutina.nombre}</h3>
                    <p>
                      <b>Objetivo:</b> {rutina.objetivo || '-'}
                    </p>
                    <p>
                      <b>Ejercicios:</b>
                    </p>
                    <pre>{rutina.ejercicios || '-'}</pre>
                    {rutina.observaciones && (
                      <p>
                        <b>Observaciones:</b> {rutina.observaciones}
                      </p>
                    )}
                  </article>
                ))
              )}
            </div>
          </section>
        )}

        {activeSection === 'pagos' && !isProfesor && (
          <section className="section">
            <div className="sectionHeader">
              <h2>Pagos</h2>
              <p>Registro de cuotas e ingresos.</p>
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

            <div className="simpleList">
              {pagos.length === 0 ? (
                <div className="empty">Todavía no hay pagos cargados.</div>
              ) : (
                pagos.map((pago) => (
                  <article className="listCard" key={pago.id}>
                    <h3>{pago.alumnos?.nombre || 'Sin alumno'}</h3>
                    <p className="money">
                      ${Number(pago.monto || 0).toLocaleString('es-AR')}
                    </p>
                    <p>Plan: {pago.plan || '-'}</p>
                    <p>Mes: {pago.mes || '-'}</p>
                    <p>Medio: {pago.medio_pago || '-'}</p>
                  </article>
                ))
              )}
            </div>
          </section>
        )}

        {activeSection === 'costos' && !isProfesor && (
          <section className="section">
            <div className="sectionHeader">
              <h2>Costos</h2>
              <p>Registro de egresos del gimnasio.</p>
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

              <select
                value={nuevoCosto.categoria}
                onChange={(e) =>
                  setNuevoCosto({
                    ...nuevoCosto,
                    categoria: e.target.value,
                  })
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
                  setNuevoCosto({
                    ...nuevoCosto,
                    observaciones: e.target.value,
                  })
                }
              />

              <button>Registrar costo</button>
            </form>

            <div className="simpleList">
              {costos.length === 0 ? (
                <div className="empty">Todavía no hay costos cargados.</div>
              ) : (
                costos.map((costo) => (
                  <article className="listCard" key={costo.id}>
                    <h3>{costo.descripcion}</h3>
                    <p className="dangerText">
                      ${Number(costo.monto || 0).toLocaleString('es-AR')}
                    </p>
                    <p>Categoría: {costo.categoria || '-'}</p>
                    <p>Observaciones: {costo.observaciones || '-'}</p>
                  </article>
                ))
              )}
            </div>
          </section>
        )}
      </section>
    </main>
  )
}
