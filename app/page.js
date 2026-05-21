'use client'

import { useEffect, useMemo, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import {
  getMonthKey,
  getPaymentMonthOptions,
  normalizeText,
} from '../lib/student-utils'

import Sidebar from '../components/Sidebar'
import Dashboard from '../components/Dashboard'
import StudentsSection from '../components/StudentsSection'
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

  const [nuevoCosto, setNuevoCosto] = useState({
    descripcion: '',
    categoria: 'alquiler',
    monto: '',
    fecha: new Date().toISOString().slice(0, 10),
    observaciones: '',
  })
  const [editingCostoId, setEditingCostoId] = useState(null)

  const [nuevaRutina, setNuevaRutina] = useState({
    alumno_id: '',
    alumno_ids: [],
    nombre: '',
    objetivo: '',
    ejercicios: '',
    observaciones: '',
  })
  const [editingRutinaId, setEditingRutinaId] = useState(null)

  function getSupabaseClient() {
    if (!supabase) {
      setError('Configura las variables de Supabase para usar la app.')
      return null
    }

    return supabase
  }

  function resetNuevoCosto() {
    setNuevoCosto({
      descripcion: '',
      categoria: 'alquiler',
      monto: '',
      fecha: new Date().toISOString().slice(0, 10),
      observaciones: '',
    })
  }

  function resetNuevaRutina() {
    setNuevaRutina({
      alumno_id: '',
      alumno_ids: [],
      nombre: '',
      objetivo: '',
      ejercicios: '',
      observaciones: '',
    })
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
          nombre,
          telefono
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

  async function unificarAlumnosDuplicados() {
    setError('')
    const client = getSupabaseClient()

    if (!client) return null

    const groupedMap = new Map()

    alumnos.forEach((alumno) => {
      const key = normalizeText(alumno.nombre)
      if (!key) return

      if (!groupedMap.has(key)) {
        groupedMap.set(key, [])
      }

      groupedMap.get(key).push(alumno)
    })

    const duplicateGroups = [...groupedMap.values()].filter(
      (group) => group.length > 1
    )

    if (duplicateGroups.length === 0) {
      return {
        alumnosUnificados: 0,
        pagosReasignados: 0,
        rutinasReasignadas: 0,
        alumnosEliminados: 0,
      }
    }

    let alumnosUnificados = 0
    let pagosReasignados = 0
    let rutinasReasignadas = 0
    let alumnosEliminados = 0

    for (const group of duplicateGroups) {
      const sortedGroup = [...group].sort((left, right) => {
        const leftCompleteness =
          Number(Boolean(left.telefono)) + Number(Boolean(left.observaciones))
        const rightCompleteness =
          Number(Boolean(right.telefono)) + Number(Boolean(right.observaciones))

        if (leftCompleteness !== rightCompleteness) {
          return rightCompleteness - leftCompleteness
        }

        const leftCreatedAt = new Date(left.creado_en || 0).getTime()
        const rightCreatedAt = new Date(right.creado_en || 0).getTime()

        return leftCreatedAt - rightCreatedAt
      })

      const principal = sortedGroup[0]
      const duplicates = sortedGroup.slice(1)
      const duplicateIds = duplicates.map((alumno) => alumno.id)

      if (!duplicateIds.length) continue

      const mergedPhone =
        principal.telefono ||
        duplicates.find((alumno) => alumno.telefono)?.telefono ||
        ''
      const mergedObservaciones =
        principal.observaciones ||
        duplicates.find((alumno) => alumno.observaciones)?.observaciones ||
        ''

      const { error: updatePrincipalError } = await client
        .from('alumnos')
        .update({
          telefono: mergedPhone,
          observaciones: mergedObservaciones,
        })
        .eq('id', principal.id)

      if (updatePrincipalError) {
        throw new Error(
          `No se pudo actualizar el alumno principal ${principal.nombre}.`
        )
      }

      const pagosDelGrupo = pagos.filter((pago) =>
        duplicateIds.includes(pago.alumno_id)
      )

      if (pagosDelGrupo.length > 0) {
        const { error: updatePagosError } = await client
          .from('pagos')
          .update({ alumno_id: principal.id })
          .in('alumno_id', duplicateIds)

        if (updatePagosError) {
          throw new Error(`No se pudieron reasignar pagos de ${principal.nombre}.`)
        }

        pagosReasignados += pagosDelGrupo.length
      }

      const rutinasDelGrupo = rutinas.filter((rutina) =>
        duplicateIds.includes(rutina.alumno_id)
      )

      if (rutinasDelGrupo.length > 0) {
        const { error: updateRutinasError } = await client
          .from('rutinas')
          .update({ alumno_id: principal.id })
          .in('alumno_id', duplicateIds)

        if (updateRutinasError) {
          throw new Error(`No se pudieron reasignar rutinas de ${principal.nombre}.`)
        }

        rutinasReasignadas += rutinasDelGrupo.length
      }

      const { error: deleteDuplicatesError } = await client
        .from('alumnos')
        .delete()
        .in('id', duplicateIds)

      if (deleteDuplicatesError) {
        throw new Error(`No se pudieron eliminar duplicados de ${principal.nombre}.`)
      }

      if (duplicateIds.includes(selectedAlumnoId)) {
        setSelectedAlumnoId(principal.id)
      }

      alumnosUnificados += group.length
      alumnosEliminados += duplicateIds.length
    }

    await cargarDatos()

    return {
      alumnosUnificados,
      pagosReasignados,
      rutinasReasignadas,
      alumnosEliminados,
    }
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

    if (editingCostoId) {
      const { error: updateError } = await client
        .from('costos')
        .update({
          descripcion: nuevoCosto.descripcion,
          categoria: nuevoCosto.categoria,
          monto: Number(nuevoCosto.monto),
          fecha: nuevoCosto.fecha || null,
          observaciones: nuevoCosto.observaciones,
        })
        .eq('id', editingCostoId)

      if (updateError) {
        setError('No se pudo actualizar el costo.')
        return
      }
    } else {
      const { error: createError } = await client.from('costos').insert([
        {
          descripcion: nuevoCosto.descripcion,
          categoria: nuevoCosto.categoria,
          monto: Number(nuevoCosto.monto),
          fecha: nuevoCosto.fecha || new Date().toISOString().slice(0, 10),
          observaciones: nuevoCosto.observaciones,
        },
      ])

      if (createError) {
        setError('No se pudo registrar el costo.')
        return
      }
    }

    resetNuevoCosto()
    setEditingCostoId(null)

    await cargarCostos()
  }

  function editarCosto(costo) {
    setEditingCostoId(costo.id)
    setNuevoCosto({
      descripcion: costo.descripcion || '',
      categoria: costo.categoria || 'otros',
      monto: costo.monto?.toString() || '',
      fecha: costo.fecha || '',
      observaciones: costo.observaciones || '',
    })
  }

  function cancelarEdicionCosto() {
    setEditingCostoId(null)
    resetNuevoCosto()
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

    if (editingCostoId === id) {
      cancelarEdicionCosto()
    }

    await cargarCostos()
  }

  async function crearRutina(event) {
    event.preventDefault()
    setError('')

    if (!nuevaRutina.nombre.trim()) {
      setError('Carga el nombre de la rutina.')
      return
    }

    const client = getSupabaseClient()

    if (!client) return

    const selectedAlumnoIds = [
      ...new Set(
        (nuevaRutina.alumno_ids?.length
          ? nuevaRutina.alumno_ids
          : nuevaRutina.alumno_id
            ? [nuevaRutina.alumno_id]
            : []
        ).filter(Boolean)
      ),
    ]

    const routinePayload = {
      nombre: nuevaRutina.nombre,
      objetivo: nuevaRutina.objetivo,
      ejercicios: nuevaRutina.ejercicios,
      observaciones: nuevaRutina.observaciones,
    }

    if (editingRutinaId) {
      const primaryAlumnoId = selectedAlumnoIds[0] || null
      const { error: updateError } = await client
        .from('rutinas')
        .update({
          alumno_id: primaryAlumnoId,
          ...routinePayload,
        })
        .eq('id', editingRutinaId)

      if (updateError) {
        setError(
          primaryAlumnoId
            ? 'No se pudo actualizar la rutina.'
            : 'Tu configuracion actual no permite guardar una rutina sin alumno asignado.'
        )
        return
      }

      const additionalAlumnoIds = selectedAlumnoIds.slice(1)

      if (additionalAlumnoIds.length > 0) {
        const { error: duplicateError } = await client.from('rutinas').insert(
          additionalAlumnoIds.map((alumnoId) => ({
            alumno_id: alumnoId,
            ...routinePayload,
          }))
        )

        if (duplicateError) {
          setError('La rutina se actualizo, pero no se pudo duplicar para todos los alumnos seleccionados.')
          await cargarRutinas()
          return
        }
      }
    } else {
      const insertRows =
        selectedAlumnoIds.length > 0
          ? selectedAlumnoIds.map((alumnoId) => ({
              alumno_id: alumnoId,
              ...routinePayload,
            }))
          : [{ alumno_id: null, ...routinePayload }]

      const { error: createError } = await client.from('rutinas').insert(
        insertRows
      )

      if (createError) {
        setError(
          selectedAlumnoIds.length > 0
            ? 'No se pudo crear la rutina.'
            : 'Tu configuracion actual no permite guardar una rutina sin alumno asignado.'
        )
        return
      }
    }

    resetNuevaRutina()
    setEditingRutinaId(null)

    await cargarRutinas()
  }

  function editarRutina(rutina) {
    const selectedAlumnoIds = Array.isArray(rutina.alumno_ids)
      ? rutina.alumno_ids.filter(Boolean)
      : rutina.alumno_id
        ? [rutina.alumno_id]
        : []

    setEditingRutinaId(rutina.id)
    setNuevaRutina({
      alumno_id: rutina.alumno_id || '',
      alumno_ids: selectedAlumnoIds,
      nombre: rutina.nombre || '',
      objetivo: rutina.objetivo || '',
      ejercicios: rutina.ejercicios || '',
      observaciones: rutina.observaciones || '',
    })
  }

  function cancelarEdicionRutina() {
    setEditingRutinaId(null)
    resetNuevaRutina()
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

  async function eliminarRutina(idOrIds) {
    const routineIds = Array.isArray(idOrIds) ? idOrIds : [idOrIds]
    const confirmar = window.confirm(
      routineIds.length > 1
        ? 'Seguro que quieres eliminar estas rutinas?'
        : 'Seguro que quieres eliminar esta rutina?'
    )

    if (!confirmar) return

    setError('')
    const client = getSupabaseClient()

    if (!client) return

    const { error: deleteError } = await client
      .from('rutinas')
      .delete()
      .in('id', routineIds)

    if (deleteError) {
      setError('No se pudo eliminar la rutina.')
      return
    }

    if (routineIds.includes(editingRutinaId)) {
      cancelarEdicionRutina()
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

        {error && <div className="error">{error}</div>}

        {activeSection === 'dashboard' && !isProfesor && (
          <Dashboard alumnos={alumnos} pagos={pagos} costos={costos} />
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
            onMergeDuplicates={unificarAlumnosDuplicados}
            onRegisterPago={registrarPagoAlumno}
            onDeletePago={eliminarPago}
            onSaveRutina={guardarRutinaAlumno}
          />
        )}

        {activeSection === 'costos' && !isProfesor && (
          <CostsSection
            costos={costos}
            nuevoCosto={nuevoCosto}
            setNuevoCosto={setNuevoCosto}
            crearCosto={crearCosto}
            editingCostoId={editingCostoId}
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
            crearRutina={crearRutina}
            editingRutinaId={editingRutinaId}
            editarRutina={editarRutina}
            cancelarEdicionRutina={cancelarEdicionRutina}
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
