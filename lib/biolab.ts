const BASE =
  (typeof process !== "undefined" && (process as any).env?.NEXT_PUBLIC_BIOLAB_API_BASE) ||
  (globalThis as any)?.NEXT_PUBLIC_BIOLAB_API_BASE ||
  "http://127.0.0.1:5055";

type Dict = Record<string, any>;
const qs = (p?: Dict) =>
  !p ? "" : "?" + new URLSearchParams(Object.entries(p).filter(([,v]) => v !== undefined && v !== null && v !== "") as any).toString();

async function get<T=any>(path: string, params?: Dict): Promise<T> {
  const url = `${BASE}${path}${qs(params)}`;
  const r = await fetch(url, { headers: { Accept: "application/json" }});
  if (!r.ok) throw new Error(`GET ${url} -> ${r.status} ${r.statusText}`);
  return r.json() as Promise<T>;
}

export async function searchPlayers(q: string) {
  return get<{ items: Array<{ id: number; name: string }> }>("/players/search", { q });
}
export async function getHitterSeason(bid: number, season: number) {
  return get<{ data: any[] }>(`/hitters/${bid}/season`, { season });
}
export async function getHitterSplits(bid: number, season: number, split: string, extra?: Dict) {
  return get<{ data: any[] }>(`/hitters/${bid}/splits`, { season, split, ...(extra||{}) });
}
export async function getHitterHeatmap(bid: number, season: number, opts: Dict = {}) {
  return get<{ grid: number[][] }>(`/hitters/${bid}/heatmap`, { season, ...opts });
}
export function heatmapToCells(grid: number[][]) {
  const cells: Array<{x:number;y:number;value:number}> = [];
  for (let y=0; y<grid.length; y++) for (let x=0; x<(grid[y]?.length||0); x++)
    cells.push({ x, y, value: grid[y][x] ?? 0 });
  return cells;
}
const BiolabApi = { BASE, searchPlayers, getHitterSeason, getHitterSplits, getHitterHeatmap, heatmapToCells };
export default BiolabApi;
