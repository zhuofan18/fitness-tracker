-- Profiles: one row per user, drives nutrition-plan and training-program generation
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  sex text not null check (sex in ('male', 'female')),
  birth_date date not null,
  height_cm numeric not null check (height_cm > 0),
  activity_level text not null check (
    activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active')
  ),
  goal text not null check (goal in ('bulk', 'cut', 'maintain')),
  goal_description text,
  target_weight_kg numeric,
  experience_level text not null check (
    experience_level in ('beginner', 'intermediate', 'advanced')
  ),
  weak_points text[] not null default '{}',
  equipment text[] not null default '{barbell,dumbbells,cables,machines,bands,kettlebells}',
  supplements text[] not null default '{}',
  available_foods text[] not null default '{}',
  imbalances jsonb not null default '[]',
  days_per_week integer not null default 4 check (days_per_week between 1 and 7),
  split_style text not null default 'auto' check (
    split_style in ('auto', 'full_body', 'upper_lower', 'push_pull_legs', 'bro_split')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Body weight history, most recent entry is "current weight"
create table public.body_weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  weight_kg numeric not null check (weight_kg > 0),
  logged_at timestamptz not null default now()
);

create index body_weight_logs_user_logged_idx
  on public.body_weight_logs (user_id, logged_at desc);

-- Food logs: AI-estimated macros, reviewed/edited by the user before save
create table public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  photo_path text,
  logged_at timestamptz not null default now(),
  items jsonb not null default '[]',
  calories numeric not null default 0,
  protein_g numeric not null default 0,
  carbs_g numeric not null default 0,
  fat_g numeric not null default 0,
  notes text
);

create index food_logs_user_logged_idx
  on public.food_logs (user_id, logged_at desc);

-- Nutrition plans: recalculated (new row) whenever profile/weight changes
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  generated_at timestamptz not null default now(),
  calorie_target numeric not null,
  protein_g numeric not null,
  carbs_g numeric not null,
  fat_g numeric not null,
  estimated_weekly_rate_kg numeric not null default 0
);

create index plans_user_generated_idx
  on public.plans (user_id, generated_at desc);

-- Saved foods/products: photographed and analyzed once (e.g. a supplement tub
-- or packaged snack), then reused as a quick per-serving log entry.
create table public.saved_foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  photo_path text,
  serving_description text,
  calories_per_serving numeric not null default 0,
  protein_g_per_serving numeric not null default 0,
  carbs_g_per_serving numeric not null default 0,
  fat_g_per_serving numeric not null default 0,
  created_at timestamptz not null default now()
);

create index saved_foods_user_idx on public.saved_foods (user_id, name);

-- Weight Goal Journey: a target weight on any lift/exercise, e.g. "Bench Press: 100kg"
create table public.lift_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_name text not null,
  starting_weight_kg numeric,
  target_weight_kg numeric not null check (target_weight_kg > 0),
  achieved boolean not null default false,
  achieved_at timestamptz,
  created_at timestamptz not null default now()
);

create index lift_goals_user_idx on public.lift_goals (user_id, achieved);

-- Training programs: a generated weekly split + 4-week heavy/light/deload wave
create table public.training_programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  generated_at timestamptz not null default now(),
  days_per_week integer not null,
  split_style text not null,
  weekly_schedule jsonb not null default '[]',
  mesocycle jsonb not null default '[]'
);

create index training_programs_user_generated_idx
  on public.training_programs (user_id, generated_at desc);

-- Workout logs: one row per training session actually performed
create table public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  performed_at timestamptz not null default now(),
  day_label text,
  cycle_week integer not null default 1 check (cycle_week between 1 and 4),
  notes text
);

create index workout_logs_user_performed_idx
  on public.workout_logs (user_id, performed_at desc);

-- Individual sets within a workout log
create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_log_id uuid not null references public.workout_logs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_name text not null,
  set_number integer not null,
  reps integer not null check (reps > 0),
  weight_kg numeric not null check (weight_kg >= 0),
  is_pr boolean not null default false
);

create index workout_sets_log_idx on public.workout_sets (workout_log_id);
create index workout_sets_user_exercise_idx
  on public.workout_sets (user_id, exercise_name, weight_kg desc);

-- Progress photos: a visual timeline of physique change over a bulk/cut/split
create table public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  photo_path text not null,
  taken_at timestamptz not null default now(),
  weight_kg numeric,
  notes text
);

create index progress_photos_user_taken_idx
  on public.progress_photos (user_id, taken_at desc);

-- Row Level Security: every table is scoped to auth.uid()
alter table public.profiles enable row level security;
alter table public.body_weight_logs enable row level security;
alter table public.food_logs enable row level security;
alter table public.plans enable row level security;
alter table public.lift_goals enable row level security;
alter table public.training_programs enable row level security;
alter table public.workout_logs enable row level security;
alter table public.workout_sets enable row level security;
alter table public.progress_photos enable row level security;
alter table public.saved_foods enable row level security;

create policy "profiles: owner read" on public.profiles
  for select using (auth.uid() = user_id);
create policy "profiles: owner insert" on public.profiles
  for insert with check (auth.uid() = user_id);
create policy "profiles: owner update" on public.profiles
  for update using (auth.uid() = user_id);
create policy "profiles: owner delete" on public.profiles
  for delete using (auth.uid() = user_id);

create policy "body_weight_logs: owner all" on public.body_weight_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "food_logs: owner all" on public.food_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "plans: owner all" on public.plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "lift_goals: owner all" on public.lift_goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "training_programs: owner all" on public.training_programs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "workout_logs: owner all" on public.workout_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "workout_sets: owner all" on public.workout_sets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "progress_photos: owner all" on public.progress_photos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "saved_foods: owner all" on public.saved_foods
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Storage buckets for food and progress photos (private; access via signed URLs)
insert into storage.buckets (id, name, public)
values ('food-photos', 'food-photos', false), ('progress-photos', 'progress-photos', false)
on conflict (id) do nothing;

create policy "food-photos: owner read"
  on storage.objects for select
  using (bucket_id = 'food-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "food-photos: owner insert"
  on storage.objects for insert
  with check (bucket_id = 'food-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "food-photos: owner delete"
  on storage.objects for delete
  using (bucket_id = 'food-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "progress-photos: owner read"
  on storage.objects for select
  using (bucket_id = 'progress-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "progress-photos: owner insert"
  on storage.objects for insert
  with check (bucket_id = 'progress-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "progress-photos: owner delete"
  on storage.objects for delete
  using (bucket_id = 'progress-photos' and auth.uid()::text = (storage.foldername(name))[1]);
