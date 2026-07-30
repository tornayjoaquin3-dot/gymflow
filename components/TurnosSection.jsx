'use client'

import { useEffect, useState } from 'react'
import { DIAS_SEMANA, formatHora } from '../lib/turnos-utils'

const EMPTY_FRANJA = {
  dia_semana: '1',
  hora_inicio: '',
  hora_fin: '',
  cupo_maximo: '',
  activo: true,
}

export default function TurnosSection({ supabase }) {
  const [franjas, setFranjas] = useState([])
  const [turnos, setTurnos] = useState([])
  const [reservasPorTurno, setReservasPorTurno] = useState({})
  const [loadingFranjas, setLoadingFranjas] = useState(true)
  const [loadingTurnos, setLoadingTurnos] = useState(true)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  const [form, setForm] = useState(EMPTY_FRANJA)
  const [editingFranjaId, setEditingFranjaId] = useState(null)

  const [diasAdelante, setDiasAdelante] = useState(14)
  const [generando, setGenerando] = useState(false)

  async function cargarFranjas() {
    if (!supabase) return

    setLoadingFranjas(true)

    const { data, error: fetchError } = await supabase
      .from('franjas_horarias')
      .select('*')
      .order('dia_semana')
      .order('hora_inicio')

    if (fetchError) {
      setError('No se pudieron cargar los horarios.')
    } else {
      setFranjas(data || [])
    }

    setLoadingFranjas(false)
  }

  async function cargarTurnos() {
    if (!supabase) return

    setLoadingTurnos(true)

    const hoy = new Date().toISOString().slice(0, 10)

    const { data: turnosData, error: turnosError } = await supabase
      .from('turnos')
      .select('*')
      .gte('fecha', hoy)
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
    cargarFranjas()
    cargarTurnos()
  }, [supabase])

  function editarFranja(franja) {
    setEditingFranjaId(franja.id)
    setForm({
      dia_semana: String(franja.dia_semana),
      hora_inicio: formatHora(franja.hora_inicio),
      hora_fin: formatHora(franja.hora_fin),
      cupo_maximo: String(franja.cupo_maximo),
      activo: franja.activo,
    })
  }

  function cancelarEdicionFranja() {
    setEditingFranjaId(null)
    setForm(EMPTY_FRANJA)
  }

  async function guardarFranja(event) {
    event.preventDefault()
    setError('')
    setMensaje('')

    if (!form.hora_inicio || !form.hora_fin || !form.cupo_maximo) {
      setError('Completa horario y cupo antes de guardar.')
      return
    }

    if (form.hora_fin <= form.hora_inicio) {
      setError('La hora de fin tiene que ser posterior a la de inicio.')
      return
    }

    const payload = {
      dia_semana: Number(form.dia_semana),
      hora_inicio: form.hora_inicio,
      hora_fin: form.hora_fin,
      cupo_maximo: Number(form.cupo_maximo),
      activo: form.activo,
    }

    const { error: saveError } = editingFranjaId
      ? await supabase.from('franjas_horarias').update(payload).eq('id', editingFranjaId)
      : await supabase.from('franjas_horarias').insert([payload])

    if (saveError) {
      setError(saveError.message)
      return
    }

    cancelarEdicionFranja()
    await cargarFranjas()
  }

  async function alternarActivo(franja) {
    setError('')

    const { error: updateError } = await supabase
      .from('franjas_horarias')
      .update({ activo: !franja.activo })
      .eq('id', franja.id)

    if (updateError) {
      setError('No se pudo actualizar el horario.')
      return
    }

    await cargarFranjas()
  }

  async function eliminarFranja(id) {
    if (!confirm('¿Eliminar este horario? Los turnos ya generados no se borran.')) {
      return
    }

    setError('')

    const { error: deleteError } = await supabase
      .from('franjas_horarias')
      .delete()
      .eq('id', id)

    if (deleteError) {
      setError('No se pudo eliminar el horario.')
      return
    }

    if (editingFranjaId === id) {
      cancelarEdicionFranja()
    }

    await cargarFranjas()
  }

  async function generarTurnos() {
    setError('')
    setMensaje('')
    setGenerando(true)

    const { data, error: rpcError } = await supabase.rpc('generar_turnos', {
      p_dias_adelante: Number(diasAdelante) || 7,
    })

    setGenerando(false)

    if (rpcError) {
      setError(rpcError.message)
      return
    }

    setMensaje(`Se generaron ${data} turnos.`)
    await cargarTurnos()
  }

  async function cambiarEstadoTurno(turno, nuevoEstado) {
    setError('')

    const { error: updateError } = await supabase
      .from('turnos')
      .update({ estado: nuevoEstado })
      .eq('id', turno.id)

    if (updateError) {
      setError('No se pudo actualizar el turno.')
      return
    }

    await cargarTurnos()
  }

  return (
    <section className="section">
      <div className="sectionHeader">
        <h2>Turnos</h2>
        <p>Configura los horarios semanales y genera los turnos que van a poder reservar los alumnos.</p>
      </div>

      {error && <div className="error">{error}</div>}
      {mensaje && <div className="success">{mensaje}</div>}

      <h3>Horarios</h3>

      <form onSubmit={guardarFranja} className="franjaForm">
        <select
          value={form.dia_semana}
          onChange={(event) => setForm({ ...form, dia_semana: event.target.value })}
        >
          {DIAS_SEMANA.map((dia, indice) => (
            <option key={dia} value={indice}>
              {dia}
            </option>
          ))}
        </select>

        <input
          type="time"
          value={form.hora_inicio}
          onChange={(event) => setForm({ ...form, hora_inicio: event.target.value })}
        />

        <input
          type="time"
          value={form.hora_fin}
          onChange={(event) => setForm({ ...form, hora_fin: event.target.value })}
        />

        <input
          type="number"
          min="1"
          placeholder="Cupo"
          value={form.cupo_maximo}
          onChange={(event) => setForm({ ...form, cupo_maximo: event.target.value })}
        />

        <label className="franjaActivoLabel">
          <input
            type="checkbox"
            checked={form.activo}
            onChange={(event) => setForm({ ...form, activo: event.target.checked })}
          />
          Activo
        </label>

        <button>{editingFranjaId ? 'Guardar cambios' : 'Agregar horario'}</button>

        {editingFranjaId && (
          <button type="button" className="smallButton" onClick={cancelarEdicionFranja}>
            Cancelar edicion
          </button>
        )}
      </form>

      <div className="dataPanel">
        <div className="dataTableHeader franjasTableGrid">
          <span>Dia</span>
          <span>Horario</span>
          <span>Cupo</span>
          <span>Estado</span>
          <span>Acciones</span>
        </div>

        <div className="dataTableBody">
          {loadingFranjas ? (
            <div className="studentsTableEmpty">Cargando horarios...</div>
          ) : franjas.length === 0 ? (
            <div className="studentsTableEmpty">Todavia no hay horarios configurados.</div>
          ) : (
            franjas.map((franja) => (
              <div key={franja.id} className="dataRow dataRowCompact franjasTableGrid">
                <span data-label="Dia">{DIAS_SEMANA[franja.dia_semana]}</span>
                <span data-label="Horario">
                  {formatHora(franja.hora_inicio)} - {formatHora(franja.hora_fin)}
                </span>
                <span data-label="Cupo">{franja.cupo_maximo}</span>
                <span data-label="Estado">{franja.activo ? 'Activo' : 'Inactivo'}</span>
                <div className="rowActions rowActionsCompact" data-label="Acciones">
                  <button
                    type="button"
                    className="smallButton smallButtonCompact"
                    onClick={() => alternarActivo(franja)}
                  >
                    {franja.activo ? 'Desactivar' : 'Activar'}
                  </button>
                  <button
                    type="button"
                    className="smallButton smallButtonCompact"
                    onClick={() => editarFranja(franja)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="smallButton smallButtonCompact dangerButton"
                    onClick={() => eliminarFranja(franja.id)}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <h3>Proximos turnos</h3>

      <div className="franjaForm">
        <input
          type="number"
          min="1"
          max="60"
          value={diasAdelante}
          onChange={(event) => setDiasAdelante(event.target.value)}
        />
        <button type="button" onClick={generarTurnos} disabled={generando}>
          {generando ? 'Generando...' : 'Generar turnos'}
        </button>
      </div>

      <div className="dataPanel">
        <div className="dataTableHeader turnosTableGrid">
          <span>Fecha</span>
          <span>Horario</span>
          <span>Cupo</span>
          <span>Estado</span>
          <span>Acciones</span>
        </div>

        <div className="dataTableBody">
          {loadingTurnos ? (
            <div className="studentsTableEmpty">Cargando turnos...</div>
          ) : turnos.length === 0 ? (
            <div className="studentsTableEmpty">
              No hay turnos generados. Configura un horario y apreta "Generar turnos".
            </div>
          ) : (
            turnos.map((turno) => (
              <div key={turno.id} className="dataRow dataRowCompact turnosTableGrid">
                <span data-label="Fecha">{turno.fecha}</span>
                <span data-label="Horario">
                  {formatHora(turno.hora_inicio)} - {formatHora(turno.hora_fin)}
                </span>
                <span data-label="Cupo">
                  {reservasPorTurno[turno.id] || 0} / {turno.cupo_maximo}
                </span>
                <span data-label="Estado">{turno.estado}</span>
                <div className="rowActions rowActionsCompact" data-label="Acciones">
                  {turno.estado === 'abierto' ? (
                    <>
                      <button
                        type="button"
                        className="smallButton smallButtonCompact"
                        onClick={() => cambiarEstadoTurno(turno, 'cerrado')}
                      >
                        Cerrar
                      </button>
                      <button
                        type="button"
                        className="smallButton smallButtonCompact dangerButton"
                        onClick={() => cambiarEstadoTurno(turno, 'cancelado')}
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="smallButton smallButtonCompact"
                      onClick={() => cambiarEstadoTurno(turno, 'abierto')}
                    >
                      Reabrir
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  )
}
