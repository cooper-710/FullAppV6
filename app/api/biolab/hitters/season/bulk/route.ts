import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getHitterSeason } from '@/lib/mlb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Q = z.object({
  id: z.coerce.number().int().positive(),
  seasons: z.string().min(1),
});

function toRow(d: any) {
  const s = d.stats;
  const avg = s.AB ? Number((s.H / s.AB).toFixed(3)) : 0;
  return {
    season: d.season,
    PA: s.PA,
    AB: s.AB,
    H: s.H,
    AVG: avg,
    OBP: s.OBP,
    SLG: s.SLG,
    OPS: s.OPS,
    HR: s.HR,
    BB: s.BB,
    SO: s.SO,
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const p = Q.safeParse({
    id: searchParams.get('id'),
    seasons: searchParams.get('seasons') ?? '',
  });
  if (!p.success) return NextResponse.json({ rows: [], ids: [] });
  const years = p.data.seasons.split(',').map(s => parseInt(s.trim(), 10)).filter(n => Number.isFinite(n));
  const out: any[] = [];
  for (const y of years) {
    const d = await getHitterSeason(p.data.id, y);
    out.push(toRow(d));
  }
  return NextResponse.json({ rows: out, ids: years });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const id = Number(body.id);
  const ids = Array.isArray(body.ids) ? body.ids : [];
  if (!Number.isFinite(id) || !ids.length) return NextResponse.json({ rows: [], ids: [] });
  const years: number[] = ids.map((n: any) => Number(n)).filter((n: number) => Number.isFinite(n));
  const out: any[] = [];
  for (const y of years) {
    const d = await getHitterSeason(id, y);
    out.push(toRow(d));
  }
  return NextResponse.json({ rows: out, ids: years });
}
