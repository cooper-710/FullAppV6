"use client";

import { useState } from "react";

type Mode = "hitter" | "pitcher";

const API_BASE =
  process.env.NEXT_PUBLIC_BIOLAB_API_BASE?.trim() || "http://127.0.0.1:5055";

export default function DeepDivePanel({ mode = "hitter" }: { mode?: Mode }) {
  const [q, setQ] = useState<string>(mode === "pitcher" ? "Tyler Glasnow" : "Pete Alonso");
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [debug, setDebug] = useState<any | null>(null);
  const [firstRow, setFirstRow] = useState<any | null>(null);

  async function onSearch() {
    setErr(null);
    setFirstRow(null);
    setLoading(true);
    try {
      const searchPath = mode === "pitcher" ? "pitchers/search" : "players/search";
      const u1 = `${API_BASE}/${searchPath}?q=${encodeURIComponent(q)}`;
      const r1 = await fetch(u1);
      if (!r1.ok) throw new Error(`${searchPath} ${r1.status}`);
      const j1 = await r1.json();
      const items = Array.isArray(j1?.items) ? j1.items : [];
      setDebug({ step: searchPath, itemsCount: items.length, items });
      if (!items.length) return;

      const id = items[0].id;
      const seasonPath =
        mode === "pitcher"
          ? `pitchers/${id}/season?season=${encodeURIComponent(year)}`
          : `hitters/${id}/season?season=${encodeURIComponent(year)}`;
      const u2 = `${API_BASE}/${seasonPath}`;
      const r2 = await fetch(u2);
      if (!r2.ok) throw new Error(`${seasonPath} ${r2.status}`);
      const j2 = await r2.json();
      const data = (j2?.data ?? j2) as any;
      const row = Array.isArray(data) ? data[0] : data;
      setFirstRow(row || null);
    } catch (e: any) {
      setErr(e?.message || "request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-8 grid gap-6">
      <div className="flex items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={mode === "pitcher" ? "Pitcher name or MLBAM id" : "Hitter name or MLBAM id"}
          className="w-[360px] rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
        />
        <input
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="w-[90px] rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
        />
        <button
          onClick={onSearch}
          disabled={loading}
          className="rounded-2xl bg-orange-500 px-4 py-2 font-semibold text-black disabled:opacity-60"
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </div>

      {err && <div className="text-red-400 text-sm">Error: {err}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <div className="mb-2 text-sm text-zinc-400">Debug response</div>
          <pre className="text-xs text-zinc-200 overflow-auto">{JSON.stringify(debug ?? {}, null, 2)}</pre>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <div className="mb-2 text-sm text-zinc-400">First row</div>
          <pre className="text-xs text-zinc-200 overflow-auto">{JSON.stringify(firstRow ?? "No data yet", null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}
