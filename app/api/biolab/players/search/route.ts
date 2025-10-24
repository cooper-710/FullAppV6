import { NextResponse } from "next/server";
import { z } from "zod";
import { searchPlayer } from "@/lib/mlb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Q = z.object({ q: z.string().min(2) });
const PY_BASE = process.env.PY_SVC_URL ?? "http://localhost:7000";

function norm(s: string) {
  return s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function includeAllTokens(name: string, tokens: string[]) {
  for (const t of tokens) if (t && !name.includes(t)) return false;
  return true;
}

async function lookupViaPy(q: string) {
  const tokens = norm(q).split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return [];
  const first = tokens[0];
  const last = tokens.slice(1).join(" ");
  const url = `${PY_BASE}/players/lookup?first=${encodeURIComponent(first)}&last=${encodeURIComponent(last)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  const items = Array.isArray(data.items) ? data.items : [];
  return items
    .filter((x: any) => x.mlbam)
    .map((x: any) => ({
      id: Number(x.mlbam),
      name: `${x.first} ${x.last}`.trim(),
      team: null,
      pos: null,
      exact: true
    }));
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsed = Q.safeParse({ q: searchParams.get("q") ?? "" });
  if (!parsed.success) return NextResponse.json({ items: [] });

  const raw = parsed.data.q;
  const q = norm(raw);
  const tokens = q.split(/\s+/).filter(Boolean);

  const viaPy = await lookupViaPy(raw);

  const queries = new Set<string>();
  queries.add(raw);
  queries.add(q);
  queries.add(tokens.join(" "));
  queries.add(tokens.join("-"));

  const byId = new Map<number, any>();
  for (const v of Array.from(queries)) {
    try {
      const res = await searchPlayer(v);
      for (const r of res) {
        const id = Number(r.id);
        const name = String(r.fullName || "");
        if (!id || !name) continue;
        const n = norm(name);
        if (!includeAllTokens(n, tokens)) continue;
        if (!byId.has(id)) {
          byId.set(id, {
            id,
            name,
            team: r.currentTeam?.abbreviation ?? r.currentTeam?.name ?? null,
            pos: r.primaryPosition?.abbreviation ?? r.primaryPosition?.name ?? null,
            exact: n === q
          });
        } else {
          const cur = byId.get(id);
          if (!cur.team && (r.currentTeam?.abbreviation || r.currentTeam?.name)) {
            cur.team = r.currentTeam?.abbreviation ?? r.currentTeam?.name;
          }
          if (!cur.pos && (r.primaryPosition?.abbreviation || r.primaryPosition?.name)) {
            cur.pos = r.primaryPosition?.abbreviation ?? r.primaryPosition?.name;
          }
        }
      }
    } catch {}
  }

  const merged = new Map<number, any>();
  for (const it of viaPy) merged.set(it.id, it);
  for (const it of byId.values()) if (!merged.has(it.id)) merged.set(it.id, it);

  const scored = Array.from(merged.values()).map((r) => {
    const n = norm(r.name);
    let score = 0;
    if (r.exact || n === q) score += 1000;
    let tokenHits = 0;
    for (const t of tokens) {
      if (t && n.includes(t)) tokenHits++;
      if (t && n.startsWith(t)) score += 2;
    }
    score += tokenHits * 5;
    return { r, score };
  }).sort((a,b)=>b.score-a.score);

  const items = scored.slice(0, 20).map(({ r }) => ({
    id: r.id,
    name: r.name,
    team: r.team ?? null,
    pos: r.pos ?? null
  }));

  return NextResponse.json({ items });
}
