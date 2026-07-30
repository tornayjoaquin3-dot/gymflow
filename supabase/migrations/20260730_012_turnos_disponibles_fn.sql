-- 20260730_012_turnos_disponibles_fn.sql
--
-- Objetivo:
--   Etapa 3 del sistema de turnos: la pantalla del alumno necesita mostrar
--   "cupo visible" y deshabilitar un turno lleno (reglas del MVP en
--   PRODUCT_VISION.md #6). La policy de reservas que se armo en la 009 solo
--   deja ver al alumno sus propias reservas (correcto para privacidad), asi
--   que no hay forma de que el cliente calcule cuantos lugares ocupados
--   tiene un turno ajeno con una consulta directa. Esta funcion resuelve
--   eso exponiendo unicamente el conteo, nunca quien reservo.
--
-- Cambios:
--   turnos_disponibles(): devuelve los turnos visibles para el alumno que
--   llama (mismo criterio que la policy "Alumno ve turnos reservables o
--   propios" de la 009: ventana de 7 dias en hora local de Argentina, o
--   turnos donde ya tiene una reserva) junto con cupo_ocupado, contado con
--   security definer para no depender de que el alumno pueda leer las
--   reservas de otros. Devuelve vacio si la llama alguien que no sea
--   alumno, sin error.
--
-- Impacto:
--   Solo lectura, no modifica ninguna fila.
--
-- Rollback manual:
--   drop function if exists public.turnos_disponibles();

begin;

create or replace function public.turnos_disponibles()
returns table (
  id uuid,
  fecha date,
  hora_inicio time,
  hora_fin time,
  cupo_maximo integer,
  estado text,
  cupo_ocupado bigint
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
    t.cupo_maximo,
    t.estado,
    count(r.id) filter (where r.estado = 'reservado') as cupo_ocupado
  from public.turnos t
  left join public.reservas r on r.turno_id = t.id
  where public.current_role() = 'alumno'
    and (
      t.fecha between (now() at time zone 'America/Argentina/Buenos_Aires')::date
                   and (now() at time zone 'America/Argentina/Buenos_Aires')::date + 7
      or exists (
        select 1 from public.reservas r2
        where r2.turno_id = t.id and r2.alumno_id = public.current_alumno_id()
      )
    )
  group by t.id
  order by t.fecha, t.hora_inicio;
$$;

revoke all on function public.turnos_disponibles() from public, anon;
grant execute on function public.turnos_disponibles() to authenticated;

commit;
