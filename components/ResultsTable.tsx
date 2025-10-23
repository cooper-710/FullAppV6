"use client";
import { useMemo, useState } from "react";

type Row = Record<string, string | number | null>;

export default function ResultsTable({ rows }: { rows: Row[] }) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const cols = useMemo(() => {
    const keys = new Set<string>();
    for (const r of rows) Object.keys(r || {}).forEach(k => keys.add(k));
    // put "pitch_family" / "pitch_type" first if present, then numeric-ish
    const ordered = Array.from(keys);
    ordered.sort((a, b) => {
      const pr = (k: string) => (k === "pitch_family" || k === "pitch_type" ? -2 : isNaN(Number(rows[0]?.[k])) ? 1 : 0);
      const da = pr(a), db = pr(b);
      if (da !== db) return da - db;
      return a.localeCompare(b);
    });
    return ordered;
  }, [rows]);

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      const va = a?.[sortKey as keyof Row];
      const vb = b?.[sortKey as keyof Row];
      const na = typeof va === "number" ? va : Number(va);
      const nb = typeof vb === "number" ? vb : Number(vb);
      if (!Number.isNaN(na) && !Number.isNaN(nb)) {
        return sortDir === "asc" ? na - nb : nb - na;
      }
      const sa = String(va ?? "");
      const sb = String(vb ?? "");
      return sortDir === "asc" ? sa.localeCompare(sb) : sb.localeCompare(sa);
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  function clickHeader(k: string) {
    if (sortKey !== k) {
      setSortKey(k);
      setSortDir("desc");
    } else {
      setSortDir(d => (d === "desc" ? "asc" : "desc"));
    }
  }

  if (!rows?.length) {
    return <div className="text-sm text-zinc-400">No rows.</div>;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-zinc-800">
      <table className="min-w-full text-sm">
        <thead className="bg-zinc-900 sticky top-0">
          <tr>
            {cols.map(k => (
              <th
                key={k}
                onClick={() => clickHeader(k)}
                className="px-3 py-2 text-left font-medium text-zinc-300 cursor-pointer select-none"
                title="Click to sort"
              >
                {k}
                {sortKey === k ? (sortDir === "desc" ? " ↓" : " ↑") : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => (
            <tr key={i} className={i % 2 ? "bg-zinc-950/40" : ""}>
              {cols.map(k => (
                <td key={k} className="px-3 py-2 tabular-nums text-zinc-200">
                  {r?.[k] as any}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
