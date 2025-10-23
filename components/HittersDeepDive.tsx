"use client";
import { useMemo, useState } from "react";

type Player = { id: number; name: string; _score?: number };
type Row = Record<string, number | string | null | undefined>;

async function getJSON<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return r.json();
}

const ALL_YEARS = [2017,2018,2019,2020,2021,2022,2023,2024,2025];

export default function HittersDeepDive() {
  const [q, setQ] = useState("Pete Alonso");
  const [years, setYears] = useState<number[]>([2025]);
  const [includePost, setIncludePost] = useState(false);
  const [minPA, setMinPA] = useState(0);

  const [picked, setPicked] = useState<Player | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [dbgL, setDbgL] = useState<any>({});
  const [dbgR, setDbgR] = useState<any>({});

  function toggleYear(y: number) {
    setYears(prev => prev.includes(y) ? prev.filter(v => v!==y) : [...prev, y].sort());
  }

  const cards = useMemo(()=>{
    if (!rows.length) return null;
    const r = rows[0];
    const n = (x:any)=> (typeof x === "number" ? x : Number(x||0));
    const PA = n(r.PA), AB = n(r.AB), H = n(r.H);
    const AVG = n(r.AVG), OBP = n(r.OBP), SLG = n(r.SLG);
    const OPS = typeof r.OPS === "number" ? r.OPS : OBP + SLG;
    return { PA, AB, H, AVG, OBP, SLG, OPS };
  }, [rows]);

  async function run() {
    setLoading(true); setErr(null); setRows([]); setDbgR({});
    try {
      const s = encodeURIComponent(q.trim());
      const { items } = await getJSON<{ items: Player[] }>(`/api/biolab/players/search?q=${s}`);
      const exact = (items||[]).find(p => p.name.toLowerCase() === q.trim().toLowerCase());
      const chosen = exact ?? (items||[])[0] ?? null;
      setPicked(chosen || null);
      setDbgL({ step: "players/search", q, itemsCount: items?.length ?? 0, picked: chosen });

      if (!chosen) { setLoading(false); return; }

      const queries = years.map(y => {
        const qs = new URLSearchParams();
        qs.set("season", String(y));
        if (includePost) qs.set("include_postseason", "true");
        if (minPA>0) qs.set("min_pa", String(minPA));
        return `/api/biolab/hitters/${chosen.id}/season?` + qs.toString();
      });

      const data = await Promise.all(
        queries.map(async (u) => {
          try {
            const r = await getJSON<{ data: Row }>(u);
            return r.data;
          } catch {
            return null;
          }
        })
      );

      const kept = data.filter(Boolean) as Row[];
      setRows(kept);
      setDbgR({ ids: years, rows: kept });
    } catch (e:any) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  const prioritizedCols = ["season","PA","AB","H","AVG","OBP","SLG","OPS","HR","BB","SO"];
  const allCols = useMemo(()=>{
    const set = new Set<string>(prioritizedCols);
    for (const r of rows) Object.keys(r||{}).forEach(k => set.add(k));
    // keep priority first, then the rest alphabetically
    const rest = Array.from(set).filter(k=>!prioritizedCols.includes(k)).sort();
    return [...prioritizedCols, ...rest];
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-5">
          <label className="text-xs uppercase opacity-60">Player</label>
          <input
            className="mt-1 w-full rounded-xl bg-neutral-900 px-3 py-2 outline-none"
            value={q}
            onChange={e=>setQ(e.target.value)}
            onKeyDown={e=>{ if(e.key==="Enter") run(); }}
            placeholder="Type a name and press Enter"
          />
          <div className="mt-2 text-sm opacity-70">
            {picked ? <>Selected: {picked.name} ({picked.id})</> : "No player selected"}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5">
          <label className="text-xs uppercase opacity-60">Seasons (multi)</label>
          <div className="mt-1 flex flex-wrap gap-2">
            {ALL_YEARS.map(y=>(
              <button key={y}
                onClick={()=>toggleYear(y)}
                className={`rounded-full px-3 py-2 text-sm ${years.includes(y) ? "bg-amber-500 text-black" : "bg-neutral-800"}`}>
                {y}
              </button>
            ))}
            <button
              onClick={()=>setYears([...ALL_YEARS])}
              className="rounded-full px-3 py-2 text-sm bg-neutral-700">
              All
            </button>
            <button
              onClick={()=>setYears([])}
              className="rounded-full px-3 py-2 text-sm bg-neutral-700">
              Clear
            </button>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-2">
          <label className="text-xs uppercase opacity-60">Options</label>
          <div className="mt-2 flex items-center gap-3">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={includePost} onChange={e=>setIncludePost(e.target.checked)} />
              <span className="text-sm">Include Postseason</span>
            </label>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm opacity-70">Min PA</span>
            <input
              className="w-20 rounded-lg bg-neutral-900 px-3 py-1 outline-none"
              type="number" min={0} step={1}
              value={minPA}
              onChange={e=>setMinPA(parseInt(e.target.value||"0",10))}
            />
          </div>
        </div>

        <div className="col-span-12 lg:col-span-12 flex justify-end">
          <button
            onClick={run}
            className="rounded-xl bg-amber-500 px-6 py-2 font-semibold text-black">
            {loading ? "Loading…" : "Search"}
          </button>
        </div>
      </div>

      {err && <div className="rounded-xl bg-red-500/20 border border-red-500/40 p-3 text-red-200 text-sm">{err}</div>}

      <div className="grid grid-cols-12 gap-4">
        {(["PA","AB","H","AVG","OBP","SLG","OPS"] as const).map(k=>(
          <div key={k} className="col-span-12 sm:col-span-6 md:col-span-3 lg:col-span-2 rounded-2xl bg-neutral-900 p-4">
            <div className="text-xs uppercase opacity-60">{k}</div>
            <div className="text-3xl mt-1 tabular-nums">{cards ? (typeof (cards as any)[k] === "number" ? (cards as any)[k] : ((cards as any)[k]||0)) : 0}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-neutral-900 overflow-hidden">
        <div className="px-4 py-3 text-sm opacity-70">Seasons ({rows.length})</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-800">
              <tr>
                {allCols.map(h=>(
                  <th key={h} className="px-4 py-2 text-left whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length===0 ? (
                <tr><td className="px-4 py-6 opacity-60" colSpan={allCols.length}>No data yet</td></tr>
              ) : rows.map((r, i)=>(
                <tr key={String(r.season ?? i)} className="border-t border-neutral-800">
                  {allCols.map(c=>{
                    let v = (r as any)[c];
                    if (c==="OPS" && (v===undefined || v===null)) {
                      const obp = Number((r as any).OBP || 0);
                      const slg = Number((r as any).SLG || 0);
                      v = obp + slg;
                    }
                    return <td key={c} className="px-4 py-2 whitespace-nowrap">{v ?? "-"}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <pre className="rounded-2xl bg-neutral-900 p-4 text-xs overflow-auto">{JSON.stringify(dbgL, null, 2)}</pre>
        <pre className="rounded-2xl bg-neutral-900 p-4 text-xs overflow-auto">{JSON.stringify(dbgR, null, 2)}</pre>
      </div>
    </div>
  );
}
