-- 20260728_003_enable_rls_legacy_tables.sql
--
-- Objetivo:
--   El advisor de seguridad de Supabase marco como ERROR que `usuarios` y
--   `ejercicios_rutina` son tablas publicas sin RLS activada. Eso significa
--   que, hasta ahora, cualquiera con la clave publica (anon) podia leer o
--   escribir esas tablas directo, sin loguearse siquiera.
--
-- Por que es seguro cerrarlas sin agregar politicas:
--   - `usuarios` (legacy): los 3 usuarios reales (socio, profesor, y el
--     alumno de prueba) ya tienen fila equivalente en `profiles`, que es
--     la tabla que el codigo consulta primero. `usuarios` solo actuaba
--     como fallback y ya no hace falta.
--   - `ejercicios_rutina`: no hay ninguna referencia a esta tabla en el
--     codigo del frontend (se verifico con busqueda en todo el repo). Es
--     schema preparado para la normalizacion futura de rutinas, todavia
--     no conectado a ninguna pantalla.
--
-- Impacto:
--   Ninguno esperado sobre la app actual. Se activa RLS sin políticas,
--   lo que bloquea el acceso desde el cliente (anon/authenticated) pero
--   no afecta al service_role ni a herramientas administrativas.
--
-- Rollback manual:
--   alter table public.usuarios disable row level security;
--   alter table public.ejercicios_rutina disable row level security;

begin;

alter table public.usuarios enable row level security;
alter table public.ejercicios_rutina enable row level security;

commit;
