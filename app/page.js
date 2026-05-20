'use client'

import { useEffect, useMemo, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { getMonthKey, getPaymentMonthOptions } from '../lib/student-utils'

import Sidebar from '../components/Sidebar'
import Dashboard from '../components/Dashboard'
import StudentsSection from '../components/StudentsSection'
import PaymentsSection from '../components/PaymentsSection'
import CostsSection from '../components/CostsSection'
import RoutinesSection from '../components/RoutinesSection'
import ExcelImportSection from '../components/ExcelImportSection'

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
  const [selectedPaymentMonth, setSelectedPaymentMonth] = useState(
    getMonthKey()
  )

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

  function getSupabaseClient() {
    if (!supabase) {
      setError('Configura las variables de Supabase para usar la app.')
      return null
    }

    return supabase
  }

  async function login(event) {
    event.preventDefault()
    setLoading(true)
    setError('')

    const client = getSupabaseClient()

    if (!client) {
      setLoading(false)
      return
    }

    const { data, error: loginError } = await client.auth.signInWithPassword({
      email,
      password,
    })

    if (loginError) {
      setError(loginError.message)
      setLoading(false)
      return
    }

    const { data: profileData, error: profileError } = await client
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
    const client = getSupabaseClient()

    if (client) {
      await client.auth.signOut()
    }

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
    const client = getSupabaseClient()

    if (!client) return

    const { data } = await client
      .from('alumnos')
      .select('*')
      .order('creado_en', { ascending: false })

    setAlumnos(data || [])
  }

  async function cargarPagos() {
    const client = getSupabaseClient()

    if (!client) return

    const { data } = await client
      .from('pagos')
      .select(
        `
        *,
        alumnos (
          nombre
        )
      `
      )
      .order('fecha_pago', { ascending: false })

    setPagos(data || [])
  }

  async function cargarCostos() {
    const client = getSupabaseClient()

    if (!client) return

    const { data } = await client
      .from('costos')
      .select('*')
      .order('fecha', { ascending: false })

    setCostos(data || [])
  }

  async function cargarRutinas() {
    const client = getSupabaseClient()

    if (!client) return

    const { data } = await client
      .from('rutinas')
      .select(
        `
        *,
        alumnos (
          nombre
        )
      `
      )
      .order('creado_en', { ascending: false })

    setRutinas(data || [])
  }

  async function crearAlumno(event) {
    event.preventDefault()
    setError('')

    if (!nuevoAlumno.nombre.trim()) {
      setError('El nombre del alumno es obligatorio.')
      return false
    }

    const client = getSupabaseClient()

    if (!client) return false

    const { data, error: createError } = await client
      .from('alumnos')
      .insert([
        {
          nombre: nuevoAlumno.nombre,
          telefono: nuevoAlumno.telefono,
          observaciones: nuevoAlumno.observaciones,
          estado: 'activo',
        },
      ])
      .select()
      .single()

    if (createError) {
      setError('No se pudo crear el alumno.')
      return false
    }

    setNuevoAlumno({
      nombre: '',
      telefono: '',
      observaciones: '',
    })

    if (data?.id) {
      setSelectedAlumnoId(data.id)
      setActiveSection('alumnos')
    }

    await cargarAlumnos()
    return true
  }

  async function actualizarAlumno(payload) {
    setError('')

    if (!payload?.id || !payload.nombre?.trim()) {
      setError('El nombre del alumno es obligatorio.')
      return false
    }

    const client = getSupabaseClient()

    if (!client) return false

    const { error: updateError } = await client
      .from('alumnos')
      .update({
        nombre: payload.nombre,
        telefono: payload.telefono,
        observaciones: payload.observaciones,
      })
      .eq('id', payload.id)

    if (updateError) {
      setError('No se pudo actualizar el alumno.')
      return false
    }

    await cargarAlumnos()
    return true
  }

  async function eliminarAlumno(id) {
    const confirmar = window.confirm(
      'Seguro que quieres eliminar este alumno?'
    )

    if (!confirmar) return false

    setError('')
    const client = getSupabaseClient()

    if (!client) return false

    const { error: deleteError } = await client
      .from('alumnos')
      .delete()
      .eq('id', id)

    if (deleteError) {
      setError('No se pudo eliminar el alumno.')
      return false
    }

    if (selectedAlumnoId === id) {
      setSelectedAlumnoId(null)
      setActiveSection('alumnos')
    }

    await cargarDatos()
    return true
  }

  async function crearPago(event) {
    event.preventDefault()
    setError('')

    if (!nuevoPago.alumno_id || !nuevoPago.monto) {
      setError('Selecciona un alumno y carga el monto.')
      return
    }

    const client = getSupabaseClient()

    if (!client) return

    const { error: createError } = await client.from('pagos').insert([
      {
        alumno_id: nuevoPago.alumno_id,
        monto: Number(nuevoPago.monto),
        medio_pago: nuevoPago.medio_pago,
        plan: nuevoPago.plan,
        mes: nuevoPago.mes,
        fecha_pago: new Date().toISOString().slice(0, 10),
      },
    ])

    if (createError) {
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

  async function registrarPagoAlumno(payload) {
    setError('')

    if (!payload?.alumno_id || !payload?.monto) {
      setError('Completa el monto para registrar el pago.')
      return false
    }

    const client = getSupabaseClient()

    if (!client) return false

    const { error: createError } = await client.from('pagos').insert([
      {
        alumno_id: payload.alumno_id,
        monto: Number(payload.monto),
        medio_pago: payload.medio_pago || 'efectivo',
        plan: payload.plan || 'mensual',
        mes: payload.mes,
        fecha_pago:
          payload.fecha_pago || new Date().toISOString().slice(0, 10),
      },
    ])

    if (createError) {
      setError('No se pudo registrar el pago.')
      return false
    }

    await cargarPagos()
    return true
  }

  async function eliminarPago(id) {
    const confirmar = window.confirm('Seguro que quieres eliminar este pago?')

    if (!confirmar) return

    setError('')
    const client = getSupabaseClient()

    if (!client) return

    const { error: deleteError } = await client
      .from('pagos')
      .delete()
      .eq('id', id)

    if (deleteError) {
      setError('No se pudo eliminar el pago.')
      return
    }

    await cargarPagos()
  }

  async function crearCosto(event) {
    event.preventDefault()
    setError('')

    if (!nuevoCosto.descripcion.trim() || !nuevoCosto.monto) {
      setError('Completa descripcion y monto del costo.')
      return
    }

    const client = getSupabaseClient()

    if (!client) return

    const { error: createError } = await client.from('costos').insert([
      {
        descripcion: nuevoCosto.descripcion,
        categoria: nuevoCosto.categoria,
        monto: Number(nuevoCosto.monto),
        observaciones: nuevoCosto.observaciones,
        fecha: new Date().toISOString().slice(0, 10),
      },
    ])

    if (createError) {
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

  async function eliminarCosto(id) {
    const confirmar = window.confirm('Seguro que quieres eliminar este costo?')

    if (!confirmar) return

    setError('')
    const client = getSupabaseClient()

    if (!client) return

    const { error: deleteError } = await client
      .from('costos')
      .delete()
      .eq('id', id)

    if (deleteError) {
      setError('No se pudo eliminar el costo.')
      return
    }

    await cargarCostos()
  }

  async function crearRutina(event) {
    event.preventDefault()
    setError('')

    if (!nuevaRutina.alumno_id || !nuevaRutina.nombre.trim()) {
      setError('Selecciona un alumno y carga el nombre de la rutina.')
      return
    }

    const client = getSupabaseClient()

    if (!client) return

    const { error: createError } = await client.from('rutinas').insert([
      {
        alumno_id: nuevaRutina.alumno_id,
        nombre: nuevaRutina.nombre,
        objetivo: nuevaRutina.objetivo,
        ejercicios: nuevaRutina.ejercicios,
        observaciones: nuevaRutina.observaciones,
      },
    ])

    if (createError) {
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

  async function guardarRutinaAlumno(payload) {
    setError('')

    if (!payload?.alumno_id || !payload?.nombre?.trim()) {
      setError('La rutina necesita un nombre.')
      return false
    }

    const client = getSupabaseClient()

    if (!client) return false

    if (payload.id) {
      const { error: updateError } = await client
        .from('rutinas')
        .update({
          nombre: payload.nombre,
          objetivo: payload.objetivo,
          ejercicios: payload.ejercicios,
          observaciones: payload.observaciones,
        })
        .eq('id', payload.id)

      if (updateError) {
        setError('No se pudo actualizar la rutina.')
        return false
      }
    } else {
      const { error: createError } = await client.from('rutinas').insert([
        {
          alumno_id: payload.alumno_id,
          nombre: payload.nombre,
          objetivo: payload.objetivo,
          ejercicios: payload.ejercicios,
          observaciones: payload.observaciones,
        },
      ])

      if (createError) {
        setError('No se pudo crear la rutina.')
        return false
      }
    }

    await cargarRutinas()
    return true
  }

  async function eliminarRutina(id) {
    const confirmar = window.confirm('Seguro que quieres eliminar esta rutina?')

    if (!confirmar) return

    setError('')
    const client = getSupabaseClient()

    if (!client) return

    const { error: deleteError } = await client
      .from('rutinas')
      .delete()
      .eq('id', id)

    if (deleteError) {
      setError('No se pudo eliminar la rutina.')
      return
    }

    await cargarRutinas()
  }

  useEffect(() => {
    async function verificarSesion() {
      if (!isSupabaseConfigured || !supabase) {
        return
      }

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

  const paymentMonthOptions = useMemo(() => {
    return getPaymentMonthOptions(pagos)
  }, [pagos])

  if (!user) {
    return (
      <main className="page">
        <section className="panel loginPanel">
          <h1>GymFlow</h1>
          <p>Ingresa con un usuario socio o profesor.</p>

          <form onSubmit={login} className="form">
            <label>Email</label>
            <input value={email} onChange={(event) => setEmail(event.target.value)} />

            <label>Contrasena</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
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

          <button onClick={logout}>Cerrar sesion</button>
        </header>

        {!isProfesor && (
          <div className="cards">
            <article>
              <span>Ingresos</span>
              <b className="money">${totalIngresos.toLocaleString('es-AR')}</b>
            </article>

            <article>
              <span>Costos</span>
              <b className="dangerText">${totalCostos.toLocaleString('es-AR')}</b>
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

        {(activeSection === 'alumnos' || activeSection === 'fichaAlumno') && (
          <StudentsSection
            alumnos={alumnos}
            pagos={pagos}
            rutinas={rutinas}
            nuevoAlumno={nuevoAlumno}
            setNuevoAlumno={setNuevoAlumno}
            crearAlumno={crearAlumno}
            eliminarAlumno={eliminarAlumno}
            selectedAlumnoId={selectedAlumnoId}
            setSelectedAlumnoId={setSelectedAlumnoId}
            selectedPaymentMonth={selectedPaymentMonth}
            setSelectedPaymentMonth={setSelectedPaymentMonth}
            paymentMonthOptions={paymentMonthOptions}
            onUpdateAlumno={actualizarAlumno}
            onRegisterPago={registrarPagoAlumno}
            onDeletePago={eliminarPago}
            onSaveRutina={guardarRutinaAlumno}
          />
        )}

        {activeSection === 'pagos' && !isProfesor && (
          <PaymentsSection
            alumnos={alumnos}
            pagos={pagos}
            nuevoPago={nuevoPago}
            setNuevoPago={setNuevoPago}
            crearPago={crearPago}
            eliminarPago={eliminarPago}
          />
        )}

        {activeSection === 'costos' && !isProfesor && (
          <CostsSection
            costos={costos}
            nuevoCosto={nuevoCosto}
            setNuevoCosto={setNuevoCosto}
            crearCosto={crearCosto}
            eliminarCosto={eliminarCosto}
          />
        )}

        {activeSection === 'rutinas' && (
          <RoutinesSection
            alumnos={alumnos}
            rutinas={rutinas}
            nuevaRutina={nuevaRutina}
            setNuevaRutina={setNuevaRutina}
            crearRutina={crearRutina}
            eliminarRutina={eliminarRutina}
          />
        )}

        {activeSection === 'importar' && !isProfesor && (
          <ExcelImportSection
            alumnos={alumnos}
            pagos={pagos}
            onImportComplete={async () => {
              await cargarAlumnos()
              await cargarPagos()
            }}
          />
        )}
      </section>
    </main>
  )
}
