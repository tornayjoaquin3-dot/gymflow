-- 20260730_013_profiles_self_select.sql
--
-- Objetivo:
--   Bug real encontrado probando la Etapa 3 (no relacionado con turnos):
--   `profiles` nunca tuvo una policy de SELECT que deje a un usuario leer
--   su propia fila -- la unica policy de lectura es "Staff puede ver todos
--   los perfiles" (solo socio/profesor). `loadUserProfile` (lib/profile-
--   service.js) hace un SELECT directo a profiles en cada login; para un
--   alumno, RLS lo bloquea y devuelve cero filas.
--
-- Por que el primer login de un alumno funcionaba igual:
--   register_alumno_profile (migracion 006) es security definer y devuelve
--   la fila directo con `returning * into v_result`, sin pasar por una
--   consulta sujeta a RLS. Pero en el login siguiente, loadUserProfile no
--   encuentra nada (RLS lo bloquea), cae a completeAlumnoSignupFromMetadata,
--   que vuelve a llamar register_alumno_profile -- y como esa cuenta ya
--   esta vinculada (alumno_id no es null), el `on conflict do update ...
--   where alumno_id is null` no actualiza nada, y por como Postgres maneja
--   un DO UPDATE condicional que no se cumple, la fila queda afuera del
--   RETURNING. El resultado: la app muestra "No se encontro un perfil" y
--   cierra la sesion. Todo alumno real quedaria bloqueado en su segundo
--   login.
--
-- Cambios:
--   Agrega una policy de SELECT para que cualquier usuario autenticado
--   (socio, profesor o alumno) pueda leer unicamente su propia fila de
--   profiles. No es recursiva (compara user_id contra auth.uid() directo,
--   no vuelve a consultar profiles adentro de la condicion), asi que no
--   repite el problema que la 007 tuvo que corregir.
--
-- Impacto:
--   No modifica ninguna fila. Solo agrega permiso de lectura de la propia
--   fila. Socio/profesor ya podian leer la suya via "Staff ve todos los
--   perfiles"; esto es aditivo, no le saca acceso a nadie.
--
-- Rollback manual:
--   drop policy if exists "Usuario puede ver su propio perfil" on public.profiles;

begin;

create policy "Usuario puede ver su propio perfil" on public.profiles
for select to authenticated
using (user_id = auth.uid());

commit;
