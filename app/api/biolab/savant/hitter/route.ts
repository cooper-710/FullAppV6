import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getStatcastHitter } from '@/lib/savant';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Q = z.object({
  id: z.coerce.number().int().positive(),
  start: z.string().min(8),
  end: z.string().min(8),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const p = Q.safeParse({
    id: searchParams.get('id'),
    start: searchParams.get('start') ?? `${new Date().getFullYear()}-03-01`,
    end: searchParams.get('end') ?? `${new Date().getFullYear()}-11-30`,
  });
  if (!p.success) return NextResponse.json({ error: 'bad params' }, { status: 400 });
  const data = await getStatcastHitter(p.data.id, p.data.start, p.data.end);
  return NextResponse.json(data);
}
