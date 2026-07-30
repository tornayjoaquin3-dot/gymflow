-- 20260728_002_role_aware_rls.sql
--
-- Objetivo:
--   Cerrar un hueco de seguridad real: las politicas de RLS de alumnos,
--   rutinas, pagos y costos estaban activadas pero con USING/WITH CHECK en
--   `true` para cualquier usuario authenticated, sin distinguir rol. Eso
--   significa que, hoy, cualquier cuenta autenticada (incluyendo cualquier
--   alumno que se registre a futuro) puede leer y modificar todas las
--   fichas, pagos, rutinas y costos directo contra la API de Supabase,
--   sin pasar por la interfaz.
--
-- Verificado antes de escribir esto (todo por lectura, sin cambios):
--   - profiles ya tiene fila real para socio@gymflow.com y profesor@gymflow.com
--     (por eso esta migracion no los deja afuera).
--   - El alumno de prueba (alumno@gymflow.com) solo existia en la tabla
--     legacy `usuarios`, no en `profiles`. Se agrega su fila al final para
--     poder probar las politicas nuevas.
--
-- Cambios:
--   1. alumnos / rutinas / pagos: socio y profesor mantienen acceso total
--      (sin cambios de comportamiento para ellos). Un alumno pasa a ver
--      unicamente la fila que le corresponde segun profiles.alumno_id.
--      Un alumno no puede crear, editar ni borrar nada en estas tablas.
--   2. costos: acceso exclusivo de socio. Ni profesor ni alumno pueden
--      leerla ni escribirla directo de la base (coincide con lo ya
--      documentado: "no administra costos"; profesor no la usaba desde la
--      interfaz, asi que esto no cambia nada visible para el).
--   3. profiles: se agrega una politica de INSERT para que un usuario
--      nuevo pueda crear su propia fila, pero solo con role = 'alumno' y
--      alumno_id nulo. Nadie puede autoasignarse un alumno_id ni crearse
--      un perfil de socio/profesor por esta via; la vinculacion a una
--      ficha existente se hace en un paso aparte y controlado.
--
-- Impacto:
--   No borra ni modifica ninguna fila existente de alumnos, pagos, rutinas
--   ni costos. Cambia unicamente quien puede ver/tocar que, segun su rol.
--
-- Rollback manual: recrear las 4 politicas "true" originales por tabla
--   (ver policyname en pg_policies antes de aplicar) y quitar la politica
--   de insert de profiles.

begin;

-- ==================== ALUMNOS ====================
drop policy if exists "Usuarios autenticados pueden ver alumnos" on public.alumnos;
drop policy if exists "Usuarios autenticados pueden crear alumnos" on public.alumnos;
drop policy if exists "Usuarios autenticados pueden editar alumnos" on public.alumnos;
drop policy if exists "Usuarios autenticados pueden eliminar alumnos" on public.alumnos;

create policy "Staff ve todos, alumno ve su propia ficha" on public.alumnos
for select to authenticated
using (
  exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('socio','profesor'))
  or exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'alumno' and p.alumno_id = alumnos.id)
);

create policy "Solo staff crea alumnos" on public.alumnos
for insert to authenticated
with check (
  exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('socio','profesor'))
);

create policy "Solo staff edita alumnos" on public.alumnos
for update to authenticated
using (
  exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('socio','profesor'))
)
with check (
  exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('socio','profesor'))
);

create policy "Solo staff elimina alumnos" on public.alumnos
for delete to authenticated
using (
  exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('socio','profesor'))
);

-- ==================== RUTINAS ====================
drop policy if exists "Usuarios autenticados pueden ver rutinas" on public.rutinas;
drop policy if exists "Usuarios autenticados pueden crear rutinas" on public.rutinas;
drop policy if exists "Usuarios autenticados pueden editar rutinas" on public.rutinas;
drop policy if exists "Usuarios autenticados pueden eliminar rutinas" on public.rutinas;

create policy "Staff ve todas, alumno ve las suyas" on public.rutinas
for select to authenticated
using (
  exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('socio','profesor'))
  or exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'alumno' and p.alumno_id = rutinas.alumno_id)
);

create policy "Solo staff crea rutinas" on public.rutinas
for insert to authenticated
with check (
  exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('socio','profesor'))
);

create policy "Solo staff edita rutinas" on public.rutinas
for update to authenticated
using (
  exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('socio','profesor'))
)
with check (
  exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('socio','profesor'))
);

create policy "Solo staff elimina rutinas" on public.rutinas
for delete to authenticated
using (
  exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('socio','profesor'))
);

-- ==================== PAGOS ====================
drop policy if exists "Usuarios autenticados pueden ver pagos" on public.pagos;
drop policy if exists "Usuarios autenticados pueden crear pagos" on public.pagos;
drop policy if exists "Usuarios autenticados pueden editar pagos" on public.pagos;
drop policy if exists "Usuarios autenticados pueden eliminar pagos" on public.pagos;

create policy "Staff ve todos, alumno ve los suyos" on public.pagos
for select to authenticated
using (
  exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('socio','profesor'))
  or exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'alumno' and p.alumno_id = pagos.alumno_id)
);

create policy "Solo staff crea pagos" on public.pagos
for insert to authenticated
with check (
  exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('socio','profesor'))
);

create policy "Solo staff edita pagos" on public.pagos
for update to authenticated
using (
  exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('socio','profesor'))
)
with check (
  exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('socio','profesor'))
);

create policy "Solo staff elimina pagos" on public.pagos
for delete to authenticated
using (
  exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('socio','profesor'))
);

-- ==================== COSTOS ====================
drop policy if exists "Usuarios autenticados pueden ver costos" on public.costos;
drop policy if exists "Usuarios autenticados pueden crear costos" on public.costos;
drop policy if exists "Usuarios autenticados pueden editar costos" on public.costos;
drop policy if exists "Usuarios autenticados pueden eliminar costos" on public.costos;

create policy "Solo socio ve costos" on public.costos
for select to authenticated
using (
  exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'socio')
);

create policy "Solo socio crea costos" on public.costos
for insert to authenticated
with check (
  exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'socio')
);

create policy "Solo socio edita costos" on public.costos
for update to authenticated
using (
  exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'socio')
)
with check (
  exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'socio')
);

create policy "Solo socio elimina costos" on public.costos
for delete to authenticated
using (
  exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'socio')
);

-- ==================== PROFILES ====================
-- Permite autorregistro como alumno, nunca autoasignarse alumno_id ni otro rol.
create policy "Usuario puede crear su propio perfil de alumno" on public.profiles
for insert to authenticated
with check (
  auth.uid() = user_id
  and role = 'alumno'
  and alumno_id is null
);

-- ==================== Datos de prueba ====================
-- El alumno de prueba solo existia en la tabla legacy `usuarios`.
-- Se agrega su fila en profiles para poder probar las politicas nuevas.
insert into public.profiles (user_id, email, nombre, role, alumno_id)
values ('71e100d6-dabb-4c08-a9aa-a7e9da6a29d0', 'alumno@gymflow.com', 'Alumno', 'alumno', null)
on conflict (user_id) do nothing;

commit;
