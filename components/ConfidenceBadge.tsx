const STYLES: Record<string, string> = {
  low: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  medium: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  high: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
};

export default function ConfidenceBadge({
  confidence,
}: {
  confidence: string;
}) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
        STYLES[confidence] ?? "bg-black/10 text-black/60 dark:bg-white/10 dark:text-white/60"
      }`}
    >
      {confidence} confidence
    </span>
  );
}
