'use client'

import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  claveNombre,
  clavePago,
  construirResumenImportacion,
  parsearArchivoExcel,
} from '../lib/excelImport'

export default function ExcelImportSection({ alumnos, pagos, onImportComplete }) {
  const inputRef = useRef(null)
  const [archivoNombre, setArchivoNombre] = useState('')
  const [parseError, setParseError] = useState('')
  const [importando, setImportando] = useState(false)
  const [resumen, setResumen] = useState(null)
  const [resultado, setResultado] = useState(null)

  async function handleArchivo(event) {
    const file = event.target.files?.[0]
    setParseError('')
    setResultado(null)

    if (!file) {
      setArchivoNombre('')
      setResumen(null)
      return
    }

    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setParseError('Seleccioná un archivo .xlsx válido.')
      setResumen(null)
      return
    }

    setArchivoNombre(file.name)

    try {
      const buffer = await file.arrayBuffer()
      const { filas, hojasDetectadas, errores } = parsearArchivoExcel(buffer)

      if (hojasDetectadas.length === 0) {
        setParseError(
          'No se detectaron hojas mensuales de 2026. Verificá que el archivo tenga hojas como "Ene 2026", "Feb 2026", etc.'
        )
        setResumen(null)
        return
      }

      if (filas.length === 0) {
        setParseError(
          'Se detectaron hojas válidas pero no hay filas con nombre y cuota para importar.'
        )
        setResumen(null)
        return
      }

      const preview = construirResumenImportacion(filas, alumnos, pagos)

      setResumen({
        ...preview,
        erroresParseo: errores,
      })
    } catch (err) {
      setParseError(err.message || 'No se pudo leer el archivo Excel.')
      setResumen(null)
    }
  }

  async function handleImportar() {
    if (!resumen || resumen.pagosAImportar === 0) return

    const confirmar = window.confirm(
      `¿Importar ${resumen.pagosAImportar} pagos y crear ${resumen.alumnosNuevos.length} alumnos nuevos?`
    )

    if (!confirmar) return

    setImportando(true)
    setParseError('')

    const alumnosPorClave = new Map()
    alumnos.forEach((alumno) => {
      alumnosPorClave.set(claveNombre(alumno.nombre), alumno)
    })

    const existentes = new Set(
      pagos.map((p) =>
        clavePago(p.alumno_id, p.fecha_pago, Number(p.monto), p.mes)
      )
    )

    const errores = [...(resumen.erroresParseo || [])]
    let alumnosCreados = 0
    const alumnosReutilizados = resumen.alumnosReutilizados.length
    let duplicadosOmitidos = resumen.duplicados

    try {
      const nombresACrear = resumen.alumnosNuevos.filter(
        (nombre) => !alumnosPorClave.has(claveNombre(nombre))
      )

      if (nombresACrear.length > 0) {
        const observacionesPorNombre = new Map()

        resumen.filasImportables.forEach((fila) => {
          if (fila.observaciones && !observacionesPorNombre.has(fila.nombreClave)) {
            observacionesPorNombre.set(fila.nombreClave, fila.observaciones)
          }
        })

        const payloadAlumnos = nombresACrear.map((nombre) => ({
          nombre,
          telefono: '',
          observaciones:
            observacionesPorNombre.get(claveNombre(nombre)) ||
            'Importado desde Excel',
          estado: 'activo',
        }))

        const { data: nuevosAlumnos, error: errorAlumnos } = await supabase
          .from('alumnos')
          .insert(payloadAlumnos)
          .select()

        if (errorAlumnos) {
          throw new Error(`Error al crear alumnos: ${errorAlumnos.message}`)
        }

        nuevosAlumnos?.forEach((alumno) => {
          alumnosPorClave.set(claveNombre(alumno.nombre), alumno)
        })

        alumnosCreados = nuevosAlumnos?.length || 0
      }

      const pagosInsert = []

      resumen.filasImportables.forEach((fila) => {
        const alumno = alumnosPorClave.get(fila.nombreClave)

        if (!alumno) {
          errores.push(`No se pudo vincular alumno: ${fila.nombre}`)
          return
        }

        const clave = clavePago(
          alumno.id,
          fila.fecha_pago,
          fila.monto,
          fila.mes
        )

        if (existentes.has(clave)) {
          duplicadosOmitidos += 1
          return
        }

        existentes.add(clave)
        pagosInsert.push({
          alumno_id: alumno.id,
          monto: fila.monto,
          medio_pago: fila.medio_pago,
          plan: fila.plan,
          mes: fila.mes,
          fecha_pago: fila.fecha_pago,
        })
      })

      let pagosImportados = 0
      const chunkSize = 50

      for (let i = 0; i < pagosInsert.length; i += chunkSize) {
        const chunk = pagosInsert.slice(i, i + chunkSize)
        const { error: errorPagos } = await supabase.from('pagos').insert(chunk)

        if (errorPagos) {
          errores.push(`Error al importar pagos: ${errorPagos.message}`)
          break
        }

        pagosImportados += chunk.length
      }

      setResultado({
        alumnosCreados,
        alumnosReutilizados,
        pagosImportados,
        duplicadosOmitidos,
        errores,
      })

      if (pagosImportados > 0 || alumnosCreados > 0) {
        await onImportComplete()
      }
    } catch (err) {
      setParseError(err.message || 'La importación falló.')
    } finally {
      setImportando(false)
    }
  }

  function limpiar() {
    setArchivoNombre('')
    setResumen(null)
    setResultado(null)
    setParseError('')
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <section className="section excelImportSection">
      <div className="sectionHeader">
        <h2>Importar Excel</h2>
        <p>
          Cargá el Excel del gimnasio con hojas mensuales 2026 (Ene, Feb, Mar,
          etc.) para importar alumnos y pagos a Supabase.
        </p>
      </div>

      <div className="excelImportPanel">
        <label className="excelImportUpload">
          <span className="excelImportUploadLabel">Archivo .xlsx</span>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={handleArchivo}
            disabled={importando}
          />
          {archivoNombre ? (
            <span className="excelImportFileName">{archivoNombre}</span>
          ) : (
            <span className="excelImportFileHint">
              Seleccioná el Excel del gimnasio
            </span>
          )}
        </label>

        {archivoNombre && (
          <button
            type="button"
            className="secondaryButton excelImportClear"
            onClick={limpiar}
            disabled={importando}
          >
            Limpiar
          </button>
        )}
      </div>

      <div className="excelImportRules">
        <p><b>Se importan:</b> hojas mensuales 2026 (Ene 2026, Feb 2026, etc.)</p>
        <p>
          <b>Se ignoran:</b> 2025, Balance, Costos, Pretemporada y otras hojas no
          mensuales.
        </p>
        <p>
          <b>Columnas:</b> A nombre · B cuota · C plan/días · D fecha · E medio ·
          F observaciones
        </p>
      </div>

      {parseError && <div className="error">{parseError}</div>}

      {resumen && (
        <div className="excelImportPreview">
          <h3>Resumen previo a importar</h3>

          <div className="excelImportStats">
            <article>
              <span>Hojas detectadas</span>
              <strong>{resumen.hojas.length}</strong>
              <p>{resumen.hojas.join(' · ')}</p>
            </article>
            <article>
              <span>Filas válidas</span>
              <strong>{resumen.filasValidas}</strong>
            </article>
            <article>
              <span>Alumnos nuevos</span>
              <strong>{resumen.alumnosNuevos.length}</strong>
            </article>
            <article>
              <span>Alumnos reutilizados</span>
              <strong>{resumen.alumnosReutilizados.length}</strong>
            </article>
            <article>
              <span>Pagos a importar</span>
              <strong className="money">{resumen.pagosAImportar}</strong>
            </article>
            <article>
              <span>Duplicados omitidos</span>
              <strong>{resumen.duplicados}</strong>
            </article>
          </div>

          {resumen.alumnosNuevos.length > 0 && (
            <div className="excelImportListBlock">
              <h4>Alumnos que se crearán</h4>
              <ul className="excelImportNameList">
                {resumen.alumnosNuevos.slice(0, 12).map((nombre) => (
                  <li key={nombre}>{nombre}</li>
                ))}
                {resumen.alumnosNuevos.length > 12 && (
                  <li className="excelImportMore">
                    +{resumen.alumnosNuevos.length - 12} más
                  </li>
                )}
              </ul>
            </div>
          )}

          {resumen.erroresParseo?.length > 0 && (
            <div className="excelImportWarnings">
              {resumen.erroresParseo.map((msg) => (
                <p key={msg}>{msg}</p>
              ))}
            </div>
          )}

          <button
            type="button"
            className="excelImportBtn"
            onClick={handleImportar}
            disabled={importando || resumen.pagosAImportar === 0}
          >
            {importando ? 'Importando...' : 'Importar a Supabase'}
          </button>
        </div>
      )}

      {resultado && (
        <div className="excelImportResult">
          <h3>Resultado de la importación</h3>
          <div className="excelImportStats">
            <article className="excelImportStat--ok">
              <span>Alumnos creados</span>
              <strong>{resultado.alumnosCreados}</strong>
            </article>
            <article className="excelImportStat--ok">
              <span>Alumnos reutilizados</span>
              <strong>{resultado.alumnosReutilizados}</strong>
            </article>
            <article className="excelImportStat--ok">
              <span>Pagos importados</span>
              <strong>{resultado.pagosImportados}</strong>
            </article>
            <article>
              <span>Duplicados omitidos</span>
              <strong>{resultado.duplicadosOmitidos}</strong>
            </article>
          </div>

          {resultado.errores.length > 0 && (
            <div className="excelImportWarnings">
              <h4>Errores / advertencias</h4>
              {resultado.errores.map((msg, index) => (
                <p key={`${msg}-${index}`}>{msg}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
