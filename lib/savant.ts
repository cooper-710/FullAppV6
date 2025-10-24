import { httpJSON } from './http';
const PY_BASE = process.env.PY_SVC_URL ?? 'http://localhost:7000';
export async function getStatcastSummaryBySeason(playerId: number, seasons: number[]) {
  const ys = Array.from(new Set(seasons.filter(n => Number.isFinite(n)))).sort((a,b)=>a-b);
  const url = `${PY_BASE}/statcast/summary?player_id=${playerId}&seasons=${ys.join(',')}`;
  return httpJSON<{ rows: any[] }>(url, { timeoutMs: 25000, retries: 1, ttlMs: 21600000 });
}
