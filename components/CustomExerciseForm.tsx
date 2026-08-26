"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MUSCLE_GROUPS, type MuscleGroup } from "@/lib/supabase/types";

interface CustomExercise {
  id: string;
  muscle_group: MuscleGroup;
  exercise_name: string;
}

export default function CustomExerciseForm({
  initial,
}: {
  initial: CustomExercise[];
}) {
  const router = useRouter();
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>(MUSCLE_GROUPS[0]);
  const [exerciseNames, setExerciseNames] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // One exercise per line, or comma-separated - whichever's faster to type.
    const names = Array.from(
      new Set(
        exerciseNames
          .split(/[\n,]/)
          .map((name) => name.trim())
          .filter(Boolean),
      ),
    );
    if (names.length === 0) return;

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

    const { error: insertError } = await supabase
      .from("custom_exercises")
      .insert(
        names.map((exercise_name) => ({
          user_id: user.id,
          muscle_group: muscleGroup,
          exercise_name,
        })),
      );

    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setExerciseNames("");
    router.refresh();
  }

  async function remove(id: string) {
    const supabase = createClient();
    await supabase.from("custom_exercises").delete().eq("id", id);
    router.refresh();
  }

  const byGroup = new Map<MuscleGroup, CustomExercise[]>();
  for (const item of initial) {
    const list = byGroup.get(item.muscle_group) ?? [];
    list.push(item);
    byGroup.set(item.muscle_group, list);
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-black/60 dark:text-white/60">
        Tell it the exercises you already do for each muscle group (add as
        many as you like at once). Regenerating your program draws from this
        list - not always the same ones every time, since your workouts
        change - and still fills in anything you haven&apos;t listed
        automatically.
      </p>
      <form
        onSubmit={handleSubmit}
        className="flex flex-wrap items-end gap-2 rounded border border-black/10 p-3 text-sm dark:border-white/10"
      >
        <label className="flex flex-col gap-1">
          Muscle group
          <select
            value={muscleGroup}
            onChange={(e) => setMuscleGroup(e.target.value as MuscleGroup)}
            className="rounded border border-black/20 px-2 py-1 capitalize dark:border-white/20"
          >
            {MUSCLE_GROUPS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-1 flex-col gap-1">
          Exercises (one per line, or comma-separated)
          <textarea
            required
            rows={2}
            placeholder={"Incline Dumbbell Press\nCable Fly"}
            value={exerciseNames}
            onChange={(e) => setExerciseNames(e.target.value)}
            className="min-w-48 flex-1 rounded border border-black/20 px-2 py-1 dark:border-white/20"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="rounded bg-black px-3 py-1.5 text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {saving ? "Adding..." : "Add"}
        </button>
        {error && <p className="w-full text-xs text-red-600">{error}</p>}
      </form>

      {byGroup.size > 0 && (
        <div className="flex flex-col gap-2">
          {MUSCLE_GROUPS.filter((g) => byGroup.has(g)).map((group) => (
            <div key={group} className="text-sm">
              <span className="font-medium capitalize">{group}: </span>
              {byGroup.get(group)!.map((item, i) => (
                <span key={item.id}>
                  {i > 0 && ", "}
                  {item.exercise_name}{" "}
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    className="text-black/40 hover:text-red-600 dark:text-white/40"
                    title="Remove"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
