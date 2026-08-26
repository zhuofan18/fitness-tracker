-- A curated set of meals for the day (breakfast/lunch/dinner/etc.), built
-- from the user's available foods to hit the plan's calorie/macro targets -
-- distinct from the ad-hoc "suggest a meal from remaining macros" feature.
alter table public.plans add column meal_plan jsonb not null default '[]';
