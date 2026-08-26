import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/**
 * Compares a newly-logged set against the user's prior best for that
 * exercise, and against any open Weight Goal Journey target. Returns
 * whether it's a new PR, and marks the matching goal achieved if so.
 */
export async function evaluateSet(
  supabase: SupabaseClient<Database>,
  userId: string,
  exerciseName: string,
  weightKg: number,
): Promise<boolean> {
  const { data: priorBest } = await supabase
    .from("workout_sets")
    .select("weight_kg")
    .eq("user_id", userId)
    .eq("exercise_name", exerciseName)
    .order("weight_kg", { ascending: false })
    .limit(1)
    .maybeSingle();

  const isPr = !priorBest || weightKg > priorBest.weight_kg;

  if (isPr) {
    await supabase
      .from("lift_goals")
      .update({ achieved: true, achieved_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("exercise_name", exerciseName)
      .eq("achieved", false)
      .lte("target_weight_kg", weightKg);
  }

  return isPr;
}
