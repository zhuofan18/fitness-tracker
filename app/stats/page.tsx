import { redirect } from "next/navigation";
import BarChart from "@/components/BarChart";
import { average, bucketByMonth, bucketByWeek } from "@/lib/stats";
import { createClient } from "@/lib/supabase/server";

export default async function StatsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const since90 = new Date();
  since90.setDate(since90.getDate() - 90);
  const since180 = new Date();
  since180.setDate(since180.getDate() - 180);

  const [
    { data: weightLogs },
    { data: foodLogs },
    { data: workoutLogs },
    { data: workoutSets },
    { data: waterLogs },
  ] = await Promise.all([
    supabase
      .from("body_weight_logs")
      .select("weight_kg, logged_at")
      .eq("user_id", user.id)
      .order("logged_at", { ascending: true })
      .limit(500),
    supabase
      .from("food_logs")
      .select("calories, protein_g, carbs_g, fat_g, logged_at")
      .eq("user_id", user.id)
      .gte("logged_at", since90.toISOString())
      .order("logged_at", { ascending: true })
      .limit(2000),
    supabase
      .from("workout_logs")
      .select("id, performed_at, day_label, cycle_week")
      .eq("user_id", user.id)
      .gte("performed_at", since180.toISOString())
      .order("performed_at", { ascending: false })
      .limit(500),
    supabase
      .from("workout_sets")
      .select("workout_log_id, exercise_name, reps, weight_kg, is_pr")
      .eq("user_id", user.id)
      .limit(5000),
    supabase
      .from("water_logs")
      .select("amount_ml, logged_at")
      .eq("user_id", user.id)
      .gte("logged_at", since90.toISOString())
      .order("logged_at", { ascending: true })
      .limit(2000),
  ]);

  // --- Weight ---
  const weightWeeks = bucketByWeek(weightLogs ?? [], (w) => w.logged_at).map(
    (bucket) => ({
      label: bucket.weekStart.toLocaleDateString(undefined, {
        month: "numeric",
        day: "numeric",
      }),
      value: average(bucket.entries.map((e) => e.weight_kg)),
    }),
  );
  const firstWeight = weightLogs?.[0];
  const latestWeight = weightLogs?.[weightLogs.length - 1];
  const weightChange =
    firstWeight && latestWeight
      ? Math.round((latestWeight.weight_kg - firstWeight.weight_kg) * 10) / 10
      : null;
  const weightMonths = bucketByMonth(weightLogs ?? [], (w) => w.logged_at);

  // --- Nutrition ---
  const dailyTotals = new Map<
    string,
    { calories: number; protein_g: number; carbs_g: number; fat_g: number }
  >();
  for (const log of foodLogs ?? []) {
    const day = new Date(log.logged_at).toDateString();
    const totals = dailyTotals.get(day) ?? {
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
    };
    totals.calories += log.calories;
    totals.protein_g += log.protein_g;
    totals.carbs_g += log.carbs_g;
    totals.fat_g += log.fat_g;
    dailyTotals.set(day, totals);
  }
  const dailyEntries = Array.from(dailyTotals.entries()).map(
    ([day, totals]) => ({ logged_at: day, ...totals }),
  );
  const calorieWeeks = bucketByWeek(dailyEntries, (d) => d.logged_at).map(
    (bucket) => ({
      label: bucket.weekStart.toLocaleDateString(undefined, {
        month: "numeric",
        day: "numeric",
      }),
      value: average(bucket.entries.map((e) => e.calories)),
    }),
  );

  // --- Water ---
  const dailyWater = new Map<string, number>();
  for (const log of waterLogs ?? []) {
    const day = new Date(log.logged_at).toDateString();
    dailyWater.set(day, (dailyWater.get(day) ?? 0) + log.amount_ml);
  }
  const dailyWaterEntries = Array.from(dailyWater.entries()).map(
    ([day, amount_ml]) => ({ logged_at: day, amount_ml }),
  );
  const waterWeeks = bucketByWeek(dailyWaterEntries, (d) => d.logged_at).map(
    (bucket) => ({
      label: bucket.weekStart.toLocaleDateString(undefined, {
        month: "numeric",
        day: "numeric",
      }),
      value: average(bucket.entries.map((e) => e.amount_ml / 1000)),
    }),
  );

  // --- Workouts ---
  const setsByLog = new Map<string, typeof workoutSets>();
  for (const set of workoutSets ?? []) {
    const list = setsByLog.get(set.workout_log_id) ?? [];
    list.push(set);
    setsByLog.set(set.workout_log_id, list);
  }
  const workoutsWithSets = (workoutLogs ?? []).map((log) => {
    const sets = setsByLog.get(log.id) ?? [];
    const volume = sets.reduce((sum, s) => sum + s.reps * s.weight_kg, 0);
    const prCount = sets.filter((s) => s.is_pr).length;
    return { ...log, sets, volume, prCount };
  });
  const workoutWeeks = bucketByWeek(workoutsWithSets, (w) => w.performed_at).map(
    (bucket) => ({
      label: bucket.weekStart.toLocaleDateString(undefined, {
        month: "numeric",
        day: "numeric",
      }),
      value: bucket.entries.length,
    }),
  );
  const totalPRs = workoutsWithSets.reduce((sum, w) => sum + w.prCount, 0);
  const workoutMonths = bucketByMonth(workoutsWithSets, (w) => w.performed_at);

  return (
    <div className="flex flex-col gap-10">
      <h1 className="text-2xl font-semibold">Stats</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Body weight</h2>
        {weightLogs && weightLogs.length > 0 ? (
          <>
            <p className="text-sm text-black/60 dark:text-white/60">
              {weightChange !== null && (
                <>
                  {weightChange > 0 ? "+" : ""}
                  {weightChange}kg since your first log ·{" "}
                </>
              )}
              latest {latestWeight?.weight_kg}kg
            </p>
            {weightWeeks.length > 1 && (
              <BarChart
                bars={weightWeeks}
                formatValue={(v) => v.toFixed(1)}
              />
            )}
            <details className="text-sm">
              <summary className="cursor-pointer text-black/60 dark:text-white/60">
                By month
              </summary>
              <ul className="mt-2 flex flex-col gap-1">
                {weightMonths.map((month) => {
                  const first = month.entries[0];
                  const last = month.entries[month.entries.length - 1];
                  return (
                    <li key={month.label} className="flex justify-between">
                      <span>{month.label}</span>
                      <span className="text-black/60 dark:text-white/60">
                        {first.weight_kg}kg -&gt; {last.weight_kg}kg (
                        {month.entries.length} log
                        {month.entries.length === 1 ? "" : "s"})
                      </span>
                    </li>
                  );
                })}
              </ul>
            </details>
          </>
        ) : (
          <p className="text-sm text-black/60 dark:text-white/60">
            No body weight logs yet.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Nutrition (last 90 days)</h2>
        {calorieWeeks.length > 0 ? (
          <>
            <p className="text-sm text-black/60 dark:text-white/60">
              Weekly average calories
            </p>
            <BarChart bars={calorieWeeks} />
          </>
        ) : (
          <p className="text-sm text-black/60 dark:text-white/60">
            No food logs in the last 90 days.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Water (last 90 days)</h2>
        {waterWeeks.length > 0 ? (
          <>
            <p className="text-sm text-black/60 dark:text-white/60">
              Weekly average liters/day
            </p>
            <BarChart bars={waterWeeks} formatValue={(v) => v.toFixed(2)} />
          </>
        ) : (
          <p className="text-sm text-black/60 dark:text-white/60">
            No water logged in the last 90 days.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Workouts (last 180 days)</h2>
        {workoutsWithSets.length > 0 ? (
          <>
            <p className="text-sm text-black/60 dark:text-white/60">
              {workoutsWithSets.length} workout
              {workoutsWithSets.length === 1 ? "" : "s"} logged · {totalPRs}{" "}
              PR{totalPRs === 1 ? "" : "s"}
            </p>
            <p className="text-sm text-black/60 dark:text-white/60">
              Workouts per week
            </p>
            <BarChart bars={workoutWeeks} />
            <details className="text-sm">
              <summary className="cursor-pointer text-black/60 dark:text-white/60">
                By month
              </summary>
              <ul className="mt-2 flex flex-col gap-3">
                {workoutMonths.map((month) => (
                  <li key={month.label} className="flex flex-col gap-1">
                    <span className="font-medium">{month.label}</span>
                    <ul className="flex flex-col gap-1 pl-3">
                      {month.entries.map((w) => (
                        <li
                          key={w.id}
                          className="flex justify-between text-black/70 dark:text-white/70"
                        >
                          <span>
                            {new Date(w.performed_at).toLocaleDateString(
                              undefined,
                              { month: "short", day: "numeric" },
                            )}{" "}
                            - {w.day_label ?? "Workout"}
                          </span>
                          <span className="text-black/50 dark:text-white/50">
                            {w.sets.length} sets · {Math.round(w.volume)}kg
                            volume
                            {w.prCount > 0 ? ` · ${w.prCount} PR` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </details>
          </>
        ) : (
          <p className="text-sm text-black/60 dark:text-white/60">
            No workouts logged in the last 180 days.
          </p>
        )}
      </section>
    </div>
  );
}
