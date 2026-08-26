create table public.water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount_ml numeric not null check (amount_ml > 0),
  logged_at timestamptz not null default now()
);

create index water_logs_user_logged_idx
  on public.water_logs (user_id, logged_at desc);

alter table public.water_logs enable row level security;

create policy "water_logs: owner all" on public.water_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
