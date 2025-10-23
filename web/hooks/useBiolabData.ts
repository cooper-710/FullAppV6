import { useEffect, useMemo, useState } from "react";
import BiolabApi from "../lib/biolab";

type SplitKind =
  | "pitch_family"
  | "pitch_type"
  | "count"
  | "zone"
  | "stand"
  | "home_away";

export function useBiolabData(
  bid: number | null,
  season: number,
  split: SplitKind = "pitch_family",
  heatmap: { pitch_type?: string; pitch_family?: string } = { pitch_family: "slider" }
) {
  const [seasonRow, setSeasonRow] = useState<any | null>(null);
  const [splits, setSplits] = useState<any[] | null>(null);
  const [heat, setHeat] = useState<number[][] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<Error | null>(null);

  useEffect(() => {
    if (!bid) return;
    let alive = true;
    setLoading(true);
    setErr(null);

    (async () => {
      try {
        const [s, sp, hm] = await Promise.all([
          BiolabApi.getHitterSeason(bid, season),
          BiolabApi.getHitterSplits(bid, season, split),
          BiolabApi.getHitterHeatmap(bid, season, heatmap),
        ]);
        if (!alive) return;
        setSeasonRow((s.data && s.data[0]) || null);
        setSplits(sp?.data || []);
        setHeat(hm?.grid || null);
      } catch (e: any) {
        if (alive) setErr(e);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [bid, season, split, heatmap?.pitch_type, heatmap?.pitch_family]);

  const heatCells = useMemo(
    () => (heat ? BiolabApi.heatmapToCells(heat) : []),
    [heat]
  );

  return { seasonRow, splits, heat, heatCells, loading, error: err };
}

export default useBiolabData;
