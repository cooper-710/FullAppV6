"use client";

import React, { useMemo, useState } from "react";

type PlayerItem = { id: number; name: string };
type SeasonRow = {
  batter: number;
  player_name: string;
  season: number;
  PA?: number;
  AB?: number;
  H?: number;
  "1B"?: number;
  "2B"?: number;
  "3B"?: number;
  HR?: number;
  BB?: number;
  IBB?: number;
  HBP?: number;
  SO?: number;
  AVG?: number;
  OBP?: number;
  SLG?: number;
  OPS?: number; // we'll compute if not provided
  [key: string]: any;
};

const API_BASE =
  (typeof window !== "undefined" &&
    (window as any).__BIOLAB_API_BASE__) ||
  process.env.NEXT_PUBLIC_BIOLAB_API_BASE ||
  "http://127.0.0.1:5055";

const ALL_COUNTS = [
  "0-0","0-1","0-2","1-0","1-1","1-2","2-0","2-1","2-2","3-0","3-1","3-2",
];

const range = (a: number, b: number) =>
  Array.from({ length: b - a + 1 }, (_, i) => a + i);

const SEASONS = range(2017, new Date().getFullYear());

async function j<T>(url: string) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return (await r.json()) as T;
}

function Chip({
  label,
  checked,
  onChange,
}: {
  label: string | number;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={[
        "px-3 py-1 rounded-xl text-sm transition",
        checked
          ? "bg-amber-500/90 text-black shadow"
          : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700",
      ].join(" ")}
      aria-pressed={checked}
    >
      {label}
    </button>
  );
}

function Card({ title, value, sub }: { title: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 p-4 bg-zinc-900/40">
      <div className="text-xs uppercase tracking-wider text-zinc-400">{title}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {sub ? <div className="text-xs text-zinc-500 mt-1">{sub}</div> : null}
    </div>
  );
}

export default function DeepDiveHitters() {
  const [q, setQ] = useState("Pete Alonso");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedName, setSelectedName] = useState<string>("");
  const [seasons, setSeasons] = useState<number[]>([new Date().getFullYear()]);
  const [counts, setCounts] = useState<string[]>([]);
  const [includePost, setIncludePost] = useState(true);
  const [minPA, setMinPA] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<SeasonRow[]>([]);
  const [debug, setDebug] = useState<any>({});

  function toggleSeason(y: number) {
    setSeasons((s) =>
      s.includes(y) ? s.filter((x) => x !== y) : [...s, y].sort()
    );
  }
  function toggleCount(c: string) {
    setCounts((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c]));
  }

  async function doSearch() {
    setLoading(true);
    try {
      const ps = await j<{ items: PlayerItem[] }>(
        `${API_BASE}/players/search?q=${encodeURIComponent(q)}`
      );
      setDebug({ step: "players/search", itemsCount: ps.items?.length ?? 0, items: ps.items?.slice(0, 3) ?? [] });
      if (!ps.items?.length) {
        setRows([]);
        setSelectedId(null);
        return;
      }
      const { id, name } = ps.items[0];
      setSelectedId(id);
      setSelectedName(name);
      const wanted = seasons.length ? seasons : [new Date().getFullYear()];
      const out: SeasonRow[] = [];
      for (const y of wanted) {
        const url = new URL(`${API_BASE}/hitters/${id}/season`);
        url.searchParams.set("season", String(y));
        if (includePost) url.searchParams.set("include_postseason", "true");
        if (minPA > 0) url.searchParams.set("min_pa", String(minPA));
        if (counts.length) url.searchParams.set("count", counts.join(","));
        const r = await j<{ data: SeasonRow[] }>(url.toString());
        const first = r?.data?.[0];
        if (first) {
          const OPS =
            typeof first.OBP === "number" && typeof first.SLG === "number"
              ? Number((first.OBP + first.SLG).toFixed(3))
              : undefined;
          out.push({ ...first, OPS });
        }
      }
      setRows(out);
      setDebug((d: any) => ({ ...d, step: "season", seasons: wanted }));
    } catch (e: any) {
      setDebug({ error: String(e?.message || e) });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  const totals = useMemo(() => {
    if (!rows.length) return null;
    const sum = <K extends keyof SeasonRow>(k: K) =>
      rows.reduce((acc, r) => acc + (typeof r[k] === "number" ? (r[k] as number) : 0), 0);
    const PA = sum("PA");
    const AB = sum("AB");
    const H = sum("H");
    const OBP =
      rows.every((r) => typeof r.OBP === "number")
        ? Number((rows.reduce((a, r) => a + (r.OBP || 0), 0) / rows.length).toFixed(3))
        : undefined;
    const SLG =
      rows.every((r) => typeof r.SLG === "number")
        ? Number((rows.reduce((a, r) => a + (r.SLG || 0), 0) / rows.length).toFixed(3))
        : undefined;
    const OPS =
      typeof OBP === "number" && typeof SLG === "number"
        ? Number((OBP + SLG).toFixed(3))
        : undefined;
    return { PA, AB, H, OBP, SLG, OPS };
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 lg:grid-cols-[1fr,auto,auto,auto]">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Player"
          className="rounded-2xl bg-zinc-900 border border-zinc-800 px-4 py-3 outline-none focus:ring-2 ring-amber-500/60"
        />
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-3">
          <div className="text-xs text-zinc-400 mb-2">Seasons</div>
          <div className="flex flex-wrap gap-2 max-w-[520px]">
            {SEASONS.map((y) => (
              <Chip key={y} label={y} checked={seasons.includes(y)} onChange={() => toggleSeason(y)} />
            ))}
          </div>
        </div>
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-3">
          <div className="text-xs text-zinc-400 mb-2">Counts</div>
          <div className="grid grid-cols-3 gap-2">
            {ALL_COUNTS.map((c) => (
              <Chip key={c} label={c} checked={counts.includes(c)} onChange={() => toggleCount(c)} />
            ))}
          </div>
        </div>
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-3 flex flex-col gap-2 justify-between">
          <label className="text-xs text-zinc-400 flex items-center gap-2">
            <input
              type="checkbox"
              className="size-4 rounded border-zinc-700 bg-zinc-900 accent-amber-500"
              checked={includePost}
              onChange={(e) => setIncludePost(e.target.checked)}
            />
            Include Postseason
          </label>
          <label className="text-xs text-zinc-400">
            Min PA
            <input
              type="number"
              value={minPA}
              onChange={(e) => setMinPA(parseInt(e.target.value || "0", 10))}
              className="mt-1 w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2 outline-none focus:ring-2 ring-amber-500/60"
            />
          </label>
          <button
            onClick={doSearch}
            disabled={loading}
            className="mt-2 rounded-2xl bg-amber-500 text-black font-medium py-2 hover:bg-amber-400 disabled:opacity-60"
          >
            {loading ? "Searching…" : "Search"}
          </button>
        </div>
      </div>

      {selectedId ? (
        <div className="text-sm text-zinc-400">
          Selected: <span className="text-zinc-200">{selectedName}</span>{" "}
          ({selectedId})
        </div>
      ) : null}

      {totals ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <Card title="PA" value={totals.PA} />
          <Card title="AB" value={totals.AB} />
          <Card title="H" value={totals.H} />
          <Card title="AVG" value={rows[rows.length - 1]?.AVG?.toFixed?.(3) ?? "-"} />
          <Card title="OBP" value={totals.OBP ?? "-"} />
          <Card title="OPS" value={totals.OPS ?? "-"} />
        </div>
      ) : null}

      <div className="rounded-2xl border border-zinc-800 overflow-hidden">
        <div className="bg-zinc-900/50 px-4 py-2 text-xs text-zinc-400">
          Seasons ({rows.length})
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-900/40 text-zinc-300">
              <tr>
                <th className="px-3 py-2 text-left">Season</th>
                <th className="px-3 py-2 text-right">PA</th>
                <th className="px-3 py-2 text-right">AB</th>
                <th className="px-3 py-2 text-right">H</th>
                <th className="px-3 py-2 text-right">AVG</th>
                <th className="px-3 py-2 text-right">OBP</th>
                <th className="px-3 py-2 text-right">SLG</th>
                <th className="px-3 py-2 text-right">OPS</th>
                <th className="px-3 py-2 text-right">HR</th>
                <th className="px-3 py-2 text-right">BB</th>
                <th className="px-3 py-2 text-right">SO</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.season} className="odd:bg-zinc-950/40">
                  <td className="px-3 py-2">{r.season}</td>
                  <td className="px-3 py-2 text-right">{r.PA ?? "-"}</td>
                  <td className="px-3 py-2 text-right">{r.AB ?? "-"}</td>
                  <td className="px-3 py-2 text-right">{r.H ?? "-"}</td>
                  <td className="px-3 py-2 text-right">{typeof r.AVG === "number" ? r.AVG.toFixed(3) : "-"}</td>
                  <td className="px-3 py-2 text-right">{typeof r.OBP === "number" ? r.OBP.toFixed(3) : "-"}</td>
                  <td className="px-3 py-2 text-right">{typeof r.SLG === "number" ? r.SLG.toFixed(3) : "-"}</td>
                  <td className="px-3 py-2 text-right">
                    {typeof r.OPS === "number"
                      ? r.OPS.toFixed(3)
                      : typeof r.OBP === "number" && typeof r.SLG === "number"
                      ? (r.OBP + r.SLG).toFixed(3)
                      : "-"}
                  </td>
                  <td className="px-3 py-2 text-right">{r.HR ?? "-"}</td>
                  <td className="px-3 py-2 text-right">{r.BB ?? "-"}</td>
                  <td className="px-3 py-2 text-right">{r.SO ?? "-"}</td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td className="px-3 py-6 text-center text-zinc-500" colSpan={11}>
                    No data yet
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 p-3">
          <div className="text-xs text-zinc-400 mb-2">Debug response</div>
          <pre className="text-xs text-zinc-200 overflow-x-auto">
            {JSON.stringify(debug, null, 2)}
          </pre>
        </div>
        <div className="rounded-2xl border border-zinc-800 p-3">
          <div className="text-xs text-zinc-400 mb-2">First row</div>
          <pre className="text-xs text-zinc-200 overflow-x-auto">
            {JSON.stringify(rows[0] ?? {}, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
