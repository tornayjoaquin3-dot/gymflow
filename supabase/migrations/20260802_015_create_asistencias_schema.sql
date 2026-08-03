-- 20260802_015_create_asistencias_schema.sql
--
-- Objetivo:
--   Fase 3 del roadmap (PRODUCT_VISION.md #5): el profesor no tiene forma
--   de saber quien reservo, quien vino, quien falto, ni de anotar a alguien
--   que entreno sin reserva. Este modulo es nuevo y separado del de Turnos
--   (Fase 2): no modifica `franjas_horarias`, `turnos` ni `reservas`, solo
--   lee de ellas. `reservas.checked_in_at` quedo sin usar desde la 009 a
--   proposito para esto, pero se prefiere una tabla propia en vez de esa
--   columna: una reserva es "la intencion de venir", una asistencia es "lo
--   que paso de verdad" (incluye alumnos que vinieron sin reservar, que no
--   tienen fila en `reservas`), y separarlas deja mejor preparadas las
--   estadisticas futuras del PRODUCT_VISION.md #7 (ausentismo, ranking,
--   ocupacion, frecuencia) sin tener que revisar reservas canceladas o
--   filtrar por origen.
--
-- Cambios:
--   1. public.asistencias: una fila por (turno, alumno), sin importar si
--      llego por reserva o se agrego a mano. `reserva_id` referencia la
--      reserva de origen (null si es un ingreso sin reserva).
--      `registrado_por` guarda que cuenta de staff la registro (auditoria,
--      ver DATABASE.md #9).
--   2. Constraint unique (turno_id, alumno_id): nunca dos registros del
--      mismo alumno en el mismo turno.
--   3. Constraint check: un registro 'sin_reserva' nunca puede tener
--      reserva_id (evita datos inconsistentes para las estadisticas
--      futuras).
--   4. Indices por turno_id, alumno_id y estado: son los tres cortes que
--      van a usar los reportes futuros (asistencia por turno, por alumno,
--      y conteos por estado).
--   5. Trigger de updated_at reutilizando public.set_updated_at(), la
--      misma funcion que ya usan franjas_horarias/turnos (migracion 009).
--      No hace falta un trigger de invariantes tipo
--      enforce_reserva_invariants: ac no hay cupo que proteger de
--      condiciones de carrera, es CRUD directo de staff (mismo patron que
--      franjas_horarias/turnos, sin funciones RPC security definer).
--   6. RLS: solo socio/profesor (select/insert/update/delete), usando
--      current_role() (funcion security definer de la migracion 007) --
--      nunca una subquery directa a profiles, que fue lo que rompio el
--      login de los tres roles la primera vez (ver DATABASE.md #10). No
--      hay ninguna policy para alumno: el requisito "no disponible para
--      Alumno" queda reforzado en la base, no solo ocultando la seccion en
--      el frontend (AI_RULES.md #2).
--
-- Impacto:
--   Tabla nueva, no toca ninguna tabla ni fila existente (alumnos, turnos,
--   reservas, profiles quedan intactas).
--
-- Pasos manuales despues de aplicar:
--   Ninguno. La pantalla nueva (components/AsistenciaSection.jsx) ya
--   apunta a este esquema.
--
-- Rollback manual:
--   begin;
--   drop table if exists public.asistencias cascade;
--   commit;

begin;

create table public.asistencias (
  id uuid primary key default gen_random_uuid(),
  turno_id uuid not null references public.turnos(id) on delete cascade,
  alumno_id uuid not null references public.alumnos(id) on delete cascade,
  reserva_id uuid references public.reservas(id) on delete set null,
  estado text not null check (estado in ('presente', 'ausente', 'sin_reserva')),
  registrado_por uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint asistencias_turno_alumno_key unique (turno_id, alumno_id),
  constraint asistencias_sin_reserva_sin_fk check (estado <> 'sin_reserva' or reserva_id is null)
);

create index asistencias_turno_id_idx on public.asistencias (turno_id);
create index asistencias_alumno_id_idx on public.asistencias (alumno_id);
create index asistencias_estado_idx on public.asistencias (estado);

create trigger trg_asistencias_updated_at
before update on public.asistencias
for each row
execute function public.set_updated_at();

-- ==================== RLS ====================
alter table public.asistencias enable row level security;

create policy "Staff ve todas las asistencias" on public.asistencias
for select to authenticated
using (public.current_role() in ('socio', 'profesor'));

create policy "Staff crea asistencias" on public.asistencias
for insert to authenticated
with check (public.current_role() in ('socio', 'profesor'));

create policy "Staff actualiza asistencias" on public.asistencias
for update to authenticated
using (public.current_role() in ('socio', 'profesor'))
with check (public.current_role() in ('socio', 'profesor'));

create policy "Staff elimina asistencias" on public.asistencias
for delete to authenticated
using (public.current_role() in ('socio', 'profesor'));

-- Sin policy para alumno: RLS deniega por default, el rol alumno no tiene
-- ningun acceso a esta tabla (ni lectura), a proposito.

commit;
