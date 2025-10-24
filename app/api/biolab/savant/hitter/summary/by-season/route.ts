import { NextResponse } from 'next/server';

const PCT_KEYS = ['hard','sweet','barrel','swing','whiff','chase','zone','fps','gb','ld','fb'];

export async function GET(req: Request) {
  const u = new URL(req.url);
  const id = u.searchParams.get('id') ?? '';
  const seasons = u.searchParams.get('seasons') ?? '';
  const base = process.env.PY_SVC_URL ?? 'http://localhost:7010';
  const url = `${base}/statcast/summary/by-season?id=${encodeURIComponent(id)}&seasons=${encodeURIComponent(seasons)}`;

  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) return NextResponse.json({ rows: [] });

  const data = await r.json();
  const rows = Array.isArray(data.rows) ? data.rows : [];

  const fixed = rows.map((row: any) => {
    const out: any = { ...row };
    for (const k of PCT_KEYS) {
      const v = Number(out[k]);
      if (Number.isFinite(v)) out[k] = v / 100; // 2310.0 -> 23.1
    }
    return out;
  });

  return NextResponse.json({ rows: fixed });
}
