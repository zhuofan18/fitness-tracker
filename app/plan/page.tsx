import Link from "next/link";
import { redirect } from "next/navigation";
import CustomExerciseForm from "@/components/CustomExerciseForm";
import LiftGoalForm from "@/components/LiftGoalForm";
import RegenerateButton from "@/components/RegenerateButton";
import { createClient } from "@/lib/supabase/server";

export default async function PlanPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [
    { data: plan },
    { data: program },
    { data: liftGoals },
    { data: profile },
    { data: latestWeight },
    { data: customExercises },
  ] = await Promise.all([
      supabase
        .from("plans")
        .select("*")
        .eq("user_id", user.id)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("training_programs")
        .select("*")
        .eq("user_id", user.id)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("lift_goals")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("target_weight_kg")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("body_weight_logs")
        .select("weight_kg")
        .eq("user_id", user.id)
        .order("logged_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("custom_exercises")
        .select("id, muscle_group, exercise_name")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
    ]);

  let pacingNote: string | null = null;
  if (
    plan &&
    profile?.target_weight_kg &&
    latestWeight?.weight_kg &&
    plan.estimated_weekly_rate_kg !== 0
  ) {
    const remainingKg = profile.target_weight_kg - latestWeight.weight_kg;
    const sameDirection = Math.sign(remainingKg) === Math.sign(plan.estimated_weekly_rate_kg);
    if (sameDirection) {
      const weeks = Math.abs(remainingKg / plan.estimated_weekly_rate_kg);
      pacingNote = `At roughly ${plan.estimated_weekly_rate_kg > 0 ? "+" : ""}${plan.estimated_weekly_rate_kg}kg/week, expect to reach your ${profile.target_weight_kg}kg target in about ${Math.round(weeks)} week${Math.round(weeks) === 1 ? "" : "s"}.`;
    } else {
      pacingNote = `Your current calorie target moves weight in the opposite direction of your ${profile.target_weight_kg}kg goal - consider switching goal to match, or adjusting your target.`;
    }
  }

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Nutrition plan</h1>
          <RegenerateButton
            endpoint="/api/generate-plan"
            label={plan ? "Regenerate" : "Generate"}
          />
        </div>
        {plan ? (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <PlanStat label="Calories" value={plan.calorie_target} />
              <PlanStat label="Protein" value={plan.protein_g} unit="g" />
              <PlanStat label="Carbs" value={plan.carbs_g} unit="g" />
              <PlanStat label="Fat" value={plan.fat_g} unit="g" />
            </div>
            {pacingNote && (
              <p className="text-sm text-black/60 dark:text-white/60">
                {pacingNote}
              </p>
            )}

            {plan.meal_plan.length > 0 && (
              <div className="flex flex-col gap-3">
                <h2 className="font-semibold">Curated meals for the day</h2>
                <p className="text-xs text-black/50 dark:text-white/50">
                  Built from the foods on your profile&apos;s &quot;usually
                  available&quot; list - update that list and hit Regenerate
                  to refresh these.
                </p>
                {plan.meal_plan.map((meal, i) => {
                  const totals = meal.items.reduce(
                    (acc, item) => ({
                      calories: acc.calories + item.calories,
                      protein_g: acc.protein_g + item.protein_g,
                      carbs_g: acc.carbs_g + item.carbs_g,
                      fat_g: acc.fat_g + item.fat_g,
                    }),
                    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
                  );
                  return (
                    <div
                      key={i}
                      className="rounded border border-black/10 p-3 text-sm dark:border-white/10"
                    >
                      <div className="mb-2 flex justify-between font-semibold">
                        <span>{meal.name}</span>
                        <span className="text-black/50 dark:text-white/50">
                          {Math.round(totals.calories)} kcal
                        </span>
                      </div>
                      <ul className="flex flex-col gap-1">
                        {meal.items.map((item, j) => (
                          <li key={j} className="flex justify-between">
                            <span>
                              {item.name} - {item.quantity_description}
                            </span>
                            <span className="text-black/50 dark:text-white/50">
                              P{Math.round(item.protein_g)} C
                              {Math.round(item.carbs_g)} F
                              {Math.round(item.fat_g)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-black/60 dark:text-white/60">
            No plan yet - generate one from your profile stats.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold">Your exercises</h1>
        <CustomExerciseForm initial={customExercises ?? []} />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Training program</h1>
          <RegenerateButton
            endpoint="/api/generate-program"
            label={program ? "Regenerate" : "Generate"}
          />
        </div>

        {program ? (
          <>
            <p className="text-sm text-black/60 dark:text-white/60">
              {program.days_per_week} days/week ·{" "}
              {program.split_style === "auto"
                ? "auto split"
                : program.split_style.replace("_", " ")}
            </p>

            <div className="flex flex-col gap-3">
              {program.weekly_schedule.map((day) => (
                <div
                  key={day.day_index}
                  className="rounded border border-black/10 p-3 text-sm dark:border-white/10"
                >
                  <p className="mb-2 font-semibold">
                    Day {day.day_index}: {day.focus}
                  </p>
                  <ul className="flex flex-col gap-1">
                    {day.exercises.map((ex) => (
                      <li key={ex.name}>
                        <div className="flex justify-between text-black/80 dark:text-white/80">
                          <span>
                            {ex.name}
                            {ex.emphasis ? " *" : ""}
                            {ex.custom && (
                              <span className="text-xs text-black/40 dark:text-white/40">
                                {" "}
                                · from your list
                              </span>
                            )}
                          </span>
                          <span className="text-black/50 dark:text-white/50">
                            {ex.sets} x {ex.rep_range}
                          </span>
                        </div>
                        {ex.note && (
                          <p className="text-xs text-black/50 dark:text-white/50">
                            {ex.note}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <p className="text-xs text-black/50 dark:text-white/50">
                * extra volume for a weak point, or added to make sure every
                muscle group gets trained
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <h2 className="font-semibold">4-week wave</h2>
              <ul className="flex flex-col gap-1 text-sm">
                {program.mesocycle.map((week) => (
                  <li key={week.week}>
                    <span className="font-medium capitalize">
                      Week {week.week} ({week.wave}):
                    </span>{" "}
                    <span className="text-black/70 dark:text-white/70">
                      {week.intensity_note}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <Link
              href="/training/log"
              className="w-fit rounded bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black"
            >
              Log a workout
            </Link>
          </>
        ) : (
          <p className="text-sm text-black/60 dark:text-white/60">
            No training program yet - generate one from your profile stats.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold">Weight Goal Journey</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Set a target weight on any lift. Hitting it in a logged set marks it
          achieved automatically.
        </p>
        <LiftGoalForm />
        {liftGoals && liftGoals.length > 0 && (
          <ul className="flex flex-col gap-2">
            {liftGoals.map((goal) => (
              <li
                key={goal.id}
                className="flex items-center justify-between rounded border border-black/10 px-3 py-2 text-sm dark:border-white/10"
              >
                <span>
                  {goal.exercise_name}
                  {goal.starting_weight_kg
                    ? ` · ${goal.starting_weight_kg}kg -> `
                    : " · target "}
                  {goal.target_weight_kg}kg
                </span>
                <span
                  className={
                    goal.achieved
                      ? "text-green-600"
                      : "text-black/50 dark:text-white/50"
                  }
                >
                  {goal.achieved ? "Achieved" : "In progress"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function PlanStat({
  label,
  value,
  unit,
}: {
  label: string;
  value: number;
  unit?: string;
}) {
  return (
    <div className="rounded border border-black/10 p-3 dark:border-white/10">
      <p className="text-xs text-black/60 dark:text-white/60">{label}</p>
      <p className="text-lg font-semibold">
        {Math.round(value)}
        {unit}
      </p>
    </div>
  );
}
