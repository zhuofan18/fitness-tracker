"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MuscleGroup } from "@/lib/supabase/types";

interface Analysis {
  suggested_emphasis_muscle_groups: MuscleGroup[];
  suggestion_reasoning: string;
  physique_goal_note: string;
}

export default function ProgressPhotoUpload() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [weightKg, setWeightKg] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [applyingSuggestion, setApplyingSuggestion] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [suggestionApplied, setSuggestionApplied] = useState(false);

  function handleFileChange(f: File | null) {
    setFile(f);
    setAnalysis(null);
    setSuggestionApplied(false);
  }

  async function handleAnalyze() {
    if (!file) return;
    setAnalyzing(true);
    setError(null);

    const formData = new FormData();
    formData.append("photo", file);

    const res = await fetch("/api/analyze-progress-photo", {
      method: "POST",
      body: formData,
    });

    setAnalyzing(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to analyze photo");
      return;
    }

    setAnalysis(await res.json());
  }

  async function handleApplySuggestion() {
    if (!analysis) return;
    setApplyingSuggestion(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Not logged in");
      setApplyingSuggestion(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("weak_points")
      .eq("user_id", user.id)
      .maybeSingle();

    const merged = Array.from(
      new Set([
        ...(profile?.weak_points ?? []),
        ...analysis.suggested_emphasis_muscle_groups,
      ]),
    );

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ weak_points: merged })
      .eq("user_id", user.id);

    setApplyingSuggestion(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuggestionApplied(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
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
      .from("progress-photos")
      .upload(photoPath, file);

    if (uploadError) {
      setError(uploadError.message);
      setSaving(false);
      return;
    }

    const { error: insertError } = await supabase
      .from("progress_photos")
      .insert({
        user_id: user.id,
        photo_path: photoPath,
        weight_kg: weightKg ? Number(weightKg) : null,
        notes: notes || null,
      });

    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setFile(null);
    setWeightKg("");
    setNotes("");
    setAnalysis(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4 rounded border border-black/10 p-4 dark:border-white/10">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex w-fit cursor-pointer flex-col items-center gap-2 rounded border border-dashed border-black/30 px-6 py-6 text-sm dark:border-white/30">
          {file ? file.name : "Tap to take or choose a progress photo"}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Weight (kg, optional)
            <input
              type="number"
              step="0.1"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Notes (optional)
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="rounded border border-black/20 px-3 py-2 dark:border-white/20"
            />
          </label>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={!file || saving}
            className="w-fit rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {saving ? "Uploading..." : "Add to timeline"}
          </button>
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={!file || analyzing}
            className="w-fit rounded border border-black/20 px-4 py-2 text-sm disabled:opacity-50 dark:border-white/20"
          >
            {analyzing ? "Analyzing..." : "Get training suggestions"}
          </button>
        </div>
      </form>

      {analysis && (
        <div className="flex flex-col gap-2 rounded border border-black/10 bg-black/[0.02] p-3 text-sm dark:border-white/10 dark:bg-white/[0.03]">
          <p className="text-xs uppercase tracking-wide text-black/40 dark:text-white/40">
            Visual suggestion, not a medical assessment - entirely optional
          </p>
          <p>
            <span className="font-medium">Could use more emphasis:</span>{" "}
            {analysis.suggested_emphasis_muscle_groups.join(", ") || "none"}
          </p>
          <p className="text-black/70 dark:text-white/70">
            {analysis.suggestion_reasoning}
          </p>
          <p className="text-black/70 dark:text-white/70">
            {analysis.physique_goal_note}
          </p>
          {suggestionApplied ? (
            <p className="text-green-600">
              Added to your weak points. Regenerate your training program from
              the Plan page to apply it.
            </p>
          ) : (
            <button
              type="button"
              onClick={handleApplySuggestion}
              disabled={applyingSuggestion}
              className="w-fit rounded border border-black/20 px-3 py-1.5 text-xs disabled:opacity-50 dark:border-white/20"
            >
              {applyingSuggestion ? "Adding..." : "Add these to my weak points"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
