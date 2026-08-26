import { NextRequest, NextResponse } from "next/server";
import { suggestNextWeight } from "@/lib/progression";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const exerciseName = request.nextUrl.searchParams.get("exercise");
  if (!exerciseName) {
    return NextResponse.json({ error: "Missing exercise" }, { status: 400 });
  }

  const { data: recentSets } = await supabase
    .from("workout_sets")
    .select("reps, weight_kg, workout_logs!inner(performed_at)")
    .eq("user_id", user.id)
    .eq("exercise_name", exerciseName)
    .order("performed_at", { foreignTable: "workout_logs", ascending: false })
    .limit(6);

  const suggestion = suggestNextWeight(recentSets ?? []);
  return NextResponse.json({ suggestion });
}
