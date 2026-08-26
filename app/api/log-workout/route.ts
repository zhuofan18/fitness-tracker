import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { evaluateSet } from "@/lib/prs";
import { createClient } from "@/lib/supabase/server";

const SetSchema = z.object({
  exercise_name: z.string().min(1),
  set_number: z.number().int().positive(),
  reps: z.number().int().positive(),
  weight_kg: z.number().nonnegative(),
});

const BodySchema = z.object({
  day_label: z.string().optional(),
  cycle_week: z.number().int().min(1).max(4).default(1),
  notes: z.string().optional(),
  sets: z.array(SetSchema).min(1),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = BodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { day_label, cycle_week, notes, sets } = parsed.data;

  const { data: workoutLog, error: logError } = await supabase
    .from("workout_logs")
    .insert({ user_id: user.id, day_label, cycle_week, notes })
    .select()
    .single();

  if (logError || !workoutLog) {
    return NextResponse.json(
      { error: "Failed to create workout log" },
      { status: 500 },
    );
  }

  const savedSets = [];
  for (const set of sets) {
    const isPr = await evaluateSet(
      supabase,
      user.id,
      set.exercise_name,
      set.weight_kg,
    );

    const { data: savedSet, error: setError } = await supabase
      .from("workout_sets")
      .insert({
        workout_log_id: workoutLog.id,
        user_id: user.id,
        exercise_name: set.exercise_name,
        set_number: set.set_number,
        reps: set.reps,
        weight_kg: set.weight_kg,
        is_pr: isPr,
      })
      .select()
      .single();

    if (setError || !savedSet) {
      return NextResponse.json(
        { error: "Failed to save set" },
        { status: 500 },
      );
    }
    savedSets.push(savedSet);
  }

  return NextResponse.json({ workoutLog, sets: savedSets });
}
