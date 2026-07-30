-- 20260728_001_add_alumno_role_support.sql
--
-- Objetivo:
--   Preparar el esquema de GymFlow para que un alumno pueda tener su propia
--   cuenta, vinculada a su ficha existente en `alumnos`. Es el prerequisito
--   de la Etapa 1 del portal del alumno ("Mi perfil").
--
-- Cambios:
--   1. Ampliar profiles.role para permitir 'alumno' (hoy el CHECK solo
--      deja pasar 'socio' y 'profesor' -> confirmado con
--      profiles_role_check = CHECK (role = ANY (ARRAY['socio','profesor']))).
--   2. Agregar profiles.alumno_id (nullable, unico, FK a alumnos.id) para
--      vincular la cuenta de auth con una fila de alumnos existente.
--   3. Agregar apellido, email y dni a alumnos (nullable, no rompen datos
--      existentes) para poder completarlos desde "Mi perfil".
--   4. Unicidad de alumnos.email cuando no es null, para evitar dos cuentas
--      apuntando al mismo alumno por error.
--
-- Impacto:
--   No borra ni modifica ningun dato existente. Todas las columnas nuevas
--   son nullable. Los alumnos, pagos y rutinas actuales quedan intactos.
--
-- Pasos manuales despues de aplicar:
--   - Revisar/crear politicas de RLS para el rol 'alumno' sobre alumnos,
--     rutinas y pagos (se hace en un paso posterior, una vez que haya
--     cuentas reales usando alumno_id).
--
-- Rollback manual:
--   begin;
--   alter table public.profiles drop constraint if exists profiles_role_check;
--   alter table public.profiles add constraint profiles_role_check
--     check (role = any (array['socio'::text, 'profesor'::text]));
--   drop index if exists public.profiles_alumno_id_key;
--   alter table public.profiles drop column if exists alumno_id;
--   drop index if exists public.alumnos_email_key;
--   alter table public.alumnos drop column if exists apellido;
--   alter table public.alumnos drop column if exists email;
--   alter table public.alumnos drop column if exists dni;
--   commit;

begin;

-- 1. Ampliar el check de rol para incluir 'alumno'
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role = any (array['socio'::text, 'profesor'::text, 'alumno'::text]));

-- 2. Vincular profiles con alumnos
alter table public.profiles
  add column if not exists alumno_id uuid references public.alumnos(id) on delete set null;

create unique index if not exists profiles_alumno_id_key
  on public.profiles (alumno_id)
  where alumno_id is not null;

-- 3. Datos personales que hoy faltan en alumnos
alter table public.alumnos add column if not exists apellido text;
alter table public.alumnos add column if not exists email text;
alter table public.alumnos add column if not exists dni text;

create unique index if not exists alumnos_email_key
  on public.alumnos (email)
  where email is not null;

commit;
