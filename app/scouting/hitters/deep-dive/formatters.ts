export type SavantRow = {
  season: number
  bbe: number
  ev: number
  evMax: number
  la: number
  hard: number
  sweet: number
  barrel: number
  xwOBA: number
  xBA: number
  xSLG: number
  swing: number
  whiff: number
  chase: number
  zone: number
  fps: number
  gb: number
  ld: number
  fb: number
}

const num = (x: any) => Number(x ?? 0)
const round = (x: any, d = 1) => {
  const v = num(x)
  if (!Number.isFinite(v)) return 0
  const p = 10 ** d
  return Math.round(v * p) / p
}

// If value already looks like a percentage (e.g., 28.6) keep it,
// otherwise convert from fraction (e.g., 0.286 -> 28.6)
const normalizePct = (x: any) => {
  const v = num(x)
  if (!Number.isFinite(v)) return 0
  return v > 1.5 ? v : v * 100
}

export function formatSavantRows(rows: SavantRow[]) {
  return rows.map(r => ({
    season: r.season,
    bbe: num(r.bbe),
    ev: round(r.ev, 1),
    evMax: round(r.evMax, 1),
    la: round(r.la, 1),
    hard: round(normalizePct(r.hard), 1),
    sweet: round(normalizePct(r.sweet), 1),
    barrel: round(normalizePct(r.barrel), 1),
    xwOBA: round(r.xwOBA, 3),
    xBA: round(r.xBA, 3),
    xSLG: round(r.xSLG, 3),
    swing: round(normalizePct(r.swing), 1),
    whiff: round(normalizePct(r.whiff), 1),
    chase: round(normalizePct(r.chase), 1),
    zone: round(normalizePct(r.zone), 1),
    fps: round(normalizePct(r.fps), 1),
    gb: round(normalizePct(r.gb), 1),
    ld: round(normalizePct(r.ld), 1),
    fb: round(normalizePct(r.fb), 1),
  }))
}

export type SeasonRow = {
  season: number
  PA: number
  AB: number
  H: number
  AVG: number
  OBP: number
  SLG: number
  OPS: number
  HR: number
  BB: number
  SO: number
}

export function computeDashboard(rows: SeasonRow[]) {
  const rowsLen = rows.length || 0
  const sum = <K extends keyof SeasonRow>(k: K) =>
    rows.reduce((t, r) => t + (Number(r[k]) || 0), 0)

  return {
    'PA': sum('PA'),
    'AB': sum('AB'),
    'H': sum('H'),
    'AVG': rowsLen ? round(sum('AVG') / rowsLen, 3) : 0,
    'OBP': rowsLen ? round(sum('OBP') / rowsLen, 3) : 0,
    'SLG': rowsLen ? round(sum('SLG') / rowsLen, 3) : 0,
    'OPS': rowsLen ? round(sum('OPS') / rowsLen, 3) : 0,
    'HR': sum('HR'),
    'BB': sum('BB'),
    'SO': sum('SO'),
  }
}
