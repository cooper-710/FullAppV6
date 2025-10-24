"use client";
import { useMemo, useState } from "react";
type Row = { season:number; PA:number; AB:number; H:number; AVG:number; OBP:number; SLG:number; OPS:number; HR:number; BB:number; SO:number };
type Props = { rows: Row[] };
const COLS: (keyof Row)[] = ["season","PA","AB","H","AVG","OBP","SLG","OPS","HR","BB","SO"];
export default function SeasonTable({ rows }: Props) {
  const [sort, setSort] = useState<{k:keyof Row, dir: 1|-1}>({k:"season", dir:-1});
  const data = useMemo(()=>{
    const cp = [...rows];
    cp.sort((a,b)=>{
      const ka = a[sort.k]; const kb = b[sort.k];
      if (ka < kb) return -1*sort.dir;
      if (ka > kb) return 1*sort.dir;
      return 0;
    });
    return cp;
  }, [rows, sort]);
  function onHead(k: keyof Row) {
    setSort(s=> s.k===k ? {k, dir: (s.dir===1?-1:1)} : {k, dir: -1});
  }
  return (
    <div className="mt-6">
      <div className="text-sm text-zinc-400 mb-2">Seasons ({rows.length})</div>
      <div className="max-h-[360px] overflow-auto border border-zinc-700 rounded-md">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-zinc-900">
            <tr>
              {COLS.map(h=>(
                <th key={h} onClick={()=>onHead(h)} className="px-3 py-2 text-left border-b border-zinc-700 cursor-pointer select-none">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map(r=>(
              <tr key={r.season} className="odd:bg-zinc-950">
                {COLS.map(k=>(
                  <td key={String(k)} className="px-3 py-2 border-b border-zinc-800">{(r as any)[k]}</td>
                ))}
              </tr>
            ))}
            {!data.length && <tr><td className="px-3 py-3 text-zinc-500" colSpan={COLS.length}>No data yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
