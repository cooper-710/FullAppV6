import { NextResponse } from 'next/server';
import { getHitterSeason } from '@/lib/mlb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function firstNum(arr: any[]) {
  for (const v of arr) {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return NaN;
}

function numsFromPath(u: URL) {
  return u.pathname.split('/').map(s => {
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  }).filter(Number.isFinite) as number[];
}

function pickId(u: URL, body: any) {
  const sp = u.searchParams;
  const pathNums = numsFromPath(u);
  if (pathNums.length) return pathNums[0];
  const b = body || {};
  const cand = [
    sp.get('id'), sp.get('player'), sp.get('playerId'), sp.get('player_id'),
    sp.get('mlbam'), sp.get('mlbamId'), sp.get('mlbam_id'), sp.get('batter'),
    b.id, b.player, b.playerId, b.player_id, b.mlbam, b.mlbamId, b.mlbam_id, b.batter,
    b.player?.id, b.player?.playerId, b.player?.mlbamId
  ].filter(v => v !== null && v !== undefined);
  return firstNum(cand);
}

function parseYearsStr(s: string) {
  return s.split(',').map(x => parseInt(x.trim(), 10)).filter(Number.isFinite);
}

function pickYears(u: URL, body: any) {
  const sp = u.searchParams;
  const b = body || {};
  const listStr =
    sp.get('seasonIds') || sp.get('season_ids') || sp.get('seasons') || sp.get('years') || sp.get('ids') ||
    sp.get('season') || sp.get('year') || '';
  let years: number[] = [];
  if (listStr) years = parseYearsStr(listStr);
  if (!years.length) {
    const pathNums = numsFromPath(u);
    const fromPathYears = pathNums.filter(n => n >= 1900 && n <= 2100);
    if (fromPathYears.length) years = fromPathYears;
  }
  if (!years.length && Number.isFinite(Number(b.season))) years = [Number(b.season)];
  if (!years.length && Array.isArray(b.ids)) years = b.ids.map((n: any) => Number(n)).filter(Number.isFinite);
  if (!years.length && Array.isArray(b.seasons)) years = b.seasons.map((n: any) => Number(n)).filter(Number.isFinite);
  return years;
}

function toRow(d: any) {
  const s = d.stats;
  const avg = s.AB ? Number((s.H / s.AB).toFixed(3)) : 0;
  return { season: d.season, PA: s.PA, AB: s.AB, H: s.H, AVG: avg, OBP: s.OBP, SLG: s.SLG, OPS: s.OPS, HR: s.HR, BB: s.BB, SO: s.SO };
}

async function handle(u: URL, body: any, method: string) {
  const id = pickId(u, body);
  const years = pickYears(u, body);
  console.log('[biolab/hitters]', method, u.pathname + u.search, { id, years, body: Object.keys(body || {}).length });
  if (!Number.isFinite(id) || !years.length) return NextResponse.json({ ids: [], rows: [] });
  const rows = [];
  for (const y of years) {
    const d = await getHitterSeason(id, y);
    rows.push(toRow(d));
  }
  return NextResponse.json({ ids: years, rows });
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  return handle(u, {}, 'GET');
}

export async function POST(req: Request) {
  const u = new URL(req.url);
  const body = await req.json().catch(() => ({}));
  return handle(u, body, 'POST');
}
