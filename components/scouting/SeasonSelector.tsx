"use client";
type Props = { selected: number[]; onChange: (ids: number[]) => void; years?: number[] };
export default function SeasonSelector({ selected, onChange, years }: Props) {
  const ys = years && years.length ? years : Array.from({length: 9}, (_,i)=>2017+i);
  function toggle(y: number) {
    const on = selected.includes(y);
    onChange(on ? selected.filter(n=>n!==y) : [...selected, y]);
  }
  function all() { onChange([...ys]); }
  function clear() { onChange([]); }
  return (
    <div className="flex items-center gap-2">
      {ys.map(y=>{
        const on = selected.includes(y);
        return (
          <button key={y} onClick={()=>toggle(y)} className={`px-3 py-1 rounded-full text-sm border ${on ? "bg-amber-700 border-amber-500" : "bg-zinc-800 border-zinc-600"}`}>{y}</button>
        );
      })}
      <button onClick={all} className="px-2 py-1 rounded-full text-xs bg-zinc-800 border border-zinc-600">All</button>
      <button onClick={clear} className="px-2 py-1 rounded-full text-xs bg-zinc-800 border border-zinc-600">Clear</button>
    </div>
  );
}
