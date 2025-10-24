export type StatcastRow = Record<string, any>;

function mean(nums: number[]) {
  if (!nums.length) return 0;
  let s = 0;
  for (const n of nums) s += n;
  return s / nums.length;
}

function quantile(nums: number[], q: number) {
  if (!nums.length) return 0;
  const a = nums.slice().sort((x, y) => x - y);
  const i = Math.min(a.length - 1, Math.max(0, Math.floor(q * (a.length - 1))));
  return a[i];
}

function isNum(x: any) {
  return typeof x === "number" && Number.isFinite(x);
}

function isSwing(desc: string | null, typeVal: string | null) {
  const d = (desc || "").toLowerCase();
  const t = (typeVal || "").toUpperCase();
  if (t === "X") return true;
  return d.includes("swing") || d.startsWith("foul") || d.includes("hit_into_play");
}

function isWhiff(desc: string | null) {
  const d = (desc || "").toLowerCase();
  return d.startsWith("swinging_strike");
}

function isStrike(desc: string | null, typeVal: string | null) {
  const d = (desc || "").toLowerCase();
  const t = (typeVal || "").toUpperCase();
  if (t === "X") return true;
  return d.includes("called_strike") || d.startsWith("swinging_strike") || d.startsWith("foul");
}

function inZone(zone: any) {
  const z = Number(zone);
  return Number.isFinite(z) && z >= 1 && z <= 9;
}

function isBarrel(ev: number, la: number) {
  if (!isNum(ev) || !isNum(la)) return false;
  if (ev < 98) return false;
  const ranges: Record<number, [number, number]> = {
    98: [26, 30],
    99: [25, 31],
    100: [24, 33],
    101: [23, 35],
    102: [22, 36],
  };
  const key = Math.min(102, Math.floor(ev));
  const [lo, hi] = ranges[key] || [21, 39];
  return la >= lo && la <= (ev >= 103 ? 39 : hi);
}

export function summarizeStatcast(rows: StatcastRow[]) {
  const pitches = rows.length;

  const bbe = rows.filter(r => isNum(r.launch_speed) && isNum(r.launch_angle));
  const evs = bbe.map(r => Number(r.launch_speed));
  const las = bbe.map(r => Number(r.launch_angle));
  const hard = bbe.filter(r => Number(r.launch_speed) >= 95).length;
  const sweet = bbe.filter(r => {
    const la = Number(r.launch_angle);
    return la >= 8 && la <= 32;
  }).length;
  const barrels = bbe.filter(r => isBarrel(Number(r.launch_speed), Number(r.launch_angle))).length;

  const evAvg = mean(evs);
  const evMax = evs.length ? Math.max(...evs) : 0;
  const ev95 = quantile(evs, 0.95);
  const laAvg = mean(las);
  const hardHitPct = bbe.length ? hard / bbe.length : 0;
  const sweetSpotPct = bbe.length ? sweet / bbe.length : 0;
  const barrelPct = bbe.length ? barrels / bbe.length : 0;

  const xwobaVals = rows.map(r => Number(r.estimated_woba_using_speedangle)).filter(isNum);
  const xbaVals = rows.map(r => Number(r.estimated_ba_using_speedangle)).filter(isNum);
  const xslgVals = rows.map(r => Number((r as any).estimated_slg_using_speedangle)).filter(isNum);
  const xwOBA = mean(xwobaVals);
  const xBA = mean(xbaVals);
  const xSLG = xslgVals.length ? mean(xslgVals) : 0;

  const swings = rows.filter(r => isSwing(r.description ?? null, r.type ?? null)).length;
  const whiffs = rows.filter(r => isWhiff(r.description ?? null)).length;

  let inZonePitches = 0;
  let outZonePitches = 0;
  let swingsOZ = 0;
  for (const r of rows) {
    const z = r.zone;
    if (inZone(z)) inZonePitches++;
    else outZonePitches++;
    if (!inZone(z) && isSwing(r.description ?? null, r.type ?? null)) swingsOZ++;
  }

  const swingPct = pitches ? swings / pitches : 0;
  const whiffPct = swings ? whiffs / swings : 0;
  const zonePct = pitches ? inZonePitches / pitches : 0;
  const chasePct = outZonePitches ? swingsOZ / outZonePitches : 0;

  const firsts = new Map<string, StatcastRow>();
  for (const r of rows) {
    const pk = String(r.game_pk ?? "") + "|" + String(r.at_bat_number ?? "");
    const pn = Number(r.pitch_number ?? 0);
    const prev = firsts.get(pk);
    if (!prev || Number(prev.pitch_number ?? 9999) > pn) firsts.set(pk, r);
  }
  let fpsTotal = 0;
  let fpsStrikes = 0;
  for (const r of firsts.values()) {
    fpsTotal++;
    if (isStrike(r.description ?? null, r.type ?? null)) fpsStrikes++;
  }
  const firstPitchStrikePct = fpsTotal ? fpsStrikes / fpsTotal : 0;

  const bbType = (bbe.map(r => String(r.bb_type || "").toLowerCase()));
  const gb = bbType.filter(t => t === "ground_ball").length;
  const ld = bbType.filter(t => t === "line_drive").length;
  const fb = bbType.filter(t => t === "fly_ball").length;
  const pu = bbType.filter(t => t === "popup").length;
  const gbPct = bbe.length ? gb / bbe.length : 0;
  const ldPct = bbe.length ? ld / bbe.length : 0;
  const fbPct = bbe.length ? fb / bbe.length : 0;
  const puPct = bbe.length ? pu / bbe.length : 0;

  return {
    samples: { pitches, bbe: bbe.length },
    quality: { evAvg, evMax, ev95, laAvg, hardHitPct, sweetSpotPct, barrelPct },
    xstats: { xwOBA, xBA, xSLG },
    discipline: { swingPct, whiffPct, chasePct, zonePct, firstPitchStrikePct },
    battedBall: { gbPct, ldPct, fbPct, puPct }
  };
}
