import * as XLSX from 'xlsx'

const MESES_PATTERN =
  /(ene|enero|feb|febrero|mar|marzo|abr|abril|may|mayo|jun|junio|jul|julio|ago|agosto|sep|sept|oct|nov|dic)/i

const HOJAS_EXCLUIDAS = /balance|costos|pretemporada|2025/i

const MESES_MAPA = {
  ene: 0,
  enero: 0,
  feb: 1,
  febrero: 1,
  mar: 2,
  marzo: 2,
  abr: 3,
  abril: 3,
  may: 4,
  mayo: 4,
  jun: 5,
  junio: 5,
  jul: 6,
  julio: 6,
  ago: 7,
  agosto: 7,
  sep: 8,
  sept: 8,
  septiembre: 8,
  oct: 9,
  octubre: 9,
  nov: 10,
  noviembre: 10,
  dic: 11,
  diciembre: 11,
}

export function esHojaMensual2026(nombreHoja) {
  const nombre = String(nombreHoja || '').trim()
  if (!nombre) return false
  if (HOJAS_EXCLUIDAS.test(nombre)) return false
  if (!/2026/.test(nombre)) return false
  return MESES_PATTERN.test(nombre)
}

export function normalizarNombre(nombre) {
  const limpio = String(nombre || '')
    .trim()
    .replace(/\s+/g, ' ')

  if (!limpio) return ''

  return limpio
    .split(' ')
    .map((palabra) => {
      if (!palabra) return ''
      return palabra.charAt(0).toUpperCase() + palabra.slice(1).toLowerCase()
    })
    .join(' ')
}

export function claveNombre(nombre) {
  return normalizarNombre(nombre).toLowerCase()
}

export function normalizarMedio(medio) {
  const valor = String(medio || '')
    .trim()
    .toLowerCase()

  if (!valor) return 'otro'

  if (
    valor.includes('mercado') ||
    valor === 'mp' ||
    valor.startsWith('mp ') ||
    valor === 'mercado pago'
  ) {
    return 'mercado_pago'
  }

  if (
    valor.includes('efec') ||
    valor === 'efe' ||
    valor === 'efectivo' ||
    valor === 'cash'
  ) {
    return 'efectivo'
  }

  if (valor.includes('transfer')) return 'transferencia'
  if (valor.includes('tarj') || valor.includes('card')) return 'tarjeta'

  return 'otro'
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

function fechaAISO(date) {
  if (!date || Number.isNaN(date.getTime())) return null
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

export function convertirFechaExcel(valor, nombreHoja = '') {
  if (valor == null || valor === '') return null

  if (typeof valor === 'number' && !Number.isNaN(valor)) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30))
    const fecha = new Date(excelEpoch.getTime() + valor * 86400000)
    return fechaAISO(fecha)
  }

  if (valor instanceof Date) {
    return fechaAISO(valor)
  }

  const texto = String(valor).trim()
  if (!texto) return null

  const partesDMY = texto.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/)
  if (partesDMY) {
    const dia = Number(partesDMY[1])
    const mes = Number(partesDMY[2]) - 1
    let anio = Number(partesDMY[3])
    if (anio < 100) anio += 2000
    const fecha = new Date(anio, mes, dia)
    return fechaAISO(fecha)
  }

  const parsed = new Date(texto)
  if (!Number.isNaN(parsed.getTime())) {
    return fechaAISO(parsed)
  }

  return mesDesdeHoja(nombreHoja)
}

function mesDesdeHoja(nombreHoja) {
  const texto = String(nombreHoja || '').toLowerCase()

  for (const [clave, indice] of Object.entries(MESES_MAPA)) {
    if (texto.includes(clave)) {
      return `2026-${pad2(indice + 1)}-01`
    }
  }

  return null
}

export function mesDesdeFecha(fechaISO) {
  if (!fechaISO) return ''

  const fecha = new Date(`${fechaISO}T12:00:00`)
  if (Number.isNaN(fecha.getTime())) return ''

  const label = fecha.toLocaleString('es-AR', { month: 'long' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function parsearMonto(valor) {
  if (valor == null || valor === '') return null

  if (typeof valor === 'number' && !Number.isNaN(valor)) {
    return Math.round(valor * 100) / 100
  }

  let limpio = String(valor).replace(/\$/g, '').trim()

  if (/,\d{1,2}$/.test(limpio)) {
    limpio = limpio.replace(/\./g, '').replace(',', '.')
  } else {
    limpio = limpio.replace(/\./g, '')
  }

  const numero = Number(limpio)
  return Number.isNaN(numero) ? null : Math.round(numero * 100) / 100
}

function esFilaEncabezado(nombre) {
  const n = String(nombre || '').trim().toLowerCase()
  return (
    n === 'nombre' ||
    n === 'alumno' ||
    n === 'socio' ||
    n.includes('nombre y apellido')
  )
}

function celda(row, index) {
  if (!row || index >= row.length) return ''
  const valor = row[index]
  return valor == null ? '' : valor
}

export function parsearFilaExcel(row, nombreHoja) {
  const nombreRaw = celda(row, 0)
  if (!nombreRaw || esFilaEncabezado(nombreRaw)) return null

  const nombre = normalizarNombre(nombreRaw)
  if (!nombre) return null

  const monto = parsearMonto(celda(row, 1))
  if (monto == null || monto <= 0) return null

  const plan = String(celda(row, 2) || '').trim() || 'mensual'
  const fechaValor = celda(row, 3)
  const fecha_pago =
    convertirFechaExcel(fechaValor, nombreHoja) || mesDesdeHoja(nombreHoja)

  if (!fecha_pago) return null

  const medio_pago = normalizarMedio(celda(row, 4))
  const observaciones = String(celda(row, 5) || '').trim()

  return {
    nombre,
    nombreClave: claveNombre(nombre),
    monto,
    plan,
    fecha_pago,
    medio_pago,
    mes: mesDesdeFecha(fecha_pago),
    observaciones,
    hoja: nombreHoja,
  }
}

export function clavePago(alumnoId, fecha_pago, monto, medio_pago) {
  return `${alumnoId}|${fecha_pago}|${monto}|${medio_pago}`
}

export function construirResumenImportacion(filas, alumnos, pagos) {
  const existentes = new Set(
    (pagos || []).map((p) =>
      clavePago(p.alumno_id, p.fecha_pago, Number(p.monto), p.medio_pago)
    )
  )

  const alumnosPorClave = new Map()
  ;(alumnos || []).forEach((alumno) => {
    alumnosPorClave.set(claveNombre(alumno.nombre), alumno)
  })

  const alumnosNuevosSet = new Set()
  const vistosImport = new Set()
  let duplicados = 0
  const filasImportables = []

  filas.forEach((fila) => {
    const alumno = alumnosPorClave.get(fila.nombreClave)
    const alumnoId = alumno?.id

    if (!alumnoId) {
      alumnosNuevosSet.add(fila.nombre)
    }

    const clave =
      alumnoId != null
        ? clavePago(alumnoId, fila.fecha_pago, fila.monto, fila.medio_pago)
        : `nuevo|${fila.nombreClave}|${fila.fecha_pago}|${fila.monto}|${fila.medio_pago}`

    if (alumnoId && existentes.has(clave)) {
      duplicados += 1
      return
    }

    if (vistosImport.has(clave)) {
      duplicados += 1
      return
    }

    vistosImport.add(clave)
    filasImportables.push(fila)
  })

  const hojas = [...new Set(filas.map((f) => f.hoja))]

  return {
    hojas,
    filasValidas: filas.length,
    alumnosNuevos: Array.from(alumnosNuevosSet).sort(),
    pagosAImportar: filasImportables.length,
    duplicados,
    filasImportables,
  }
}

export function parsearWorkbook(workbook) {
  const filas = []
  const hojasDetectadas = []
  const errores = []

  workbook.SheetNames.forEach((nombreHoja) => {
    if (!esHojaMensual2026(nombreHoja)) return

    hojasDetectadas.push(nombreHoja)

    try {
      const sheet = workbook.Sheets[nombreHoja]
      const data = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: '',
        raw: true,
      })

      data.forEach((row) => {
        const fila = parsearFilaExcel(row, nombreHoja)
        if (fila) filas.push(fila)
      })
    } catch (err) {
      errores.push(`Error en hoja "${nombreHoja}": ${err.message}`)
    }
  })

  return { filas, hojasDetectadas, errores }
}

// XLSX se inyecta desde el componente para evitar import circular en tests
export function parsearArchivoExcel(arrayBuffer) {
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true })
  return parsearWorkbook(workbook)
}
