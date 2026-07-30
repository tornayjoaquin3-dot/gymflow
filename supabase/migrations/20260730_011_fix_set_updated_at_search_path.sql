-- 20260730_011_fix_set_updated_at_search_path.sql
--
-- Objetivo:
--   El advisor de seguridad marco set_updated_at() (creada en la 009) con
--   search_path mutable -- a diferencia de todas las demas funciones del
--   proyecto, que fijan `set search_path = public` explicitamente. No tiene
--   impacto practico hoy (la funcion no hace ninguna consulta calificable
--   por otro schema), pero se corrige para no dejar la unica excepcion al
--   patron establecido.
--
-- Impacto:
--   Ninguno sobre datos existentes. Solo redefine la funcion.
--
-- Rollback manual:
--   create or replace function public.set_updated_at()
--   returns trigger language plpgsql as $$
--   begin
--     new.updated_at := now();
--     return new;
--   end;
--   $$;

begin;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

commit;
