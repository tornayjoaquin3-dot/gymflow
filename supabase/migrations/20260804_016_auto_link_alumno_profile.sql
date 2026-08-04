-- 20260804_016_auto_link_alumno_profile.sql
--
-- Objetivo:
--   Vinculacion automatica alumno <-> auth al registrarse (Fase de
--   onboarding). Hoy `register_alumno_profile` (006, corregida en 008)
--   solo intenta matchear por telefono; si no matchea exactamente una
--   fila, el alumno queda "pendiente" y un miembro del staff tiene que
--   vincularlo a mano desde PendingAlumnoAccounts.jsx -- incluso si el
--   alumno es completamente nuevo y nunca tuvo ficha. Se reemplaza esa
--   funcion por una que busca en cascada de mayor a menor confianza
--   (DNI -> email -> telefono) y, si no encuentra nada, crea la ficha
--   directamente en vez de dejarla pendiente.
--
-- Cambios:
--   Recrea `register_alumno_profile(p_nombre, p_apellido, p_telefono,
--   p_dni)` (mismo nombre y firma, sigue security definer):
--
--   1. Busca un alumno existente probando DNI, despues email (de
--      auth.users, no lo que tipeo el alumno), despues telefono -- se
--      prueba el siguiente solo si el anterior no encontro NINGUNA fila.
--      Todo normalizado (solo digitos para dni/telefono, lower/trim para
--      email) para tolerar formato distinto (puntos, espacios, mayusculas).
--   2. Si algun paso encuentra mas de una coincidencia (ej. dos alumnos
--      con el mismo telefono, algo que hoy es posible porque telefono no
--      tiene constraint unique), se corta la cascada ahi mismo: no se
--      vincula ni se crea nada, la cuenta queda con alumno_id null (el
--      mismo estado "pendiente" de siempre, para que el staff lo resuelva
--      a mano -- ver PendingAlumnoAccounts.jsx).
--   3. Si nada matchea y no hubo conflicto, se crea la ficha en
--      `alumnos` con los datos del formulario. nombre y apellido se
--      guardan en columnas separadas (no concatenados) para no repetir
--      el apellido al mostrarlo despues (ver formatStudentName en
--      lib/student-utils.js).
--   4. Si se encontro (o se creo) un alumno, se sincroniza
--      apellido/telefono/email/dni con lo que cargo el alumno ahora --
--      mismo patron ya usado antes (coalesce: solo pisa si el nuevo dato
--      no viene vacio), se le suma telefono, que antes no se sincronizaba.
--
-- Impacto:
--   No borra ni renombra nada. Reemplaza el cuerpo de una funcion
--   existente (mismo nombre/firma, ningun componente necesita cambios).
--   Antes, un alumno sin ficha previa SIEMPRE quedaba pendiente; ahora se
--   le crea la ficha sola. Los flujos de vinculacion manual
--   (PendingAlumnoAccounts.jsx) siguen intactos para el caso de conflicto.
--
-- Pasos manuales despues de aplicar:
--   Ninguno.
--
-- Rollback manual:
--   Reaplicar el cuerpo de la funcion documentado en
--   20260728_008_fix_register_alumno_profile_min_uuid.sql.

begin;

create or replace function public.register_alumno_profile(
  p_nombre text,
  p_apellido text,
  p_telefono text,
  p_dni text
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_normalized_phone text;
  v_normalized_dni text;
  v_alumno_id uuid;
  v_match_count int;
  v_conflict boolean := false;
  v_nombre_completo text;
  v_result public.profiles;
begin
  if v_user_id is null then
    raise exception 'No hay sesion activa';
  end if;

  select email into v_email from auth.users where id = v_user_id;

  v_normalized_phone := regexp_replace(coalesce(p_telefono, ''), '\D', '', 'g');
  v_normalized_dni := regexp_replace(coalesce(p_dni, ''), '\D', '', 'g');
  v_alumno_id := null;

  -- 1) DNI, maxima prioridad.
  if v_normalized_dni <> '' then
    select count(*), (array_agg(id))[1] into v_match_count, v_alumno_id
    from public.alumnos
    where regexp_replace(coalesce(dni, ''), '\D', '', 'g') = v_normalized_dni;

    if v_match_count = 0 then
      v_alumno_id := null;
    elsif v_match_count > 1 then
      v_alumno_id := null;
      v_conflict := true;
    end if;
  end if;

  -- 2) Email (de auth.users), solo si DNI no encontro nada y no hubo conflicto.
  if v_alumno_id is null and not v_conflict and coalesce(v_email, '') <> '' then
    select count(*), (array_agg(id))[1] into v_match_count, v_alumno_id
    from public.alumnos
    where email is not null and lower(trim(email)) = lower(trim(v_email));

    if v_match_count = 0 then
      v_alumno_id := null;
    elsif v_match_count > 1 then
      v_alumno_id := null;
      v_conflict := true;
    end if;
  end if;

  -- 3) Telefono, ultimo recurso.
  if v_alumno_id is null and not v_conflict and v_normalized_phone <> '' then
    select count(*), (array_agg(id))[1] into v_match_count, v_alumno_id
    from public.alumnos
    where regexp_replace(coalesce(telefono, ''), '\D', '', 'g') = v_normalized_phone;

    if v_match_count = 0 then
      v_alumno_id := null;
    elsif v_match_count > 1 then
      v_alumno_id := null;
      v_conflict := true;
    end if;
  end if;

  v_nombre_completo := coalesce(
    nullif(trim(coalesce(p_nombre, '') || ' ' || coalesce(p_apellido, '')), ''),
    v_email,
    'Alumno'
  );

  -- 4) Nada matcheo y no hay conflicto: se crea la ficha en vez de dejarla
  -- pendiente. nombre/apellido separados a proposito (ver comentario de
  -- arriba).
  if v_alumno_id is null and not v_conflict then
    insert into public.alumnos (nombre, apellido, telefono, email, dni)
    values (
      coalesce(nullif(p_nombre, ''), v_email, 'Alumno'),
      nullif(p_apellido, ''),
      nullif(p_telefono, ''),
      nullif(v_email, ''),
      nullif(p_dni, '')
    )
    returning id into v_alumno_id;
  end if;

  insert into public.profiles (user_id, email, nombre, role, alumno_id)
  values (v_user_id, v_email, v_nombre_completo, 'alumno', v_alumno_id)
  on conflict (user_id) do update
    set alumno_id = excluded.alumno_id
    where public.profiles.alumno_id is null
  returning * into v_result;

  -- Si se encontro (o se creo) una ficha, sincronizamos sus datos de
  -- contacto con lo que cargo el alumno ahora -- coalesce: solo pisa si
  -- el dato nuevo no viene vacio.
  if v_alumno_id is not null and not v_conflict then
    update public.alumnos
    set
      apellido = coalesce(nullif(p_apellido, ''), apellido),
      telefono = coalesce(nullif(p_telefono, ''), telefono),
      email = coalesce(nullif(v_email, ''), email),
      dni = coalesce(nullif(p_dni, ''), dni)
    where id = v_alumno_id;
  end if;

  return v_result;
end;
$$;

revoke all on function public.register_alumno_profile(text, text, text, text) from public, anon;
grant execute on function public.register_alumno_profile(text, text, text, text) to authenticated;

commit;
