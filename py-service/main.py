from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pybaseball import statcast_batter_exitvelo_barrels as evb, statcast_batter_expected_stats as xstats, cache
import pandas as pd, numpy as np

cache.enable()

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

def fnum(v, d=0.0):
    try:
        if v is None: return d
        if isinstance(v, (float, int)): return float(v) if np.isfinite(v) else d
        s = str(v).strip().lower()
        if s in ("", "nan", "inf", "-inf"): return d
        return float(s)
    except: return d

def pick_row(df: pd.DataFrame, pid: int):
    for k in ["player_id","playerid","batter","id","mlbam_id","key_mlbam"]:
        if k in df.columns:
            sub = df[df[k].astype(str) == str(pid)]
            if len(sub): return sub.iloc[0].to_dict()
    return {}

@app.get("/statcast/summary")
def statcast_summary(player_id: int, seasons: str):
    years = [int(y) for y in seasons.split(",") if y.strip().isdigit()]
    out = []
    for y in years:
        row = {"season": y, "bbe": 0, "ev": 0, "evMax": 0, "la": 0, "hard": 0, "sweet": 0, "barrel": 0, "xwOBA": 0, "xBA": 0, "xSLG": 0}
        try:
            de = evb(y)
            r = pick_row(de, player_id)
            if r:
                row["ev"]    = fnum(r.get("avg_hit_speed", r.get("avg_exitspeed", r.get("avg_ev"))))
                row["evMax"] = fnum(r.get("max_hit_speed", r.get("max_exitspeed", r.get("max_ev"))))
                row["la"]    = fnum(r.get("avg_launch_angle", r.get("avg_la", r.get("la_avg", 0))))
                row["hard"]  = fnum(r.get("hard_hit_percent", r.get("hardhit_percent", r.get("hardhit_pct", 0))))
                row["hard"]  = row["hard"]/100.0 if row["hard"]>1 else row["hard"]
                row["sweet"] = fnum(r.get("sweet_spot_percent", r.get("sweetspot_percent", r.get("sweetspot_pct", 0))))
                row["sweet"] = row["sweet"]/100.0 if row["sweet"]>1 else row["sweet"]
                row["barrel"]= fnum(r.get("brl_percent", r.get("barrel_percent", r.get("brl_pct", 0))))
                row["barrel"]= row["barrel"]/100.0 if row["barrel"]>1 else row["barrel"]
                row["bbe"]   = int(fnum(r.get("batted_balls", r.get("events", r.get("bip", 0))), 0))
        except Exception:
            pass
        try:
            dx = xstats(y, min_pa=0)
            r2 = pick_row(dx, player_id)
            if r2:
                row["xwOBA"] = fnum(r2.get("xwoba", r2.get("xwOBA")))
                row["xBA"]   = fnum(r2.get("xba", r2.get("xBA")))
                row["xSLG"]  = fnum(r2.get("xslg", r2.get("xSLG")))
        except Exception:
            pass
        out.append(row)
    out.sort(key=lambda r: r["season"])
    return {"rows": out}

@app.get("/healthz")
def healthz():
    return {"ok": True}
