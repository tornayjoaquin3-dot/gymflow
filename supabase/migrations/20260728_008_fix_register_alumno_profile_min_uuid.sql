-- 20260728_008_fix_register_alumno_profile_min_uuid.sql
--
-- Objetivo:
--   Corrige un bug real encontrado al probar el signup de alumno end to
--   end: `register_alumno_profile` (20260728_006) usa `min(id)` para
--   quedarse con la ficha coincidente cuando el telefono matchea una sola
--   fila de `alumnos`. `alumnos.id` es `uuid`, y Postgres no tiene una
--   funcion de agregacion `min()` para `uuid` (solo para tipos con orden
--   nativo como int, text, timestamp).
--
-- Efecto del bug:
--   Cualquier alta de alumno que cargara un telefono (el caso normal)
--   rompia la funcion con `function min(uuid) does not exist` apenas
--   entraba al bloque `if v_normalized_phone <> ''`. El error se perdia
--   silenciosamente en `completeAlumnoSignupFromMetadata` (frontend) y el
--   usuario terminaba viendo "No se encontro un perfil" y deslogueado, sin
--   que se creara nunca su fila en `profiles`. Bloqueaba toda la Etapa 1.
--
-- Solucion:
--   Reemplazar `min(id)` por `min(id::text)::uuid`. Como el valor solo se
--   usa cuando `v_match_count = 1` (con 0 o mas de 1 coincidencia se
--   descarta y queda en null), el orden que use el agregado sobre el texto
--   no afecta el resultado: con una sola fila, cualquier agregado devuelve
--   ese unico id.
--
-- Impacto:
--   No modifica filas existentes. Reemplaza unicamente el cuerpo de la
--   funcion (mismo nombre, misma firma).
--
-- Rollback manual:
--   Reaplicar el cuerpo original de 20260728_006_register_alumno_profile_fn.sql
--   (queda documentado ahi, con el bug).

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
    select count(*), min(id::text)::uuid into v_match_count, v_alumno_id
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
