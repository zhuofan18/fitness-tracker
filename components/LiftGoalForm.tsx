"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LiftGoalForm() {
  const router = useRouter();
  const [exerciseName, setExerciseName] = useState("");
  const [targetWeightKg, setTargetWeightKg] = useState("");
  const [startingWeightKg, setStartingWeightKg] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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

    const { error: insertError } = await supabase.from("lift_goals").insert({
      user_id: user.id,
      exercise_name: exerciseName,
      target_weight_kg: Number(targetWeightKg),
      starting_weight_kg: startingWeightKg ? Number(startingWeightKg) : null,
    });

    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setExerciseName("");
    setTargetWeightKg("");
    setStartingWeightKg("");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-2 rounded border border-black/10 p-3 text-sm dark:border-white/10"
    >
      <label className="flex flex-col gap-1">
        Exercise
        <input
          required
          placeholder="e.g. Bench Press"
          value={exerciseName}
          onChange={(e) => setExerciseName(e.target.value)}
          className="rounded border border-black/20 px-2 py-1 dark:border-white/20"
        />
      </label>
      <label className="flex flex-col gap-1">
        Current (kg, optional)
        <input
          type="number"
          step="0.5"
          value={startingWeightKg}
          onChange={(e) => setStartingWeightKg(e.target.value)}
          className="w-28 rounded border border-black/20 px-2 py-1 dark:border-white/20"
        />
      </label>
      <label className="flex flex-col gap-1">
        Target (kg)
        <input
          required
          type="number"
          step="0.5"
          value={targetWeightKg}
          onChange={(e) => setTargetWeightKg(e.target.value)}
          className="w-28 rounded border border-black/20 px-2 py-1 dark:border-white/20"
        />
      </label>
      <button
        type="submit"
        disabled={saving}
        className="rounded bg-black px-3 py-1.5 text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {saving ? "Adding..." : "Add goal"}
      </button>
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
    </form>
  );
}
