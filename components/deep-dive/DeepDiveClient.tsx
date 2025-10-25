"use client";
import { useMemo } from "react";
import type { PlayerSummary } from "@/lib/api";

export default function DeepDiveClient({ data, seasons }: { data: PlayerSummary; seasons: (string | number)[] }) {
  const qoc = data?.qualityOfContact ?? {};
  const approach = data?.approach ?? {};

  const cards = useMemo(
    () => [
      { label: "xwOBA", value: fmt(qoc.xwOBA) },
      { label: "HardHit%", value: fmtPct(qoc.hardHitPct) },
      { label: "Avg EV", value: fmt(qoc.avgEV) },
      { label: "Max EV", value: fmt(qoc.maxEV) },
      { label: "LA", value: fmt(qoc.la) },
      { label: "K%", value: fmtPct(approach.kPct) },
      { label: "BB%", value: fmtPct(approach.bbPct) },
      { label: "Chase%", value: fmtPct(approach.chasePct) },
      { label: "Zone Contact%", value: fmtPct(approach.zoneContactPct) },
    ],
    [qoc, approach]
  );

  return (
    <section className="grid gap-3 md:grid-cols-3">
      {cards.map((c) => (
        <div key={c.label} className="rounded-lg border border-neutral-800 p-4">
          <div className="text-xs opacity-70">{c.label}</div>
          <div className="text-2xl font-semibold">{c.value}</div>
        </div>
      ))}
    </section>
  );
}

function fmt(n: any) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return Number(n).toFixed(3);
}
function fmtPct(n: any) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  const v = Number(n);
  return `${(v <= 1 ? v * 100 : v).toFixed(1)}%`;
}
