"use client";
import { useMemo, useState } from "react";

type Summary = any;
const YEARS = [2017,2018,2019,2020,2021,2022,2023,2024,2025];

function splitName(input: string) {
  const cleaned = input.trim().replace(/\s+/g," ");
  const parts = cleaned.split(" ");
  const toTitle = (s:string)=>s.charAt(0).toUpperCase()+s.slice(1).toLowerCase();
  return { first: toTitle(parts[0]), last: toTitle(parts.slice(1).join(" ")) };
}
function getFgRows(summary: Summary) {
  const arr = Array.isArray(summary?.fangraphs) ? summary.fangraphs : [];
  return arr.map((r:any)=>({ season: r?.season ?? r?.data?.Season ?? "", data: r?.data ?? {} }));
}
function normKey(k:string){ return String(k).toLowerCase().replace(/[^a-z0-9]/g,""); }
function parseNumber(v:any){
  if (v==null) return undefined;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const cleaned = v.replace(/[,]/g,"").trim();
    const m = cleaned.match(/-?\d+(\.\d+)?/);
    if (!m) return undefined;
    const num = Number(m[0]);
    return Number.isFinite(num) ? num : undefined;
  }
  return undefined;
}
function pick(obj:any, candidates:string[]) {
  if (!obj || typeof obj!=="object") return undefined;
  for (const c of candidates) if (Object.prototype.hasOwnProperty.call(obj, c)) return obj[c];
  for (const c of candidates) {
    const key = Object.keys(obj).find(k => k.toLowerCase() === c.toLowerCase());
    if (key) return obj[key];
  }
  return undefined;
}
function n(obj:any, keys:string[]) {
  const v = pick(obj, keys);
  return parseNumber(v);
}
function nFuzzy(obj:any, patterns:RegExp[]) {
  if (!obj || typeof obj!=="object") return undefined;
  const keys = Object.keys(obj);
  for (const p of patterns) {
    const k = keys.find(key => p.test(normKey(key)));
    if (k) {
      const val = parseNumber((obj as any)[k]);
      if (val!=null) return val;
    }
  }
  return undefined;
}
// smarter key/alias resolver for troublesome columns
function nSmart(obj:any, aliases:string[], fuzzy:RegExp[] = []) {
  const direct = n(obj, aliases);
  if (direct != null) return direct;
  const keys = Object.keys(obj);
  const map = new Map(keys.map(k => [normKey(k), k]));
  for (const a of aliases) {
    const hit = map.get(normKey(a));
    if (hit) {
      const val = parseNumber(obj[hit]);
      if (val != null) return val;
    }
  }
  for (const p of fuzzy) {
    const k = keys.find(k1 => p.test(normKey(k1)));
    if (k) {
      const val = parseNumber(obj[k]);
      if (val != null) return val;
    }
  }
  return undefined;
}

function fmt(n:any, d=1){ if(n==null||Number.isNaN(Number(n))) return ""; return Number(n).toFixed(d); }
function fmt3(n:any){ return fmt(n,3); }
function pctSmart(v:any){
  if (v==null || v==="") return "";
  const num = Number(v);
  if (!Number.isFinite(num)) return "";
  return `${(Math.abs(num) <= 1 ? num*100 : num).toFixed(1)}%`;
}
const sum = (a:number[]) => a.reduce((s,x)=>s+x,0);
const mean = (a:number[]) => a.length ? sum(a)/a.length : undefined;
const pushIf = (arr:number[], v:any) => { const p = parseNumber(v); if (p!=null) arr.push(p); };

type Col = { key: string; label: string; kind?: "pct"|"dec3"|"num"|"int" };
function cellFormat(key:string, v:any, kind?:Col["kind"]){
  if (v==null) return "";
  if (kind==="pct") return pctSmart(v);
  if (kind==="dec3") return fmt3(v);
  if (kind==="int") return fmt(v,0);
  if (/%/.test(key) || /(Pct|Rate)$/i.test(key)) return pctSmart(v);
  if (["AVG","OBP","SLG","OPS","wOBA","xwOBA","xBA","xSLG","ISO","BABIP"].includes(key)) return fmt3(v);
  return fmt(v, key==="Spd" ? 1 : 1);
}
function sortValue(key:string, v:any, kind?:Col["kind"]){
  if (v==null) return -Infinity;
  if (kind==="pct") return Math.abs(Number(v))<=1 ? Number(v)*100 : Number(v);
  return Number(v);
}
const alias = new Map<string,string>([
  ["BB%","BBp"],
  ["K%","Kp"],
  ["wRC+","wRCp"],
  ["LD%","LDpct"],
  ["GB%","GBpct"],
  ["FB%","FBpct"],
  ["IFFB%","IFFBpct"],
  ["HR/FB","HRperFB"]
]);

function useSorted(rows:any[], cols:Col[]){
  const [sortKey, setSortKey] = useState<string|undefined>();
  const [sortDir, setSortDir] = useState<"asc"|"desc">("asc");
  const sorted = useMemo(()=>{
    if (!sortKey) return rows;
    const col = cols.find(c=>c.key===sortKey);
    return [...rows].sort((a,b)=>{
      const av = sortValue(sortKey, a[sortKey], col?.kind);
      const bv = sortValue(sortKey, b[sortKey], col?.kind);
      return sortDir==="asc" ? av-bv : bv-av;
    });
  },[rows,sortKey,sortDir,cols]);
  function onSort(k:string){
    if (sortKey===k) setSortDir(sortDir==="asc"?"desc":"asc");
    else { setSortKey(k); setSortDir("desc"); }
  }
  return { sorted, sortKey, sortDir, onSort };
}

function Table({
  title, rows, cols, sumKeys = [], avgKeys = [], footAlias = alias
}:{
  title: string;
  rows: any[];
  cols: Col[];
  sumKeys?: string[];
  avgKeys?: string[];
  footAlias?: Map<string,string>;
}){
  const { sorted, sortKey, sortDir, onSort } = useSorted(rows, cols);
  const totals: Record<string,number|undefined> = {};
  for (const k of sumKeys){ const vals:number[]=[]; for(const r of rows) pushIf(vals,r[k]); totals[k]=vals.length?sum(vals):undefined; }
  for (const k of avgKeys){ const vals:number[]=[]; for(const r of rows) pushIf(vals,r[k]); totals[k]=mean(vals); }

  const tableClass = "min-w-full text-sm";
  const theadClass = "text-left sticky top-0 z-10 bg-neutral-1000/70 backdrop-blur border-b border-neutral-800";
  const thBase = "px-3 py-2 select-none";
  const trClass = "odd:bg-neutral-1000/15 hover:bg-neutral-900/30";
  const numCell = "px-3 py-2 text-right tabular-nums";
  const headBtn = (c:Col)=>(
    <th key={c.key} className={thBase}>
      <button onClick={()=>onSort(c.key)} className={`flex items-center gap-1 ${c.key==="season"?"font-medium":"opacity-90 hover:opacity-100"} ${sortKey===c.key?"text-orange-400":""}`}>
        <span>{c.label}</span>
        {sortKey===c.key ? <span className="text-xs">{sortDir==="asc"?"▲":"▼"}</span> : <span className="text-xs opacity-30">↕</span>}
      </button>
    </th>
  );

  return (
    <section className="space-y-2">
      <div className="text-sm opacity-80">{title}</div>
      <div className="rounded border border-neutral-800 overflow-auto">
        <table className={tableClass}>
          <thead className={theadClass}>
            <tr>{cols.map(headBtn)}</tr>
          </thead>
          <tbody>
            {sorted.length===0?(
              <tr><td className="px-3 py-3 opacity-60" colSpan={cols.length}>No data yet</td></tr>
            ):sorted.map((r,i)=>(
              <tr key={r.season ?? i} className={trClass}>
                {cols.map(c=>(
                  <td key={c.key} className={c.key==="season"?"px-3 py-2 text-left font-medium":numCell}>
                    {c.key==="season" ? r[c.key] : cellFormat(c.key, r[c.key], c.kind)}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="border-t border-neutral-800 bg-neutral-900/40 font-semibold">
              {cols.map((c,idx)=>{
                if (idx===0) return <td key={c.key} className="px-3 py-2">Totals</td>;
                const k = totals[c.key]!==undefined ? c.key : (footAlias.get(c.key) ?? c.key);
                return <td key={c.key} className={numCell}>{cellFormat(c.key, totals[k], c.kind)}</td>;
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function HittersDeepDiveSearch() {
  const [name, setName] = useState("Pete Alonso");
  const [years, setYears] = useState<number[]>([2025]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");
  const [data, setData] = useState<Summary|null>(null);

  function toggle(y:number){
    setYears(prev=>{
      const s = new Set(prev);
      s.has(y)?s.delete(y):s.add(y);
      return Array.from(s).sort((a,b)=>a-b);
    });
  }
  function setAllYears(){ setYears([...YEARS]); }
  function clearYears(){ setYears([]); }

  async function doSearch() {
    setErr(""); setLoading(true); setData(null);
    try{
      const { first, last } = splitName(name);
      const qs = years.length? years.map(y=>`seasons=${y}`).join("&") : `seasons=2025`;
      const res = await fetch(`/api/players/${encodeURIComponent(first)}/${encodeURIComponent(last)}/summary?${qs}`, { cache: "no-store" });
      const json = await res.json();
      setData(json);
    }catch(e:any){ setErr(e?.message || "Error"); }
    finally{ setLoading(false); }
  }

  const fg = useMemo(()=>getFgRows(data),[data]);

  const production = useMemo(()=>fg.map(r=>{
    const d = r.data;
    return {
      season: r.season,
      PA: n(d,["PA"]), AB: n(d,["AB"]), H: n(d,["H"]), R: n(d,["R"]), RBI: n(d,["RBI"]),
      HR: n(d,["HR"]), SB: n(d,["SB"]),
      BBp: nSmart(d, ["BB%","BB Pct","BBPct","BB Percent","BBP"], [/^bb(p|pct|percent)?$/]),
      Kp: nSmart(d, ["K%","SO%","KPct","K Percent","SO Percent","Strikeout%","SO Pct"], [/^(k|so)(p|pct|percent|rate)?$/]),
      AVG: n(d,["AVG"]), OBP: n(d,["OBP"]), SLG: n(d,["SLG"]), OPS: n(d,["OPS"]),
      wOBA: n(d,["wOBA"]),
      wRCp: nSmart(d, ["wRC+","wRCPlus","wRC +"], [/^wrc(\+|plus)?$/])
    };
  }),[fg]);

  const qoc = useMemo(()=>fg.map(r=>{
    const d = r.data;
    return {
      season: r.season,
      EV: n(d,["EV","Avg EV","Average EV","AverageEV","AvgEV"]),
      MaxEV: n(d,["Max EV","MaxEV","EV Max","Max Exit Velo"]),
      LA: n(d,["LA","Avg LA","Average LA","AvgLA","AverageLA","Launch Angle"]),
      HardHitPct: n(d,["HardHit%"]),
      BarrelPct: n(d,["Barrel%","BRL%"]),
      Barrels: n(d,["Barrels","BRL","Brls"]),
      xwOBA: n(d,["xwOBA","xwoba"]),
      xBA: n(d,["xBA","xba"]),
      xSLG: n(d,["xSLG","xslg"]),
    };
  }),[fg]);

  const plate = useMemo(()=>fg.map(r=>{
    const d = r.data;
    return {
      season: r.season,
      SwingPct: n(d,["Swing%"]),
      O_SwingPct: n(d,["O-Swing%","Chase%"]),
      Z_SwingPct: n(d,["Z-Swing%"]),
      ContactPct: n(d,["Contact%"]),
      Z_ContactPct: n(d,["Z-Contact%"]),
      SwStrPct: n(d,["SwStr%","Whiff%"]),
      ZonePct: n(d,["Zone%"])
    };
  }),[fg]);

  const batted = useMemo(()=>fg.map(r=>{
    const d = r.data;
    return {
      season: r.season,
      LDpct: n(d,["LD%"]), GBpct: n(d,["GB%"]), FBpct: n(d,["FB%"]), IFFBpct: n(d,["IFFB%"]),
      HRperFB: n(d,["HR/FB","HR/FB%"]), PullPct: n(d,["Pull%"]), CentPct: n(d,["Cent%"]), OppoPct: n(d,["Oppo%"])
    };
  }),[fg]);

  const advanced = useMemo(()=>fg.map(r=>{
    const d = r.data;
    const XBR = nSmart(d, ["XBR","Extra Base Runs","XB Runs","XB-Runs"], [/^xbr$/, /^extrabaseruns$/, /^xbtruns$/, /^xbruns$/, /^xbaseruns$/]);
    return {
      season: r.season,
      ISO: n(d,["ISO"]),
      BABIP: n(d,["BABIP"]),
      Spd: n(d,["Spd"]),
      UBR: n(d,["UBR"]),
      wSB: n(d,["wSB"]),
      wGDP: n(d,["wGDP"]),
      XBR,
      wRC: n(d,["wRC"]),
      wRAA: n(d,["wRAA"]),
      wOBA: n(d,["wOBA"]),
    };
  }),[fg]);

  const value = useMemo(()=>fg.map(r=>{
    const d = r.data;
    const Batting = n(d,["Batting","Bat","BatRuns","Batting Runs"]);
    const BaseRunning = n(d,["Base Running","BsR","BsRng"]);
    const Fielding = n(d,["Fielding","Fld","Field"]);
    const Positional = n(d,["Positional","Pos"]);
    let Offense = n(d,["Offense","Off"]);
    let Defense = n(d,["Defense","Def"]);
    if (Offense==null && Batting!=null && BaseRunning!=null) Offense = Batting + BaseRunning;
    if (Defense==null && Fielding!=null && Positional!=null) Defense = Fielding + Positional;
    const League = n(d,["League","Lg"]) ?? nFuzzy(d,[/^league$/]);
    const Replacement = n(d,["Replacement","Rep"]);
    const RAR = n(d,["RAR"]);
    const WAR = n(d,["WAR"]);
    const Dollars = nSmart(d, ["Dollars","Dollars (millions)","$","Salary","Salary $","$ (millions)"], [/^dollars/, /^\$/, /^salary$/]);
    return { season: r.season, Batting, BaseRunning, Fielding, Positional, Offense, Defense, League, Replacement, RAR, WAR, Dollars };
  }),[fg]);

  const yearChip = (y:number, active:boolean, onClick:()=>void)=>(
    <button
      key={y}
      onClick={onClick}
      className={`px-3 py-1 rounded-full border text-sm transition
      ${active ? "bg-orange-500 border-orange-600 text-black shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
               : "border-orange-500/60 text-orange-400 hover:bg-orange-500/10"}`}
    >{y}</button>
  );
  const primaryBtn = "px-3 py-2 rounded-md bg-orange-500 hover:bg-orange-600 text-black border border-orange-600";
  const ghostBtn = "px-3 py-1 rounded-md border border-orange-500/60 text-orange-400 hover:bg-orange-500/10";

  return (
    <div className="px-6 py-6 space-y-8">
      <div className="flex flex-wrap gap-3 items-center">
        <input
          value={name}
          onChange={(e)=>setName(e.target.value)}
          placeholder="First Last"
          className="px-3 py-2 rounded-md border border-neutral-700 bg-transparent w-[320px]"
        />
        <button onClick={doSearch} disabled={loading} className={primaryBtn}>{loading ? "Loading..." : "Search"}</button>
        <div className="text-sm opacity-70">{years.length ? `${years.length} seasons` : "No seasons selected"}</div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {YEARS.map(y=>yearChip(y, years.includes(y), ()=>toggle(y)))}
        <button onClick={setAllYears} className={ghostBtn}>All</button>
        <button onClick={clearYears} className={ghostBtn}>Clear</button>
      </div>

      {err ? <div className="text-red-400 text-sm">{err}</div> : null}

      <Table
        title="Production (FanGraphs)"
        rows={production}
        cols={[
          {key:"season",label:"season"},
          {key:"PA",label:"PA",kind:"int"},
          {key:"AB",label:"AB",kind:"int"},
          {key:"H",label:"H",kind:"int"},
          {key:"R",label:"R",kind:"int"},
          {key:"RBI",label:"RBI",kind:"int"},
          {key:"HR",label:"HR",kind:"int"},
          {key:"SB",label:"SB",kind:"int"},
          {key:"BB%",label:"BB%",kind:"pct"},
          {key:"K%",label:"K%",kind:"pct"},
          {key:"AVG",label:"AVG",kind:"dec3"},
          {key:"OBP",label:"OBP",kind:"dec3"},
          {key:"SLG",label:"SLG",kind:"dec3"},
          {key:"OPS",label:"OPS",kind:"dec3"},
          {key:"wOBA",label:"wOBA",kind:"dec3"},
          {key:"wRC+",label:"wRC+"}
        ]}
        sumKeys={["PA","AB","H","R","RBI","HR","SB"]}
        avgKeys={["BBp","Kp","AVG","OBP","SLG","OPS","wOBA","wRCp"]}
      />

      <Table
        title="Quality of Contact (FanGraphs Statcast)"
        rows={qoc}
        cols={[
          {key:"season",label:"season"},
          {key:"EV",label:"EV"},
          {key:"MaxEV",label:"Max EV"},
          {key:"LA",label:"LA"},
          {key:"HardHitPct",label:"HardHit%",kind:"pct"},
          {key:"BarrelPct",label:"Barrel%",kind:"pct"},
          {key:"Barrels",label:"Barrels",kind:"int"},
          {key:"xwOBA",label:"xwOBA",kind:"dec3"},
          {key:"xBA",label:"xBA",kind:"dec3"},
          {key:"xSLG",label:"xSLG",kind:"dec3"}
        ]}
        sumKeys={["Barrels"]}
        avgKeys={["EV","MaxEV","LA","HardHitPct","BarrelPct","xwOBA","xBA","xSLG"]}
      />

      <Table
        title="Plate Discipline (FanGraphs)"
        rows={plate}
        cols={[
          {key:"season",label:"season"},
          {key:"SwingPct",label:"Swing%",kind:"pct"},
          {key:"O_SwingPct",label:"O-Swing%",kind:"pct"},
          {key:"Z_SwingPct",label:"Z-Swing%",kind:"pct"},
          {key:"ContactPct",label:"Contact%",kind:"pct"},
          {key:"Z_ContactPct",label:"Z-Contact%",kind:"pct"},
          {key:"SwStrPct",label:"SwStr%",kind:"pct"},
          {key:"ZonePct",label:"Zone%",kind:"pct"}
        ]}
        avgKeys={["SwingPct","O_SwingPct","Z_SwingPct","ContactPct","Z_ContactPct","SwStrPct","ZonePct"]}
      />

      <Table
        title="Batted Ball Profile (FanGraphs)"
        rows={batted}
        cols={[
          {key:"season",label:"season"},
          {key:"LDpct",label:"LD%",kind:"pct"},
          {key:"GBpct",label:"GB%",kind:"pct"},
          {key:"FBpct",label:"FB%",kind:"pct"},
          {key:"IFFBpct",label:"IFFB%",kind:"pct"},
          {key:"HRperFB",label:"HR/FB",kind:"pct"},
          {key:"PullPct",label:"Pull%",kind:"pct"},
          {key:"CentPct",label:"Cent%",kind:"pct"},
          {key:"OppoPct",label:"Oppo%",kind:"pct"}
        ]}
        avgKeys={["LDpct","GBpct","FBpct","IFFBpct","HRperFB","PullPct","CentPct","OppoPct"]}
      />

      <Table
        title="Advanced (FanGraphs)"
        rows={advanced}
        cols={[
          {key:"season",label:"season"},
          {key:"ISO",label:"ISO",kind:"dec3"},
          {key:"BABIP",label:"BABIP",kind:"dec3"},
          {key:"Spd",label:"Spd"},
          {key:"UBR",label:"UBR"},
          {key:"wSB",label:"wSB"},
          {key:"wGDP",label:"wGDP"},
          {key:"XBR",label:"XBR"},
          {key:"wRC",label:"wRC"},
          {key:"wRAA",label:"wRAA"},
          {key:"wOBA",label:"wOBA",kind:"dec3"}
        ]}
        sumKeys={["UBR","wSB","wGDP","XBR","wRC","wRAA"]}
        avgKeys={["ISO","BABIP","Spd","wOBA"]}
      />

      <Table
        title="Value (FanGraphs)"
        rows={value}
        cols={[
          {key:"season",label:"season"},
          {key:"Batting",label:"Batting"},
          {key:"BaseRunning",label:"Base Running"},
          {key:"Fielding",label:"Fielding"},
          {key:"Positional",label:"Positional"},
          {key:"Offense",label:"Offense"},
          {key:"Defense",label:"Defense"},
          {key:"League",label:"League"},
          {key:"Replacement",label:"Replacement"},
          {key:"RAR",label:"RAR"},
          {key:"WAR",label:"WAR"},
          {key:"Dollars",label:"Dollars"}
        ]}
        sumKeys={["Batting","BaseRunning","Fielding","Positional","Offense","Defense","League","Replacement","RAR","WAR","Dollars"]}
      />
    </div>
  );
}
