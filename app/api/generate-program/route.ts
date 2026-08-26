import { NextResponse } from "next/server";
import { generateMesocycle, generateWeeklySchedule } from "@/lib/training";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json(
      { error: "Profile not found - complete onboarding first" },
      { status: 400 },
    );
  }

  const weeklySchedule = generateWeeklySchedule(
    profile.days_per_week,
    profile.split_style,
    profile.weak_points,
    profile.equipment,
    profile.imbalances,
  );
  const mesocycle = generateMesocycle();

  const { data: savedProgram, error: insertError } = await supabase
    .from("training_programs")
    .insert({
      user_id: user.id,
      days_per_week: profile.days_per_week,
      split_style: profile.split_style,
      weekly_schedule: weeklySchedule,
      mesocycle,
    })
    .select()
    .single();

  if (insertError || !savedProgram) {
    return NextResponse.json(
      { error: "Failed to save training program" },
      { status: 500 },
    );
  }

  return NextResponse.json(savedProgram);
}
