"use client";
import { useEffect, useMemo, useState } from "react";
import ResultsTable from "@/components/ResultsTable";

const API = "http://127.0.0.1:5055";

async function j<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return r.json();
}

async function searchPitchers(q: string) {
  const data = await j<{ items: { id: number; name: string }[] }>(`${API}/pitchers/search?q=${encodeURIComponent(q)}`);
  return data.items || [];
}

async function pitcherSeason(pid: number, season: number, includePost: boolean) {
  const url = new URL(`${API}/pitchers/${pid}/season`);
  url.searchParams.set("season", String(season));
  url.searchParams.set("include_postseason", String(includePost));
  const data = await j<{ data: any[] }>(url.toString());
  return data.data || [];
}

// reuse hitter-style "splits" UI by calling hitters splits shape if you later add /pitchers/{pid}/splits
export default function PitchersDeepDive() {
  const [q, setQ] = useState("Gerrit Cole");
  const [season, setSeason] = useState<number>(2025);
  const [includePost, setIncludePost] = useState(false);

  const [searching, setSearching] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [picked, setPicked] = useState<{ id: number; name: string } | null>(null);
  const [seasonRow, setSeasonRow] = useState<any | null>(null);

  async function run() {
    setErr(null);
    setSearching(true);
    try {
      const items = await searchPitchers(q.trim());
      if (!items.length) {
        setPicked(null);
        setSeasonRow(null);
        setErr("No pitcher match");
        return;
      }
      const sel = items[0];
      setPicked(sel);

      const sRows = await pitcherSeason(sel.id, season, includePost);
      setSeasonRow(sRows[0] || null);
    } catch (e: any) {
      setErr(e?.message || "Failed");
    } finally {
      setSearching(false);
    }
  }

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const metrics = useMemo(() => {
    const r = seasonRow || {};
    return [
      { label: "IP", value: r["IP"] },
      { label: "K%", value: r["K%"] ?? r["K_percent"] },
      { label: "BB%", value: r["BB%"] ?? r["BB_percent"] },
      { label: "ERA", value: r["ERA"] },
      { label: "FIP", value: r["FIP"] },
      { label: "WHIP", value: r["WHIP"] },
    ];
  }, [seasonRow]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-zinc-800 p-4">
          <div className="text-xs tracking-wide text-zinc-400 mb-1">FILTERS</div>
          <div className="text-sm text-zinc-300 mb-4">Season, usage, outcomes…</div>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Search pitcher"
                className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2 outline-none"
              />
              <input
                value={season}
                onChange={e => setSeason(Number(e.target.value || 0))}
                className="w-24 rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2 outline-none tabular-nums"
              />
              <button
                onClick={run}
                disabled={searching}
                className="rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 px-4 py-2 font-medium"
              >
                {searching ? "Searching…" : "Search"}
              </button>
            </div>
            <label className="text-sm text-zinc-300 flex items-center gap-2">
              <input
                type="checkbox"
                checked={includePost}
                onChange={e => {}}
                className="accent-orange-600"
              />
              <span onClick={() => {}} className="cursor-default">
                Include Postseason
              </span>
            </label>
            {!!err && <div className="text-xs text-red-400">Error: {err}</div>}
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-800 p-4">
          <div className="text-xs tracking-wide text-zinc-400 mb-1">TABLE/CHART</div>
          <div className="text-sm text-zinc-300">Add pitch-mix, outcomes, locations…</div>
        </div>
      </div>

      {picked && (
        <div className="rounded-2xl border border-zinc-800 p-4">
          <div className="text-xs tracking-wide text-zinc-400 mb-3">PITCHER</div>
          <div className="text-lg font-semibold text-zinc-100">
            {picked.name} <span className="text-zinc-500 font-normal">({season})</span>
          </div>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {metrics.map(m => (
              <div key={m.label} className="rounded-xl border border-zinc-800 p-3">
                <div className="text-xs text-zinc-400">{m.label}</div>
                <div className="text-xl font-semibold tabular-nums">{m.value ?? "—"}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-zinc-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs tracking-wide text-zinc-400">SPLITS</div>
          <div className="text-xs text-zinc-500">coming soon</div>
        </div>
        <ResultsTable rows={[]} />
      </div>
    </div>
  );
}
