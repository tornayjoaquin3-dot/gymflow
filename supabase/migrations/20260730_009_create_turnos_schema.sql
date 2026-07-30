-- 20260730_009_create_turnos_schema.sql
--
-- Objetivo:
--   Etapa 1 del sistema de turnos (Fase 2 del roadmap): crear el modelo de
--   datos, los indices que hacen cumplir las reglas de negocio del MVP
--   (PRODUCT_VISION.md #6) y la RLS. No incluye pantallas ni las funciones
--   RPC de reservar/cancelar/generar (esas van en la 010, a proposito
--   separadas para poder corregir una funcion sin tocar el esquema, como
--   paso con la 008 sobre la 006).
--
-- Cambios:
--   1. public.franjas_horarias: plantilla semanal que va a configurar el
--      staff (dia_semana + horario + cupo). Todavia no hay pantalla para
--      esto, se carga a mano si hace falta probar.
--   2. public.turnos: instancia concreta de una franja en una fecha real.
--      franja_horaria_id es nullable con on delete set null para que
--      borrar o editar una plantilla nunca borre turnos ya generados.
--   3. public.reservas: la reserva de un alumno sobre un turno. `fecha`
--      esta denormalizada de turnos.fecha (la pisa un trigger siempre, ver
--      mas abajo) porque la regla "maximo un turno diario" cruza reservas
--      con turnos.fecha y un indice no puede expresar eso solo.
--   4. Trigger enforce_reserva_invariants: unico lugar que hace cumplir el
--      cupo maximo de verdad (con lock de fila sobre turnos, para que dos
--      reservas simultaneas no pasen el cupo) y que fecha nunca pueda
--      venir falseada desde el cliente ni desde un insert manual del staff.
--   5. RLS en las 3 tablas, usando current_role()/current_alumno_id()
--      (funciones de la migracion 007) -- nunca una subquery directa a
--      profiles, que fue lo que rompio el login de todos los roles la
--      ultima vez.
--
-- Por que va todo en una sola transaccion (esquema + RLS juntos):
--   La migracion 002 tuvo que documentar como hueco de seguridad real el
--   haber creado tablas en un paso separado de agregarles RLS. Ac lo
--   creamos con RLS activada y las politicas ya puestas desde el mismo
--   commit, para que nunca exista una ventana de tablas nuevas sin
--   proteccion.
--
-- Impacto:
--   Tablas nuevas, no toca ninguna tabla ni fila existente.
--
-- Pasos manuales despues de aplicar:
--   - La 010 (funciones RPC) tiene que aplicarse despues de esta.
--   - No hay pantalla todavia para cargar franjas_horarias; si se quiere
--     probar el flujo hay que insertar una fila a mano (staff-only por RLS).
--
-- Rollback manual (orden de dependencias):
--   begin;
--   drop policy if exists "Staff ve todas las reservas" on public.reservas;
--   drop policy if exists "Staff crea reservas" on public.reservas;
--   drop policy if exists "Staff actualiza reservas" on public.reservas;
--   drop policy if exists "Alumno ve sus propias reservas" on public.reservas;
--   drop policy if exists "Staff ve todos los turnos" on public.turnos;
--   drop policy if exists "Staff administra turnos" on public.turnos;
--   drop policy if exists "Staff edita turnos" on public.turnos;
--   drop policy if exists "Alumno ve turnos reservables o propios" on public.turnos;
--   drop policy if exists "Staff ve todas las franjas" on public.franjas_horarias;
--   drop policy if exists "Staff administra franjas" on public.franjas_horarias;
--   drop policy if exists "Staff edita franjas" on public.franjas_horarias;
--   drop policy if exists "Staff elimina franjas" on public.franjas_horarias;
--   drop policy if exists "Alumno ve franjas activas" on public.franjas_horarias;
--   drop trigger if exists trg_enforce_reserva_invariants on public.reservas;
--   drop function if exists public.enforce_reserva_invariants();
--   drop trigger if exists trg_franjas_horarias_updated_at on public.franjas_horarias;
--   drop trigger if exists trg_turnos_updated_at on public.turnos;
--   drop function if exists public.set_updated_at();
--   drop table if exists public.reservas;
--   drop table if exists public.turnos;
--   drop table if exists public.franjas_horarias;
--   commit;

begin;

-- ==================== Helper: mantener updated_at ====================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ==================== franjas_horarias ====================
create table public.franjas_horarias (
  id uuid primary key default gen_random_uuid(),
  dia_semana smallint not null check (dia_semana between 0 and 6), -- 0 = domingo, igual que extract(dow from date)
  hora_inicio time not null,
  hora_fin time not null check (hora_fin > hora_inicio),
  cupo_maximo integer not null check (cupo_maximo > 0),
  activo boolean not null default true,
  profesor_id uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index franjas_horarias_dia_activo_idx
  on public.franjas_horarias (dia_semana)
  where activo = true;

create trigger trg_franjas_horarias_updated_at
before update on public.franjas_horarias
for each row
execute function public.set_updated_at();

-- ==================== turnos ====================
create table public.turnos (
  id uuid primary key default gen_random_uuid(),
  franja_horaria_id uuid references public.franjas_horarias(id) on delete set null,
  fecha date not null,
  hora_inicio time not null,
  hora_fin time not null check (hora_fin > hora_inicio),
  cupo_maximo integer not null check (cupo_maximo > 0),
  estado text not null default 'abierto' check (estado in ('abierto', 'cerrado', 'cancelado')),
  profesor_id uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint turnos_franja_fecha_key unique (franja_horaria_id, fecha)
);

create index turnos_fecha_idx on public.turnos (fecha);

create trigger trg_turnos_updated_at
before update on public.turnos
for each row
execute function public.set_updated_at();

-- ==================== reservas ====================
create table public.reservas (
  id uuid primary key default gen_random_uuid(),
  alumno_id uuid not null references public.alumnos(id) on delete cascade,
  turno_id uuid not null references public.turnos(id) on delete cascade,
  fecha date not null, -- denormalizada de turnos.fecha, la pisa el trigger de abajo siempre
  estado text not null default 'reservado'
    check (estado in ('reservado', 'cancelado', 'presente', 'ausente', 'lista_espera')),
  origen text not null default 'alumno' check (origen in ('alumno', 'staff')),
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  checked_in_at timestamptz
);

create index reservas_turno_id_idx on public.reservas (turno_id);
create index reservas_alumno_id_idx on public.reservas (alumno_id);

-- Una reserva activa por alumno y turno (no duplicar la misma reserva)
create unique index reservas_alumno_turno_activa_key
  on public.reservas (alumno_id, turno_id)
  where estado = 'reservado';

-- Maximo un turno reservado por dia (la regla del MVP). lista_espera no
-- cuenta a proposito: esta etapa nunca genera ese estado.
create unique index reservas_alumno_fecha_activa_key
  on public.reservas (alumno_id, fecha)
  where estado = 'reservado';

-- ==================== Trigger: cupo y fecha de verdad ====================
create or replace function public.enforce_reserva_invariants()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_turno public.turnos;
  v_reservas_activas int;
begin
  -- Siempre se bloquea y se lee el turno real, sin importar que columna
  -- cambio: es lo que serializa reservas simultaneas sobre el mismo turno
  -- y evita que fecha se pueda forzar desde afuera (cliente o insert
  -- manual del staff).
  select * into v_turno from public.turnos where id = new.turno_id for update;

  if v_turno.id is null then
    raise exception 'El turno no existe';
  end if;

  new.fecha := v_turno.fecha;

  -- Solo importa el cupo cuando la fila esta pasando a "reservado"
  if new.estado = 'reservado'
     and (tg_op = 'INSERT' or old.estado is distinct from 'reservado') then

    select count(*) into v_reservas_activas
    from public.reservas
    where turno_id = new.turno_id
      and estado = 'reservado'
      and id is distinct from new.id;

    if v_reservas_activas >= v_turno.cupo_maximo then
      raise exception 'Turno completo';
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function public.enforce_reserva_invariants() from public, anon, authenticated;

create trigger trg_enforce_reserva_invariants
before insert or update on public.reservas
for each row
execute function public.enforce_reserva_invariants();

-- ==================== RLS ====================
alter table public.franjas_horarias enable row level security;
alter table public.turnos enable row level security;
alter table public.reservas enable row level security;

-- ---- franjas_horarias ----
create policy "Staff ve todas las franjas" on public.franjas_horarias
for select to authenticated
using (public.current_role() in ('socio', 'profesor'));

create policy "Alumno ve franjas activas" on public.franjas_horarias
for select to authenticated
using (public.current_role() = 'alumno' and activo = true);

create policy "Staff administra franjas" on public.franjas_horarias
for insert to authenticated
with check (public.current_role() in ('socio', 'profesor'));

create policy "Staff edita franjas" on public.franjas_horarias
for update to authenticated
using (public.current_role() in ('socio', 'profesor'))
with check (public.current_role() in ('socio', 'profesor'));

create policy "Staff elimina franjas" on public.franjas_horarias
for delete to authenticated
using (public.current_role() in ('socio', 'profesor'));

-- ---- turnos ----
create policy "Staff ve todos los turnos" on public.turnos
for select to authenticated
using (public.current_role() in ('socio', 'profesor'));

create policy "Alumno ve turnos reservables o propios" on public.turnos
for select to authenticated
using (
  public.current_role() = 'alumno'
  and (
    fecha between current_date and current_date + 7
    or exists (
      select 1 from public.reservas r
      where r.turno_id = turnos.id
        and r.alumno_id = public.current_alumno_id()
    )
  )
);

create policy "Staff administra turnos" on public.turnos
for insert to authenticated
with check (public.current_role() in ('socio', 'profesor'));

create policy "Staff edita turnos" on public.turnos
for update to authenticated
using (public.current_role() in ('socio', 'profesor'))
with check (public.current_role() in ('socio', 'profesor'));

-- Sin policy de delete: cancelar es un cambio de estado, no un borrado
-- (turnos tiene reservas.turno_id con on delete cascade, no queremos que
-- borrar un turno se lleve puesto el historial de reservas).

-- ---- reservas ----
create policy "Alumno ve sus propias reservas" on public.reservas
for select to authenticated
using (public.current_role() = 'alumno' and alumno_id = public.current_alumno_id());

create policy "Staff ve todas las reservas" on public.reservas
for select to authenticated
using (public.current_role() in ('socio', 'profesor'));

create policy "Staff crea reservas" on public.reservas
for insert to authenticated
with check (public.current_role() in ('socio', 'profesor'));

create policy "Staff actualiza reservas" on public.reservas
for update to authenticated
using (public.current_role() in ('socio', 'profesor'))
with check (public.current_role() in ('socio', 'profesor'));

-- Alumno no tiene policy de insert/update directa: reservar_turno y
-- cancelar_reserva (migracion 010) son security definer y escriben sin
-- necesitar policy. Tampoco hay policy de delete para nadie.

commit;
