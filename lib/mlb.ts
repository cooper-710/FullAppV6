import { httpJSON } from './http';
import type { MLBPlayerId, PlayerIdentity, HitterSeason } from './types';

const BASE = 'https://statsapi.mlb.com/api/v1';

export async function searchPlayer(q: string): Promise<PlayerIdentity[]> {
  const url = `${BASE}/people/search?q=${encodeURIComponent(q)}&sportId=1`;
  const data = await httpJSON<{ people: any[] }>(url, { ttlMs: 86400000 });
  return (data.people ?? []).map(p => ({
    id: p.id,
    fullName: p.fullName,
    firstLastName: p.firstLastName,
    primaryNumber: p.primaryNumber,
    primaryPosition: p.primaryPosition,
    currentTeam: p.currentTeam,
  }));
}

export async function getHitterSeason(id: MLBPlayerId, season: number): Promise<HitterSeason> {
  const url = `${BASE}/people/${id}/stats?stats=season&group=hitting&season=${season}`;
  const data = await httpJSON<any>(url, { ttlMs: 21600000 });
  const splits = data?.stats?.[0]?.splits?.[0]?.stat ?? {};
  const n = (x: any) => Number(x ?? 0);
  return {
    playerId: id,
    season,
    teamId: data?.stats?.[0]?.splits?.[0]?.team?.id,
    stats: {
      PA: n(splits.plateAppearances),
      AB: n(splits.atBats),
      R: n(splits.runs),
      H: n(splits.hits),
      HR: n(splits.homeRuns),
      RBI: n(splits.rbi),
      BB: n(splits.baseOnBalls),
      SO: n(splits.strikeOuts),
      OBP: n(splits.obp),
      SLG: n(splits.slg),
      OPS: n(splits.ops),
    },
  };
}
