-- GymFlow - esquema inicial para Supabase
-- Ejecutar en Supabase > SQL Editor > New query > Run.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null check (role in ('socio','profesor')) default 'profesor',
  created_at timestamptz default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  created_at date default current_date,
  status text not null default 'activo' check (status in ('activo','inactivo','baja')),
  notes text,
  routine text
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.students(id) on delete cascade,
  amount numeric not null,
  method text not null,
  plan text,
  date date not null default current_date,
  notes text
);

create table if not exists public.costs (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  category text not null,
  amount numeric not null,
  date date not null default current_date,
  notes text
);

create table if not exists public.attendances (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.students(id) on delete cascade,
  date date not null default current_date,
  time_slot text,
  professor_id uuid references public.profiles(id),
  notes text
);

alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.payments enable row level security;
alter table public.costs enable row level security;
alter table public.attendances enable row level security;

create or replace function public.current_role()
returns text language sql security definer stable as $$
  select role from public.profiles where id = auth.uid()
$$;

drop policy if exists "profiles read own" on public.profiles;
create policy "profiles read own" on public.profiles for select using (id = auth.uid());

drop policy if exists "students read authenticated" on public.students;
create policy "students read authenticated" on public.students for select using (auth.role() = 'authenticated');
drop policy if exists "students write socios" on public.students;
create policy "students write socios" on public.students for all using (public.current_role()='socio') with check (public.current_role()='socio');

-- Profesores pueden actualizar rutinas/notas de alumnos si se desea. Si no, borrar esta policy.
drop policy if exists "students update profesores" on public.students;
create policy "students update profesores" on public.students for update using (public.current_role() in ('socio','profesor')) with check (public.current_role() in ('socio','profesor'));

drop policy if exists "payments socios only" on public.payments;
create policy "payments socios only" on public.payments for all using (public.current_role()='socio') with check (public.current_role()='socio');

drop policy if exists "costs socios only" on public.costs;
create policy "costs socios only" on public.costs for all using (public.current_role()='socio') with check (public.current_role()='socio');

drop policy if exists "attendances authenticated read" on public.attendances;
create policy "attendances authenticated read" on public.attendances for select using (auth.role()='authenticated');
drop policy if exists "attendances authenticated write" on public.attendances;
create policy "attendances authenticated write" on public.attendances for insert with check (auth.role()='authenticated');
