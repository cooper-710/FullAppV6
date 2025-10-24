export type SeasonRow = {
  season: number; PA: number; AB: number; H: number;
  AVG: number; OBP: number; SLG: number; OPS: number;
  HR: number; BB: number; SO: number;
};

export type SavantRow = {
  season: number;
  bbe: number;
  ev: number; evMax: number; la: number;
  hard: number; sweet: number; barrel: number;
  xwOBA: number; xBA: number; xSLG: number;
  swing: number; whiff: number; chase: number; zone: number; fps: number;
  gb: number; ld: number; fb: number;
};

const isNum = (x: any) => Number.isFinite(Number(x));
const mph = (x: any) => (isNum(x) ? `${Number(x).toFixed(1)} mph` : '–');
const deg = (x: any) => (isNum(x) ? `${Number(x).toFixed(1)}°` : '–');
const pct = (x: any) => {
  const n = Number(x);
  if (!Number.isFinite(n)) return '–';
  const v = n > 1 ? n : n * 100;
  return `${v.toFixed(1)}%`;
};
const th = (x: any) => (isNum(x) ? String(Number(x).toFixed(3)).replace(/^0/, '') : '–');

export function formatSavantRows(rows: SavantRow[]) {
  return (rows ?? []).map(r => ({
    season: r.season,
    EV: mph(r.ev),
    'Max EV': mph(r.evMax),
    LA: deg(r.la),
    'HardHit%': pct(r.hard),
    'SweetSpot%': pct(r.sweet),
    'Barrel%': pct(r.barrel),
    xwOBA: th(r.xwOBA),
    xBA: th(r.xBA),
    xSLG: th(r.xSLG),
    'Swing%': pct(r.swing),
    'Whiff%': pct(r.whiff),
    'Chase%': pct(r.chase),
    'Zone%': pct(r.zone),
    'FPS%': pct(r.fps),
    'GB%': pct(r.gb),
    'LD%': pct(r.ld),
    'FB%': pct(r.fb),
  }));
}

export function computeDashboard(rows: SeasonRow[]) {
  const sum = <K extends keyof SeasonRow>(k: K) =>
    (rows ?? []).reduce((t, r) => t + (Number((r as any)[k]) || 0), 0);
  const avg = <K extends keyof SeasonRow>(k: K) => {
    const n = (rows ?? []).length || 1;
    const s = (rows ?? []).reduce((t, r) => t + (Number((r as any)[k]) || 0), 0);
    return Number((s / n).toFixed(3));
  };
  return {
    PA: sum('PA'),
    AB: sum('AB'),
    H: sum('H'),
    AVG: avg('AVG'),
    OBP: avg('OBP'),
    SLG: avg('SLG'),
    OPS: avg('OPS'),
    HR: sum('HR'),
    BB: sum('BB'),
    SO: sum('SO'),
  };
}
