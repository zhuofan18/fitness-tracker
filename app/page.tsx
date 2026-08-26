import Link from "next/link";
import { redirect } from "next/navigation";
import MealSuggestion from "@/components/MealSuggestion";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) redirect("/onboarding");

  const { data: plan } = await supabase
    .from("plans")
    .select("*")
    .eq("user_id", user.id)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { data: todaysLogs } = await supabase
    .from("food_logs")
    .select("*")
    .eq("user_id", user.id)
    .gte("logged_at", startOfDay.toISOString())
    .order("logged_at", { ascending: false });

  const totals = (todaysLogs ?? []).reduce(
    (acc, log) => ({
      calories: acc.calories + log.calories,
      protein_g: acc.protein_g + log.protein_g,
      carbs_g: acc.carbs_g + log.carbs_g,
      fat_g: acc.fat_g + log.fat_g,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Today</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          {new Date().toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {plan ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Calories" value={totals.calories} target={plan.calorie_target} />
          <Stat label="Protein" value={totals.protein_g} target={plan.protein_g} unit="g" />
          <Stat label="Carbs" value={totals.carbs_g} target={plan.carbs_g} unit="g" />
          <Stat label="Fat" value={totals.fat_g} target={plan.fat_g} unit="g" />
        </div>
      ) : (
        <p className="text-sm text-black/60 dark:text-white/60">
          No nutrition plan yet.{" "}
          <Link href="/plan" className="underline">
            Generate one
          </Link>
          .
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/log/new"
          className="w-fit rounded bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black"
        >
          + Log food
        </Link>
        {plan && (
          <MealSuggestion
            remaining={{
              calories: plan.calorie_target - totals.calories,
              protein_g: plan.protein_g - totals.protein_g,
              carbs_g: plan.carbs_g - totals.carbs_g,
              fat_g: plan.fat_g - totals.fat_g,
            }}
          />
        )}
      </div>

      <div>
        <h2 className="mb-2 text-lg font-semibold">Today&apos;s meals</h2>
        {(todaysLogs ?? []).length === 0 ? (
          <p className="text-sm text-black/60 dark:text-white/60">
            Nothing logged yet today.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {(todaysLogs ?? []).map((log) => (
              <li
                key={log.id}
                className="rounded border border-black/10 px-3 py-2 text-sm dark:border-white/10"
              >
                <div className="flex justify-between">
                  <span>
                    {(log.items as { name: string }[])
                      .map((item) => item.name)
                      .join(", ") || "Meal"}
                  </span>
                  <span className="text-black/60 dark:text-white/60">
                    {log.calories} kcal
                  </span>
                </div>
                <p className="text-black/50 dark:text-white/50">
                  P {log.protein_g}g · C {log.carbs_g}g · F {log.fat_g}g
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  target,
  unit,
}: {
  label: string;
  value: number;
  target: number;
  unit?: string;
}) {
  const pct = target > 0 ? Math.min(Math.round((value / target) * 100), 999) : 0;
  return (
    <div className="rounded border border-black/10 p-3 dark:border-white/10">
      <p className="text-xs text-black/60 dark:text-white/60">{label}</p>
      <p className="text-lg font-semibold">
        {Math.round(value)}
        {unit}
        <span className="text-sm font-normal text-black/50 dark:text-white/50">
          {" "}
          / {Math.round(target)}
          {unit}
        </span>
      </p>
      <p className="text-xs text-black/40 dark:text-white/40">{pct}%</p>
    </div>
  );
}
