export function normalizeDeepDiveRowsWithAudit(rows: Row[], label = 'DeepDive'): Row[] {
  const out = normalizeDeepDiveRows(rows);
  const counts = new Map<string, { nulls: number; total: number }>();
  for (const r of out) {
    for (const [k, v] of Object.entries(r)) {
      const c = counts.get(k) || { nulls: 0, total: 0 };
      c.total += 1;
      if (v === null || v === undefined || v === '') c.nulls += 1;
      counts.set(k, c);
    }
  }
  const heavy = Array.from(counts.entries())
    .filter(([_, c]) => c.total >= 5 && c.nulls / c.total >= 0.5)
    .map(([k, c]) => `${k}:${c.nulls}/${c.total}`);
  if (heavy.length) console.warn(`[${label}] high-null columns -> ${heavy.join(', ')}`);
  return out;
}
