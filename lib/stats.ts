function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

export interface WeekBucket<T> {
  weekStart: Date;
  entries: T[];
}

// Buckets oldest -> newest, for charting a trend left-to-right.
export function bucketByWeek<T>(
  entries: T[],
  getDate: (item: T) => string,
): WeekBucket<T>[] {
  const buckets = new Map<number, T[]>();
  for (const entry of entries) {
    const key = startOfWeek(new Date(getDate(entry))).getTime();
    const list = buckets.get(key) ?? [];
    list.push(entry);
    buckets.set(key, list);
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => a - b)
    .map(([weekStart, entries]) => ({ weekStart: new Date(weekStart), entries }));
}

export interface MonthBucket<T> {
  label: string;
  entries: T[];
}

// Buckets newest -> oldest, for a scrollable "backlog" view.
export function bucketByMonth<T>(
  entries: T[],
  getDate: (item: T) => string,
): MonthBucket<T>[] {
  const buckets = new Map<string, T[]>();
  for (const entry of entries) {
    const date = new Date(getDate(entry));
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const list = buckets.get(key) ?? [];
    list.push(entry);
    buckets.set(key, list);
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, entries]) => {
      const [y, m] = key.split("-").map(Number);
      const label = new Date(y, m - 1, 1).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      });
      return { label, entries };
    });
}

export function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}
