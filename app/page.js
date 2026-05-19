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
  const [alumnoEditandoId, setAlumnoEditandoId] = useState(null)
  const [pagoEditandoId, setPagoEditandoId] = useState(null)
  const [costoEditandoId, setCostoEditandoId] = useState(null)
  const [rutinaEditandoId, setRutinaEditandoId] = useState(null)

  const [nuevoAlumno, setNuevoAlumno] = useState({
    nombre: '',
    telefono: '',
    observaciones: '',
  })

  function pagoVacio() {
    return {
      alumno_id: '',
      monto: '',
      medio_pago: 'efectivo',
      plan: 'mensual',
      mes: new Date().toLocaleString('es-AR', { month: 'long' }),
    }
  }

  const [nuevoPago, setNuevoPago] = useState(pagoVacio)

  function costoVacio() {
    return {
      descripcion: '',
      categoria: 'alquiler',
      monto: '',
      observaciones: '',
    }
  }

  const [nuevoCosto, setNuevoCosto] = useState(costoVacio)

  function rutinaVacia() {
    return {
      alumno_id: '',
      nombre: '',
      objetivo: '',
      ejercicios: '',
      observaciones: '',
    }
  }

  const [nuevaRutina, setNuevaRutina] = useState(rutinaVacia)

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
    setAlumnoEditandoId(null)
    setPagoEditandoId(null)
    setCostoEditandoId(null)
    setRutinaEditandoId(null)
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

  async function guardarAlumno(event) {
    event.preventDefault()
    setError('')

    if (!nuevoAlumno.nombre.trim()) {
      setError('El nombre del alumno es obligatorio.')
      return
    }

    if (alumnoEditandoId) {
      const { error } = await supabase
        .from('alumnos')
        .update({
          nombre: nuevoAlumno.nombre,
          telefono: nuevoAlumno.telefono,
          observaciones: nuevoAlumno.observaciones,
        })
        .eq('id', alumnoEditandoId)

      if (error) {
        setError('No se pudo actualizar el alumno.')
        return
      }
    } else {
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
    }

    setNuevoAlumno({
      nombre: '',
      telefono: '',
      observaciones: '',
    })

    setAlumnoEditandoId(null)

    await cargarAlumnos()
  }

  function editarAlumno(alumno) {
    setAlumnoEditandoId(alumno.id)

    setNuevoAlumno({
      nombre: alumno.nombre || '',
      telefono: alumno.telefono || '',
      observaciones: alumno.observaciones || '',
    })

    setActiveSection('alumnos')
  }

  function cancelarEdicionAlumno() {
    setAlumnoEditandoId(null)

    setNuevoAlumno({
      nombre: '',
      telefono: '',
      observaciones: '',
    })
  }

  async function eliminarAlumno(id) {
    const confirmar = window.confirm(
      '¿Seguro que querés eliminar este alumno? También se eliminará su historial asociado si la base está configurada en cascada.'
    )

    if (!confirmar) return

    setError('')

    const { error } = await supabase.from('alumnos').delete().eq('id', id)

    if (error) {
      setError('No se pudo eliminar el alumno.')
      return
    }

    if (selectedAlumnoId === id) {
      setSelectedAlumnoId(null)
      setActiveSection('alumnos')
    }

    await cargarDatos()
  }

  async function guardarPago(event) {
    event.preventDefault()
    setError('')

    if (!nuevoPago.alumno_id || !nuevoPago.monto) {
      setError('Seleccioná un alumno y cargá el monto.')
      return
    }

    const datosPago = {
      alumno_id: nuevoPago.alumno_id,
      monto: Number(nuevoPago.monto),
      medio_pago: nuevoPago.medio_pago,
      plan: nuevoPago.plan,
      mes: nuevoPago.mes,
    }

    if (pagoEditandoId) {
      const { error } = await supabase
        .from('pagos')
        .update(datosPago)
        .eq('id', pagoEditandoId)

      if (error) {
        setError('No se pudo actualizar el pago.')
        return
      }
    } else {
      const { error } = await supabase.from('pagos').insert([
        {
          ...datosPago,
          fecha_pago: new Date().toISOString().slice(0, 10),
        },
      ])

      if (error) {
        setError('No se pudo registrar el pago.')
        return
      }
    }

    setNuevoPago(pagoVacio())
    setPagoEditandoId(null)

    await cargarPagos()
  }

  function editarPago(pago) {
    setPagoEditandoId(pago.id)

    setNuevoPago({
      alumno_id: pago.alumno_id || '',
      monto: String(pago.monto ?? ''),
      medio_pago: pago.medio_pago || 'efectivo',
      plan: pago.plan || 'mensual',
      mes: pago.mes || '',
    })

    setActiveSection('pagos')
  }

  function cancelarEdicionPago() {
    setPagoEditandoId(null)
    setNuevoPago(pagoVacio())
  }

  async function eliminarPago(id) {
    const confirmar = window.confirm('¿Seguro que querés eliminar este pago?')

    if (!confirmar) return

    setError('')

    const { error } = await supabase.from('pagos').delete().eq('id', id)

    if (error) {
      setError('No se pudo eliminar el pago.')
      return
    }

    if (pagoEditandoId === id) {
      cancelarEdicionPago()
    }

    await cargarPagos()
  }

  async function guardarCosto(event) {
    event.preventDefault()
    setError('')

    if (!nuevoCosto.descripcion.trim() || !nuevoCosto.monto) {
      setError('Completá descripción y monto del costo.')
      return
    }

    const datosCosto = {
      descripcion: nuevoCosto.descripcion,
      categoria: nuevoCosto.categoria,
      monto: Number(nuevoCosto.monto),
      observaciones: nuevoCosto.observaciones,
    }

    if (costoEditandoId) {
      const { error } = await supabase
        .from('costos')
        .update(datosCosto)
        .eq('id', costoEditandoId)

      if (error) {
        setError('No se pudo actualizar el costo.')
        return
      }
    } else {
      const { error } = await supabase.from('costos').insert([
        {
          ...datosCosto,
          fecha: new Date().toISOString().slice(0, 10),
        },
      ])

      if (error) {
        setError('No se pudo registrar el costo.')
        return
      }
    }

    setNuevoCosto(costoVacio())
    setCostoEditandoId(null)

    await cargarCostos()
  }

  function editarCosto(costo) {
    setCostoEditandoId(costo.id)

    setNuevoCosto({
      descripcion: costo.descripcion || '',
      categoria: costo.categoria || 'alquiler',
      monto: String(costo.monto ?? ''),
      observaciones: costo.observaciones || '',
    })

    setActiveSection('costos')
  }

  function cancelarEdicionCosto() {
    setCostoEditandoId(null)
    setNuevoCosto(costoVacio())
  }

  async function eliminarCosto(id) {
    const confirmar = window.confirm('¿Seguro que querés eliminar este costo?')

    if (!confirmar) return

    setError('')

    const { error } = await supabase.from('costos').delete().eq('id', id)

    if (error) {
      setError('No se pudo eliminar el costo.')
      return
    }

    if (costoEditandoId === id) {
      cancelarEdicionCosto()
    }

    await cargarCostos()
  }

  async function guardarRutina(event) {
    event.preventDefault()
    setError('')

    if (!nuevaRutina.alumno_id || !nuevaRutina.nombre.trim()) {
      setError('Seleccioná un alumno y cargá el nombre de la rutina.')
      return
    }

    const datosRutina = {
      alumno_id: nuevaRutina.alumno_id,
      nombre: nuevaRutina.nombre,
      objetivo: nuevaRutina.objetivo,
      ejercicios: nuevaRutina.ejercicios,
      observaciones: nuevaRutina.observaciones,
    }

    if (rutinaEditandoId) {
      const { error } = await supabase
        .from('rutinas')
        .update(datosRutina)
        .eq('id', rutinaEditandoId)

      if (error) {
        setError('No se pudo actualizar la rutina.')
        return
      }
    } else {
      const { error } = await supabase.from('rutinas').insert([datosRutina])

      if (error) {
        setError('No se pudo crear la rutina.')
        return
      }
    }

    setNuevaRutina(rutinaVacia())
    setRutinaEditandoId(null)

    await cargarRutinas()
  }

  function editarRutina(rutina) {
    setRutinaEditandoId(rutina.id)

    setNuevaRutina({
      alumno_id: rutina.alumno_id || '',
      nombre: rutina.nombre || '',
      objetivo: rutina.objetivo || '',
      ejercicios: rutina.ejercicios || '',
      observaciones: rutina.observaciones || '',
    })

    setActiveSection('rutinas')
  }

  function cancelarEdicionRutina() {
    setRutinaEditandoId(null)
    setNuevaRutina(rutinaVacia())
  }

  async function eliminarRutina(id) {
    const confirmar = window.confirm('¿Seguro que querés eliminar esta rutina?')

    if (!confirmar) return

    setError('')

    const { error } = await supabase.from('rutinas').delete().eq('id', id)

    if (error) {
      setError('No se pudo eliminar la rutina.')
      return
    }

    if (rutinaEditandoId === id) {
      cancelarEdicionRutina()
    }

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
            rutinas={rutinas}
          />
        )}

        {activeSection === 'alumnos' && (
          <StudentsSection
            alumnos={alumnos}
            nuevoAlumno={nuevoAlumno}
            setNuevoAlumno={setNuevoAlumno}
            guardarAlumno={guardarAlumno}
            alumnoEditandoId={alumnoEditandoId}
            editarAlumno={editarAlumno}
            cancelarEdicionAlumno={cancelarEdicionAlumno}
            eliminarAlumno={eliminarAlumno}
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
            guardarPago={guardarPago}
            pagoEditandoId={pagoEditandoId}
            editarPago={editarPago}
            cancelarEdicionPago={cancelarEdicionPago}
            eliminarPago={eliminarPago}
          />
        )}

        {activeSection === 'costos' && !isProfesor && (
          <CostsSection
            costos={costos}
            nuevoCosto={nuevoCosto}
            setNuevoCosto={setNuevoCosto}
            guardarCosto={guardarCosto}
            costoEditandoId={costoEditandoId}
            editarCosto={editarCosto}
            cancelarEdicionCosto={cancelarEdicionCosto}
            eliminarCosto={eliminarCosto}
          />
        )}

        {activeSection === 'rutinas' && (
          <RoutinesSection
            alumnos={alumnos}
            rutinas={rutinas}
            nuevaRutina={nuevaRutina}
            setNuevaRutina={setNuevaRutina}
            guardarRutina={guardarRutina}
            rutinaEditandoId={rutinaEditandoId}
            editarRutina={editarRutina}
            cancelarEdicionRutina={cancelarEdicionRutina}
            eliminarRutina={eliminarRutina}
          />
        )}
      </section>
    </main>
  )
}
