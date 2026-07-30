import { mapProfileRow } from './profile-service'

// Crea la cuenta de auth para un alumno nuevo y, si hay sesion inmediata
// (sin confirmacion de email pendiente), vincula su perfil llamando a la
// funcion de base de datos `register_alumno_profile`. Esa funcion hace el
// matching por telefono de forma segura (el cliente nunca decide ni manda
// el alumno_id directamente).
export async function signUpAlumno(client, { email, password, nombre, apellido, telefono, dni }) {
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      // Se guarda por si Supabase pide confirmar el email antes de dar
      // sesion: cuando el alumno inicie sesion por primera vez ya
      // confirmado, hydrateSession usa estos datos para completar el alta.
      data: {
        alumno_signup_pendiente: true,
        nombre: nombre || '',
        apellido: apellido || '',
        telefono: telefono || '',
        dni: dni || '',
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  if (!data?.session || !data?.user) {
    return { pendingEmailConfirmation: true }
  }

  return registerAlumnoProfile(client, { nombre, apellido, telefono, dni })
}

// Fallback para cuando el alumno confirma su email y recien ahi inicia
// sesion por primera vez: no hay perfil todavia, pero el authUser tiene
// los datos que cargo al registrarse guardados en sus metadatos.
export async function completeAlumnoSignupFromMetadata(client, authUser) {
  const metadata = authUser?.user_metadata || {}

  if (!metadata.alumno_signup_pendiente) {
    return null
  }

  const result = await registerAlumnoProfile(client, {
    nombre: metadata.nombre,
    apellido: metadata.apellido,
    telefono: metadata.telefono,
    dni: metadata.dni,
  })

  return result?.profile || null
}

// Llama a la funcion de base de datos que hace el matching por telefono y
// crea (o completa) la fila de profiles para el usuario ya autenticado.
export async function registerAlumnoProfile(client, { nombre, apellido, telefono, dni }) {
  const { data, error } = await client.rpc('register_alumno_profile', {
    p_nombre: nombre || '',
    p_apellido: apellido || '',
    p_telefono: telefono || '',
    p_dni: dni || '',
  })

  if (error) {
    return { error: error.message }
  }

  return { profile: mapProfileRow(data) }
}
