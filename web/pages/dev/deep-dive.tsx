'use client';
import React, { useEffect, useMemo, useState } from "react";
import BiolabApi, { searchPlayers, getHitterSeason, getHitterSplits, getHitterHeatmap, heatmapToCells } from "../../lib/biolab";

export default function DeepDiveDev() {
  const [q, setQ] = useState("Pete Alonso");
  const [results, setResults] = useState<Array<{id:number; name:string}>>([]);
  const [bid, setBid] = useState<number | null>(null);
  const [season, setSeason] = useState<number>(2025);

  const [seasonRow, setSeasonRow] = useState<any | null>(null);
  const [splits, setSplits] = useState<any[] | null>(null);
  const [grid, setGrid] = useState<number[][] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function doSearch() {
    const { items } = await searchPlayers(q);
    setResults(items || []);
    if (items?.[0]) setBid(items[0].id);
  }

  useEffect(() => {
    if (!bid) return;
    let alive = true;
    setLoading(true); setErr(null);
    (async () => {
      try {
        const [s, sp, hm] = await Promise.all([
          getHitterSeason(bid, season),
          getHitterSplits(bid, season, "pitch_family"),
          getHitterHeatmap(bid, season, { pitch_family: "slider" }),
        ]);
        if (!alive) return;
        setSeasonRow(s.data?.[0] || null);
        setSplits(sp.data || []);
        setGrid(hm.grid || null);
      } catch (e:any) {
        setErr(e?.message || String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [bid, season]);

  const cells = useMemo(() => grid ? heatmapToCells(grid) : [], [grid]);

  return (
    <div style={{padding:"24px", maxWidth: 1100, margin: "0 auto", color: "var(--foreground, #e5e7eb)"}}>
      <h1 style={{fontSize: 24, fontWeight: 600, marginBottom: 12}}>Deep Dive — Dev</h1>
      <p style={{opacity:.7, marginBottom: 16}}>API base: {BiolabApi.BASE}</p>

      <div style={{display:"flex", gap:12, alignItems:"center", marginBottom:16}}>
        <input
          value={q}
          onChange={(e)=>setQ(e.target.value)}
          placeholder="Search player…"
          style={{padding:"10px 12px", background:"#111", border:"1px solid #333", borderRadius:8, color:"#e5e7eb", width:320}}
        />
        <input
          type="number"
          value={season}
          onChange={(e)=>setSeason(parseInt(e.target.value||"2025",10))}
          style={{padding:"10px 12px", background:"#111", border:"1px solid #333", borderRadius:8, color:"#e5e7eb", width:120}}
        />
        <button onClick={doSearch} style={{padding:"10px 14px", background:"#E5812B", color:"#111", border:"none", borderRadius:8, fontWeight:600}}>
          Search
        </button>
      </div>

      {results.length > 0 && (
        <div style={{display:"flex", gap:8, flexWrap:"wrap", marginBottom:16}}>
          {results.slice(0,6).map(r => (
            <button key={r.id} onClick={()=>setBid(r.id)}
              style={{padding:"8px 10px", background: bid===r.id ? "#333" : "#18181b", border:"1px solid #333", borderRadius:8, color:"#e5e7eb"}}>
              {r.name} ({r.id})
            </button>
          ))}
        </div>
      )}

      {err && <div style={{color:"#ef4444", marginBottom:12}}>Error: {err}</div>}
      {loading && <div style={{opacity:.7}}>Loading…</div>}

      {seasonRow && (
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginTop:12}}>
          <div style={{background:"#0b0b0c", border:"1px solid #222", borderRadius:12, padding:16}}>
            <h3 style={{marginBottom:8, fontWeight:600}}>Season Totals</h3>
            <div>Player: {seasonRow.player_name} (MLBAM: {seasonRow.batter})</div>
            <div>Season: {seasonRow.season}</div>
            <div style={{marginTop:6}}>PA: {seasonRow.PA} &nbsp; AB: {seasonRow.AB} &nbsp; H: {seasonRow.H}</div>
            <div style={{marginTop:6}}>AVG: {seasonRow.AVG} &nbsp; OBP: {seasonRow.OBP} &nbsp; SLG: {seasonRow.SLG}</div>
          </div>

          <div style={{background:"#0b0b0c", border:"1px solid #222", borderRadius:12, padding:16}}>
            <h3 style={{marginBottom:8, fontWeight:600}}>Pitch-Family Splits</h3>
            <div style={{fontSize:12, opacity:.7, marginBottom:8}}>From /hitters/{bid}/splits</div>
            <div style={{display:"grid", gridTemplateColumns:"1.2fr .7fr .7fr .7fr", gap:"6px 10px", fontFamily:"ui-monospace, SFMono-Regular, Menlo, monospace"}}>
              <div style={{opacity:.7}}>Family</div><div style={{opacity:.7}}>AB</div><div style={{opacity:.7}}>H</div><div style={{opacity:.7}}>AVG</div>
              {(splits||[]).map((r:any, i:number)=>(
                <React.Fragment key={i}>
                  <div>{r.pitch_family}</div>
                  <div>{r.AB}</div>
                  <div>{r.H}</div>
                  <div>{Number(r.AVG).toFixed(3)}</div>
                </React.Fragment>
              ))}
            </div>
          </div>

          <div style={{gridColumn:"1 / span 2", background:"#0b0b0c", border:"1px solid #222", borderRadius:12, padding:16}}>
            <h3 style={{marginBottom:8, fontWeight:600}}>Heatmap (Slider)</h3>
            <div style={{
              display:"grid",
              gridTemplateColumns:`repeat(${grid?.[0]?.length||12}, 18px)`,
              gap:2,
              alignItems:"center"
            }}>
              {cells.map((c,i)=>(
                <div key={i} title={`${c.value.toFixed(3)}`}
                  style={{
                    width:18, height:18,
                    background:`hsl(16, 90%, ${Math.max(12, 60 - Math.min(50, c.value*100))}%)`,
                    borderRadius:3
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
