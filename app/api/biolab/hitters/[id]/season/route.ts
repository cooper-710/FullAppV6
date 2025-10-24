import { NextResponse } from 'next/server';
import { getHitterSeason } from '@/lib/mlb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function toRow(d: any) {
  const s = d.stats;
  const avg = s.AB ? Number((s.H / s.AB).toFixed(3)) : 0;
  return { season: d.season, PA: s.PA, AB: s.AB, H: s.H, AVG: avg, OBP: s.OBP, SLG: s.SLG, OPS: s.OPS, HR: s.HR, BB: s.BB, SO: s.SO };
}

async function run(id: number, years: number[]) {
  const rows: any[] = [];
  for (const y of years) {
    const d = await getHitterSeason(id, y);
    rows.push(toRow(d));
  }
  const payload = { ok: true, ids: years, rows, row: rows[0] ?? null, data: { ids: years, rows } };
  return NextResponse.json(payload);
}

export async function GET(req: Request, ctx: { params: { id: string } }) {
  const u = new URL(req.url);
  const id = Number(ctx.params.id);
  const sList = u.searchParams.get('ids') || u.searchParams.get('seasons') || u.searchParams.get('years');
  const sOne = u.searchParams.get('season') || u.searchParams.get('year');
  let years: number[] = [];
  if (sList) years = sList.split(',').map(x => parseInt(x.trim(), 10)).filter(Number.isFinite);
  if (!years.length && sOne) years = [Number(sOne)];
  if (!Number.isFinite(id) || !years.length) return NextResponse.json({ ok: true, ids: [], rows: [], row: null, data: { ids: [], rows: [] } });
  return run(id, years);
}

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const id = Number(ctx.params.id);
  const body = await req.json().catch(() => ({} as any));
  let years: number[] = [];
  if (Array.isArray(body.ids)) years = body.ids.map((n: any) => Number(n)).filter(Number.isFinite);
  if (!years.length && Array.isArray(body.seasons)) years = body.seasons.map((n: any) => Number(n)).filter(Number.isFinite);
  if (!years.length && Number.isFinite(Number(body.season))) years = [Number(body.season)];
  if (!Number.isFinite(id) || !years.length) return NextResponse.json({ ok: true, ids: [], rows: [], row: null, data: { ids: [], rows: [] } });
  return run(id, years);
}
