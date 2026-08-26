"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface ProductAnalysis {
  name: string;
  serving_description: string;
  calories_per_serving: number;
  protein_g_per_serving: number;
  carbs_g_per_serving: number;
  fat_g_per_serving: number;
}

export default function SavedFoodUpload() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProductAnalysis | null>(null);

  async function handleAnalyze() {
    if (!file) return;
    setAnalyzing(true);
    setError(null);

    const formData = new FormData();
    formData.append("photo", file);

    const res = await fetch("/api/analyze-product", {
      method: "POST",
      body: formData,
    });

    setAnalyzing(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to analyze product");
      return;
    }

    setResult(await res.json());
  }

  function updateField<K extends keyof ProductAnalysis>(
    field: K,
    value: ProductAnalysis[K],
  ) {
    if (!result) return;
    setResult({ ...result, [field]: value });
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
      photoPath = `${user.id}/products/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("food-photos")
        .upload(photoPath, file);
      if (uploadError) {
        setError(uploadError.message);
        setSaving(false);
        return;
      }
    }

    const { error: insertError } = await supabase.from("saved_foods").insert({
      user_id: user.id,
      name: result.name,
      photo_path: photoPath,
      serving_description: result.serving_description,
      calories_per_serving: result.calories_per_serving,
      protein_g_per_serving: result.protein_g_per_serving,
      carbs_g_per_serving: result.carbs_g_per_serving,
      fat_g_per_serving: result.fat_g_per_serving,
    });

    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setFile(null);
    setResult(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 rounded border border-black/10 p-4 dark:border-white/10">
      <label className="flex w-fit cursor-pointer flex-col items-center gap-2 rounded border border-dashed border-black/30 px-6 py-6 text-sm dark:border-white/30">
        {file ? file.name : "Photograph a product's nutrition label"}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setResult(null);
          }}
        />
      </label>

      {file && !result && (
        <button
          type="button"
          onClick={handleAnalyze}
          disabled={analyzing}
          className="w-fit rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {analyzing ? "Reading label..." : "Analyze label"}
        </button>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {result && (
        <div className="flex flex-col gap-2 text-sm">
          <label className="flex flex-col gap-1">
            Name
            <input
              value={result.name}
              onChange={(e) => updateField("name", e.target.value)}
              className="rounded border border-black/20 px-2 py-1 dark:border-white/20"
            />
          </label>
          <label className="flex flex-col gap-1">
            Serving
            <input
              value={result.serving_description}
              onChange={(e) =>
                updateField("serving_description", e.target.value)
              }
              className="rounded border border-black/20 px-2 py-1 dark:border-white/20"
            />
          </label>
          <div className="grid grid-cols-4 gap-2">
            <label className="flex flex-col gap-1">
              kcal
              <input
                type="number"
                value={result.calories_per_serving}
                onChange={(e) =>
                  updateField("calories_per_serving", Number(e.target.value))
                }
                className="rounded border border-black/20 px-2 py-1 dark:border-white/20"
              />
            </label>
            <label className="flex flex-col gap-1">
              protein g
              <input
                type="number"
                value={result.protein_g_per_serving}
                onChange={(e) =>
                  updateField("protein_g_per_serving", Number(e.target.value))
                }
                className="rounded border border-black/20 px-2 py-1 dark:border-white/20"
              />
            </label>
            <label className="flex flex-col gap-1">
              carbs g
              <input
                type="number"
                value={result.carbs_g_per_serving}
                onChange={(e) =>
                  updateField("carbs_g_per_serving", Number(e.target.value))
                }
                className="rounded border border-black/20 px-2 py-1 dark:border-white/20"
              />
            </label>
            <label className="flex flex-col gap-1">
              fat g
              <input
                type="number"
                value={result.fat_g_per_serving}
                onChange={(e) =>
                  updateField("fat_g_per_serving", Number(e.target.value))
                }
                className="rounded border border-black/20 px-2 py-1 dark:border-white/20"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-fit rounded bg-black px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {saving ? "Saving..." : "Save to my products"}
          </button>
        </div>
      )}
    </div>
  );
}
