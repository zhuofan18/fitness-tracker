"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ImbalanceEditor from "@/components/ImbalanceEditor";
import TagInput from "@/components/TagInput";
import { createClient } from "@/lib/supabase/client";
import {
  EQUIPMENT_OPTIONS,
  MUSCLE_GROUPS,
  type Database,
  type Equipment,
  type MuscleGroup,
  type SideImbalance,
} from "@/lib/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export default function ProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [sex, setSex] = useState(profile.sex);
  const [birthDate, setBirthDate] = useState(profile.birth_date);
  const [heightCm, setHeightCm] = useState(String(profile.height_cm));
  const [activityLevel, setActivityLevel] = useState(profile.activity_level);
  const [goal, setGoal] = useState(profile.goal);
  const [goalDescription, setGoalDescription] = useState(
    profile.goal_description ?? "",
  );
  const [targetWeightKg, setTargetWeightKg] = useState(
    profile.target_weight_kg ? String(profile.target_weight_kg) : "",
  );
  const [experienceLevel, setExperienceLevel] = useState(
    profile.experience_level,
  );
  const [daysPerWeek, setDaysPerWeek] = useState(String(profile.days_per_week));
  const [splitStyle, setSplitStyle] = useState(profile.split_style);
  const [weakPoints, setWeakPoints] = useState<MuscleGroup[]>(
    profile.weak_points,
  );
  const [equipment, setEquipment] = useState<Equipment[]>(profile.equipment);
  const [supplements, setSupplements] = useState<string[]>(
    profile.supplements,
  );
  const [availableFoods, setAvailableFoods] = useState<string[]>(
    profile.available_foods,
  );
  const [imbalances, setImbalances] = useState<SideImbalance[]>(
    profile.imbalances,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

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
    setSaving(true);
    setError(null);
    setSaved(false);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        sex,
        birth_date: birthDate,
        height_cm: Number(heightCm),
        activity_level: activityLevel,
        goal,
        goal_description: goalDescription || null,
        target_weight_kg: targetWeightKg ? Number(targetWeightKg) : null,
        experience_level: experienceLevel,
        weak_points: weakPoints,
        equipment,
        supplements,
        available_foods: availableFoods,
        imbalances,
        days_per_week: Number(daysPerWeek),
        split_style: splitStyle,
      })
      .eq("user_id", profile.user_id);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Sex
          <select
            value={sex}
            onChange={(e) => setSex(e.target.value as Profile["sex"])}
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
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Height (cm)
          <input
            type="number"
            value={heightCm}
            onChange={(e) => setHeightCm(e.target.value)}
            className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Target weight (kg, optional)
          <input
            type="number"
            step="0.1"
            value={targetWeightKg}
            onChange={(e) => setTargetWeightKg(e.target.value)}
            className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
          />
        </label>
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
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Activity level
        <select
          value={activityLevel}
          onChange={(e) =>
            setActivityLevel(e.target.value as Profile["activity_level"])
          }
          className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
        >
          <option value="sedentary">Sedentary</option>
          <option value="light">Light</option>
          <option value="moderate">Moderate</option>
          <option value="active">Active</option>
          <option value="very_active">Very active</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Goal
        <select
          value={goal}
          onChange={(e) => setGoal(e.target.value as Profile["goal"])}
          className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
        >
          <option value="bulk">Bulk</option>
          <option value="cut">Cut</option>
          <option value="maintain">Maintain</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        What do you want to look/feel like at the end of this? (optional)
        <textarea
          value={goalDescription}
          onChange={(e) => setGoalDescription(e.target.value)}
          rows={2}
          className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Lifting experience
        <select
          value={experienceLevel}
          onChange={(e) =>
            setExperienceLevel(e.target.value as Profile["experience_level"])
          }
          className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
        >
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Split style
        <select
          value={splitStyle}
          onChange={(e) =>
            setSplitStyle(e.target.value as Profile["split_style"])
          }
          className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
        >
          <option value="auto">Auto</option>
          <option value="full_body">Full body</option>
          <option value="upper_lower">Upper / lower</option>
          <option value="push_pull_legs">Push / pull / legs</option>
          <option value="bro_split">Bro split</option>
        </select>
      </label>

      <fieldset className="flex flex-col gap-2 text-sm">
        <legend className="mb-1">Weak points / muscle groups to emphasize</legend>
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

      <ImbalanceEditor values={imbalances} onChange={setImbalances} />

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-green-600">Saved.</p>}
      <button
        type="submit"
        disabled={saving}
        className="w-fit rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {saving ? "Saving..." : "Save profile"}
      </button>
    </form>
  );
}
