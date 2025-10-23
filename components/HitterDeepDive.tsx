'use client';

import React, { useEffect, useMemo, useState } from 'react';

const API_BASE = '/api/biolab';

type PlayerLite = { id: number; name: string };
type HitRow = {
  batter: number;
  player_name: string;
  season: number;
  PA?: number; AB?: number; H?: number;
  AVG?: number; OBP?: number; SLG?: number;
  [k: string]: any;
};

async function searchPlayers(q: string): Promise<PlayerLite[]> {
  const r = await fetch(`${API_BASE}/players/search?q=${encodeURIComponent(q)}`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`players/search ${r.status}`);
  const j = await r.json();
  return (j.items ?? []) as PlayerLite[];
}

async function getHitterSeason(bid: number, season: number): Promise<HitRow | null> {
  const r = await fetch(`${API_BASE}/hitters/${bid}/season?season=${season}`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`hitters/${bid}/season ${r.status}`);
  const j = await r.json();
  const data = (j.data ?? []) as HitRow[];
  return data.length ? data[0] : null;
}

export default function HitterDeepDive() {
  const [q, setQ] = useState('Pete Alonso');
  const [season, setSeason] = useState<string>('2025');

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [results, setResults] = useState<PlayerLite[]>([]);
  const [firstRow, setFirstRow] = useState<HitRow | null>(null);

  const selected = useMemo(() => results[0] ?? null, [results]);

  async function handleSearch() {
    setLoading(true);
    setErr(null);
    setResults([]);
    setFirstRow(null);
    try {
      const items = await searchPlayers(q.trim());
      setResults(items);
      const bid = items[0]?.id;
      if (bid) {
        const row = await getHitterSeason(bid, Number(season));
        setFirstRow(row);
      }
    } catch (e: any) {
      setErr(e?.message ?? 'Error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // optional: auto search on mount if empty state
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Player name or MLB ID"
          className="w-full sm:w-96 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-zinc-100 outline-none"
        />
        <input
          value={season}
          onChange={(e) => setSeason(e.target.value)}
          placeholder="Season"
          inputMode="numeric"
          className="w-24 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="rounded-xl bg-orange-500 px-4 py-2 font-medium text-black disabled:opacity-60"
        >
          {loading ? 'Searching…' : 'Search'}
        </button>
        {selected ? (
          <span className="text-sm text-zinc-400">
            Selected: <span className="text-zinc-200">{selected.name}</span> ({selected.id})
          </span>
        ) : null}
      </div>

      {err ? (
        <div className="rounded-xl border border-red-800 bg-red-950/40 p-3 text-red-300">
          Error: {err}
        </div>
      ) : null}

      {firstRow ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <div className="mb-3 text-sm uppercase tracking-wide text-zinc-400">Player</div>
            <div className="text-xl font-semibold text-zinc-100">{firstRow.player_name}</div>
            <div className="text-zinc-400">Season {firstRow.season}</div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <div className="mb-3 text-sm uppercase tracking-wide text-zinc-400">Volume</div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <Stat label="PA" value={firstRow.PA} />
              <Stat label="AB" value={firstRow.AB} />
              <Stat label="H" value={firstRow.H} />
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <div className="mb-3 text-sm uppercase tracking-wide text-zinc-400">Rate</div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <Stat label="AVG" value={firstRow.AVG} fmt="3" />
              <Stat label="OBP" value={firstRow.OBP} fmt="3" />
              <Stat label="SLG" value={firstRow.SLG} fmt="3" />
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 text-zinc-400">
          No data yet
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <div className="mb-2 text-sm uppercase tracking-wide text-zinc-400">Debug response</div>
          <pre className="whitespace-pre-wrap text-xs text-zinc-300">
            {JSON.stringify({ step: 'players/search', itemsCount: results.length, items: results }, null, 2)}
          </pre>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <div className="mb-2 text-sm uppercase tracking-wide text-zinc-400">First row</div>
          <pre className="whitespace-pre-wrap text-xs text-zinc-300">
            {JSON.stringify(firstRow ?? 'No data yet', null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, fmt = '0' }: { label: string; value: any; fmt?: '0' | '3' }) {
  const show =
    value === null || value === undefined || Number.isNaN(value) ? '—' : fmt === '3' ? Number(value).toFixed(3) : String(value);
  return (
    <div>
      <div className="text-2xl font-semibold text-zinc-100">{show}</div>
      <div className="text-xs uppercase tracking-wide text-zinc-400">{label}</div>
    </div>
  );
}
