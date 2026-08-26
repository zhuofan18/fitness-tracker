import { redirect } from "next/navigation";
import LogWorkoutForm from "@/components/LogWorkoutForm";
import { createClient } from "@/lib/supabase/server";

export default async function LogWorkoutPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: program } = await supabase
    .from("training_programs")
    .select("*")
    .eq("user_id", user.id)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Log a workout</h1>
      <LogWorkoutForm days={program?.weekly_schedule ?? []} />
    </div>
  );
}
