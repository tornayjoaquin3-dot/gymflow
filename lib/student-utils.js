const MONTH_FORMATTER = new Intl.DateTimeFormat('es-AR', {
  month: 'long',
  year: 'numeric',
})

const TEXT_NORMALIZER = /[\u0300-\u036f]/g

export function normalizeText(value = '') {
  return value
    .toString()
    .normalize('NFD')
    .replace(TEXT_NORMALIZER, '')
    .toLowerCase()
    .trim()
}

export function getMonthKey(dateValue = new Date()) {
  const date = new Date(dateValue)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')

  return `${year}-${month}`
}

export function getMonthLabel(monthKey) {
  if (!monthKey) {
    return 'Mes actual'
  }

  const [year, month] = monthKey.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)

  if (Number.isNaN(date.getTime())) {
    return monthKey
  }

  return MONTH_FORMATTER.format(date)
}

export function compareMonthKeys(left, right) {
  if (!left || !right) return 0
  return left.localeCompare(right)
}

export function getPaymentMonthOptions(pagos) {
  const monthKeys = new Set([getMonthKey()])

  pagos.forEach((pago) => {
    if (pago?.fecha_pago) {
      monthKeys.add(getMonthKey(pago.fecha_pago))
    }
  })

  return [...monthKeys]
    .filter(Boolean)
    .sort((left, right) => compareMonthKeys(right, left))
    .map((value) => ({
      value,
      label: getMonthLabel(value),
    }))
}

function sortPaymentsDesc(left, right) {
  const leftTime = new Date(left?.fecha_pago || 0).getTime()
  const rightTime = new Date(right?.fecha_pago || 0).getTime()
  return rightTime - leftTime
}

export function getStudentPaymentSnapshot(alumno, pagos, selectedMonth) {
  const studentPayments = pagos
    .filter((pago) => pago.alumno_id === alumno.id)
    .sort(sortPaymentsDesc)

  const paymentsForMonth = studentPayments.filter(
    (pago) => getMonthKey(pago.fecha_pago) === selectedMonth
  )

  const latestPayment = studentPayments[0] || null
  const currentMonth = getMonthKey()
  const hasPayments = studentPayments.length > 0
  const isPaid = paymentsForMonth.length > 0
  const isPastMonth =
    selectedMonth && compareMonthKeys(selectedMonth, currentMonth) < 0

  let filterStatus = 'pendientes'
  let badgeLabel = 'Pendiente'
  let badgeTone = 'pending'
  let helperText = 'Sin registrar en el mes'

  if (isPaid) {
    filterStatus = 'al_dia'
    badgeLabel = 'Al dia'
    badgeTone = 'paid'
    helperText = `Pago registrado en ${getMonthLabel(selectedMonth)}`
  } else if (!hasPayments) {
    filterStatus = 'sin_pagos'
    helperText = 'Sin historial de pagos'
  } else if (isPastMonth) {
    filterStatus = 'pendientes'
    badgeLabel = 'Vencido'
    badgeTone = 'overdue'
    helperText = `Sin pago en ${getMonthLabel(selectedMonth)}`
  }

  return {
    badgeLabel,
    badgeTone,
    filterStatus,
    hasPayments,
    helperText,
    latestPayment,
    paymentsForMonth,
    studentPayments,
  }
}
