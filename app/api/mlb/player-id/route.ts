import { NextResponse } from 'next/server';
import { z } from 'zod';
import { searchPlayer } from '@/lib/mlb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Q = z.object({ q: z.string().min(2) });

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parse = Q.safeParse({ q: searchParams.get('q') ?? '' });
  if (!parse.success) return NextResponse.json({ error: 'q required' }, { status: 400 });
  const q = parse.data.q.trim();
  const results = await searchPlayer(q);
  if (results.length === 0 && q.includes(' ')) {
    const alt = q.replace(/\s+/g, '-');
    const retry = await searchPlayer(alt);
    return NextResponse.json(retry);
  }
  return NextResponse.json(results);
}
