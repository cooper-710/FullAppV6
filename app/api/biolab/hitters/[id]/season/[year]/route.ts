import { NextResponse } from 'next/server';
import { getHitterSeason } from '@/lib/mlb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function toRow(d: any) {
  const s = d.stats;
  const avg = s.AB ? Number((s.H / s.AB).toFixed(3)) : 0;
  return { season: d.season, PA: s.PA, AB: s.AB, H: s.H, AVG: avg, OBP: s.OBP, SLG: s.SLG, OPS: s.OPS, HR: s.HR, BB: s.BB, SO: s.SO };
}

export async function GET(req: Request, ctx: { params: { id: string; year: string } }) {
  const id = Number(ctx.params.id);
  const year = Number(ctx.params.year);
  if (!Number.isFinite(id) || !Number.isFinite(year)) return NextResponse.json({ ok: true, ids: [], rows: [], row: null, data: { ids: [], rows: [] } });
  const d = await getHitterSeason(id, year);
  const row = toRow(d);
  return NextResponse.json({ ok: true, ids: [year], rows: [row], row, data: { ids: [year], rows: [row] } });
}
