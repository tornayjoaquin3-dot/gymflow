-- 20260728_004_staff_can_update_profiles.sql
--
-- Objetivo:
--   `profiles` no tenia ninguna politica de UPDATE para usuarios comunes
--   (solo service_role podia). Sin esto, socio/profesor no podrian vincular
--   manualmente una cuenta de alumno "pendiente" (alumno_id null) con su
--   ficha correcta en alumnos, que es justo el paso manual que la Etapa 1
--   necesita para los casos donde el telefono no matchea automaticamente.
--
-- Cambios:
--   Permite a socio y profesor actualizar filas de profiles (por ejemplo,
--   setear alumno_id). Un alumno no puede actualizar ninguna fila de
--   profiles con esta politica (ni la propia).
--
-- Impacto:
--   No modifica ninguna fila existente. Solo habilita el permiso.
--
-- Rollback manual:
--   drop policy if exists "Staff puede vincular y administrar perfiles" on public.profiles;

begin;

create policy "Staff puede vincular y administrar perfiles" on public.profiles
for update to authenticated
using (
  exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('socio','profesor'))
)
with check (
  exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('socio','profesor'))
);

commit;
