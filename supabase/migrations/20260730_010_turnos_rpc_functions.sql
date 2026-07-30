-- 20260730_010_turnos_rpc_functions.sql
--
-- Objetivo:
--   Funciones que un alumno o el staff van a poder llamar para reservar,
--   cancelar y (el staff) generar turnos desde las franjas horarias. Se
--   separan del esquema (migracion 009) para poder corregir una funcion
--   sola en el futuro sin re-tocar tablas/RLS, como paso con la 008 sobre
--   la 006.
--
-- Por que la hora de Argentina:
--   franjas_horarias/turnos guardan hora local del gimnasio (es-AR). El
--   servidor de Postgres corre en otro huso horario. Si se compara
--   now()/current_date crudo contra esas horas locales, el corte de "2
--   horas antes" y la ventana de "7 dias" se corren por el offset de
--   Argentina. Por eso todas las comparaciones de tiempo ac convierten
--   explicitamente con `at time zone 'America/Argentina/Buenos_Aires'`.
--
-- Cambios:
--   1. reservar_turno(p_turno_id): solo alumno, sobre su propia cuenta
--      (current_alumno_id(), nunca un id mandado por el cliente). Valida
--      turno abierto, ventana de 7 dias, que no haya arrancado ya, cupo y
--      "un turno por dia" antes de insertar. El trigger de la 009 es la
--      garantia real contra condiciones de carrera; si el insert pierde
--      esa carrera se devuelve el mismo mensaje amigable en vez de un
--      error crudo de Postgres.
--   2. cancelar_reserva(p_reserva_id): alumno solo puede cancelar la
--      propia y con mas de 2 horas de anticipacion; staff puede cancelar
--      cualquiera sin ese limite (como ya tiene acceso total al resto de
--      la app).
--   3. generar_turnos(p_dias_adelante): solo staff. Genera turnos desde
--      las franjas activas para los proximos N dias (default 7), idempotente
--      via "on conflict (franja_horaria_id, fecha) do nothing" -- se puede
--      apretar el boton de nuevo sin duplicar turnos.
--
-- Impacto:
--   No modifica filas existentes. Solo agrega funciones nuevas.
--
-- Pasos manuales despues de aplicar:
--   Ninguno: no hay pantalla todavia que llame a estas funciones. Se
--   pueden probar a mano via supabase.rpc(...) o SQL directo simulando
--   la sesion (set_config('request.jwt.claims', ...)).
--
-- Rollback manual:
--   begin;
--   drop function if exists public.generar_turnos(integer);
--   drop function if exists public.cancelar_reserva(uuid);
--   drop function if exists public.reservar_turno(uuid);
--   commit;

begin;

-- ==================== reservar_turno ====================
create or replace function public.reservar_turno(p_turno_id uuid)
returns public.reservas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_alumno_id uuid := public.current_alumno_id();
  v_turno public.turnos;
  v_hoy_local date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
  v_hora_local time := (now() at time zone 'America/Argentina/Buenos_Aires')::time;
  v_reservas_activas int;
  v_reserva public.reservas;
begin
  if public.current_role() <> 'alumno' or v_alumno_id is null then
    raise exception 'Solo un alumno con cuenta vinculada puede reservar un turno';
  end if;

  select * into v_turno from public.turnos where id = p_turno_id for update;

  if v_turno.id is null then
    raise exception 'El turno no existe';
  end if;

  if v_turno.estado <> 'abierto' then
    raise exception 'El turno no esta disponible';
  end if;

  if v_turno.fecha < v_hoy_local or v_turno.fecha > v_hoy_local + 7 then
    raise exception 'Solo se puede reservar hasta 7 dias de anticipacion';
  end if;

  if v_turno.fecha = v_hoy_local and v_turno.hora_inicio <= v_hora_local then
    raise exception 'El turno ya comenzo';
  end if;

  select count(*) into v_reservas_activas
  from public.reservas
  where turno_id = p_turno_id and estado = 'reservado';

  if v_reservas_activas >= v_turno.cupo_maximo then
    raise exception 'Turno completo';
  end if;

  if exists (
    select 1 from public.reservas
    where alumno_id = v_alumno_id and fecha = v_turno.fecha and estado = 'reservado'
  ) then
    raise exception 'Ya tenes un turno reservado ese dia';
  end if;

  begin
    insert into public.reservas (alumno_id, turno_id, fecha, estado, origen)
    values (v_alumno_id, p_turno_id, v_turno.fecha, 'reservado', 'alumno')
    returning * into v_reserva;
  exception
    when unique_violation then
      raise exception 'Ese turno ya no esta disponible';
  end;

  return v_reserva;
end;
$$;

revoke all on function public.reservar_turno(uuid) from public, anon;
grant execute on function public.reservar_turno(uuid) to authenticated;

-- ==================== cancelar_reserva ====================
create or replace function public.cancelar_reserva(p_reserva_id uuid)
returns public.reservas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := public.current_role();
  v_reserva public.reservas;
  v_turno public.turnos;
  v_limite timestamptz;
begin
  select * into v_reserva from public.reservas where id = p_reserva_id for update;

  if v_reserva.id is null then
    raise exception 'La reserva no existe';
  end if;

  if v_reserva.estado = 'cancelado' then
    raise exception 'La reserva ya estaba cancelada';
  end if;

  if v_role = 'alumno' then
    if v_reserva.alumno_id <> public.current_alumno_id() then
      raise exception 'No autorizado';
    end if;

    select * into v_turno from public.turnos where id = v_reserva.turno_id;

    v_limite := ((v_turno.fecha + v_turno.hora_inicio) at time zone 'America/Argentina/Buenos_Aires') - interval '2 hours';

    if now() > v_limite then
      raise exception 'No se puede cancelar a menos de 2 horas del turno';
    end if;
  elsif v_role not in ('socio', 'profesor') then
    raise exception 'No autorizado';
  end if;

  update public.reservas
  set estado = 'cancelado', cancelled_at = now()
  where id = p_reserva_id
  returning * into v_reserva;

  return v_reserva;
end;
$$;

revoke all on function public.cancelar_reserva(uuid) from public, anon;
grant execute on function public.cancelar_reserva(uuid) to authenticated;

-- ==================== generar_turnos ====================
create or replace function public.generar_turnos(p_dias_adelante integer default 7)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hoy_local date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
  v_creados int;
begin
  if public.current_role() not in ('socio', 'profesor') then
    raise exception 'Solo el staff puede generar turnos';
  end if;

  if p_dias_adelante < 1 or p_dias_adelante > 60 then
    raise exception 'Rango de dias invalido';
  end if;

  with fechas as (
    select generate_series(v_hoy_local, v_hoy_local + (p_dias_adelante - 1), interval '1 day')::date as fecha
  ),
  insertados as (
    insert into public.turnos (franja_horaria_id, fecha, hora_inicio, hora_fin, cupo_maximo, estado, profesor_id)
    select f.id, fechas.fecha, f.hora_inicio, f.hora_fin, f.cupo_maximo, 'abierto', f.profesor_id
    from public.franjas_horarias f
    join fechas on extract(dow from fechas.fecha)::smallint = f.dia_semana
    where f.activo = true
    on conflict (franja_horaria_id, fecha) do nothing
    returning 1
  )
  select count(*) into v_creados from insertados;

  return v_creados;
end;
$$;

revoke all on function public.generar_turnos(integer) from public, anon;
grant execute on function public.generar_turnos(integer) to authenticated;

commit;
