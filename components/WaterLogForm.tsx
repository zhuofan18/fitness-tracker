"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const QUICK_AMOUNTS = [250, 500, 1000];

export default function WaterLogForm() {
  const router = useRouter();
  const [customMl, setCustomMl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function logAmount(amountMl: number) {
    if (amountMl <= 0) return;
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
      .from("water_logs")
      .insert({ user_id: user.id, amount_ml: amountMl });

    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setCustomMl("");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {QUICK_AMOUNTS.map((ml) => (
          <button
            key={ml}
            type="button"
            onClick={() => logAmount(ml)}
            disabled={saving}
            className="rounded border border-black/20 px-3 py-1.5 disabled:opacity-50 dark:border-white/20"
          >
            +{ml}ml
          </button>
        ))}
        <input
          type="number"
          placeholder="Custom ml"
          value={customMl}
          onChange={(e) => setCustomMl(e.target.value)}
          className="w-24 rounded border border-black/20 px-2 py-1 dark:border-white/20"
        />
        <button
          type="button"
          onClick={() => logAmount(Number(customMl))}
          disabled={saving || !customMl}
          className="rounded bg-black px-3 py-1.5 text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          Add
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
