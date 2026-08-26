"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegenerateButton({
  endpoint,
  label,
}: {
  endpoint: string;
  label: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    const res = await fetch(endpoint, { method: "POST" });
    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to regenerate");
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleClick}
        disabled={loading}
        className="w-fit rounded border border-black/20 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-white/20"
      >
        {loading ? "Generating..." : label}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
