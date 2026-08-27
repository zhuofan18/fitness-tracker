"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ConfidenceBadge from "@/components/ConfidenceBadge";
import MacroBar from "@/components/MacroBar";
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
  const [mode, setMode] = useState<"photo" | "describe">("photo");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [lookup, setLookup] = useState(false);
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

  function switchMode(next: "photo" | "describe") {
    setMode(next);
    setResult(null);
    setError(null);
  }

  async function handleAnalyze() {
    if (mode === "photo" && !file) return;
    if (mode === "describe" && !description.trim()) return;
    setAnalyzing(true);
    setError(null);

    const formData = new FormData();
    if (mode === "photo" && file) {
      formData.append("photo", file);
    } else {
      formData.append("description", description.trim());
      formData.append("lookup", String(lookup));
    }

    const res = await fetch("/api/analyze-food", {
      method: "POST",
      body: formData,
    });

    setAnalyzing(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to analyze food");
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
    if (!result) return;
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

    let photoPath: string | null = null;
    if (file) {
      photoPath = `${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("food-photos")
        .upload(photoPath, file);

      if (uploadError) {
        setError(uploadError.message);
        setSaving(false);
        return;
      }
    }

    const { error: insertError } = await supabase.from("food_logs").insert({
      user_id: user.id,
      photo_path: photoPath,
      items: result.items,
      calories: result.total_calories,
      protein_g: result.total_protein_g,
      carbs_g: result.total_carbs_g,
      fat_g: result.total_fat_g,
      notes: mode === "describe" ? description.trim() : null,
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

      <div className="flex w-fit gap-2 rounded border border-black/10 p-1 text-sm dark:border-white/10">
        <button
          type="button"
          onClick={() => switchMode("photo")}
          className={`rounded px-3 py-1 ${
            mode === "photo"
              ? "bg-black text-white dark:bg-white dark:text-black"
              : "text-black/60 dark:text-white/60"
          }`}
        >
          Photo
        </button>
        <button
          type="button"
          onClick={() => switchMode("describe")}
          className={`rounded px-3 py-1 ${
            mode === "describe"
              ? "bg-black text-white dark:bg-white dark:text-black"
              : "text-black/60 dark:text-white/60"
          }`}
        >
          Describe
        </button>
      </div>

      {mode === "photo" ? (
        <label className="flex w-fit cursor-pointer flex-col items-center gap-2 rounded border border-dashed border-black/30 px-6 py-8 text-sm dark:border-white/30">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Selected food"
              className="max-h-64 rounded object-contain"
            />
          ) : (
            <span>
              Tap to take a photo, or pick one from your gallery - handy if
              you already snapped it earlier and forgot to log it
            </span>
          )}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>
      ) : (
        <label className="flex flex-col gap-1 text-sm">
          Describe what you ate
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. a bowl of chicken fried rice, about the size of a large cereal bowl, with a fried egg on top"
            rows={3}
            className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
          />
          <span className="text-xs text-black/50 dark:text-white/50">
            No photo to check against, so include quantities where you can -
            the more specific, the more accurate the estimate.
          </span>
          <label className="mt-1 flex items-center gap-2 text-xs text-black/60 dark:text-white/60">
            <input
              type="checkbox"
              checked={lookup}
              onChange={(e) => setLookup(e.target.checked)}
            />
            Not sure what this dish is called? Search the web to help
            identify it.
          </label>
        </label>
      )}

      {((mode === "photo" && file) || (mode === "describe" && description.trim())) &&
        !result && (
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="w-fit rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {analyzing ? "Analyzing..." : "Analyze"}
          </button>
        )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {result && (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.03]">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium">Estimated total</span>
              <ConfidenceBadge confidence={result.confidence} />
            </div>
            <MacroBar
              calories={result.total_calories}
              protein_g={result.total_protein_g}
              carbs_g={result.total_carbs_g}
              fat_g={result.total_fat_g}
            />
          </div>

          <p className="text-xs text-black/50 dark:text-white/50">
            Review and edit the items below before saving.
          </p>

          <div className="flex flex-col gap-3">
            {result.items.map((item, i) => (
              <div
                key={i}
                className="rounded-xl border border-black/10 p-3 text-sm dark:border-white/10"
              >
                <input
                  className="mb-2 w-full rounded border border-black/20 px-2 py-1 font-medium dark:border-white/20"
                  value={item.name}
                  onChange={(e) => updateItem(i, "name", e.target.value)}
                />
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
              </div>
            ))}
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
