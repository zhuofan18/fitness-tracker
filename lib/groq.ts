import { z } from "zod";

// Groq's free tier - used for food analysis (photo + description) and meal
// suggestions/plans while the Anthropic account is unfunded. qwen/qwen3.6-27b
// is vision-capable; reasoning must be disabled for clean JSON output (a
// "thinking" turn otherwise breaks response_format: json_object).
const GROQ_MODEL = "qwen/qwen3.6-27b";

async function groqChatJSON(
  messages: Array<{ role: "user"; content: unknown }>,
): Promise<unknown> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      response_format: { type: "json_object" },
      reasoning_effort: "none",
      reasoning_format: "hidden",
      messages,
    }),
  });

  if (!res.ok) {
    throw new Error(`Groq API error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("Groq response missing message content");
  }
  return JSON.parse(content);
}

export const FoodAnalysisSchema = z.object({
  items: z.array(
    z.object({
      name: z.string(),
      estimated_grams: z.number(),
      calories: z.number(),
      protein_g: z.number(),
      carbs_g: z.number(),
      fat_g: z.number(),
    }),
  ),
  total_calories: z.number(),
  total_protein_g: z.number(),
  total_carbs_g: z.number(),
  total_fat_g: z.number(),
  confidence: z.enum(["low", "medium", "high"]),
});

export type FoodAnalysis = z.infer<typeof FoodAnalysisSchema>;

const FOOD_ANALYSIS_JSON_SHAPE = `{"items":[{"name":string,"estimated_grams":number,"calories":number,"protein_g":number,"carbs_g":number,"fat_g":number}],"total_calories":number,"total_protein_g":number,"total_carbs_g":number,"total_fat_g":number,"confidence":"low"|"medium"|"high"}`;

export async function analyzeFoodPhotoViaGroq(
  base64Image: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp",
): Promise<FoodAnalysis> {
  const raw = await groqChatJSON([
    {
      role: "user",
      content: [
        {
          type: "text",
          text: `Identify each distinct food item in this photo and estimate its portion size in grams, calories, and macros (protein/carbs/fat in grams). Also give the totals across all items and your overall confidence in the estimate. Base portion sizes on visible plate/container scale.

Respond ONLY with JSON in this exact shape: ${FOOD_ANALYSIS_JSON_SHAPE}`,
        },
        {
          type: "image_url",
          image_url: { url: `data:${mediaType};base64,${base64Image}` },
        },
      ],
    },
  ]);
  return FoodAnalysisSchema.parse(raw);
}

export async function analyzeFoodDescriptionViaGroq(
  description: string,
  research?: string,
): Promise<FoodAnalysis> {
  const raw = await groqChatJSON([
    {
      role: "user",
      content: `Someone is logging a meal they don't have a photo of. Based on this description, identify each distinct food item and estimate its portion size in grams, calories, and macros (protein/carbs/fat in grams). Also give the totals across all items and your overall confidence in the estimate - confidence should be "low" unless the description gives clear quantities, since there's no photo to verify against.

Description: "${description}"${research ? `\n\nWeb research on this dish: ${research}` : ""}

Respond ONLY with JSON in this exact shape: ${FOOD_ANALYSIS_JSON_SHAPE}`,
    },
  ]);
  return FoodAnalysisSchema.parse(raw);
}

export const MealSuggestionSchema = z.object({
  items: z.array(
    z.object({
      name: z.string(),
      quantity_description: z.string(),
      calories: z.number(),
      protein_g: z.number(),
      carbs_g: z.number(),
      fat_g: z.number(),
    }),
  ),
  reasoning: z.string(),
});

export type MealSuggestion = z.infer<typeof MealSuggestionSchema>;

export async function suggestMealFromAvailableFoodsViaGroq(input: {
  remainingCalories: number;
  remainingProteinG: number;
  remainingCarbsG: number;
  remainingFatG: number;
  availableFoods: string[];
  onHand: string[];
  goalDescription: string | null;
}): Promise<MealSuggestion> {
  const noFoodsSpecified =
    input.availableFoods.length === 0 && input.onHand.length === 0;
  const raw = await groqChatJSON([
    {
      role: "user",
      content: `You are a practical nutrition assistant. Build a meal ONLY from the foods the person says they have - never suggest a food outside those lists. If they have foods on hand right now, strongly prefer those over their general pantry list. Use realistic portion sizes and standard nutrition values for common foods.

Remaining targets for today: ${Math.round(input.remainingCalories)} kcal, ${Math.round(input.remainingProteinG)}g protein, ${Math.round(input.remainingCarbsG)}g carbs, ${Math.round(input.remainingFatG)}g fat.

${input.onHand.length > 0 ? `Foods I have on hand right now (prefer these): ${input.onHand.join(", ")}.\n` : ""}Foods usually available to me: ${input.availableFoods.length > 0 ? input.availableFoods.join(", ") : noFoodsSpecified ? "(none specified - use common pantry staples)" : "(none beyond what I have on hand right now)"}.
${input.goalDescription ? `My goal: ${input.goalDescription}` : ""}

Suggest a meal using only those foods (with quantities) that gets as close as possible to the remaining targets.

Respond ONLY with JSON in this exact shape: {"items":[{"name":string,"quantity_description":string,"calories":number,"protein_g":number,"carbs_g":number,"fat_g":number}],"reasoning":string}`,
    },
  ]);
  return MealSuggestionSchema.parse(raw);
}

const MealPlanSchema = z.object({
  meals: z.array(
    z.object({
      name: z.string(),
      items: z.array(
        z.object({
          name: z.string(),
          quantity_description: z.string(),
          calories: z.number(),
          protein_g: z.number(),
          carbs_g: z.number(),
          fat_g: z.number(),
        }),
      ),
    }),
  ),
});

export async function generateMealPlanViaGroq(input: {
  calorieTarget: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  availableFoods: string[];
  goalDescription: string | null;
}): Promise<z.infer<typeof MealPlanSchema>["meals"]> {
  const raw = await groqChatJSON([
    {
      role: "user",
      content: `You are a practical nutrition assistant. Curate a full day's meals (breakfast, lunch, dinner, and a snack if useful) that together hit the person's daily targets as closely as possible. Build every meal ONLY from the foods they say they usually have available - never suggest a food outside that list. Use realistic portion sizes and standard nutrition values for common foods.

Daily targets: ${Math.round(input.calorieTarget)} kcal, ${Math.round(input.proteinG)}g protein, ${Math.round(input.carbsG)}g carbs, ${Math.round(input.fatG)}g fat.

Foods usually available to me: ${input.availableFoods.length > 0 ? input.availableFoods.join(", ") : "(none specified - use common pantry staples)"}.
${input.goalDescription ? `My goal: ${input.goalDescription}` : ""}

Curate a day of meals (with quantities) from those foods that gets as close as possible to the daily targets in total.

Respond ONLY with JSON in this exact shape: {"meals":[{"name":string,"items":[{"name":string,"quantity_description":string,"calories":number,"protein_g":number,"carbs_g":number,"fat_g":number}]}]}`,
    },
  ]);
  return MealPlanSchema.parse(raw).meals;
}
