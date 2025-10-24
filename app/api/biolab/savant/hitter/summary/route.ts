import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getStatcastHitter, getStatcastSeasons } from '@/lib/savant';
import { summarizeStatcast } from '@/lib/savantSummary';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Q = z.object({
  id: z.coerce.number().int().positive(),
  start: z.string().optional(),
  end: z.string().optional(),
  seasons: z.string().optional(),
});

function zero() {
  return NextResponse.json({
    ok: true,
    samples: { pitches: 0, bbe: 0 },
    quality: { evAvg: 0, evMax: 0, ev95: 0, laAvg: 0, hardHitPct: 0, sweetSpotPct: 0, barrelPct: 0 },
    xstats: { xwOBA: 0, xBA: 0, xSLG: 0 },
    discipline: { swingPct: 0, whiffPct: 0, chasePct: 0, zonePct: 0, firstPitchStrikePct: 0 },
    battedBall: { gbPct: 0, ldPct: 0, fbPct: 0, puPct: 0 }
  });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const p = Q.safeParse({
      id: searchParams.get('id'),
      start: searchParams.get('start') ?? undefined,
      end: searchParams.get('end') ?? undefined,
      seasons: searchParams.get('seasons') ?? undefined,
    });
    if (!p.success) return zero();

    const id = p.data.id;
    let rows: any[] = [];
    if (p.data.seasons) {
      const ys = p.data.seasons.split(',').map(s => parseInt(s.trim(), 10)).filter(n => Number.isFinite(n));
      if (!ys.length) return zero();
      rows = await getStatcastSeasons(id, ys);
    } else {
      const now = new Date().getFullYear();
      const start = p.data.start ?? `${now}-03-01`;
      const end = p.data.end ?? `${now}-11-30`;
      const r = await getStatcastHitter(id, start, end);
      rows = r.rows ?? [];
    }

    const summary = summarizeStatcast(rows || []);
    return NextResponse.json({ ok: true, ...summary });
  } catch {
    return zero();
  }
}
