-- 20260731_014_turnos_disponibles_fix.sql
--
-- Objetivo:
--   Dos correcciones a `turnos_disponibles()` (migracion 012), pedidas
--   despues de que el usuario probo el portal del alumno:
--
--   1. Bug: un turno que el alumno ya reservo seguia apareciendo en
--      "Turnos disponibles" (la funcion original lo dejaba visible a
--      proposito via el "or exists reserva", pensando en mostrar turnos
--      fuera de la ventana de 7 dias). Esa rama sobraba: "Mis turnos" ya
--      muestra los turnos reservados con su propia consulta directa a
--      `reservas`. Se saca esa rama y se excluyen explicitamente los
--      turnos donde el alumno ya tiene una reserva activa.
--
--   2. Privacidad: el alumno no debe ver cuantos lugares estan ocupados,
--      eso es solo para socio/profesor (que ya lo ven en la pantalla de
--      staff, sin cambios). Se reemplaza `cupo_maximo`/`cupo_ocupado`
--      (numeros) por un solo booleano `disponible`.
--
-- Cambios:
--   Se dropea y recrea la funcion porque cambia la forma de la tabla que
--   devuelve (no se puede hacer con create or replace).
--
-- Impacto:
--   Solo lectura, no modifica ninguna fila. Rompe el contrato de la
--   funcion para quien la llame esperando `cupo_maximo`/`cupo_ocupado`;
--   el unico consumidor es components/AlumnoTurnosSection.jsx, que se
--   actualiza en el mismo cambio.
--
-- Rollback manual:
--   Reaplicar el cuerpo original de 20260730_012_turnos_disponibles_fn.sql.

begin;

drop function if exists public.turnos_disponibles();

create or replace function public.turnos_disponibles()
returns table (
  id uuid,
  fecha date,
  hora_inicio time,
  hora_fin time,
  estado text,
  disponible boolean
)
language sql
security definer
stable
set search_path = public
as $$
  select
    t.id,
    t.fecha,
    t.hora_inicio,
    t.hora_fin,
    t.estado,
    (
      t.estado = 'abierto'
      and count(r.id) filter (where r.estado = 'reservado') < t.cupo_maximo
    ) as disponible
  from public.turnos t
  left join public.reservas r on r.turno_id = t.id
  where public.current_role() = 'alumno'
    and t.fecha between (now() at time zone 'America/Argentina/Buenos_Aires')::date
                     and (now() at time zone 'America/Argentina/Buenos_Aires')::date + 7
    and not exists (
      select 1 from public.reservas r2
      where r2.turno_id = t.id
        and r2.alumno_id = public.current_alumno_id()
        and r2.estado = 'reservado'
    )
  group by t.id
  order by t.fecha, t.hora_inicio;
$$;

revoke all on function public.turnos_disponibles() from public, anon;
grant execute on function public.turnos_disponibles() to authenticated;

commit;
