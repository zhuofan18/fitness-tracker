import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function HistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: logs } = await supabase
    .from("food_logs")
    .select("*")
    .eq("user_id", user.id)
    .order("logged_at", { ascending: false })
    .limit(200);

  const groups = new Map<string, typeof logs>();
  for (const log of logs ?? []) {
    const day = new Date(log.logged_at).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    if (!groups.has(day)) groups.set(day, []);
    groups.get(day)!.push(log);
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">History</h1>

      {groups.size === 0 && (
        <p className="text-sm text-black/60 dark:text-white/60">
          No food logs yet.
        </p>
      )}

      {Array.from(groups.entries()).map(([day, dayLogs]) => {
        const totals = dayLogs!.reduce(
          (acc, log) => ({
            calories: acc.calories + log.calories,
            protein_g: acc.protein_g + log.protein_g,
            carbs_g: acc.carbs_g + log.carbs_g,
            fat_g: acc.fat_g + log.fat_g,
          }),
          { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
        );

        return (
          <div key={day} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <h2 className="font-semibold">{day}</h2>
              <span className="text-xs text-black/60 dark:text-white/60">
                {Math.round(totals.calories)} kcal · P{" "}
                {Math.round(totals.protein_g)}g · C{" "}
                {Math.round(totals.carbs_g)}g · F {Math.round(totals.fat_g)}g
              </span>
            </div>
            <ul className="flex flex-col gap-2">
              {dayLogs!.map((log) => (
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
                    P {log.protein_g}g · C {log.carbs_g}g · F {log.fat_g}g ·{" "}
                    {new Date(log.logged_at).toLocaleTimeString(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
