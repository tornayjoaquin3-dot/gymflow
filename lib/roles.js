export const ROLES = {
  SOCIO: 'socio',
  PROFESOR: 'profesor',
  ALUMNO: 'alumno',
}

export const ROLE_SECTIONS = {
  [ROLES.SOCIO]: [
    'dashboard',
    'alumnos',
    'fichaAlumno',
    'rutinas',
    'turnos',
    'asistencia',
    'costos',
    'importar',
  ],
  [ROLES.PROFESOR]: ['alumnos', 'fichaAlumno', 'rutinas', 'turnos', 'asistencia'],
  [ROLES.ALUMNO]: ['turnos', 'rutina', 'cuota', 'portal'],
}

export function normalizeRole(roleValue) {
  const normalizedRole = String(roleValue || '').trim().toLowerCase()

  if (normalizedRole === ROLES.PROFESOR) {
    return ROLES.PROFESOR
  }

  if (normalizedRole === ROLES.ALUMNO) {
    return ROLES.ALUMNO
  }

  return ROLES.SOCIO
}

export function getAllowedSections(role) {
  return ROLE_SECTIONS[normalizeRole(role)] || ROLE_SECTIONS[ROLES.SOCIO]
}

export function getDefaultSection(role) {
  const normalizedRole = normalizeRole(role)

  if (normalizedRole === ROLES.ALUMNO) {
    return 'turnos'
  }

  return 'alumnos'
}

export function isStaffRole(role) {
  const normalizedRole = normalizeRole(role)
  return normalizedRole === ROLES.SOCIO || normalizedRole === ROLES.PROFESOR
}

export function isAlumnoRole(role) {
  return normalizeRole(role) === ROLES.ALUMNO
}

export function getPanelTitle(role) {
  const normalizedRole = normalizeRole(role)

  if (normalizedRole === ROLES.PROFESOR) {
    return 'Profesor'
  }

  if (normalizedRole === ROLES.ALUMNO) {
    return 'Alumno'
  }

  return 'Socio'
}
