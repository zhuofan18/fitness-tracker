"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

type SavedFood = Database["public"]["Tables"]["saved_foods"]["Row"];

export default function QuickLogSavedFood({ food }: { food: SavedFood }) {
  const router = useRouter();
  const [servings, setServings] = useState("1");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logged, setLogged] = useState(false);

  async function handleLog() {
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Not logged in");
      setSaving(false);
      return;
    }

    const n = Number(servings) || 0;
    const { error: insertError } = await supabase.from("food_logs").insert({
      user_id: user.id,
      photo_path: food.photo_path,
      items: [
        {
          name: `${food.name} (${n} x ${food.serving_description ?? "serving"})`,
          estimated_grams: 0,
          calories: food.calories_per_serving * n,
          protein_g: food.protein_g_per_serving * n,
          carbs_g: food.carbs_g_per_serving * n,
          fat_g: food.fat_g_per_serving * n,
        },
      ],
      calories: food.calories_per_serving * n,
      protein_g: food.protein_g_per_serving * n,
      carbs_g: food.carbs_g_per_serving * n,
      fat_g: food.fat_g_per_serving * n,
    });

    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setLogged(true);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2 rounded border border-black/10 px-3 py-2 text-sm dark:border-white/10">
      <div className="flex-1">
        <p className="font-medium">{food.name}</p>
        <p className="text-black/50 dark:text-white/50">
          {food.serving_description} - {food.calories_per_serving} kcal · P{" "}
          {food.protein_g_per_serving}g · C {food.carbs_g_per_serving}g · F{" "}
          {food.fat_g_per_serving}g
        </p>
      </div>
      <input
        type="number"
        step="0.5"
        min="0"
        value={servings}
        onChange={(e) => setServings(e.target.value)}
        className="w-16 rounded border border-black/20 px-2 py-1 dark:border-white/20"
      />
      <button
        type="button"
        onClick={handleLog}
        disabled={saving}
        className="rounded bg-black px-3 py-1.5 text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {saving ? "..." : logged ? "Logged" : "Log to today"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
