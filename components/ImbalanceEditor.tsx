"use client";

import { useState } from "react";
import {
  MUSCLE_GROUPS,
  type MuscleGroup,
  type Side,
  type SideImbalance,
} from "@/lib/supabase/types";

export default function ImbalanceEditor({
  values,
  onChange,
}: {
  values: SideImbalance[];
  onChange: (values: SideImbalance[]) => void;
}) {
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>(MUSCLE_GROUPS[0]);
  const [weakerSide, setWeakerSide] = useState<Side>("left");

  function add() {
    if (values.some((v) => v.muscle_group === muscleGroup)) return;
    onChange([...values, { muscle_group: muscleGroup, weaker_side: weakerSide }]);
  }

  function remove(group: string) {
    onChange(values.filter((v) => v.muscle_group !== group));
  }

  return (
    <fieldset className="flex flex-col gap-2 text-sm">
      <legend className="mb-1">
        Left/right imbalances (optional) - affected muscles get unilateral
        exercises so each side trains independently
      </legend>
      <div className="flex flex-wrap items-end gap-2">
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
        <select
          value={weakerSide}
          onChange={(e) => setWeakerSide(e.target.value as Side)}
          className="rounded border border-black/20 px-2 py-1 dark:border-white/20"
        >
          <option value="left">Left is weaker</option>
          <option value="right">Right is weaker</option>
        </select>
        <button
          type="button"
          onClick={add}
          className="rounded border border-black/20 px-3 py-1 dark:border-white/20"
        >
          Add
        </button>
      </div>
      {values.length > 0 && (
        <ul className="flex flex-col gap-1">
          {values.map((v) => (
            <li key={v.muscle_group} className="flex items-center gap-2">
              <span className="capitalize">
                {v.muscle_group}: {v.weaker_side} is weaker
              </span>
              <button
                type="button"
                onClick={() => remove(v.muscle_group)}
                className="text-black/40 hover:text-red-600 dark:text-white/40"
              >
                remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  );
}
