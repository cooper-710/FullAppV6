import sys, time, calendar, math
from io import StringIO
from typing import List, Dict
import pandas as pd
import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

BASE = "https://baseballsavant.mlb.com/statcast_search/csv"
MLB = "https://statsapi.mlb.com/api/v1/people/"
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17 Safari/605.1.15"}

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

def _params(player: str, start: str, end: str) -> Dict[str, str]:
    return {
        "all":"true",
        "type":"details",
        "hfGT":"R|",
        "player_type":"batter",
        "player": player,
        "game_date_gt": start,
        "game_date_lt": end,
    }

def _fetch_csv(player_token: str, start: str, end: str) -> pd.DataFrame:
    for _ in range(3):
        try:
            r = requests.get(BASE, params=_params(player_token, start, end), headers=UA, timeout=60)
            if r.ok and r.text.strip():
                return pd.read_csv(StringIO(r.text))
        except Exception:
            time.sleep(2)
    return pd.DataFrame()

def _name_for_id(pid: int) -> str:
    r = requests.get(f"{MLB}{pid}", headers=UA, timeout=20)
    r.raise_for_status()
    d = r.json()
    return d["people"][0]["fullName"]

def _col(df: pd.DataFrame, key: str) -> pd.Series:
    for c in df.columns:
        if key.lower() in c.lower():
            return df[c]
    return pd.Series([], dtype="float64")

def _barrel(row) -> bool:
    ev = row.get("launch_speed")
    la = row.get("launch_angle")
    if pd.isna(ev) or pd.isna(la):
        return False
    if ev >= 98 and 26 <= la <= 30:
        return True
    if ev >= 99 and 25 <= la <= 31:
        return True
    if ev >= 100 and 24 <= la <= 33:
        return True
    return False

def _season_row(df: pd.DataFrame, season: int) -> Dict[str, float]:
    if df.empty:
        return {
            "season": season, "bbe": 0, "ev": 0, "evMax": 0, "la": 0,
            "hard": 0, "sweet": 0, "barrel": 0,
            "xwOBA": 0, "xBA": 0, "xSLG": 0,
            "swing": 0, "whiff": 0, "chase": 0, "zone": 0, "fps": 0,
            "gb": 0, "ld": 0, "fb": 0
        }

    ls = _col(df, "launch_speed")
    la = _col(df, "launch_angle")
    est_woba = _col(df, "estimated_woba")
    est_ba = _col(df, "estimated_ba")
    est_slg = _col(df, "estimated_slg")
    bb_type = _col(df, "bb_type")

    m = pd.DataFrame({"launch_speed": ls, "launch_angle": la})
    m = m.dropna(subset=["launch_speed", "launch_angle"])
    bbe = int(len(m))

    if bbe == 0:
        return _season_row(pd.DataFrame(), season)

    ev_avg = float(round(m["launch_speed"].mean(), 1))
    ev_max = float(round(m["launch_speed"].max(), 1))
    la_avg = float(round(m["launch_angle"].mean(), 1))
    hard = float(round((m["launch_speed"] >= 95).mean() * 100, 1))
    sweet = float(round(((m["launch_angle"] >= 8) & (m["launch_angle"] <= 32)).mean() * 100, 1))
    barrel = float(round(m.apply(_barrel, axis=1).mean() * 100, 1))

    xwoba = float(round(est_woba.mean(), 3)) if len(est_woba) else 0.0
    xba = float(round(est_ba.mean(), 3)) if len(est_ba) else 0.0
    xslg = float(round(est_slg.mean(), 3)) if len(est_slg) else 0.0

    gb = float(round((bb_type.str.contains("ground", case=False, na=False)).mean() * 100, 1)) if len(bb_type) else 0.0
    ld = float(round((bb_type.str.contains("line", case=False, na=False)).mean() * 100, 1)) if len(bb_type) else 0.0
    fb = float(round((bb_type.str.contains("fly", case=False, na=False)).mean() * 100, 1)) if len(bb_type) else 0.0

    return {
        "season": season, "bbe": bbe, "ev": ev_avg, "evMax": ev_max, "la": la_avg,
        "hard": hard, "sweet": sweet, "barrel": barrel,
        "xwOBA": xwoba, "xBA": xba, "xSLG": xslg,
        "swing": 0.0, "whiff": 0.0, "chase": 0.0, "zone": 0.0, "fps": 0.0,
        "gb": gb, "ld": ld, "fb": fb
    }

def get_batter_season(pid: int, season: int) -> Dict[str, float]:
    start = f"{season}-03-01"
    end = f"{season}-11-30"

    df = _fetch_csv(str(pid), start, end)
    if df.empty:
        try:
            name = _name_for_id(pid)
            df = _fetch_csv(name, start, end)
        except Exception:
            df = pd.DataFrame()

    return _season_row(df, season)

@app.get("/healthz")
def healthz(): return {"ok": True}

@app.get("/statcast/summary")
def summary(player_id: int, seasons: str):
    try:
        ys = [int(x) for x in seasons.split(",") if x.strip()]
        rows = [get_batter_season(player_id, y) for y in ys]
        rows.sort(key=lambda r: r["season"])
        return {"rows": rows}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
