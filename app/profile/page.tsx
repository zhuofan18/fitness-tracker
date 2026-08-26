import { redirect } from "next/navigation";
import ProfileForm from "@/components/ProfileForm";
import WeightLogForm from "@/components/WeightLogForm";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) redirect("/onboarding");

  const { data: weightHistory } = await supabase
    .from("body_weight_logs")
    .select("*")
    .eq("user_id", user.id)
    .order("logged_at", { ascending: false })
    .limit(10);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Updating your stats doesn&apos;t auto-regenerate your plan or
          program - do that from the Plan page when you&apos;re ready.
        </p>
      </div>

      <ProfileForm profile={profile} />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Body weight</h2>
        <WeightLogForm />
        {weightHistory && weightHistory.length > 0 && (
          <ul className="flex flex-col gap-1 text-sm">
            {weightHistory.map((entry) => (
              <li key={entry.id} className="flex justify-between">
                <span>{entry.weight_kg} kg</span>
                <span className="text-black/50 dark:text-white/50">
                  {new Date(entry.logged_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
