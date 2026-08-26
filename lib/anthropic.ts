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

export async function generateMealPlan(input: {
  calorieTarget: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  availableFoods: string[];
  goalDescription: string | null;
}): Promise<z.infer<typeof MealPlanSchema>["meals"]> {
  const response = await client.messages.parse({
    model: FOOD_ANALYSIS_MODEL,
    max_tokens: 4096,
    system:
      "You are a practical nutrition assistant. Curate a full day's meals (breakfast, lunch, dinner, and a snack if useful) that together hit the person's daily targets as closely as possible. Build every meal ONLY from the foods they say they usually have available - never suggest a food outside that list. Use realistic portion sizes and standard nutrition values for common foods.",
    messages: [
      {
        role: "user",
        content: `Daily targets: ${Math.round(input.calorieTarget)} kcal, ${Math.round(input.proteinG)}g protein, ${Math.round(input.carbsG)}g carbs, ${Math.round(input.fatG)}g fat.

Foods usually available to me: ${input.availableFoods.length > 0 ? input.availableFoods.join(", ") : "(none specified - use common pantry staples)"}.
${input.goalDescription ? `My goal: ${input.goalDescription}` : ""}

Curate a day of meals (with quantities) from those foods that gets as close as possible to the daily targets in total.`,
      },
    ],
    output_config: {
      format: zodOutputFormat(MealPlanSchema),
    },
  });

  if (!response.parsed_output) {
    throw new Error("Failed to parse meal plan response");
  }

  return response.parsed_output.meals;
}

// For dishes the user isn't sure how to describe precisely (e.g. an
// unfamiliar cuisine) - looks the dish up so the macro-estimation call below
// has something more concrete than the user's own guess to work from.
// Structured output (messages.parse) doesn't combine with tool use in one
// call, so this runs as a separate plain-text step first.
async function identifyDishViaWebSearch(description: string): Promise<string> {
  const webSearchTool = {
    type: "web_search_20260209" as const,
    name: "web_search" as const,
    max_uses: 3,
  };

  let messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `Someone is logging a meal but isn't sure what the dish is called or what's typically in it. Search the web if needed to identify it, then summarize in a couple of sentences: what it's called, its typical ingredients, and a standard serving size.

Their description: "${description}"`,
    },
  ];

  let response = await client.messages.create({
    model: FOOD_ANALYSIS_MODEL,
    max_tokens: 1024,
    tools: [webSearchTool],
    messages,
  });

  // A server-tool turn can pause mid-search; resume until it actually finishes.
  for (let i = 0; i < 3 && response.stop_reason === "pause_turn"; i++) {
    messages = [...messages, { role: "assistant", content: response.content }];
    response = await client.messages.create({
      model: FOOD_ANALYSIS_MODEL,
      max_tokens: 1024,
      tools: [webSearchTool],
      messages,
    });
  }

  return response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}

export async function analyzeFoodDescription(
  description: string,
  options: { lookup?: boolean } = {},
): Promise<FoodAnalysis> {
  let research = "";
  if (options.lookup) {
    try {
      research = await identifyDishViaWebSearch(description);
    } catch (error) {
      console.error("Dish lookup failed", error);
    }
  }

  const response = await client.messages.parse({
    model: FOOD_ANALYSIS_MODEL,
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `Someone is logging a meal they don't have a photo of. Based on this description, identify each distinct food item and estimate its portion size in grams, calories, and macros (protein/carbs/fat in grams). Also give the totals across all items and your overall confidence in the estimate - confidence should be "low" unless the description gives clear quantities, since there's no photo to verify against.

Description: "${description}"${research ? `\n\nWeb research on this dish: ${research}` : ""}`,
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
  onHand: string[];
  goalDescription: string | null;
}): Promise<MealSuggestion> {
  const noFoodsSpecified =
    input.availableFoods.length === 0 && input.onHand.length === 0;
  const response = await client.messages.parse({
    model: FOOD_ANALYSIS_MODEL,
    max_tokens: 2048,
    system:
      "You are a practical nutrition assistant. Build a meal ONLY from the foods the person says they have - never suggest a food outside those lists. If they have foods on hand right now, strongly prefer those over their general pantry list. Use realistic portion sizes and standard nutrition values for common foods.",
    messages: [
      {
        role: "user",
        content: `Remaining targets for today: ${Math.round(input.remainingCalories)} kcal, ${Math.round(input.remainingProteinG)}g protein, ${Math.round(input.remainingCarbsG)}g carbs, ${Math.round(input.remainingFatG)}g fat.

${input.onHand.length > 0 ? `Foods I have on hand right now (prefer these): ${input.onHand.join(", ")}.\n` : ""}Foods usually available to me: ${input.availableFoods.length > 0 ? input.availableFoods.join(", ") : noFoodsSpecified ? "(none specified - use common pantry staples)" : "(none beyond what I have on hand right now)"}.
${input.goalDescription ? `My goal: ${input.goalDescription}` : ""}

Suggest a meal using only those foods (with quantities) that gets as close as possible to the remaining targets.`,
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
