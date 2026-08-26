"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function WeightLogForm() {
  const router = useRouter();
  const [weightKg, setWeightKg] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Not logged in");
      setSaving(false);
      return;
    }

    const { error: insertError } = await supabase
      .from("body_weight_logs")
      .insert({ user_id: user.id, weight_kg: Number(weightKg) });

    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setWeightKg("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 text-sm">
      <label className="flex flex-col gap-1">
        New weight (kg)
        <input
          required
          type="number"
          step="0.1"
          value={weightKg}
          onChange={(e) => setWeightKg(e.target.value)}
          className="w-32 rounded border border-black/20 px-2 py-1 dark:border-white/20"
        />
      </label>
      <button
        type="submit"
        disabled={saving}
        className="rounded bg-black px-3 py-1.5 text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {saving ? "Logging..." : "Log weight"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </form>
  );
}
