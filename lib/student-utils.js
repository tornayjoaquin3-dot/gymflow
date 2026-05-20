export const TOTAL_PERIOD_VALUE = 'all'

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
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim()
}

function parseDateValue(dateValue) {
  if (typeof dateValue === 'string') {
    const dateOnlyMatch = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})$/)

    if (dateOnlyMatch) {
      return new Date(
        Number(dateOnlyMatch[1]),
        Number(dateOnlyMatch[2]) - 1,
        Number(dateOnlyMatch[3])
      )
    }
  }

  return new Date(dateValue)
}

export function getMonthKey(dateValue = new Date()) {
  const date = parseDateValue(dateValue)

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

  if (monthKey === TOTAL_PERIOD_VALUE) {
    return 'Total acumulado'
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

  return [
    { value: TOTAL_PERIOD_VALUE, label: getMonthLabel(TOTAL_PERIOD_VALUE) },
    ...[...monthKeys]
      .filter(Boolean)
      .sort((left, right) => compareMonthKeys(right, left))
      .map((value) => ({
        value,
        label: getMonthLabel(value),
      })),
  ]
}

export function getPeriodMonthKey(selectedMonth) {
  return selectedMonth === TOTAL_PERIOD_VALUE ? getMonthKey() : selectedMonth
}

export function getPaymentPeriodLabel(selectedMonth) {
  return getMonthLabel(getPeriodMonthKey(selectedMonth))
}

function sortPaymentsDesc(left, right) {
  const leftTime = new Date(left?.fecha_pago || 0).getTime()
  const rightTime = new Date(right?.fecha_pago || 0).getTime()
  return rightTime - leftTime
}

function getDistinctPaidMonths(studentPayments) {
  return new Set(
    studentPayments
      .map((pago) => getMonthKey(pago.fecha_pago))
      .filter(Boolean)
  ).size
}

export function getStudentPaymentSnapshot(alumno, pagos, selectedMonth) {
  const studentPayments = pagos
    .filter((pago) => pago.alumno_id === alumno.id)
    .sort(sortPaymentsDesc)

  const currentMonth = getMonthKey()
  const resolvedMonth = getPeriodMonthKey(selectedMonth || currentMonth)
  const latestPayment = studentPayments[0] || null
  const hasPayments = studentPayments.length > 0
  const paymentsForMonth =
    selectedMonth === TOTAL_PERIOD_VALUE
      ? studentPayments
      : studentPayments.filter(
          (pago) => getMonthKey(pago.fecha_pago) === resolvedMonth
        )
  const isPaid =
    selectedMonth === TOTAL_PERIOD_VALUE ? hasPayments : paymentsForMonth.length > 0
  const isPastMonth =
    resolvedMonth && compareMonthKeys(resolvedMonth, currentMonth) < 0

  let filterStatus = 'unpaid'
  let badgeLabel = 'No pagó'
  let badgeTone = 'unpaid'
  let helperText = `Sin pago en ${getMonthLabel(resolvedMonth)}`

  if (isPaid) {
    filterStatus = 'paid'
    badgeLabel = 'Pagó'
    badgeTone = 'paid'
    helperText =
      selectedMonth === TOTAL_PERIOD_VALUE
        ? 'Tiene historial de pagos'
        : `Pago registrado en ${getMonthLabel(resolvedMonth)}`
  } else if (!hasPayments) {
    filterStatus = 'no_history'
    helperText = 'Sin historial de pagos'
  } else if (!isPastMonth) {
    helperText = `Aun sin pago en ${getMonthLabel(resolvedMonth)}`
  }

  return {
    badgeLabel,
    badgeTone,
    filterStatus,
    hasPayments,
    helperText,
    latestPayment,
    paidMonthCount: getDistinctPaidMonths(studentPayments),
    paymentsForMonth,
    studentPayments,
  }
}
