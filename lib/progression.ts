export interface ProgressionSuggestion {
  suggested_weight_kg: number;
  estimated_one_rep_max_kg: number;
  note: string;
}

function roundToNearest(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/**
 * Double-progression suggestion: stay at a weight until reps reach the top
 * of the target range across sets, then bump the load so the muscle keeps
 * being stressed rather than stagnating indefinitely at the same weight.
 */
export function suggestNextWeight(
  recentSets: { reps: number; weight_kg: number }[],
  targetRepLow = 8,
  targetRepHigh = 10,
): ProgressionSuggestion | null {
  if (recentSets.length === 0) return null;

  const best = recentSets.reduce((a, b) =>
    b.weight_kg > a.weight_kg || (b.weight_kg === a.weight_kg && b.reps > a.reps)
      ? b
      : a,
  );

  // Epley formula
  const oneRepMax = best.weight_kg * (1 + best.reps / 30);

  let suggestedWeight = best.weight_kg;
  let note: string;

  if (best.reps > targetRepHigh) {
    suggestedWeight = roundToNearest(best.weight_kg * 1.05, 2.5);
    note = `You hit ${best.reps} reps last time - past your ${targetRepLow}-${targetRepHigh} target range. Add weight to keep the muscle under enough stress to keep adapting.`;
  } else if (best.reps >= targetRepLow) {
    note = `Solid rep range last time (${best.reps}). Repeat ${best.weight_kg}kg and push for more reps before adding load.`;
  } else {
    note = `Reps came in under ${targetRepLow} last time (${best.reps}). Repeat ${best.weight_kg}kg and focus on form until you reach the target range.`;
  }

  return {
    suggested_weight_kg: suggestedWeight,
    estimated_one_rep_max_kg: Math.round(oneRepMax * 10) / 10,
    note,
  };
}
