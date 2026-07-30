-- 20260728_006_register_alumno_profile_fn.sql
--
-- Objetivo:
--   La politica de INSERT de profiles solo permite crear la propia fila
--   con alumno_id = null (a proposito, para que nadie se autoasigne la
--   ficha de otro alumno). Pero el alta de un alumno SI necesita, cuando
--   el telefono matchea exactamente con una unica ficha, guardar ese
--   alumno_id. Esta funcion resuelve el matching y el insert de forma
--   seria, sin depender de lo que mande el cliente.
--
-- Como funciona:
--   - Corre con privilegios elevados (security definer), pero SOLO puede
--     actuar sobre auth.uid() (el usuario que la llama), nunca sobre otro.
--   - Normaliza el telefono recibido y busca en alumnos cuantas fichas
--     tienen ese mismo telefono normalizado. Si hay exactamente una
--     coincidencia, vincula esa ficha. Si hay cero o mas de una, deja
--     alumno_id en null (cuenta "pendiente", para vincular a mano).
--   - Si vinculo, completa apellido/email/dni en la ficha con lo que puso
--     el alumno (sin pisar datos ya cargados).
--   - Solo puede ejecutarla un usuario autenticado (revocado para anon).
--
-- Impacto:
--   No modifica filas existentes salvo cuando efectivamente vincula una
--   cuenta nueva a una ficha (y solo completa campos vacios).
--
-- Rollback manual:
--   drop function if exists public.register_alumno_profile(text, text, text, text);

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
  v_alumno_id uuid;
  v_match_count int;
  v_nombre_completo text;
  v_result public.profiles;
begin
  if v_user_id is null then
    raise exception 'No hay sesion activa';
  end if;

  select email into v_email from auth.users where id = v_user_id;

  v_normalized_phone := regexp_replace(coalesce(p_telefono, ''), '\D', '', 'g');
  v_alumno_id := null;

  if v_normalized_phone <> '' then
    select count(*), min(id) into v_match_count, v_alumno_id
    from public.alumnos
    where regexp_replace(coalesce(telefono, ''), '\D', '', 'g') = v_normalized_phone;

    if v_match_count <> 1 then
      v_alumno_id := null;
    end if;
  end if;

  v_nombre_completo := coalesce(
    nullif(trim(coalesce(p_nombre, '') || ' ' || coalesce(p_apellido, '')), ''),
    v_email,
    'Alumno'
  );

  insert into public.profiles (user_id, email, nombre, role, alumno_id)
  values (v_user_id, v_email, v_nombre_completo, 'alumno', v_alumno_id)
  on conflict (user_id) do update
    set alumno_id = excluded.alumno_id
    where public.profiles.alumno_id is null
  returning * into v_result;

  if v_alumno_id is not null then
    update public.alumnos
    set
      apellido = coalesce(nullif(p_apellido, ''), apellido),
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
