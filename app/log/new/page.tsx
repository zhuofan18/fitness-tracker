"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { FoodItem } from "@/lib/supabase/types";

interface AnalysisResult {
  items: FoodItem[];
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  confidence: "low" | "medium" | "high";
}

export default function NewLogPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setResult(null);
    setError(null);
  }

  async function handleAnalyze() {
    if (!file) return;
    setAnalyzing(true);
    setError(null);

    const formData = new FormData();
    formData.append("photo", file);

    const res = await fetch("/api/analyze-food", {
      method: "POST",
      body: formData,
    });

    setAnalyzing(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to analyze photo");
      return;
    }

    setResult(await res.json());
  }

  function updateItem(index: number, field: keyof FoodItem, value: number | string) {
    if (!result) return;
    const items = [...result.items];
    items[index] = { ...items[index], [field]: value };
    setResult(recomputeTotals({ ...result, items }));
  }

  function recomputeTotals(r: AnalysisResult): AnalysisResult {
    const totals = r.items.reduce(
      (acc, item) => ({
        calories: acc.calories + Number(item.calories),
        protein_g: acc.protein_g + Number(item.protein_g),
        carbs_g: acc.carbs_g + Number(item.carbs_g),
        fat_g: acc.fat_g + Number(item.fat_g),
      }),
      { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
    );
    return {
      ...r,
      total_calories: totals.calories,
      total_protein_g: totals.protein_g,
      total_carbs_g: totals.carbs_g,
      total_fat_g: totals.fat_g,
    };
  }

  async function handleSave() {
    if (!result || !file) return;
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

    const photoPath = `${user.id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("food-photos")
      .upload(photoPath, file);

    if (uploadError) {
      setError(uploadError.message);
      setSaving(false);
      return;
    }

    const { error: insertError } = await supabase.from("food_logs").insert({
      user_id: user.id,
      photo_path: photoPath,
      items: result.items,
      calories: result.total_calories,
      protein_g: result.total_protein_g,
      carbs_g: result.total_carbs_g,
      fat_g: result.total_fat_g,
    });

    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Log food</h1>

      <label className="flex w-fit cursor-pointer flex-col items-center gap-2 rounded border border-dashed border-black/30 px-6 py-8 text-sm dark:border-white/30">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="Selected food"
            className="max-h-64 rounded object-contain"
          />
        ) : (
          <span>Tap to take or choose a photo</span>
        )}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />
      </label>

      {file && !result && (
        <button
          onClick={handleAnalyze}
          disabled={analyzing}
          className="w-fit rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {analyzing ? "Analyzing..." : "Analyze photo"}
        </button>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {result && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-black/60 dark:text-white/60">
            Confidence: {result.confidence}. Review and edit before saving.
          </p>

          <div className="flex flex-col gap-3">
            {result.items.map((item, i) => (
              <div
                key={i}
                className="grid grid-cols-2 gap-2 rounded border border-black/10 p-3 text-sm sm:grid-cols-6 dark:border-white/10"
              >
                <input
                  className="col-span-2 rounded border border-black/20 px-2 py-1 sm:col-span-2 dark:border-white/20"
                  value={item.name}
                  onChange={(e) => updateItem(i, "name", e.target.value)}
                />
                <NumberField
                  label="grams"
                  value={item.estimated_grams}
                  onChange={(v) => updateItem(i, "estimated_grams", v)}
                />
                <NumberField
                  label="kcal"
                  value={item.calories}
                  onChange={(v) => updateItem(i, "calories", v)}
                />
                <NumberField
                  label="protein g"
                  value={item.protein_g}
                  onChange={(v) => updateItem(i, "protein_g", v)}
                />
                <NumberField
                  label="carbs g"
                  value={item.carbs_g}
                  onChange={(v) => updateItem(i, "carbs_g", v)}
                />
              </div>
            ))}
          </div>

          <div className="rounded border border-black/10 p-3 text-sm font-medium dark:border-white/10">
            Total: {Math.round(result.total_calories)} kcal · P{" "}
            {Math.round(result.total_protein_g)}g · C{" "}
            {Math.round(result.total_carbs_g)}g · F{" "}
            {Math.round(result.total_fat_g)}g
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-fit rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {saving ? "Saving..." : "Save to today's log"}
          </button>
        </div>
      )}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-0.5 text-xs text-black/60 dark:text-white/60">
      {label}
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded border border-black/20 px-2 py-1 text-black dark:border-white/20 dark:text-white"
      />
    </label>
  );
}
