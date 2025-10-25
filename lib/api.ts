export type PlayerSummary = {
  meta?: { team?: string; player?: string; type?: string };
  overview?: { bats?: string; height?: string; weight?: number; age?: number };
  qualityOfContact?: {
    avgEV?: number | null;
    maxEV?: number | null;
    la?: number | null;
    hardHitPct?: number | null;
    barrelsPct?: number | null;
    xwOBA?: number | null;
  };
  approach?: {
    kPct?: number | null;
    bbPct?: number | null;
    chasePct?: number | null;
    zoneContactPct?: number | null;
  };
  battedBall?: Record<string, unknown>;
  splits?: Record<string, unknown>;
  statcast?: Record<string, unknown>;
  fangraphs?: Record<string, unknown>;
};

const BASE = process.env.NEXT_PUBLIC_API_URL || "";

export function splitNameFromId(id: string): { first: string; last: string } {
  const cleaned = id.replace(/[_]+/g, "-").replace(/\s+/g, "-").toLowerCase();
  const parts = cleaned.split("-").filter(Boolean);
  if (parts.length < 2) throw new Error("Invalid player id. Expected first-last.");
  const toTitle = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return { first: toTitle(parts[0]), last: toTitle(parts.slice(1).join(" ")) };
}

export async function fetchPlayerSummary(
  first: string,
  last: string,
  seasons: (string | number)[]
): Promise<PlayerSummary> {
  const q = seasons.map((y) => `seasons=${y}`).join("&");
  const url = `${BASE}/players/${encodeURIComponent(first)}/${encodeURIComponent(last)}/summary?${q}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}
