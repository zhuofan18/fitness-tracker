import type {
  Equipment,
  MesocycleWeek,
  MuscleGroup,
  ProgramDay,
  ProgramExercise,
  SideImbalance,
  SplitStyle,
} from "@/lib/supabase/types";

// Equipment that allows training one limb at a time - preferred when the
// user has flagged a left/right imbalance so both sides move independently
// instead of the stronger side compensating on a fixed bilateral bar.
const UNILATERAL_CAPABLE: Set<Equipment | "bodyweight"> = new Set([
  "dumbbells",
  "cables",
  "kettlebells",
  "bodyweight",
]);

interface ExerciseOption {
  name: string;
  equipment: Equipment | "bodyweight";
}

interface ExerciseTemplate {
  muscle_group: MuscleGroup;
  compound: boolean;
  // First entry is the preferred exercise; later entries are equipment
  // substitutes tried in order when the preferred equipment isn't available.
  options: ExerciseOption[];
}

const DAY_TEMPLATES: Record<string, ExerciseTemplate[]> = {
  "Full Body": [
    {
      muscle_group: "quads",
      compound: true,
      options: [
        { name: "Squat", equipment: "barbell" },
        { name: "Goblet Squat", equipment: "dumbbells" },
        { name: "Leg Press", equipment: "machines" },
        { name: "Bodyweight Squat", equipment: "bodyweight" },
      ],
    },
    {
      muscle_group: "chest",
      compound: true,
      options: [
        { name: "Bench Press", equipment: "barbell" },
        { name: "Dumbbell Bench Press", equipment: "dumbbells" },
        { name: "Machine Chest Press", equipment: "machines" },
        { name: "Push-Up", equipment: "bodyweight" },
      ],
    },
    {
      muscle_group: "back",
      compound: true,
      options: [
        { name: "Barbell Row", equipment: "barbell" },
        { name: "Dumbbell Row", equipment: "dumbbells" },
        { name: "Seated Cable Row", equipment: "cables" },
        { name: "Inverted Row", equipment: "bodyweight" },
      ],
    },
    {
      muscle_group: "shoulders",
      compound: true,
      options: [
        { name: "Overhead Press", equipment: "barbell" },
        { name: "Dumbbell Shoulder Press", equipment: "dumbbells" },
        { name: "Machine Shoulder Press", equipment: "machines" },
      ],
    },
    {
      muscle_group: "hamstrings",
      compound: true,
      options: [
        { name: "Romanian Deadlift", equipment: "barbell" },
        { name: "Dumbbell Romanian Deadlift", equipment: "dumbbells" },
        { name: "Leg Curl Machine", equipment: "machines" },
      ],
    },
    {
      muscle_group: "core",
      compound: false,
      options: [{ name: "Plank", equipment: "bodyweight" }],
    },
  ],
  Upper: [
    {
      muscle_group: "chest",
      compound: true,
      options: [
        { name: "Bench Press", equipment: "barbell" },
        { name: "Dumbbell Bench Press", equipment: "dumbbells" },
        { name: "Machine Chest Press", equipment: "machines" },
        { name: "Push-Up", equipment: "bodyweight" },
      ],
    },
    {
      muscle_group: "back",
      compound: true,
      options: [
        { name: "Barbell Row", equipment: "barbell" },
        { name: "Dumbbell Row", equipment: "dumbbells" },
        { name: "Seated Cable Row", equipment: "cables" },
        { name: "Inverted Row", equipment: "bodyweight" },
      ],
    },
    {
      muscle_group: "shoulders",
      compound: true,
      options: [
        { name: "Overhead Press", equipment: "barbell" },
        { name: "Dumbbell Shoulder Press", equipment: "dumbbells" },
        { name: "Machine Shoulder Press", equipment: "machines" },
      ],
    },
    {
      muscle_group: "back",
      compound: false,
      options: [
        { name: "Lat Pulldown", equipment: "cables" },
        { name: "Assisted Pull-Up Machine", equipment: "machines" },
        { name: "Pull-Up", equipment: "bodyweight" },
      ],
    },
    {
      muscle_group: "biceps",
      compound: false,
      options: [
        { name: "Bicep Curl", equipment: "dumbbells" },
        { name: "Barbell Curl", equipment: "barbell" },
        { name: "Cable Curl", equipment: "cables" },
        { name: "Band Curl", equipment: "bands" },
      ],
    },
    {
      muscle_group: "triceps",
      compound: false,
      options: [
        { name: "Triceps Pushdown", equipment: "cables" },
        { name: "Overhead Dumbbell Extension", equipment: "dumbbells" },
        { name: "Band Pushdown", equipment: "bands" },
        { name: "Diamond Push-Up", equipment: "bodyweight" },
      ],
    },
  ],
  Lower: [
    {
      muscle_group: "quads",
      compound: true,
      options: [
        { name: "Squat", equipment: "barbell" },
        { name: "Goblet Squat", equipment: "dumbbells" },
        { name: "Leg Press", equipment: "machines" },
        { name: "Bodyweight Squat", equipment: "bodyweight" },
      ],
    },
    {
      muscle_group: "hamstrings",
      compound: true,
      options: [
        { name: "Romanian Deadlift", equipment: "barbell" },
        { name: "Dumbbell Romanian Deadlift", equipment: "dumbbells" },
        { name: "Leg Curl Machine", equipment: "machines" },
      ],
    },
    {
      muscle_group: "quads",
      compound: false,
      options: [
        { name: "Leg Press", equipment: "machines" },
        { name: "Goblet Squat", equipment: "dumbbells" },
        { name: "Bodyweight Lunge", equipment: "bodyweight" },
      ],
    },
    {
      muscle_group: "glutes",
      compound: false,
      options: [
        { name: "Hip Thrust", equipment: "barbell" },
        { name: "Dumbbell Hip Thrust", equipment: "dumbbells" },
        { name: "Glute Bridge", equipment: "bodyweight" },
      ],
    },
    {
      muscle_group: "calves",
      compound: false,
      options: [
        { name: "Calf Raise Machine", equipment: "machines" },
        { name: "Dumbbell Calf Raise", equipment: "dumbbells" },
        { name: "Bodyweight Calf Raise", equipment: "bodyweight" },
      ],
    },
    {
      muscle_group: "core",
      compound: false,
      options: [{ name: "Hanging Leg Raise", equipment: "bodyweight" }],
    },
  ],
  Push: [
    {
      muscle_group: "chest",
      compound: true,
      options: [
        { name: "Bench Press", equipment: "barbell" },
        { name: "Dumbbell Bench Press", equipment: "dumbbells" },
        { name: "Machine Chest Press", equipment: "machines" },
        { name: "Push-Up", equipment: "bodyweight" },
      ],
    },
    {
      muscle_group: "shoulders",
      compound: true,
      options: [
        { name: "Overhead Press", equipment: "barbell" },
        { name: "Dumbbell Shoulder Press", equipment: "dumbbells" },
        { name: "Machine Shoulder Press", equipment: "machines" },
      ],
    },
    {
      muscle_group: "chest",
      compound: false,
      options: [
        { name: "Incline Dumbbell Press", equipment: "dumbbells" },
        { name: "Incline Barbell Press", equipment: "barbell" },
        { name: "Incline Machine Press", equipment: "machines" },
      ],
    },
    {
      muscle_group: "shoulders",
      compound: false,
      options: [
        { name: "Lateral Raise", equipment: "dumbbells" },
        { name: "Cable Lateral Raise", equipment: "cables" },
        { name: "Machine Lateral Raise", equipment: "machines" },
      ],
    },
    {
      muscle_group: "triceps",
      compound: false,
      options: [
        { name: "Triceps Pushdown", equipment: "cables" },
        { name: "Overhead Dumbbell Extension", equipment: "dumbbells" },
        { name: "Band Pushdown", equipment: "bands" },
        { name: "Diamond Push-Up", equipment: "bodyweight" },
      ],
    },
  ],
  Pull: [
    {
      muscle_group: "back",
      compound: true,
      options: [
        { name: "Deadlift", equipment: "barbell" },
        { name: "Dumbbell Deadlift", equipment: "dumbbells" },
        { name: "Glute Bridge", equipment: "bodyweight" },
      ],
    },
    {
      muscle_group: "back",
      compound: true,
      options: [
        { name: "Barbell Row", equipment: "barbell" },
        { name: "Dumbbell Row", equipment: "dumbbells" },
        { name: "Seated Cable Row", equipment: "cables" },
        { name: "Inverted Row", equipment: "bodyweight" },
      ],
    },
    {
      muscle_group: "back",
      compound: false,
      options: [
        { name: "Lat Pulldown", equipment: "cables" },
        { name: "Assisted Pull-Up Machine", equipment: "machines" },
        { name: "Pull-Up", equipment: "bodyweight" },
      ],
    },
    {
      muscle_group: "shoulders",
      compound: false,
      options: [
        { name: "Face Pull", equipment: "cables" },
        { name: "Band Face Pull", equipment: "bands" },
      ],
    },
    {
      muscle_group: "biceps",
      compound: false,
      options: [
        { name: "Bicep Curl", equipment: "dumbbells" },
        { name: "Barbell Curl", equipment: "barbell" },
        { name: "Cable Curl", equipment: "cables" },
        { name: "Band Curl", equipment: "bands" },
      ],
    },
  ],
  Legs: [
    {
      muscle_group: "quads",
      compound: true,
      options: [
        { name: "Squat", equipment: "barbell" },
        { name: "Goblet Squat", equipment: "dumbbells" },
        { name: "Leg Press", equipment: "machines" },
        { name: "Bodyweight Squat", equipment: "bodyweight" },
      ],
    },
    {
      muscle_group: "hamstrings",
      compound: true,
      options: [
        { name: "Romanian Deadlift", equipment: "barbell" },
        { name: "Dumbbell Romanian Deadlift", equipment: "dumbbells" },
        { name: "Leg Curl Machine", equipment: "machines" },
      ],
    },
    {
      muscle_group: "quads",
      compound: false,
      options: [
        { name: "Leg Press", equipment: "machines" },
        { name: "Goblet Squat", equipment: "dumbbells" },
        { name: "Bodyweight Lunge", equipment: "bodyweight" },
      ],
    },
    {
      muscle_group: "hamstrings",
      compound: false,
      options: [
        { name: "Leg Curl Machine", equipment: "machines" },
        { name: "Nordic Curl", equipment: "bodyweight" },
      ],
    },
    {
      muscle_group: "calves",
      compound: false,
      options: [
        { name: "Calf Raise Machine", equipment: "machines" },
        { name: "Dumbbell Calf Raise", equipment: "dumbbells" },
        { name: "Bodyweight Calf Raise", equipment: "bodyweight" },
      ],
    },
  ],
  Chest: [
    {
      muscle_group: "chest",
      compound: true,
      options: [
        { name: "Bench Press", equipment: "barbell" },
        { name: "Dumbbell Bench Press", equipment: "dumbbells" },
        { name: "Machine Chest Press", equipment: "machines" },
        { name: "Push-Up", equipment: "bodyweight" },
      ],
    },
    {
      muscle_group: "chest",
      compound: false,
      options: [
        { name: "Incline Dumbbell Press", equipment: "dumbbells" },
        { name: "Incline Barbell Press", equipment: "barbell" },
        { name: "Incline Machine Press", equipment: "machines" },
      ],
    },
    {
      muscle_group: "chest",
      compound: false,
      options: [
        { name: "Cable Fly", equipment: "cables" },
        { name: "Dumbbell Fly", equipment: "dumbbells" },
        { name: "Pec Deck", equipment: "machines" },
      ],
    },
    {
      muscle_group: "triceps",
      compound: false,
      options: [
        { name: "Triceps Pushdown", equipment: "cables" },
        { name: "Overhead Dumbbell Extension", equipment: "dumbbells" },
        { name: "Diamond Push-Up", equipment: "bodyweight" },
      ],
    },
  ],
  Back: [
    {
      muscle_group: "back",
      compound: true,
      options: [
        { name: "Deadlift", equipment: "barbell" },
        { name: "Dumbbell Deadlift", equipment: "dumbbells" },
        { name: "Glute Bridge", equipment: "bodyweight" },
      ],
    },
    {
      muscle_group: "back",
      compound: true,
      options: [
        { name: "Barbell Row", equipment: "barbell" },
        { name: "Dumbbell Row", equipment: "dumbbells" },
        { name: "Seated Cable Row", equipment: "cables" },
        { name: "Inverted Row", equipment: "bodyweight" },
      ],
    },
    {
      muscle_group: "back",
      compound: false,
      options: [
        { name: "Lat Pulldown", equipment: "cables" },
        { name: "Assisted Pull-Up Machine", equipment: "machines" },
        { name: "Pull-Up", equipment: "bodyweight" },
      ],
    },
    {
      muscle_group: "back",
      compound: false,
      options: [
        { name: "Seated Cable Row", equipment: "cables" },
        { name: "Machine Row", equipment: "machines" },
        { name: "Dumbbell Row", equipment: "dumbbells" },
      ],
    },
  ],
  Shoulders: [
    {
      muscle_group: "shoulders",
      compound: true,
      options: [
        { name: "Overhead Press", equipment: "barbell" },
        { name: "Dumbbell Shoulder Press", equipment: "dumbbells" },
        { name: "Machine Shoulder Press", equipment: "machines" },
      ],
    },
    {
      muscle_group: "shoulders",
      compound: false,
      options: [
        { name: "Lateral Raise", equipment: "dumbbells" },
        { name: "Cable Lateral Raise", equipment: "cables" },
        { name: "Machine Lateral Raise", equipment: "machines" },
      ],
    },
    {
      muscle_group: "shoulders",
      compound: false,
      options: [
        { name: "Face Pull", equipment: "cables" },
        { name: "Band Face Pull", equipment: "bands" },
      ],
    },
    {
      muscle_group: "shoulders",
      compound: false,
      options: [
        { name: "Shrug", equipment: "dumbbells" },
        { name: "Barbell Shrug", equipment: "barbell" },
      ],
    },
  ],
  Arms: [
    {
      muscle_group: "biceps",
      compound: false,
      options: [
        { name: "Bicep Curl", equipment: "dumbbells" },
        { name: "Barbell Curl", equipment: "barbell" },
        { name: "Cable Curl", equipment: "cables" },
        { name: "Band Curl", equipment: "bands" },
      ],
    },
    {
      muscle_group: "biceps",
      compound: false,
      options: [
        { name: "Hammer Curl", equipment: "dumbbells" },
        { name: "Cable Hammer Curl", equipment: "cables" },
        { name: "Band Hammer Curl", equipment: "bands" },
      ],
    },
    {
      muscle_group: "triceps",
      compound: false,
      options: [
        { name: "Skull Crusher", equipment: "barbell" },
        { name: "Dumbbell Skull Crusher", equipment: "dumbbells" },
        { name: "Cable Overhead Extension", equipment: "cables" },
      ],
    },
    {
      muscle_group: "triceps",
      compound: false,
      options: [
        { name: "Triceps Pushdown", equipment: "cables" },
        { name: "Overhead Dumbbell Extension", equipment: "dumbbells" },
        { name: "Diamond Push-Up", equipment: "bodyweight" },
      ],
    },
  ],
};

const SPLIT_DAY_SEQUENCES: Record<Exclude<SplitStyle, "auto">, string[]> = {
  full_body: ["Full Body"],
  upper_lower: ["Upper", "Lower"],
  push_pull_legs: ["Push", "Pull", "Legs"],
  bro_split: ["Chest", "Back", "Shoulders", "Legs", "Arms"],
};

export function resolveSplitStyle(
  splitStyle: SplitStyle,
  daysPerWeek: number,
): Exclude<SplitStyle, "auto"> {
  if (splitStyle !== "auto") return splitStyle;
  if (daysPerWeek <= 3) return "full_body";
  if (daysPerWeek === 4) return "upper_lower";
  return "push_pull_legs";
}

function pickExercise(
  template: ExerciseTemplate,
  availableEquipment: Set<Equipment | "bodyweight">,
  preferUnilateral: boolean,
): ExerciseOption {
  if (preferUnilateral) {
    const unilateralMatch = template.options.find(
      (opt) =>
        availableEquipment.has(opt.equipment) &&
        UNILATERAL_CAPABLE.has(opt.equipment),
    );
    if (unilateralMatch) return unilateralMatch;
  }
  const match = template.options.find((opt) =>
    availableEquipment.has(opt.equipment),
  );
  // Bodyweight is always available as a last resort even if not selected.
  return match ?? template.options[template.options.length - 1];
}

export function generateWeeklySchedule(
  daysPerWeek: number,
  splitStyle: SplitStyle,
  weakPoints: MuscleGroup[],
  equipment: Equipment[],
  imbalances: SideImbalance[] = [],
): ProgramDay[] {
  const resolved = resolveSplitStyle(splitStyle, daysPerWeek);
  const sequence = SPLIT_DAY_SEQUENCES[resolved];
  const weakSet = new Set(weakPoints);
  const availableEquipment = new Set<Equipment | "bodyweight">([
    ...equipment,
    "bodyweight",
  ]);
  const imbalanceByMuscle = new Map(
    imbalances.map((imb) => [imb.muscle_group, imb.weaker_side]),
  );

  const days: ProgramDay[] = [];
  for (let i = 0; i < daysPerWeek; i++) {
    const focusName = sequence[i % sequence.length];
    const template = DAY_TEMPLATES[focusName];
    const hasEmphasis = template.some((ex) => weakSet.has(ex.muscle_group));

    const exercises: ProgramExercise[] = template.map((ex) => {
      const weakerSide = imbalanceByMuscle.get(ex.muscle_group);
      const chosen = pickExercise(ex, availableEquipment, Boolean(weakerSide));
      const emphasis = weakSet.has(ex.muscle_group);
      const isUnilateral = UNILATERAL_CAPABLE.has(chosen.equipment);
      return {
        name: chosen.name,
        muscle_group: ex.muscle_group,
        equipment: chosen.equipment,
        sets: emphasis ? 4 : 3,
        rep_range: ex.compound ? "5-8" : "8-12",
        emphasis,
        note: weakerSide
          ? isUnilateral
            ? `Train one side at a time - match reps/weight to what your ${weakerSide} side can strictly do, and add 1 extra set on the ${weakerSide} to help it catch up.`
            : `Your ${weakerSide} side has been lagging here - where possible favor a single-limb version of this movement instead.`
          : undefined,
      };
    });

    days.push({
      day_index: i + 1,
      focus: hasEmphasis ? `${focusName} (Emphasis)` : focusName,
      exercises,
    });
  }

  // Frequency top-up: any weak-point muscle group trained fewer than twice a
  // week gets one extra accessory exercise added to its best-matching day,
  // without displacing the balanced coverage already in the template.
  const frequency = new Map<MuscleGroup, number>();
  for (const day of days) {
    for (const ex of day.exercises) {
      frequency.set(ex.muscle_group, (frequency.get(ex.muscle_group) ?? 0) + 1);
    }
  }

  for (const weakPoint of weakPoints) {
    if ((frequency.get(weakPoint) ?? 0) >= 2) continue;
    const targetDay = days.find((day) =>
      day.exercises.some((ex) => ex.muscle_group === weakPoint),
    );
    const extra = findAccessoryFor(
      weakPoint,
      targetDay?.exercises ?? [],
      availableEquipment,
    );
    if (targetDay && extra) {
      targetDay.exercises.push(extra);
      if (!targetDay.focus.includes("Emphasis")) {
        targetDay.focus = `${targetDay.focus} (Emphasis)`;
      }
    }
  }

  return days;
}

function findAccessoryFor(
  muscleGroup: MuscleGroup,
  existing: ProgramExercise[],
  availableEquipment: Set<Equipment | "bodyweight">,
): ProgramExercise | null {
  const existingNames = new Set(existing.map((ex) => ex.name));
  for (const template of Object.values(DAY_TEMPLATES)) {
    for (const ex of template) {
      if (ex.muscle_group !== muscleGroup) continue;
      const chosen = pickExercise(ex, availableEquipment, false);
      if (existingNames.has(chosen.name)) continue;
      return {
        name: chosen.name,
        muscle_group: ex.muscle_group,
        equipment: chosen.equipment,
        sets: 3,
        rep_range: ex.compound ? "5-8" : "8-12",
        emphasis: true,
      };
    }
  }
  return null;
}

export function generateMesocycle(): MesocycleWeek[] {
  return [
    {
      week: 1,
      wave: "heavy",
      intensity_note:
        "Heavy week - aim for the low end of each rep range at a challenging but controlled weight (RPE 7-8).",
    },
    {
      week: 2,
      wave: "moderate",
      intensity_note:
        "Moderate week - work through the full programmed rep range at RPE 7.",
    },
    {
      week: 3,
      wave: "peak",
      intensity_note:
        "Peak week - push toward the top of your rep range, or a small PR attempt on main lifts (RPE 8-9).",
    },
    {
      week: 4,
      wave: "deload",
      intensity_note:
        "Deload - cut weight by roughly 40-50% and sets by about half. Focus on form and recovery.",
    },
  ];
}
