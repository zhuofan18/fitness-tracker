-- Exercises the user actually does per muscle group, preferred by the
-- training program generator over its built-in template pool.
create table public.custom_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  muscle_group text not null check (muscle_group in (
    'chest','back','shoulders','biceps','triceps',
    'quads','hamstrings','glutes','calves','core'
  )),
  exercise_name text not null,
  created_at timestamptz not null default now()
);

create index custom_exercises_user_idx
  on public.custom_exercises (user_id, muscle_group);

alter table public.custom_exercises enable row level security;

create policy "custom_exercises: owner all" on public.custom_exercises
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
