import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getHitterSeason } from '@/lib/mlb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

const Q = z.object({
  id: z.coerce.number().int().positive(),
  season: z.coerce.number().int().optional(),
  seasons: z.string().optional(),
  years: z.string().optional(),
  ids: z.string().optional(),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsed = Q.safeParse({
    id: searchParams.get('id'),
    season: searchParams.get('season') ?? undefined,
    seasons: searchParams.get('seasons') ?? undefined,
    years: searchParams.get('years') ?? undefined,
    ids: searchParams.get('ids') ?? undefined,
  });
  if (!parsed.success) return NextResponse.json({ error: 'bad params' }, { status: 400 });

  const id = parsed.data.id;
  const listStr = parsed.data.seasons || parsed.data.years || parsed.data.ids || '';
  let years: number[] = listStr
    ? listStr.split(',').map(s => parseInt(s.trim(), 10)).filter(n => Number.isFinite(n))
    : [];

  if (!years.length && parsed.data.season) years = [Number(parsed.data.season)];

  if (!years.length) return NextResponse.json({ ids: [], rows: [] });

  const out = [];
  for (const y of years) {
    const d = await getHitterSeason(id, y);
    out.push(toRow(d));
  }

  if (out.length === 1) {
    const single = out[0];
    return NextResponse.json({ row: single, rows: [single], ids: years });
  }
  return NextResponse.json({ rows: out, ids: years });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const id = Number(body.id);
  const ids = Array.isArray(body.ids) ? body.ids : [];
  if (!Number.isFinite(id) || !ids.length) return NextResponse.json({ ids: [], rows: [] });
  const years: number[] = ids.map((n: any) => Number(n)).filter((n: number) => Number.isFinite(n));
  const out = [];
  for (const y of years) {
    const d = await getHitterSeason(id, y);
    out.push(toRow(d));
  }
  return NextResponse.json({ rows: out, ids: years });
}
