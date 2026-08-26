# Fitness Tracker

A PWA that turns a food photo into calories/macros, and generates a
personalized nutrition + training plan (bulk/cut/maintain) with a real
progression system - workout logging, PR detection, and a 4-week
heavy/moderate/peak/deload training wave.

## Features

- **Food photo logging** - snap a photo, Claude estimates calories/macros per
  item, you review and edit before saving.
- **Nutrition plan** - BMR/TDEE-based calorie and macro targets from your
  stats and goal, with an estimated weekly rate of change and time-to-target
  if you set a target weight.
- **Training program** - a weekly split (auto-selected from your training
  days/week, or chosen manually: full body / upper-lower / push-pull-legs /
  bro split), built only from equipment you actually have, with extra volume
  on muscle groups you flag as weak points, and unilateral exercises for any
  left/right imbalance you specify.
- **Workout logging + progression** - log sets, get an automatic PR flag, and
  a suggested next weight based on double progression (stay at a weight until
  you clear the top of your rep range, then it nudges the load up).
- **Weight Goal Journey** - set a target weight on any lift; hitting it in a
  logged set marks the goal achieved automatically.
- **Progress photos** - a private visual timeline, with an opt-in AI
  suggestion (never auto-applied) on which muscle groups to emphasize and
  whether your visual composition looks aligned with your goal.
- **Saved products** - photograph a supplement tub or packaged food once,
  reuse it later with just a serving count.
- **Meal suggestions from what you have** - given your remaining macros for
  the day and the foods you said are available, get a suggested combination
  (e.g. swap a suggested "beef" for the equivalent amount of eggs).
- **Installable PWA** - works on desktop and mobile via "Add to Home Screen".

## Stack

Next.js 16 (App Router, TypeScript, Tailwind) - Supabase (Postgres, Auth,
Storage) - Anthropic API (`@anthropic-ai/sdk`, structured outputs via
`messages.parse`) - Serwist (PWA service worker).

`@serwist/next` doesn't support Turbopack yet, so `dev`/`build` are pinned to
webpack mode (`next dev --webpack` / `next build --webpack`).

## Setup

1. **Supabase project** - create one at [supabase.com](https://supabase.com),
   then copy `.env.example` to `.env.local` and fill in
   `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` from
   Settings -> API.
2. **Run the migration** - either paste
   `supabase/migrations/0001_init.sql` into the Supabase SQL editor, or with
   the Supabase CLI:
   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```
   This creates all tables, RLS policies, and the private `food-photos` /
   `progress-photos` storage buckets (product photos reuse `food-photos`
   under a `products/` prefix).
3. **Anthropic API key** - set `ANTHROPIC_API_KEY` in `.env.local`.
4. **Install and run**:
   ```bash
   npm install
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000), sign up, and
   complete onboarding - it generates your first nutrition plan and training
   program automatically.

## Notes

- Photo analysis defaults to `claude-opus-5` for accuracy; set
  `ANTHROPIC_FOOD_MODEL=claude-haiku-4-5` in `.env.local` to cut per-photo
  cost once you're logging daily.
- Progress-photo AI feedback is explicitly non-diagnostic, framed as an
  optional suggestion, and never writes to your profile without you clicking
  "Add these to my weak points".
