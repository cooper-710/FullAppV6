from __future__ import annotations
from pathlib import Path
import hashlib
import pandas as pd
from pybaseball import statcast_pitcher, statcast_batter
import statsapi

CACHE_DIR = Path("build/cache/savant")
CACHE_DIR.mkdir(parents=True, exist_ok=True)

def _hash_key(*parts) -> Path:
    h = hashlib.sha256("|".join(map(str, parts)).encode()).hexdigest()
    return CACHE_DIR / f"{h}.parquet"

def fetch_pitcher_statcast(pitcher_id: int, start: str, end: str) -> pd.DataFrame:
    key = _hash_key("pitcher", pitcher_id, start, end)
    if key.exists():
        return pd.read_parquet(key)
    df = statcast_pitcher(start, end, pitcher_id)
    if df is None:
        df = pd.DataFrame()
    df.to_parquet(key, index=False)
    return df

def lookup_batter_id(name: str) -> int:
    people = statsapi.lookup_player(name)
    if not people:
        raise ValueError(f"Could not locate MLBAM id for hitter: {name}")
    return int(people[0]["id"])

def fetch_batter_statcast(batter_id: int, start: str, end: str) -> pd.DataFrame:
    key = _hash_key("batter", batter_id, start, end)
    if key.exists():
        return pd.read_parquet(key)
    df = statcast_batter(start, end, batter_id)
    if df is None:
        df = pd.DataFrame()
    df.to_parquet(key, index=False)
    return df

def lookup_pitcher_id(q: str):
    q = (q or "").strip()
    if q.isdigit():
        return {"items": [{"id": int(q), "name": q}]}
    return {"items": []}



import pandas as pd
import numpy as np

_WOBA_CONSTS = {
    2019: dict(wBB=0.690, wHBP=0.719, w1B=0.877, w2B=1.232, w3B=1.549, wHR=2.031, scale=1.200, lg_woba=0.320, lgRPA=0.126),
    2020: dict(wBB=0.690, wHBP=0.719, w1B=0.877, w2B=1.232, w3B=1.549, wHR=2.031, scale=1.190, lg_woba=0.320, lgRPA=0.125),
    2021: dict(wBB=0.688, wHBP=0.720, w1B=0.877, w2B=1.240, w3B=1.568, wHR=2.010, scale=1.178, lg_woba=0.314, lgRPA=0.120),
    2022: dict(wBB=0.688, wHBP=0.720, w1B=0.878, w2B=1.242, w3B=1.569, wHR=2.007, scale=1.183, lg_woba=0.310, lgRPA=0.118),
    2023: dict(wBB=0.688, wHBP=0.720, w1B=0.880, w2B=1.247, w3B=1.578, wHR=2.013, scale=1.212, lg_woba=0.318, lgRPA=0.125),
    2024: dict(wBB=0.688, wHBP=0.720, w1B=0.880, w2B=1.247, w3B=1.578, wHR=2.013, scale=1.212, lg_woba=0.318, lgRPA=0.125),
    2025: dict(wBB=0.688, wHBP=0.720, w1B=0.880, w2B=1.247, w3B=1.578, wHR=2.013, scale=1.212, lg_woba=0.318, lgRPA=0.125),
}

def _ensure_season_col(df: pd.DataFrame) -> pd.DataFrame:
    if "season" in df.columns:
        return df
    if "game_date" in df.columns:
        df = df.copy()
        df["season"] = pd.to_datetime(df["game_date"]).dt.year
        return df
    return df

def summarize_hitter_seasons(events: pd.DataFrame) -> pd.DataFrame:
    if events is None or len(events) == 0:
        return pd.DataFrame()
    df = _ensure_season_col(events)
    df = df[df["events"].notna()].copy()

    df["is_1B"] = (df["events"] == "single").astype(int)
    df["is_2B"] = (df["events"] == "double").astype(int)
    df["is_3B"] = (df["events"] == "triple").astype(int)
    df["is_HR"] = (df["events"] == "home_run").astype(int)
    df["is_BB"] = (df["events"] == "walk").astype(int)
    df["is_IBB"] = (df.get("event", df["events"]) == "intent_walk").astype(int) if "event" in df.columns else 0
    df["is_HBP"] = (df["events"] == "hit_by_pitch").astype(int)
    df["is_SF"] = (df["events"].isin(["sac_fly","sac_fly_double_play"])).astype(int)
    df["is_SH"] = (df["events"] == "sac_bunt").astype(int)
    df["is_SO"] = (df["events"].str.startswith("strikeout")).astype(int)
    df["is_CI"] = (df["events"] == "catcher_interference").astype(int)

    gb = df.groupby("season", dropna=False)
    agg = gb.agg(
        PA=("events","count"),
        _1B=("is_1B","sum"),
        _2B=("is_2B","sum"),
        _3B=("is_3B","sum"),
        HR=("is_HR","sum"),
        BB=("is_BB","sum"),
        IBB=("is_IBB","sum") if isinstance(df["is_IBB"], pd.Series) else ("is_BB","sum"),
        HBP=("is_HBP","sum"),
        SF=("is_SF","sum"),
        SH=("is_SH","sum"),
        SO=("is_SO","sum"),
        CI=("is_CI","sum"),
    ).reset_index()

    agg["H"] = agg["_1B"] + agg["_2B"] + agg["_3B"] + agg["HR"]
    agg["UBB"] = agg["BB"] - agg["IBB"]
    agg["AB"] = agg["PA"] - agg["BB"] - agg["HBP"] - agg["SF"] - agg["SH"] - agg["CI"]
    agg["TB"] = agg["_1B"] + 2*agg["_2B"] + 3*agg["_3B"] + 4*agg["HR"]

    agg["AVG"] = np.where(agg["AB"]>0, agg["H"]/agg["AB"], np.nan)
    agg["OBP"] = np.where((agg["AB"]+agg["BB"]+agg["HBP"]+agg["SF"])>0,
                          (agg["H"]+agg["BB"]+agg["HBP"])/(agg["AB"]+agg["BB"]+agg["HBP"]+agg["SF"]), np.nan)
    agg["SLG"] = np.where(agg["AB"]>0, agg["TB"]/agg["AB"], np.nan)
    agg["OPS"] = agg["OBP"] + agg["SLG"]
    agg["ISO"] = agg["SLG"] - agg["AVG"]
    agg["BABIP"] = np.where((agg["AB"] - agg["SO"] - agg["HR"] + agg["SF"])>0,
                            (agg["H"] - agg["HR"]) / (agg["AB"] - agg["SO"] - agg["HR"] + agg["SF"]), np.nan)
    agg["BB%"] = np.where(agg["PA"]>0, agg["BB"]/agg["PA"], np.nan)
    agg["K%"]  = np.where(agg["PA"]>0, agg["SO"]/agg["PA"], np.nan)

    def _woba_row(r):
        c = _WOBA_CONSTS.get(int(r["season"]), _WOBA_CONSTS[2023])
        num = c["wBB"]*max(r["BB"]-r["IBB"],0) + c["wHBP"]*r["HBP"] + c["w1B"]*r["_1B"] + c["w2B"]*r["_2B"] + c["w3B"]*r["_3B"] + c["wHR"]*r["HR"]
        den = r["AB"] + max(r["BB"]-r["IBB"],0) + r["SF"] + r["HBP"]
        return num/den if den>0 else np.nan
    agg["wOBA"] = agg.apply(_woba_row, axis=1)

    if "estimated_woba_using_speedangle" in df.columns:
        xw = df.groupby("season")["estimated_woba_using_speedangle"].mean().rename("xwOBA").reset_index()
    else:
        xw = pd.DataFrame({"season": agg["season"], "xwOBA": np.nan})
    agg = agg.merge(xw, on="season", how="left")

    def _wrc_plus_row(r):
        c = _WOBA_CONSTS.get(int(r["season"]), _WOBA_CONSTS[2023])
        if pd.isna(r["wOBA"]) or r["PA"]<=0:
            return np.nan
        wRAA = ((r["wOBA"] - c["lg_woba"]) / c["scale"]) * r["PA"]
        return ((wRAA / r["PA"] + c["lgRPA"]) / c["lgRPA"]) * 100.0
    agg["wRC+"] = agg.apply(_wrc_plus_row, axis=1)

    cols = ["season","PA","AB","H","_1B","_2B","_3B","HR","BB","IBB","HBP","SF","SH","SO","AVG","OBP","SLG","OPS","ISO","BABIP","BB%","K%","wOBA","xwOBA","wRC+"]
    agg = agg[cols].sort_values("season")
    agg = agg.rename(columns={"_1B":"1B","_2B":"2B","_3B":"3B"})
    return agg

fetch_hitter_statcast = fetch_batter_statcast


# --- Compatibility wrappers (do not remove) ---
def _resolve_batter_id_kw(**kwargs):
    for k in ("batter","bid","player_id","pid","batter_id"):
        if k in kwargs and kwargs[k] is not None:
            return int(kwargs[k])
    raise ValueError("No batter id provided (expected one of batter, bid, player_id, pid, batter_id)")

def fetch_hitter_statcast(*, start:str, end:str, season_type:str="regular", cache:bool=True, **kwargs):
    batter = _resolve_batter_id_kw(**kwargs)
    # Delegate to the canonical function (already in this module)
    return fetch_batter_statcast(start=start, end=end, batter=batter, season_type=season_type, cache=cache)
