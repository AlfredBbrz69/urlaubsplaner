-- Im SQL Editor deines Supabase-Projekts einmal ausführen.
-- Echte Benutzerkonten via Supabase Auth und private Daten pro user_id.
create table if not exists public.vacation_plans (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.vacation_plans enable row level security;
revoke all on public.vacation_plans from anon;
grant select, insert, update, delete on public.vacation_plans to authenticated;
drop policy if exists "own_plan_read" on public.vacation_plans;
create policy "own_plan_read" on public.vacation_plans for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "own_plan_insert" on public.vacation_plans;
create policy "own_plan_insert" on public.vacation_plans for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "own_plan_update" on public.vacation_plans;
create policy "own_plan_update" on public.vacation_plans for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "own_plan_delete" on public.vacation_plans;
create policy "own_plan_delete" on public.vacation_plans for delete to authenticated using ((select auth.uid()) = user_id);
