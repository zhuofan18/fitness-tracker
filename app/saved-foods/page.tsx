import { redirect } from "next/navigation";
import QuickLogSavedFood from "@/components/QuickLogSavedFood";
import SavedFoodUpload from "@/components/SavedFoodUpload";
import { createClient } from "@/lib/supabase/server";

export default async function SavedFoodsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: savedFoods } = await supabase
    .from("saved_foods")
    .select("*")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Saved products</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Photograph a product&apos;s nutrition label once (protein powder,
          bars, packaged snacks) and reuse it with just a serving count
          instead of re-analyzing every time.
        </p>
      </div>

      <SavedFoodUpload />

      {(savedFoods ?? []).length === 0 ? (
        <p className="text-sm text-black/60 dark:text-white/60">
          No saved products yet.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {(savedFoods ?? []).map((food) => (
            <QuickLogSavedFood key={food.id} food={food} />
          ))}
        </div>
      )}
    </div>
  );
}
