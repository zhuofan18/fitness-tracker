"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ProgramDay } from "@/lib/supabase/types";

interface SetRow {
  exercise_name: string;
  set_number: number;
  reps: number;
  weight_kg: number;
}

interface Suggestion {
  suggested_weight_kg: number;
  estimated_one_rep_max_kg: number;
  note: string;
}

export default function LogWorkoutForm({ days }: { days: ProgramDay[] }) {
  const router = useRouter();
  const [dayLabel, setDayLabel] = useState(days[0]?.focus ?? "");
  const [cycleWeek, setCycleWeek] = useState(1);
  const [sets, setSets] = useState<SetRow[]>([
    { exercise_name: "", set_number: 1, reps: 8, weight_kg: 0 },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prNames, setPrNames] = useState<string[] | null>(null);
  const [suggestions, setSuggestions] = useState<Record<string, Suggestion | null>>({});
  const [suggestingFor, setSuggestingFor] = useState<string | null>(null);

  async function fetchSuggestion(index: number) {
    const exerciseName = sets[index].exercise_name.trim();
    if (!exerciseName) return;
    setSuggestingFor(exerciseName);

    const res = await fetch(
      `/api/suggest-weight?exercise=${encodeURIComponent(exerciseName)}`,
    );
    const body = await res.json().catch(() => ({ suggestion: null }));

    setSuggestingFor(null);
    setSuggestions((prev) => ({ ...prev, [exerciseName]: body.suggestion ?? null }));

    if (body.suggestion) {
      updateSet(index, "weight_kg", String(body.suggestion.suggested_weight_kg));
    }
  }

  function applyDayTemplate(focus: string) {
    setDayLabel(focus);
    const day = days.find((d) => d.focus === focus);
    if (!day) return;
    const templated: SetRow[] = day.exercises.flatMap((ex) =>
      Array.from({ length: ex.sets }, (_, i) => ({
        exercise_name: ex.name,
        set_number: i + 1,
        reps: Number(ex.rep_range.split("-")[0]) || 8,
        weight_kg: 0,
      })),
    );
    setSets(templated);
  }

  function updateSet(index: number, field: keyof SetRow, value: string) {
    const next = [...sets];
    next[index] = {
      ...next[index],
      [field]: field === "exercise_name" ? value : Number(value),
    };
    setSets(next);
  }

  function addSet() {
    const last = sets[sets.length - 1];
    setSets([
      ...sets,
      {
        exercise_name: last?.exercise_name ?? "",
        set_number: (last?.set_number ?? 0) + 1,
        reps: last?.reps ?? 8,
        weight_kg: last?.weight_kg ?? 0,
      },
    ]);
  }

  function removeSet(index: number) {
    setSets(sets.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setPrNames(null);

    const res = await fetch("/api/log-workout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        day_label: dayLabel || undefined,
        cycle_week: cycleWeek,
        sets: sets.filter((s) => s.exercise_name.trim().length > 0),
      }),
    });

    setSaving(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to log workout");
      return;
    }

    const body = await res.json();
    const prs = (body.sets as { exercise_name: string; is_pr: boolean }[])
      .filter((s) => s.is_pr)
      .map((s) => s.exercise_name);
    const uniquePrs = Array.from(new Set(prs));

    if (uniquePrs.length > 0) {
      setPrNames(uniquePrs);
    } else {
      router.push("/plan");
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {days.length > 0 && (
        <label className="flex flex-col gap-1 text-sm">
          Load today&apos;s program day
          <select
            value={dayLabel}
            onChange={(e) => applyDayTemplate(e.target.value)}
            className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
          >
            {days.map((d) => (
              <option key={d.day_index} value={d.focus}>
                Day {d.day_index}: {d.focus}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Session label
          <input
            value={dayLabel}
            onChange={(e) => setDayLabel(e.target.value)}
            className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Mesocycle week
          <select
            value={cycleWeek}
            onChange={(e) => setCycleWeek(Number(e.target.value))}
            className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
          >
            <option value={1}>Week 1 - heavy</option>
            <option value={2}>Week 2 - moderate</option>
            <option value={3}>Week 3 - peak</option>
            <option value={4}>Week 4 - deload</option>
          </select>
        </label>
      </div>

      <div className="flex flex-col gap-2">
        {sets.map((set, i) => {
          const suggestion = suggestions[set.exercise_name.trim()];
          return (
            <div key={i} className="flex flex-col gap-1">
              <div className="grid grid-cols-6 items-end gap-2 text-sm">
                <input
                  placeholder="Exercise"
                  value={set.exercise_name}
                  onChange={(e) =>
                    updateSet(i, "exercise_name", e.target.value)
                  }
                  className="col-span-2 rounded border border-black/20 px-2 py-1 dark:border-white/20"
                />
                <input
                  type="number"
                  placeholder="Set #"
                  value={set.set_number}
                  onChange={(e) => updateSet(i, "set_number", e.target.value)}
                  className="rounded border border-black/20 px-2 py-1 dark:border-white/20"
                />
                <input
                  type="number"
                  placeholder="Reps"
                  value={set.reps}
                  onChange={(e) => updateSet(i, "reps", e.target.value)}
                  className="rounded border border-black/20 px-2 py-1 dark:border-white/20"
                />
                <input
                  type="number"
                  step="0.5"
                  placeholder="kg"
                  value={set.weight_kg}
                  onChange={(e) => updateSet(i, "weight_kg", e.target.value)}
                  className="rounded border border-black/20 px-2 py-1 dark:border-white/20"
                />
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => fetchSuggestion(i)}
                    disabled={
                      !set.exercise_name.trim() ||
                      suggestingFor === set.exercise_name.trim()
                    }
                    className="rounded border border-black/20 px-2 py-1 text-xs disabled:opacity-50 dark:border-white/20"
                  >
                    {suggestingFor === set.exercise_name.trim()
                      ? "..."
                      : "Suggest"}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSet(i)}
                    className="text-black/40 hover:text-red-600 dark:text-white/40"
                  >
                    x
                  </button>
                </div>
              </div>
              {suggestion && (
                <p className="text-xs text-black/60 dark:text-white/60">
                  Est. 1RM {suggestion.estimated_one_rep_max_kg}kg -{" "}
                  {suggestion.note}
                </p>
              )}
            </div>
          );
        })}
        <button
          type="button"
          onClick={addSet}
          className="w-fit text-sm underline"
        >
          + Add set
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {prNames && prNames.length > 0 && (
        <p className="text-sm font-medium text-green-600">
          New PR: {prNames.join(", ")}! Workout saved.
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="w-fit rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {saving ? "Saving..." : "Save workout"}
      </button>
    </form>
  );
}
