export default function MacroBar({
  calories,
  protein_g,
  carbs_g,
  fat_g,
}: {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}) {
  const proteinCal = protein_g * 4;
  const carbsCal = carbs_g * 4;
  const fatCal = fat_g * 9;
  const total = Math.max(proteinCal + carbsCal + fatCal, 1);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="text-2xl font-semibold tabular-nums">
          {Math.round(calories)}
          <span className="ml-1 text-sm font-normal text-black/50 dark:text-white/50">
            kcal
          </span>
        </span>
      </div>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
        <div
          className="bg-rose-500"
          style={{ width: `${(proteinCal / total) * 100}%` }}
        />
        <div
          className="bg-amber-500"
          style={{ width: `${(carbsCal / total) * 100}%` }}
        />
        <div
          className="bg-sky-500"
          style={{ width: `${(fatCal / total) * 100}%` }}
        />
      </div>
      <div className="flex gap-4 text-xs">
        <MacroChip color="bg-rose-500" label="Protein" value={protein_g} />
        <MacroChip color="bg-amber-500" label="Carbs" value={carbs_g} />
        <MacroChip color="bg-sky-500" label="Fat" value={fat_g} />
      </div>
    </div>
  );
}

function MacroChip({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number;
}) {
  return (
    <span className="flex items-center gap-1.5 text-black/70 dark:text-white/70">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {label} <span className="font-medium tabular-nums">{Math.round(value)}g</span>
    </span>
  );
}
