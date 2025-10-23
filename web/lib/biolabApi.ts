const API = process.env.NEXT_PUBLIC_BIOLAB_API ?? "http://127.0.0.1:5055";
async function j<T>(res: Response): Promise<T> { if (!res.ok) throw new Error(`${res.status} ${res.statusText}`); return res.json() as Promise<T>; }
export type PlayerHit = { id: number; name: string; team?: string };
export async function searchPlayers(q: string): Promise<PlayerHit[]> {
  if (!q) return []; const url = `${API}/players/search?q=${encodeURIComponent(q)}`; return j<PlayerHit[]>(await fetch(url));
}
export type SeasonLine = { batter: number; player_name: string; season: number; PA: number; AB: number; H: number; AVG: number; OBP: number; SLG: number; };
export async function hitterSeason(bid: number, season: number, opts?: { season_type?: "regular" | "postseason" | "both" }): Promise<SeasonLine> {
  const p = new URL(`${API}/hitters/${bid}/season`); p.searchParams.set("season", String(season)); if (opts?.season_type) p.searchParams.set("season_type", opts.season_type); return j<SeasonLine>(await fetch(p.toString()));
}
export type SplitRow = Record<string, number | string | null>;
export async function hitterSplits(
  bid: number,
  season: number,
  split: "pitch_family" | "handedness" | "count" | "month" | "home_away" | "zone" | "pitch_type" | "location_bucket",
  opts?: { season_type?: "regular" | "postseason" | "both" }
): Promise<SplitRow[]> {
  const p = new URL(`${API}/hitters/${bid}/splits`); p.searchParams.set("season", String(season)); p.searchParams.set("split", split); if (opts?.season_type) p.searchParams.set("season_type", opts.season_type); return j<SplitRow[]>(await fetch(p.toString()));
}
export type HeatCell = { row: number; col: number; value: number };
export async function hitterHeatmap(bid: number, season: number, grid: 9 | 13 | 25, metric: "xwOBA" | "run_value" | "swing%" | "whiff%" | "contact%"): Promise<{ grid: number; metric: string; cells: HeatCell[]; last_updated: string }> {
  const p = new URL(`${API}/hitters/${bid}/heatmap`); p.searchParams.set("season", String(season)); p.searchParams.set("grid", String(grid)); p.searchParams.set("metric", metric); return j(await fetch(p.toString()));
}
export async function downloadHitterReport(bid: number, season: number) {
  const p = new URL(`${API}/reports/hitter/${bid}`); p.searchParams.set("season", String(season)); const res = await fetch(p.toString()); if (!res.ok) throw new Error("report generation failed"); const blob = await res.blob(); const url = URL.createObjectURL(blob); return url;
}
