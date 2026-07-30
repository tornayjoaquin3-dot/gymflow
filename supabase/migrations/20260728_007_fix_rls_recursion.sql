-- 20260728_007_fix_rls_recursion.sql
--
-- Objetivo:
--   Corrige un error propio: varias politicas de RLS (sobre todo las de
--   `profiles`) consultaban la tabla `profiles` desde adentro de su propia
--   condicion (`exists (select 1 from public.profiles p where ...)`).
--   Postgres detecta eso como recursion infinita en la politica, y la
--   consulta falla para cualquier usuario -- por eso dejo de andar el
--   login de socio, profesor y alumno por igual.
--
-- Solucion:
--   Reemplazar esas subconsultas por dos funciones "security definer"
--   (current_role / current_alumno_id): al correr con permisos elevados,
--   estas funciones leen `profiles` sin volver a disparar las politicas
--   de RLS sobre si misma, así se corta la recursion. Es el patron
--   recomendado por Supabase para este caso.
--
-- Cambios:
--   1. Crea public.current_role() y public.current_alumno_id().
--   2. Recrea con esas funciones las politicas de alumnos, rutinas,
--      pagos, costos y profiles que antes hacian la subconsulta directa.
--
-- Impacto:
--   No cambia el comportamiento esperado (quien puede ver/editar que
--   sigue igual), solo corrige la forma en que se calcula.
--
-- Rollback manual:
--   No aplica (esta migracion es en si misma el rollback del bug
--   introducido en 20260728_002, 20260728_004 y 20260728_005).

begin;

-- ==================== Funciones auxiliares ====================
create or replace function public.current_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from public.profiles where user_id = auth.uid()
$$;

create or replace function public.current_alumno_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select alumno_id from public.profiles where user_id = auth.uid()
$$;

revoke all on function public.current_role() from public, anon;
grant execute on function public.current_role() to authenticated;

revoke all on function public.current_alumno_id() from public, anon;
grant execute on function public.current_alumno_id() to authenticated;

-- ==================== ALUMNOS ====================
drop policy if exists "Staff ve todos, alumno ve su propia ficha" on public.alumnos;
drop policy if exists "Solo staff crea alumnos" on public.alumnos;
drop policy if exists "Solo staff edita alumnos" on public.alumnos;
drop policy if exists "Solo staff elimina alumnos" on public.alumnos;
drop policy if exists "Alumno puede editar su propia ficha" on public.alumnos;

create policy "Staff ve todos, alumno ve su propia ficha" on public.alumnos
for select to authenticated
using (
  public.current_role() in ('socio', 'profesor')
  or (public.current_role() = 'alumno' and public.current_alumno_id() = alumnos.id)
);

create policy "Solo staff crea alumnos" on public.alumnos
for insert to authenticated
with check (public.current_role() in ('socio', 'profesor'));

create policy "Solo staff edita alumnos" on public.alumnos
for update to authenticated
using (public.current_role() in ('socio', 'profesor'))
with check (public.current_role() in ('socio', 'profesor'));

create policy "Alumno puede editar su propia ficha" on public.alumnos
for update to authenticated
using (public.current_role() = 'alumno' and public.current_alumno_id() = alumnos.id)
with check (public.current_role() = 'alumno' and public.current_alumno_id() = alumnos.id);

create policy "Solo staff elimina alumnos" on public.alumnos
for delete to authenticated
using (public.current_role() in ('socio', 'profesor'));

-- ==================== RUTINAS ====================
drop policy if exists "Staff ve todas, alumno ve las suyas" on public.rutinas;
drop policy if exists "Solo staff crea rutinas" on public.rutinas;
drop policy if exists "Solo staff edita rutinas" on public.rutinas;
drop policy if exists "Solo staff elimina rutinas" on public.rutinas;

create policy "Staff ve todas, alumno ve las suyas" on public.rutinas
for select to authenticated
using (
  public.current_role() in ('socio', 'profesor')
  or (public.current_role() = 'alumno' and public.current_alumno_id() = rutinas.alumno_id)
);

create policy "Solo staff crea rutinas" on public.rutinas
for insert to authenticated
with check (public.current_role() in ('socio', 'profesor'));

create policy "Solo staff edita rutinas" on public.rutinas
for update to authenticated
using (public.current_role() in ('socio', 'profesor'))
with check (public.current_role() in ('socio', 'profesor'));

create policy "Solo staff elimina rutinas" on public.rutinas
for delete to authenticated
using (public.current_role() in ('socio', 'profesor'));

-- ==================== PAGOS ====================
drop policy if exists "Staff ve todos, alumno ve los suyos" on public.pagos;
drop policy if exists "Solo staff crea pagos" on public.pagos;
drop policy if exists "Solo staff edita pagos" on public.pagos;
drop policy if exists "Solo staff elimina pagos" on public.pagos;

create policy "Staff ve todos, alumno ve los suyos" on public.pagos
for select to authenticated
using (
  public.current_role() in ('socio', 'profesor')
  or (public.current_role() = 'alumno' and public.current_alumno_id() = pagos.alumno_id)
);

create policy "Solo staff crea pagos" on public.pagos
for insert to authenticated
with check (public.current_role() in ('socio', 'profesor'));

create policy "Solo staff edita pagos" on public.pagos
for update to authenticated
using (public.current_role() in ('socio', 'profesor'))
with check (public.current_role() in ('socio', 'profesor'));

create policy "Solo staff elimina pagos" on public.pagos
for delete to authenticated
using (public.current_role() in ('socio', 'profesor'));

-- ==================== COSTOS ====================
drop policy if exists "Solo socio ve costos" on public.costos;
drop policy if exists "Solo socio crea costos" on public.costos;
drop policy if exists "Solo socio edita costos" on public.costos;
drop policy if exists "Solo socio elimina costos" on public.costos;

create policy "Solo socio ve costos" on public.costos
for select to authenticated
using (public.current_role() = 'socio');

create policy "Solo socio crea costos" on public.costos
for insert to authenticated
with check (public.current_role() = 'socio');

create policy "Solo socio edita costos" on public.costos
for update to authenticated
using (public.current_role() = 'socio')
with check (public.current_role() = 'socio');

create policy "Solo socio elimina costos" on public.costos
for delete to authenticated
using (public.current_role() = 'socio');

-- ==================== PROFILES ====================
drop policy if exists "Staff puede ver todos los perfiles" on public.profiles;
drop policy if exists "Staff puede vincular y administrar perfiles" on public.profiles;

create policy "Staff puede ver todos los perfiles" on public.profiles
for select to authenticated
using (public.current_role() in ('socio', 'profesor'));

create policy "Staff puede vincular y administrar perfiles" on public.profiles
for update to authenticated
using (public.current_role() in ('socio', 'profesor'))
with check (public.current_role() in ('socio', 'profesor'));

commit;
