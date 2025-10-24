"use client";
import { useEffect, useMemo, useRef, useState } from "react";

type Item = { id: number; name: string; team?: string | null; pos?: string | null };
type Props = {
  value: string;
  onValue: (v: string) => void;
  onPick: (it: Item | null) => void;
  placeholder?: string;
};

export default function PlayerSearch({ value, onValue, onPick, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [hi, setHi] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);
  const q = value;

  useEffect(() => {
    if (!q || q.trim().length < 2) {
      setItems([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/biolab/players/search?q=${encodeURIComponent(q)}`, { cache: "no-store" });
        const j = await r.json();
        const arr = Array.isArray(j?.items) ? j.items : [];
        const norm = arr.map((x: any) => ({ id: Number(x.id), name: String(x.name || ""), team: x.team ?? null, pos: x.pos ?? null })).slice(0, 20);
        setItems(norm);
        setOpen(true);
        setHi(norm.length ? 0 : -1);
      } catch {
        setItems([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function pick(idx: number) {
    const it = items[idx] ?? null;
    if (it) onValue(it.name);
    onPick(it);
    setOpen(false);
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && e.key === "ArrowDown") { setOpen(true); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setHi(h => Math.min(h + 1, items.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHi(h => Math.max(h - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (hi >= 0) pick(hi); else onPick(items[0] ?? null); }
    else if (e.key === "Escape") { setOpen(false); }
  }

  return (
    <div className="relative w-[420px]" ref={boxRef}>
      <input
        value={value}
        onChange={(e)=>onValue(e.target.value)}
        onKeyDown={onKey}
        onFocus={()=>{ if (items.length) setOpen(true); }}
        placeholder={placeholder || "Search player"}
        className="w-full px-4 py-2 rounded-md bg-zinc-900 border border-zinc-700 outline-none"
      />
      {loading && <div className="absolute right-2 top-2 text-xs text-zinc-500">…</div>}
      {open && items.length > 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 shadow">
          {items.map((it, idx)=>(
            <button
              key={it.id}
              onMouseEnter={()=>setHi(idx)}
              onMouseDown={(e)=>e.preventDefault()}
              onClick={()=>pick(idx)}
              className={`w-full text-left px-3 py-2 text-sm ${idx===hi ? "bg-zinc-800" : ""}`}
            >
              <div className="flex items-center justify-between">
                <span>{it.name}</span>
                <span className="text-xs text-zinc-500">{it.team || ""}{it.pos ? ` • ${it.pos}` : ""} • {it.id}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
