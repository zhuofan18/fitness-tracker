import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { MUSCLE_GROUPS } from "@/lib/supabase/types";

export const client = new Anthropic();

// Swap to "claude-haiku-4-5" for lower per-photo cost once usage is high-volume;
// claude-opus-5 gives the best food-identification accuracy for the price.
export const FOOD_ANALYSIS_MODEL =
  process.env.ANTHROPIC_FOOD_MODEL || "claude-opus-5";

// For dishes the user isn't sure how to describe precisely (e.g. an
// unfamiliar cuisine) - looks the dish up so the macro-estimation call
// (Groq, see lib/groq.ts) has something more concrete than the user's own
// guess to work from. Kept on Claude for its web_search tool; the actual
// macro estimation moved to Groq's free tier - see lib/groq.ts.
export async function identifyDishViaWebSearch(description: string): Promise<string> {
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
