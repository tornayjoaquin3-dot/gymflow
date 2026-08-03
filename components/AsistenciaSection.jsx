'use client'

import { useEffect, useState } from 'react'
import {
  agruparTurnosPorFecha,
  formatFechaCorta,
  formatHora,
} from '../lib/asistencia-utils'
import {
  formatStudentName,
  getMonthKey,
  getStudentPaymentSnapshot,
  normalizePhone,
  normalizeText,
} from '../lib/student-utils'
import StudentStatusBadge from './StudentStatusBadge'

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

function sumarDias(fechaISO, dias) {
  const fecha = new Date(`${fechaISO}T00:00:00`)
  fecha.setDate(fecha.getDate() + dias)
  return fecha.toISOString().slice(0, 10)
}

export default function AsistenciaSection({ supabase }) {
  const [turnos, setTurnos] = useState([])
  const [reservasPorTurno, setReservasPorTurno] = useState({})
  const [loadingTurnos, setLoadingTurnos] = useState(true)
  const [diasAdelante, setDiasAdelante] = useState(7)
  const [error, setError] = useState('')

  const [diasExpandidos, setDiasExpandidos] = useState(() => new Set([hoyISO()]))

  const [turnoSeleccionado, setTurnoSeleccionado] = useState(null)
  const [detalle, setDetalle] = useState(null)

  const [currentUserId, setCurrentUserId] = useState(null)

  const [alumnos, setAlumnos] = useState([])
  const [alumnosCargados, setAlumnosCargados] = useState(false)
  const [mostrarBuscador, setMostrarBuscador] = useState(false)
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    if (!supabase) return

    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data?.user?.id || null)
    })
  }, [supabase])

  async function cargarTurnos() {
    if (!supabase) return

    setLoadingTurnos(true)
    setError('')

    const hoy = hoyISO()
    const hasta = sumarDias(hoy, Number(diasAdelante) || 7)

    const { data: turnosData, error: turnosError } = await supabase
      .from('turnos')
      .select('*')
      .gte('fecha', hoy)
      .lte('fecha', hasta)
      .order('fecha')
      .order('hora_inicio')

    if (turnosError) {
      setError('No se pudieron cargar los turnos.')
      setLoadingTurnos(false)
      return
    }

    const turnoIds = (turnosData || []).map((turno) => turno.id)

    const { data: reservasData } = turnoIds.length
      ? await supabase
          .from('reservas')
          .select('turno_id')
          .eq('estado', 'reservado')
          .in('turno_id', turnoIds)
      : { data: [] }

    const conteo = (reservasData || []).reduce((acc, reserva) => {
      acc[reserva.turno_id] = (acc[reserva.turno_id] || 0) + 1
      return acc
    }, {})

    setTurnos(turnosData || [])
    setReservasPorTurno(conteo)
    setLoadingTurnos(false)
  }

  useEffect(() => {
    cargarTurnos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, diasAdelante])

  function alternarDiaExpandido(fecha) {
    setDiasExpandidos((actual) => {
      const nuevo = new Set(actual)
      if (nuevo.has(fecha)) {
        nuevo.delete(fecha)
      } else {
        nuevo.add(fecha)
      }
      return nuevo
    })
  }

  async function abrirTurno(turno) {
    setTurnoSeleccionado(turno)
    setMostrarBuscador(false)
    setBusqueda('')
    await cargarDetalle(turno)
  }

  function volverAlListado() {
    setTurnoSeleccionado(null)
    setDetalle(null)
    setMostrarBuscador(false)
    setBusqueda('')
  }

  async function cargarDetalle(turno) {
    setDetalle({
      loading: true,
      error: '',
      alumnosReservados: [],
      sinReserva: [],
      pagos: [],
    })

    const { data: reservasData, error: reservasError } = await supabase
      .from('reservas')
      .select('id,alumno_id,alumnos(nombre,apellido)')
      .eq('turno_id', turno.id)
      .eq('estado', 'reservado')

    if (reservasError) {
      setDetalle({
        loading: false,
        error: 'No se pudieron cargar las reservas del turno.',
        alumnosReservados: [],
        sinReserva: [],
        pagos: [],
      })
      return
    }

    const { data: asistenciasData, error: asistenciasError } = await supabase
      .from('asistencias')
      .select('*,alumnos(nombre,apellido)')
      .eq('turno_id', turno.id)

    if (asistenciasError) {
      setDetalle({
        loading: false,
        error: 'No se pudieron cargar las asistencias.',
        alumnosReservados: [],
        sinReserva: [],
        pagos: [],
      })
      return
    }

    const reservas = reservasData || []
    const asistenciasPorAlumno = new Map(
      (asistenciasData || []).map((asistencia) => [asistencia.alumno_id, asistencia])
    )

    const faltantes = reservas
      .filter((reserva) => !asistenciasPorAlumno.has(reserva.alumno_id))
      .map((reserva) => ({
        turno_id: turno.id,
        alumno_id: reserva.alumno_id,
        reserva_id: reserva.id,
        estado: 'ausente',
        registrado_por: currentUserId,
      }))

    if (faltantes.length > 0) {
      const { data: creadas, error: upsertError } = await supabase
        .from('asistencias')
        .upsert(faltantes, { onConflict: 'turno_id,alumno_id' })
        .select('*,alumnos(nombre,apellido)')

      if (upsertError) {
        setDetalle({
          loading: false,
          error: 'No se pudo inicializar la asistencia de este turno.',
          alumnosReservados: [],
          sinReserva: [],
          pagos: [],
        })
        return
      }

      ;(creadas || []).forEach((asistencia) => {
        asistenciasPorAlumno.set(asistencia.alumno_id, asistencia)
      })
    }

    const alumnoIds = [...new Set([...asistenciasPorAlumno.keys(), ...reservas.map((r) => r.alumno_id)])]

    const { data: pagosData } = alumnoIds.length
      ? await supabase.from('pagos').select('*').in('alumno_id', alumnoIds)
      : { data: [] }

    const alumnosReservados = reservas.map((reserva) => ({
      alumno_id: reserva.alumno_id,
      nombre: formatStudentName(reserva.alumnos),
      asistencia: asistenciasPorAlumno.get(reserva.alumno_id) || null,
    }))

    const sinReserva = [...asistenciasPorAlumno.values()]
      .filter((asistencia) => asistencia.estado === 'sin_reserva')
      .map((asistencia) => ({
        alumno_id: asistencia.alumno_id,
        nombre: formatStudentName(asistencia.alumnos),
        asistencia,
      }))

    setDetalle({
      loading: false,
      error: '',
      alumnosReservados,
      sinReserva,
      pagos: pagosData || [],
    })
  }

  async function alternarPresente(item) {
    if (!item.asistencia) return

    const nuevoEstado = item.asistencia.estado === 'presente' ? 'ausente' : 'presente'

    const { error: updateError } = await supabase
      .from('asistencias')
      .update({ estado: nuevoEstado })
      .eq('id', item.asistencia.id)

    if (updateError) {
      setDetalle((actual) => ({ ...actual, error: 'No se pudo actualizar la asistencia.' }))
      return
    }

    setDetalle((actual) => ({
      ...actual,
      error: '',
      alumnosReservados: actual.alumnosReservados.map((alumnoItem) =>
        alumnoItem.alumno_id === item.alumno_id
          ? { ...alumnoItem, asistencia: { ...alumnoItem.asistencia, estado: nuevoEstado } }
          : alumnoItem
      ),
    }))
  }

  async function quitarSinReserva(item) {
    const { error: deleteError } = await supabase
      .from('asistencias')
      .delete()
      .eq('id', item.asistencia.id)

    if (deleteError) {
      setDetalle((actual) => ({ ...actual, error: 'No se pudo quitar al alumno.' }))
      return
    }

    setDetalle((actual) => ({
      ...actual,
      error: '',
      sinReserva: actual.sinReserva.filter((alumnoItem) => alumnoItem.alumno_id !== item.alumno_id),
    }))
  }

  async function abrirBuscador() {
    setMostrarBuscador(true)

    if (!alumnosCargados) {
      const { data, error: alumnosError } = await supabase
        .from('alumnos')
        .select('id,nombre,apellido,telefono')
        .order('nombre')

      if (!alumnosError) {
        setAlumnos(data || [])
        setAlumnosCargados(true)
      }
    }
  }

  async function agregarSinReserva(alumno) {
    const { data: creada, error: insertError } = await supabase
      .from('asistencias')
      .insert([
        {
          turno_id: turnoSeleccionado.id,
          alumno_id: alumno.id,
          estado: 'sin_reserva',
          reserva_id: null,
          registrado_por: currentUserId,
        },
      ])
      .select('*,alumnos(nombre,apellido)')
      .single()

    if (insertError) {
      setDetalle((actual) => ({ ...actual, error: 'No se pudo agregar al alumno.' }))
      return
    }

    const { data: pagosAlumno } = await supabase
      .from('pagos')
      .select('*')
      .eq('alumno_id', alumno.id)

    setDetalle((actual) => ({
      ...actual,
      error: '',
      sinReserva: [
        ...actual.sinReserva,
        { alumno_id: alumno.id, nombre: formatStudentName(creada.alumnos), asistencia: creada },
      ],
      pagos: [...actual.pagos, ...(pagosAlumno || [])],
    }))

    setBusqueda('')
  }

  const turnosPorFecha = agruparTurnosPorFecha(turnos)
  const busquedaNormalizada = normalizeText(busqueda)
  const busquedaTelefono = normalizePhone(busqueda)

  const idsEnTurno = new Set(
    detalle
      ? [
          ...detalle.alumnosReservados.map((item) => item.alumno_id),
          ...detalle.sinReserva.map((item) => item.alumno_id),
        ]
      : []
  )

  const resultadosBusqueda = mostrarBuscador
    ? alumnos
        .filter((alumno) => !idsEnTurno.has(alumno.id))
        .filter((alumno) => {
          if (!busquedaNormalizada && !busquedaTelefono) return true
          const nombreMatch = normalizeText(formatStudentName(alumno)).includes(busquedaNormalizada)
          const telefonoMatch =
            busquedaTelefono && normalizePhone(alumno.telefono || '').includes(busquedaTelefono)
          return nombreMatch || telefonoMatch
        })
        .slice(0, 20)
    : []

  return (
    <section className="section">
      <div className="sectionHeader">
        <h2>Asistencia</h2>
        <p>Mira quien reservo, marca presentes y agrega alumnos que entrenaron sin reserva.</p>
      </div>

      {error && <div className="error">{error}</div>}

      {turnoSeleccionado ? (
        <>
          <button type="button" className="smallButton" onClick={volverAlListado}>
            &larr; Volver al listado
          </button>

          <h3>
            {formatFechaCorta(turnoSeleccionado.fecha)} &middot;{' '}
            {formatHora(turnoSeleccionado.hora_inicio)} - {formatHora(turnoSeleccionado.hora_fin)}
          </h3>

          {!detalle || detalle.loading ? (
            <div className="studentsTableEmpty">Cargando asistencia...</div>
          ) : detalle.error ? (
            <div className="error">{detalle.error}</div>
          ) : (
            <>
              <div className="asistenciaStats">
                <div className="asistenciaStatCard">
                  <strong>{detalle.alumnosReservados.length}</strong>
                  <span>Reservas</span>
                </div>
                <div className="asistenciaStatCard">
                  <strong>
                    {
                      detalle.alumnosReservados.filter(
                        (item) => item.asistencia?.estado === 'presente'
                      ).length
                    }
                  </strong>
                  <span>Presentes</span>
                </div>
                <div className="asistenciaStatCard">
                  <strong>
                    {
                      detalle.alumnosReservados.filter(
                        (item) => item.asistencia?.estado !== 'presente'
                      ).length
                    }
                  </strong>
                  <span>Ausentes</span>
                </div>
                <div className="asistenciaStatCard">
                  <strong>{turnoSeleccionado.cupo_maximo}</strong>
                  <span>Cupo</span>
                </div>
              </div>

              <div className="dataPanel">
                <div className="dataTableBody">
                  {detalle.alumnosReservados.length === 0 ? (
                    <div className="studentsTableEmpty">Nadie reservo este turno.</div>
                  ) : (
                    detalle.alumnosReservados.map((item) => {
                      const snapshot = getStudentPaymentSnapshot(
                        { id: item.alumno_id },
                        detalle.pagos,
                        getMonthKey()
                      )

                      return (
                        <div key={item.alumno_id} className="dataRow dataRowCompact asistenciaAlumnoGrid">
                          <span data-label="Nombre">
                            <strong>{item.nombre}</strong>
                          </span>
                          <span data-label="Pago">
                            <StudentStatusBadge
                              label={snapshot.badgeLabel}
                              tone={snapshot.badgeTone}
                              compact
                            />
                          </span>
                          <label className="asistenciaPresenteLabel" data-label="Presente">
                            <input
                              type="checkbox"
                              checked={item.asistencia?.estado === 'presente'}
                              onChange={() => alternarPresente(item)}
                            />
                            Presente
                          </label>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {detalle.sinReserva.length > 0 && (
                <>
                  <h3>Ingresaron sin reserva</h3>
                  <div className="dataPanel">
                    <div className="dataTableBody">
                      {detalle.sinReserva.map((item) => {
                        const snapshot = getStudentPaymentSnapshot(
                          { id: item.alumno_id },
                          detalle.pagos,
                          getMonthKey()
                        )

                        return (
                          <div
                            key={item.alumno_id}
                            className="dataRow dataRowCompact asistenciaSinReservaGrid"
                          >
                            <span data-label="Nombre">
                              <strong>{item.nombre}</strong>
                              <small className="asistenciaSinReservaTag">Ingreso sin reserva</small>
                            </span>
                            <span data-label="Pago">
                              <StudentStatusBadge
                                label={snapshot.badgeLabel}
                                tone={snapshot.badgeTone}
                                compact
                              />
                            </span>
                            <div className="rowActions rowActionsCompact" data-label="Acciones">
                              <button
                                type="button"
                                className="smallButton smallButtonCompact dangerButton"
                                onClick={() => quitarSinReserva(item)}
                              >
                                Quitar
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}

              {mostrarBuscador ? (
                <div className="studentsSearchBar">
                  <input
                    autoFocus
                    placeholder="Buscar alumno por nombre o telefono..."
                    value={busqueda}
                    onChange={(event) => setBusqueda(event.target.value)}
                  />

                  <div className="asistenciaBuscadorResultados">
                    {resultadosBusqueda.length === 0 ? (
                      <div className="studentsTableEmpty">Sin resultados.</div>
                    ) : (
                      resultadosBusqueda.map((alumno) => (
                        <button
                          key={alumno.id}
                          type="button"
                          className="asistenciaBuscadorResultado"
                          onClick={() => agregarSinReserva(alumno)}
                        >
                          {formatStudentName(alumno)}
                        </button>
                      ))
                    )}
                  </div>

                  <button type="button" className="smallButton" onClick={() => setMostrarBuscador(false)}>
                    Cancelar
                  </button>
                </div>
              ) : (
                <button type="button" className="smallButton" onClick={abrirBuscador}>
                  + Agregar alumno sin reserva
                </button>
              )}
            </>
          )}
        </>
      ) : (
        <>
          <div className="franjaForm">
            <label className="asistenciaPresenteLabel">
              Dias adelante
              <input
                type="number"
                min="1"
                max="60"
                value={diasAdelante}
                onChange={(event) => setDiasAdelante(event.target.value)}
              />
            </label>
          </div>

          {loadingTurnos ? (
            <div className="studentsTableEmpty">Cargando turnos...</div>
          ) : turnos.length === 0 ? (
            <div className="studentsTableEmpty">No hay turnos generados en este rango.</div>
          ) : (
            <div className="asistenciaAccordion">
              {Object.entries(turnosPorFecha).map(([fecha, turnosDelDia]) => {
                const expandido = diasExpandidos.has(fecha)

                return (
                  <div key={fecha} className="asistenciaAccordionDia">
                    <button
                      type="button"
                      className="asistenciaAccordionHeader"
                      onClick={() => alternarDiaExpandido(fecha)}
                      aria-expanded={expandido}
                    >
                      <span className={`asistenciaAccordionChevron${expandido ? ' isExpanded' : ''}`}>
                        &#9654;
                      </span>
                      <span>{formatFechaCorta(fecha)}</span>
                    </button>

                    {expandido && (
                      <div className="dataPanel">
                        <div className="dataTableBody">
                          {turnosDelDia.map((turno) => (
                            <div key={turno.id} className="dataRow dataRowCompact asistenciaTurnosGrid">
                              <span data-label="Horario">
                                <button
                                  type="button"
                                  className="rowLink"
                                  onClick={() => abrirTurno(turno)}
                                >
                                  {formatHora(turno.hora_inicio)} - {formatHora(turno.hora_fin)}
                                </button>
                              </span>
                              <span data-label="Reservas">
                                {reservasPorTurno[turno.id] || 0} / {turno.cupo_maximo}
                              </span>
                              <span data-label="Estado">{turno.estado}</span>
                              <div className="rowActions rowActionsCompact" data-label="Acciones">
                                <button
                                  type="button"
                                  className="smallButton smallButtonCompact"
                                  onClick={() => abrirTurno(turno)}
                                >
                                  Ver asistencia
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </section>
  )
}
