import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { suggestMealFromAvailableFoodsViaGroq } from "@/lib/groq";
import { createClient } from "@/lib/supabase/server";

const BodySchema = z.object({
  remaining_calories: z.number(),
  remaining_protein_g: z.number(),
  remaining_carbs_g: z.number(),
  remaining_fat_g: z.number(),
  on_hand: z.array(z.string()).optional(),
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
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("available_foods, goal_description")
    .eq("user_id", user.id)
    .maybeSingle();

  try {
    const suggestion = await suggestMealFromAvailableFoodsViaGroq({
      remainingCalories: parsed.data.remaining_calories,
      remainingProteinG: parsed.data.remaining_protein_g,
      remainingCarbsG: parsed.data.remaining_carbs_g,
      remainingFatG: parsed.data.remaining_fat_g,
      availableFoods: profile?.available_foods ?? [],
      onHand: parsed.data.on_hand ?? [],
      goalDescription: profile?.goal_description ?? null,
    });
    return NextResponse.json(suggestion);
  } catch (error) {
    console.error("Meal suggestion failed", error);
    return NextResponse.json(
      { error: "Failed to suggest a meal" },
      { status: 502 },
    );
  }
}
