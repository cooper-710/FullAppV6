export const dynamic = 'force-dynamic';

export async function GET(request: Request, ctx: { params: { path?: string[] } }) {
  const p = ctx.params?.path ?? [];
  const upstream = new URL('http://127.0.0.1:5055/' + p.join('/'));
  upstream.search = new URL(request.url).search;
  const r = await fetch(upstream, { cache: 'no-store' });
  const body = await r.text();
  return new Response(body, {
    status: r.status,
    headers: { 'content-type': r.headers.get('content-type') || 'application/json' },
  });
}
