"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import TagInput from "@/components/TagInput";
import { createClient } from "@/lib/supabase/client";
import {
  EQUIPMENT_OPTIONS,
  MUSCLE_GROUPS,
  type Equipment,
  type MuscleGroup,
} from "@/lib/supabase/types";

export default function OnboardingPage() {
  const router = useRouter();
  const [sex, setSex] = useState<"male" | "female">("male");
  const [birthDate, setBirthDate] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [activityLevel, setActivityLevel] = useState("moderate");
  const [goal, setGoal] = useState("maintain");
  const [goalDescription, setGoalDescription] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("beginner");
  const [daysPerWeek, setDaysPerWeek] = useState("4");
  const [splitStyle, setSplitStyle] = useState("auto");
  const [weakPoints, setWeakPoints] = useState<MuscleGroup[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([...EQUIPMENT_OPTIONS]);
  const [targetWeightKg, setTargetWeightKg] = useState("");
  const [supplements, setSupplements] = useState<string[]>([]);
  const [availableFoods, setAvailableFoods] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function toggleWeakPoint(group: MuscleGroup) {
    setWeakPoints((prev) =>
      prev.includes(group)
        ? prev.filter((g) => g !== group)
        : [...prev, group],
    );
  }

  function toggleEquipment(item: Equipment) {
    setEquipment((prev) =>
      prev.includes(item) ? prev.filter((e) => e !== item) : [...prev, item],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Not logged in");
      setLoading(false);
      return;
    }

    const { error: profileError } = await supabase.from("profiles").upsert({
      user_id: user.id,
      sex,
      birth_date: birthDate,
      height_cm: Number(heightCm),
      activity_level: activityLevel as
        | "sedentary"
        | "light"
        | "moderate"
        | "active"
        | "very_active",
      goal: goal as "bulk" | "cut" | "maintain",
      goal_description: goalDescription || null,
      target_weight_kg: targetWeightKg ? Number(targetWeightKg) : null,
      experience_level: experienceLevel as
        | "beginner"
        | "intermediate"
        | "advanced",
      weak_points: weakPoints,
      equipment,
      supplements,
      available_foods: availableFoods,
      days_per_week: Number(daysPerWeek),
      split_style: splitStyle as
        | "auto"
        | "full_body"
        | "upper_lower"
        | "push_pull_legs"
        | "bro_split",
    });

    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    const { error: weightError } = await supabase
      .from("body_weight_logs")
      .insert({ user_id: user.id, weight_kg: Number(weightKg) });

    if (weightError) {
      setError(weightError.message);
      setLoading(false);
      return;
    }

    await Promise.all([
      fetch("/api/generate-plan", { method: "POST" }),
      fetch("/api/generate-program", { method: "POST" }),
    ]);

    setLoading(false);
    router.push("/");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-lg py-8">
      <h1 className="mb-6 text-2xl font-semibold">Set up your profile</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Sex
            <select
              value={sex}
              onChange={(e) => setSex(e.target.value as "male" | "female")}
              className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Birth date
            <input
              type="date"
              required
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Height (cm)
            <input
              type="number"
              required
              min={1}
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Current weight (kg)
            <input
              type="number"
              required
              min={1}
              step="0.1"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Target weight (kg, optional)
            <input
              type="number"
              min={1}
              step="0.1"
              value={targetWeightKg}
              onChange={(e) => setTargetWeightKg(e.target.value)}
              className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          Activity level (outside the gym)
          <select
            value={activityLevel}
            onChange={(e) => setActivityLevel(e.target.value)}
            className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
          >
            <option value="sedentary">Sedentary - desk job, little walking</option>
            <option value="light">Light - some walking/activity</option>
            <option value="moderate">Moderate - on your feet often</option>
            <option value="active">Active - physically demanding job</option>
            <option value="very_active">Very active</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Goal
          <select
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
          >
            <option value="bulk">Bulk - gain weight/muscle</option>
            <option value="cut">Cut - lose fat</option>
            <option value="maintain">Maintain</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          What do you want to look/feel like at the end of this? (optional)
          <textarea
            value={goalDescription}
            onChange={(e) => setGoalDescription(e.target.value)}
            placeholder="e.g. lean and toned without getting bulky, or visible abs around 12% body fat"
            rows={2}
            className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Lifting experience
          <select
            value={experienceLevel}
            onChange={(e) => setExperienceLevel(e.target.value)}
            className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
          >
            <option value="beginner">Beginner (&lt;1 year)</option>
            <option value="intermediate">Intermediate (1-3 years)</option>
            <option value="advanced">Advanced (3+ years)</option>
          </select>
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Training days/week
            <select
              value={daysPerWeek}
              onChange={(e) => setDaysPerWeek(e.target.value)}
              className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
            >
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Split style
            <select
              value={splitStyle}
              onChange={(e) => setSplitStyle(e.target.value)}
              className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
            >
              <option value="auto">Auto (recommended for your days/week)</option>
              <option value="full_body">Full body</option>
              <option value="upper_lower">Upper / lower</option>
              <option value="push_pull_legs">Push / pull / legs</option>
              <option value="bro_split">Bro split</option>
            </select>
          </label>
        </div>

        <fieldset className="flex flex-col gap-2 text-sm">
          <legend className="mb-1">
            Weak points / muscle groups to emphasize
          </legend>
          <div className="flex flex-wrap gap-2">
            {MUSCLE_GROUPS.map((group) => (
              <button
                type="button"
                key={group}
                onClick={() => toggleWeakPoint(group)}
                className={`rounded-full border px-3 py-1 capitalize ${
                  weakPoints.includes(group)
                    ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                    : "border-black/20 dark:border-white/20"
                }`}
              >
                {group}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2 text-sm">
          <legend className="mb-1">
            Equipment you have access to (your program will only use these)
          </legend>
          <div className="flex flex-wrap gap-2">
            {EQUIPMENT_OPTIONS.map((item) => (
              <button
                type="button"
                key={item}
                onClick={() => toggleEquipment(item)}
                className={`rounded-full border px-3 py-1 capitalize ${
                  equipment.includes(item)
                    ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                    : "border-black/20 dark:border-white/20"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </fieldset>

        <TagInput
          label="Supplements you take (optional)"
          placeholder="e.g. creatine, whey protein, multivitamin"
          values={supplements}
          onChange={setSupplements}
        />

        <TagInput
          label="Foods usually available to you (optional)"
          placeholder="e.g. eggs, chicken breast, rice, oats"
          values={availableFoods}
          onChange={setAvailableFoods}
        />

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {loading ? "Saving..." : "Save and generate my plan"}
        </button>
      </form>
    </div>
  );
}
