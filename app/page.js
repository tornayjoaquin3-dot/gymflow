'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

import Sidebar from '../components/Sidebar'
import Dashboard from '../components/Dashboard'
import StudentsSection from '../components/StudentsSection'
import StudentDetail from '../components/StudentDetail'
import PaymentsSection from '../components/PaymentsSection'
import CostsSection from '../components/CostsSection'
import RoutinesSection from '../components/RoutinesSection'

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

  const selectedAlumno = alumnos.find(
    (alumno) => alumno.id === selectedAlumnoId
  )

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

  return (
    <main className="app">
      <Sidebar
        isProfesor={isProfesor}
        activeSection={activeSection}
        setActiveSection={setActiveSection}
      />

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

            <article>
              <span>Alumnos</span>

              <b>{alumnos.length} registrados</b>
            </article>
          </div>
        )}

        {error && <div className="error">{error}</div>}

        {activeSection === 'dashboard' && !isProfesor && (
          <Dashboard
            totalIngresos={totalIngresos}
            totalCostos={totalCostos}
            ganancia={ganancia}
            alumnos={alumnos}
            pagos={pagos}
            costos={costos}
          />
        )}

        {activeSection === 'alumnos' && (
          <StudentsSection
            alumnos={alumnos}
            nuevoAlumno={nuevoAlumno}
            setNuevoAlumno={setNuevoAlumno}
            crearAlumno={crearAlumno}
            setSelectedAlumnoId={setSelectedAlumnoId}
            setActiveSection={setActiveSection}
          />
        )}

        {activeSection === 'fichaAlumno' && selectedAlumno && (
          <StudentDetail
            selectedAlumno={selectedAlumno}
            pagosDelAlumno={pagosDelAlumno}
            rutinasDelAlumno={rutinasDelAlumno}
            totalPagadoAlumno={totalPagadoAlumno}
            setActiveSection={setActiveSection}
          />
        )}

        {activeSection === 'pagos' && !isProfesor && (
          <PaymentsSection
            alumnos={alumnos}
            pagos={pagos}
            nuevoPago={nuevoPago}
            setNuevoPago={setNuevoPago}
            crearPago={crearPago}
          />
        )}

        {activeSection === 'costos' && !isProfesor && (
          <CostsSection
            costos={costos}
            nuevoCosto={nuevoCosto}
            setNuevoCosto={setNuevoCosto}
            crearCosto={crearCosto}
          />
        )}

        {activeSection === 'rutinas' && (
          <RoutinesSection
            alumnos={alumnos}
            rutinas={rutinas}
            nuevaRutina={nuevaRutina}
            setNuevaRutina={setNuevaRutina}
            crearRutina={crearRutina}
          />
        )}
      </section>
    </main>
  )
}
