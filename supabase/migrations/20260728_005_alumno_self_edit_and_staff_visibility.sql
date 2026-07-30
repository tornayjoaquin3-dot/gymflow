-- 20260728_005_alumno_self_edit_and_staff_visibility.sql
--
-- Objetivo:
--   Habilitar "Mi perfil" (Etapa 1): un alumno tiene que poder completar
--   sus propios datos (nombre, apellido, dni, telefono, email) en su ficha
--   de alumnos, y el staff tiene que poder ver todas las cuentas de
--   profiles (hoy solo se puede leer la propia) para vincular manualmente
--   las que queden pendientes.
--
-- Cambios:
--   1. Alumno puede UPDATE su propia fila de alumnos (via profiles.alumno_id).
--      Esta politica se suma a la de staff, no la reemplaza.
--   2. Trigger que protege `estado` y `observaciones` (campos de uso
--      interno del staff) de cualquier UPDATE hecho por un usuario con
--      rol alumno, incluso si llamara a la API directo. El alumno puede
--      cambiar el resto de sus columnas (nombre, apellido, dni, telefono,
--      email) sin restriccion.
--   3. Staff (socio/profesor) puede ver todas las filas de profiles, no
--      solo la propia. Necesario para listar cuentas de alumno pendientes
--      de vincular (alumno_id is null).
--
-- Impacto:
--   No modifica filas existentes. Solo agrega permisos y una proteccion
--   adicional sobre columnas sensibles.
--
-- Rollback manual:
--   drop trigger if exists trg_protect_alumno_admin_fields on public.alumnos;
--   drop function if exists public.protect_alumno_admin_fields();
--   drop policy if exists "Alumno puede editar su propia ficha" on public.alumnos;
--   drop policy if exists "Staff puede ver todos los perfiles" on public.profiles;

begin;

-- 1. Alumno puede editar su propia ficha
create policy "Alumno puede editar su propia ficha" on public.alumnos
for update to authenticated
using (
  exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'alumno' and p.alumno_id = alumnos.id)
)
with check (
  exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'alumno' and p.alumno_id = alumnos.id)
);

-- 2. Proteger estado/observaciones de ediciones hechas por un alumno
create or replace function public.protect_alumno_admin_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
begin
  select role into actor_role from public.profiles where user_id = auth.uid();

  if actor_role = 'alumno' then
    new.estado := old.estado;
    new.observaciones := old.observaciones;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_alumno_admin_fields on public.alumnos;
create trigger trg_protect_alumno_admin_fields
before update on public.alumnos
for each row
execute function public.protect_alumno_admin_fields();

-- La funcion no debe poder llamarse manualmente via API (solo la invoca el trigger)
revoke execute on function public.protect_alumno_admin_fields() from public, anon, authenticated;

-- 3. Staff ve todos los perfiles (para vincular pendientes)
create policy "Staff puede ver todos los perfiles" on public.profiles
for select to authenticated
using (
  exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('socio','profesor'))
);

commit;
