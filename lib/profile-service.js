import { normalizeRole } from './roles'
import { formatStudentName } from './student-utils'

export function mapProfileRow(row, fallbackEmail) {
  if (!row) return null

  return {
    userId: row.user_id || null,
    nombre: row.nombre || row.email || fallbackEmail || 'Usuario',
    email: row.email || fallbackEmail || '',
    rol: normalizeRole(row.role || row.rol),
    alumnoId: row.alumno_id || null,
  }
}

export async function loadUserProfile(client, authUser) {
  const fallbackEmail = authUser?.email || ''

  const { data: profileByUserId, error: profileByUserIdError } = await client
    .from('profiles')
    .select('user_id,email,role,nombre,alumno_id')
    .eq('user_id', authUser.id)
    .maybeSingle()

  if (profileByUserId) {
    return mapProfileRow(profileByUserId, fallbackEmail)
  }

  const profilesTableAvailable =
    !profileByUserIdError ||
    !/relation .*profiles/i.test(profileByUserIdError.message || '')

  if (profilesTableAvailable) {
    const { data: profileByEmail } = await client
      .from('profiles')
      .select('user_id,email,role,nombre,alumno_id')
      .eq('email', fallbackEmail)
      .maybeSingle()

    if (profileByEmail) {
      return mapProfileRow(profileByEmail, fallbackEmail)
    }
  }

  const { data: legacyProfile } = await client
    .from('usuarios')
    .select('nombre,email,rol')
    .eq('email', fallbackEmail)
    .maybeSingle()

  if (legacyProfile) {
    return mapProfileRow(legacyProfile, fallbackEmail)
  }

  return null
}

export function getAlumnoDisplayName(alumno, profile) {
  if (alumno?.nombre || alumno?.apellido) {
    return formatStudentName(alumno)
  }

  return profile?.nombre || profile?.email || 'Alumno'
}
