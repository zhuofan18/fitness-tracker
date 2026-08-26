import { NextResponse } from "next/server";
import { generateNutritionPlan } from "@/lib/plan";
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

  const { data: latestWeight, error: weightError } = await supabase
    .from("body_weight_logs")
    .select("weight_kg")
    .eq("user_id", user.id)
    .order("logged_at", { ascending: false })
    .limit(1)
    .single();

  if (weightError || !latestWeight) {
    return NextResponse.json(
      { error: "Log a body weight entry before generating a plan" },
      { status: 400 },
    );
  }

  const plan = generateNutritionPlan({
    sex: profile.sex,
    birthDate: profile.birth_date,
    heightCm: profile.height_cm,
    weightKg: latestWeight.weight_kg,
    activityLevel: profile.activity_level,
    goal: profile.goal,
  });

  const { data: savedPlan, error: insertError } = await supabase
    .from("plans")
    .insert({
      user_id: user.id,
      calorie_target: plan.calorie_target,
      protein_g: plan.protein_g,
      carbs_g: plan.carbs_g,
      fat_g: plan.fat_g,
      estimated_weekly_rate_kg: plan.estimated_weekly_rate_kg,
    })
    .select()
    .single();

  if (insertError || !savedPlan) {
    return NextResponse.json(
      { error: "Failed to save plan" },
      { status: 500 },
    );
  }

  return NextResponse.json(savedPlan);
}
