export default function BarChart({
  bars,
  formatValue = (v) => String(Math.round(v)),
}: {
  bars: { label: string; value: number }[];
  formatValue?: (value: number) => string;
}) {
  const max = Math.max(...bars.map((b) => b.value), 1);

  return (
    <div className="flex items-end gap-2 overflow-x-auto pb-1">
      {bars.map((bar, i) => (
        <div key={i} className="flex min-w-10 flex-1 flex-col items-center gap-1">
          <span className="text-[10px] text-black/50 dark:text-white/50">
            {formatValue(bar.value)}
          </span>
          <div
            className="w-full rounded-t bg-black/80 dark:bg-white/80"
            style={{
              height: `${Math.max((bar.value / max) * 100, 2)}px`,
            }}
          />
          <span className="text-[10px] text-black/50 dark:text-white/50">
            {bar.label}
          </span>
        </div>
      ))}
    </div>
  );
}
