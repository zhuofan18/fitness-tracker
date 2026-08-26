import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { MUSCLE_GROUPS } from "@/lib/supabase/types";

export const client = new Anthropic();

// Swap to "claude-haiku-4-5" for lower per-photo cost once usage is high-volume;
// claude-opus-5 gives the best food-identification accuracy for the price.
export const FOOD_ANALYSIS_MODEL =
  process.env.ANTHROPIC_FOOD_MODEL || "claude-opus-5";

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

export async function analyzeFoodPhoto(
  base64Image: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp",
): Promise<FoodAnalysis> {
  const response = await client.messages.parse({
    model: FOOD_ANALYSIS_MODEL,
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64Image },
          },
          {
            type: "text",
            text: "Identify each distinct food item in this photo and estimate its portion size in grams, calories, and macros (protein/carbs/fat in grams). Also give the totals across all items and your overall confidence in the estimate. Base portion sizes on visible plate/container scale.",
          },
        ],
      },
    ],
    output_config: {
      format: zodOutputFormat(FoodAnalysisSchema),
    },
  });

  if (!response.parsed_output) {
    throw new Error("Failed to parse food analysis response");
  }

  return response.parsed_output;
}

export const ProgressPhotoAnalysisSchema = z.object({
  suggested_emphasis_muscle_groups: z.array(z.enum(MUSCLE_GROUPS)),
  suggestion_reasoning: z
    .string()
    .describe(
      "Brief, encouraging explanation of why these muscle groups were suggested, framed around visual proportion/symmetry - never about appearance flaws.",
    ),
  physique_goal_note: z
    .string()
    .describe(
      "A gentle, non-judgmental observation about whether the visual composition looks aligned with a bulk/cut/maintain goal, phrased as a suggestion the person can take or leave (e.g. 'if your goal is to bulk, a short cut first may make muscle gain more visible' or 'composition looks aligned with a lean bulk'). Never use clinical, alarming, or shaming language.",
    ),
});

export type ProgressPhotoAnalysis = z.infer<
  typeof ProgressPhotoAnalysisSchema
>;

export async function analyzeProgressPhoto(
  base64Image: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp",
  currentGoal: "bulk" | "cut" | "maintain",
): Promise<ProgressPhotoAnalysis> {
  const response = await client.messages.parse({
    model: FOOD_ANALYSIS_MODEL,
    max_tokens: 2048,
    system:
      "You are a supportive, body-positive fitness coach giving purely visual, non-diagnostic observations from a physique photo. This is not a medical or clinical assessment - never estimate a body fat percentage or use clinical/alarming language. Be encouraging, brief, and respectful. Always frame observations as optional suggestions the person is free to ignore; never present them as facts about the person's body.",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64Image },
          },
          {
            type: "text",
            text: `This person's stated training goal is to ${currentGoal}. Based purely on visual proportion and symmetry in this photo, suggest 1-3 muscle groups that could use extra training emphasis to improve overall symmetry, and give a brief, kind note on whether the visual composition looks aligned with their stated goal.`,
          },
        ],
      },
    ],
    output_config: {
      format: zodOutputFormat(ProgressPhotoAnalysisSchema),
    },
  });

  if (!response.parsed_output) {
    throw new Error("Failed to parse progress photo analysis response");
  }

  return response.parsed_output;
}

export const ProductAnalysisSchema = z.object({
  name: z.string(),
  serving_description: z
    .string()
    .describe("e.g. '2 scoops (60g)' or '1 bar (45g)' - as stated on the label"),
  calories_per_serving: z.number(),
  protein_g_per_serving: z.number(),
  carbs_g_per_serving: z.number(),
  fat_g_per_serving: z.number(),
});

export type ProductAnalysis = z.infer<typeof ProductAnalysisSchema>;

export async function analyzeProductPhoto(
  base64Image: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp",
): Promise<ProductAnalysis> {
  const response = await client.messages.parse({
    model: FOOD_ANALYSIS_MODEL,
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64Image },
          },
          {
            type: "text",
            text: "This is a photo of a packaged food/supplement product, ideally showing its nutrition label. Read the label (or your best estimate if the label isn't fully visible) and extract the product name, the serving size as described, and calories/protein/carbs/fat per serving.",
          },
        ],
      },
    ],
    output_config: {
      format: zodOutputFormat(ProductAnalysisSchema),
    },
  });

  if (!response.parsed_output) {
    throw new Error("Failed to parse product analysis response");
  }

  return response.parsed_output;
}

export const MealSuggestionSchema = z.object({
  items: z.array(
    z.object({
      name: z.string(),
      quantity_description: z
        .string()
        .describe("e.g. '3 whole eggs' or '150g chicken breast'"),
      calories: z.number(),
      protein_g: z.number(),
      carbs_g: z.number(),
      fat_g: z.number(),
    }),
  ),
  reasoning: z
    .string()
    .describe(
      "Brief explanation of the substitution logic, e.g. why this quantity of eggs was chosen to match the target protein.",
    ),
});

export type MealSuggestion = z.infer<typeof MealSuggestionSchema>;

export async function suggestMealFromAvailableFoods(input: {
  remainingCalories: number;
  remainingProteinG: number;
  remainingCarbsG: number;
  remainingFatG: number;
  availableFoods: string[];
  goalDescription: string | null;
}): Promise<MealSuggestion> {
  const response = await client.messages.parse({
    model: FOOD_ANALYSIS_MODEL,
    max_tokens: 2048,
    system:
      "You are a practical nutrition assistant. Build a meal ONLY from the foods the person says they have available - never suggest a food outside that list. Use realistic portion sizes and standard nutrition values for common foods.",
    messages: [
      {
        role: "user",
        content: `Remaining targets for today: ${Math.round(input.remainingCalories)} kcal, ${Math.round(input.remainingProteinG)}g protein, ${Math.round(input.remainingCarbsG)}g carbs, ${Math.round(input.remainingFatG)}g fat.

Foods available to me: ${input.availableFoods.length > 0 ? input.availableFoods.join(", ") : "(none specified - use common pantry staples)"}.
${input.goalDescription ? `My goal: ${input.goalDescription}` : ""}

Suggest a meal using only the available foods (with quantities) that gets as close as possible to the remaining targets.`,
      },
    ],
    output_config: {
      format: zodOutputFormat(MealSuggestionSchema),
    },
  });

  if (!response.parsed_output) {
    throw new Error("Failed to parse meal suggestion response");
  }

  return response.parsed_output;
}
