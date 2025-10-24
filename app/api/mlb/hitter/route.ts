import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getHitterSeason } from '@/lib/mlb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Q = z.object({
  id: z.coerce.number().int().positive(),
  season: z.coerce.number().int().min(1900).max(2100),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsed = Q.safeParse({
    id: searchParams.get('id'),
    season: searchParams.get('season') ?? new Date().getFullYear(),
  });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  const data = await getHitterSeason(parsed.data.id, parsed.data.season);
  return NextResponse.json(data);
}
