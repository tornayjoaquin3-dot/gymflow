# GymFlow - Aplicación web para gimnasio

App web responsive para administrar alumnos, pagos, costos, dashboard y rutinas con roles: socio y profesor.

## Qué incluye

- Login demo local.
- Rol socio: ve Dashboard, Alumnos y Costos.
- Rol profesor: ve solo Alumnos y Rutinas.
- Dashboard mensual y acumulado.
- Registro de pagos.
- Registro de costos.
- Ficha individual de alumno.
- Historial de pagos por alumno.
- Rutina por alumno.
- Persistencia local en el navegador con localStorage.
- Archivo SQL para crear base de datos en Supabase.

## Usuarios demo

Socio:
- email: socio@gymflow.com
- contraseña: 123456

Profesor:
- email: profesor@gymflow.com
- contraseña: 123456

## Publicación rápida en Vercel

1. Crear un repositorio en GitHub.
2. Subir estos archivos: `index.html`, `styles.css`, `app.js`, `supabase-schema.sql`, `README.md`.
3. Entrar a Vercel.
4. Importar el repositorio.
5. Deploy.
6. Vercel entrega un link tipo `https://tu-app.vercel.app`.

## Modo real con Supabase

1. Crear un proyecto en Supabase.
2. Ir a SQL Editor.
3. Copiar y ejecutar el contenido de `supabase-schema.sql`.
4. Crear usuarios desde Authentication > Users.
5. Insertar cada usuario en la tabla `profiles` con rol `socio` o `profesor`.
6. Copiar Project URL y anon key.
7. Pegarlos al inicio de `app.js`:

```js
const CONFIG = {
  SUPABASE_URL: 'TU_URL',
  SUPABASE_ANON_KEY: 'TU_ANON_KEY'
};
```

## Nota importante

La versión incluida funciona inmediatamente sin Supabase, pero los datos quedan guardados en el navegador de cada dispositivo. Para que tu hermano y su socio vean los mismos datos desde PC y celular, hay que conectar Supabase.
