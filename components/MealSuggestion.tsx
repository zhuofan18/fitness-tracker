"use client";

import { useState } from "react";
import MacroBar from "@/components/MacroBar";
import TagInput from "@/components/TagInput";

interface Suggestion {
  items: {
    name: string;
    quantity_description: string;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  }[];
  reasoning: string;
}

export default function MealSuggestion({
  remaining,
}: {
  remaining: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [onHand, setOnHand] = useState<string[]>([]);
  const [showOnHand, setShowOnHand] = useState(false);

  async function handleSuggest() {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/suggest-meal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        remaining_calories: Math.max(remaining.calories, 0),
        remaining_protein_g: Math.max(remaining.protein_g, 0),
        remaining_carbs_g: Math.max(remaining.carbs_g, 0),
        remaining_fat_g: Math.max(remaining.fat_g, 0),
        on_hand: onHand,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to suggest a meal");
      return;
    }

    setSuggestion(await res.json());
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setShowOnHand((v) => !v)}
        className="w-fit text-xs underline text-black/60 dark:text-white/60"
      >
        {showOnHand ? "Hide" : "What do you have on hand right now? (optional)"}
      </button>
      {showOnHand && (
        <TagInput
          label="Ingredients you have on hand right now"
          placeholder="e.g. eggs, spinach, leftover rice"
          values={onHand}
          onChange={setOnHand}
        />
      )}
      <button
        type="button"
        onClick={handleSuggest}
        disabled={loading}
        className="w-fit rounded border border-black/20 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-white/20"
      >
        {loading ? "Thinking..." : "Suggest a meal from what I have"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {suggestion && (
        <div className="flex flex-col gap-3 rounded-xl border border-black/10 bg-black/[0.02] p-4 text-sm dark:border-white/10 dark:bg-white/[0.03]">
          <MacroBar
            calories={suggestion.items.reduce((s, i) => s + i.calories, 0)}
            protein_g={suggestion.items.reduce((s, i) => s + i.protein_g, 0)}
            carbs_g={suggestion.items.reduce((s, i) => s + i.carbs_g, 0)}
            fat_g={suggestion.items.reduce((s, i) => s + i.fat_g, 0)}
          />
          <ul className="flex flex-col gap-1.5 border-t border-black/10 pt-3 dark:border-white/10">
            {suggestion.items.map((item, i) => (
              <li key={i} className="flex justify-between">
                <span className="font-medium">
                  {item.name}
                  <span className="ml-1.5 font-normal text-black/50 dark:text-white/50">
                    {item.quantity_description}
                  </span>
                </span>
                <span className="text-black/50 dark:text-white/50">
                  {Math.round(item.calories)} kcal
                </span>
              </li>
            ))}
          </ul>
          <p className="text-black/60 dark:text-white/60">
            {suggestion.reasoning}
          </p>
        </div>
      )}
    </div>
  );
}
