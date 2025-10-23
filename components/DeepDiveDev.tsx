"use client";

import { useState } from "react";

type PlayerItem = { id: number; name: string };

const API_BASE = "/api/biolab";

async function searchPlayers(q: string): Promise<{ items: PlayerItem[] }> {
  const r = await fetch(`${API_BASE}/players/search?q=${encodeURIComponent(q)}`);
  if (!r.ok) throw new Error(`players/search ${r.status}`);
  return r.json();
}

async function getHitterSeason(
  bid: number,
  season: number
): Promise<{ data: any[] }> {
  const r = await fetch(`${API_BASE}/hitters/${bid}/season?season=${season}`);
  if (!r.ok) throw new Error(`hitters/${bid}/season ${r.status}`);
  return r.json();
}

export default function DeepDiveDev() {
  const [q, setQ] = useState("Pete Alonso");
  const [season, setSeason] = useState<number>(2025);
  const [err, setErr] = useState<string | null>(null);
  const [debug, setDebug] = useState<any>({});
  const [firstRow, setFirstRow] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSearch() {
    try {
      setLoading(true);
      setErr(null);
      setFirstRow(null);
      const { items } = await searchPlayers(q);
      setDebug({ step: "players/search", itemsCount: items.length, items });
      if (!items.length) return;
      const bid = items[0].id;
      const { data } = await getHitterSeason(bid, season);
      setFirstRow(data?.[0] ?? null);
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input
          className="w-[340px] rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Player name or ID"
        />
        <input
          className="w-[90px] rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
          value={season}
          onChange={(e) => setSeason(Number(e.target.value) || 0)}
          placeholder="Season"
        />
        <button
          onClick={onSearch}
          disabled={loading}
          className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium hover:bg-orange-500 disabled:opacity-50"
        >
          {loading ? "Loading…" : "Search"}
        </button>
      </div>

      {err ? (
        <div className="text-red-400 text-sm">Error: {err}</div>
      ) : null}

      <div className="grid grid-cols-2 gap-4">
        <pre className="rounded-lg border border-neutral-800 bg-neutral-950 p-4 text-xs overflow-auto">
{JSON.stringify(debug, null, 2)}
        </pre>
        <pre className="rounded-lg border border-neutral-800 bg-neutral-950 p-4 text-xs overflow-auto">
{firstRow ? JSON.stringify(firstRow, null, 2) : `"No data yet"`}
        </pre>
      </div>
    </div>
  );
}
