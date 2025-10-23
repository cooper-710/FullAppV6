import math
import numpy as np
import pandas as pd

HIT_EVENTS = {"single","double","triple","home_run"}
AB_EVENTS_INC = {"single","double","triple","home_run","field_out","force_out","other_out","grounded_into_double_play","field_error","double_play","triple_play"}
AB_EVENTS_EXC = {"walk","intent_walk","hit_by_pitch","sac_bunt","sac_fly","catcher_interf"}
BB_EVENTS = {"walk","intent_walk"}
SF_EVENTS = {"sac_fly"}
HBP_EVENTS = {"hit_by_pitch"}

def _dedupe_pas(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df
    g = df.sort_values(["game_pk","at_bat_number","pitch_number"]).drop_duplicates(["game_pk","at_bat_number","batter"], keep="last")
    return g

def _is_zone(row):
    return (abs(row.get("plate_x", np.nan)) <= 0.83) and (row.get("plate_z", np.nan) >= row.get("sz_bot", np.nan)) and (row.get("plate_z", np.nan) <= row.get("sz_top", np.nan))

def _is_swing(desc, typ):
    if typ in ("X",): 
        return True
    if typ in ("S",) and isinstance(desc,str) and "called_strike" not in desc:
        return True
    return False

def _is_whiff(desc):
    return isinstance(desc,str) and ("swinging_strike" in desc or "swinging_strike_blocked" in desc or "missed_bunt" in desc)

def _is_ball_in_play(typ):
    return typ == "X"

def _barrel_like(ev, la):
    if pd.isna(ev) or pd.isna(la):
        return False
    if ev < 98:
        return False
    return 26 <= la <= 30

def season_rollup(events: pd.DataFrame) -> pd.DataFrame:
    if events.empty:
        return pd.DataFrame(columns=["batter","player_name","season","PA","AB","H","AVG","OBP","SLG","ISO","BABIP","EV","LA","HardHitPct","BarrelPct","WhiffSwingPct","ChasePct","xwOBA","xBA","xSLG"])
    ev = events.copy()
    ev["in_zone"] = ev.apply(_is_zone, axis=1)
    ev["is_swing"] = ev.apply(lambda r: _is_swing(r.get("description",""), r.get("type","")), axis=1)
    ev["is_whiff"] = ev["description"].astype(str).apply(_is_whiff)
    ev["is_bip"] = ev["type"].astype(str).apply(_is_ball_in_play)
    ev["hard_hit"] = ev["launch_speed"].astype(float) >= 95
    ev["barrel_like"] = ev.apply(lambda r: _barrel_like(r.get("launch_speed",np.nan), r.get("launch_angle",np.nan)), axis=1)
    pas = _dedupe_pas(ev)
    e = pas["events"].fillna("")
    ab_mask = e.isin(list(AB_EVENTS_INC)) & (~e.isin(list(AB_EVENTS_EXC)))
    h_mask = e.isin(list(HIT_EVENTS))
    bb_mask = e.isin(list(BB_EVENTS))
    sf_mask = e.isin(list(SF_EVENTS))
    hbp_mask = e.isin(list(HBP_EVENTS))
    pa = len(pas)
    ab = int(ab_mask.sum())
    h = int(h_mask.sum())
    bb = int(bb_mask.sum())
    sf = int(sf_mask.sum())
    hbp = int(hbp_mask.sum())
    tb = int((e=="single").sum()*1 + (e=="double").sum()*2 + (e=="triple").sum()*3 + (e=="home_run").sum()*4)
    avg = round(h/ab,3) if ab>0 else 0.0
    obp = round((h+bb+hbp)/(ab+bb+hbp+sf),3) if (ab+bb+hbp+sf)>0 else 0.0
    slg = round(tb/ab,3) if ab>0 else 0.0
    iso = round(slg-avg,3) if ab>0 else 0.0
    bip = ev[ev["is_bip"]]
    hard = round((bip["hard_hit"].sum()/len(bip)),3) if len(bip)>0 else 0.0
    barrel = round((bip["barrel_like"].sum()/len(bip)),3) if len(bip)>0 else 0.0
    swings = ev[ev["is_swing"]]
    whiff = round((swings["is_whiff"].sum()/len(swings)),3) if len(swings)>0 else 0.0
    chase = round((swings[~swings["in_zone"]].shape[0]/len(swings)),3) if len(swings)>0 else 0.0
    ev_mean = round(ev["launch_speed"].dropna().mean(),1) if "launch_speed" in ev else 0.0
    la_mean = round(ev["launch_angle"].dropna().mean(),1) if "launch_angle" in ev else 0.0
    xwoba = round(ev["estimated_woba_using_speedangle"].dropna().mean(),3) if "estimated_woba_using_speedangle" in ev else 0.0
    xba = round(ev["estimated_ba_using_speedangle"].dropna().mean(),3) if "estimated_ba_using_speedangle" in ev else 0.0
    xslg = round(ev["estimated_slg_using_speedangle"].dropna().mean(),3) if "estimated_slg_using_speedangle" in ev else 0.0
    season = int(events["game_year"].iloc[0])
    row = {
        "batter": int(events["batter"].iloc[0]),
        "player_name": str(events["player_name"].iloc[0]),
        "season": season,
        "PA": pa,
        "AB": ab,
        "H": h,
        "AVG": avg,
        "OBP": obp,
        "SLG": slg,
        "ISO": iso,
        "BABIP": round(((h - (e=="home_run").sum())/(ab - swings["is_whiff"].sum() - (e=="home_run").sum() + sf)),3) if (ab - swings["is_whiff"].sum() - (e=="home_run").sum() + sf)>0 else 0.0,
        "EV": ev_mean,
        "LA": la_mean,
        "HardHitPct": hard,
        "BarrelPct": barrel,
        "WhiffSwingPct": whiff,
        "ChasePct": chase,
        "xwOBA": xwoba,
        "xBA": xba,
        "xSLG": xslg
    }
    return pd.DataFrame([row])

def split_by(events: pd.DataFrame, by: list[str]) -> pd.DataFrame:
    if events.empty:
        cols = ["batter","player_name","season","PA","AB","H","AVG","OBP","SLG"]
        return pd.DataFrame(columns=by+cols)
    ev = events.copy()
    ev["in_zone"] = ev.apply(_is_zone, axis=1)
    ev["is_swing"] = ev.apply(lambda r: _is_swing(r.get("description",""), r.get("type","")), axis=1)
    ev["is_whiff"] = ev["description"].astype(str).apply(_is_whiff)
    ev["is_bip"] = ev["type"].astype(str).apply(_is_ball_in_play)
    pas = _dedupe_pas(ev)
    e = pas["events"].fillna("")
    pas["AB"] = e.isin(list(AB_EVENTS_INC)) & (~e.isin(list(AB_EVENTS_EXC)))
    pas["H"] = e.isin(list(HIT_EVENTS))
    pas["BB"] = e.isin(list(BB_EVENTS))
    pas["SF"] = e.isin(list(SF_EVENTS))
    pas["HBP"] = e.isin(list(HBP_EVENTS))
    gb = pas.groupby(by, dropna=False)
    out = gb.apply(lambda g: pd.Series({
        "batter": int(g["batter"].iloc[0]),
        "player_name": str(g["player_name"].iloc[0]),
        "season": int(g["game_year"].iloc[0]),
        "PA": int(len(g)),
        "AB": int(g["AB"].sum()),
        "H": int(g["H"].sum()),
        "AVG": round((g["H"].sum()/g["AB"].sum()),3) if g["AB"].sum()>0 else 0.0,
        "OBP": round(((g["H"].sum()+g["BB"].sum()+g["HBP"].sum())/(g["AB"].sum()+g["BB"].sum()+g["HBP"].sum()+g["SF"].sum())),3) if (g["AB"].sum()+g["BB"].sum()+g["HBP"].sum()+g["SF"].sum())>0 else 0.0,
        "SLG": 0.0
    })).reset_index()
    return out

def bin25(events: pd.DataFrame) -> pd.DataFrame:
    if events.empty:
        return pd.DataFrame(columns=["row","col","swing_pct","whiff_swing_pct","contact_pct","xwoba"])
    ev = events.copy()
    z_bot = ev["sz_bot"].fillna(1.5)
    z_top = ev["sz_top"].fillna(3.5)
    nx = ((ev["plate_x"]+0.83)/(0.83*2)).clip(0,1)
    nz = ((ev["plate_z"]-z_bot)/(z_top-z_bot)).clip(0,1)
    ev["col"] = (nx*5).clip(0,0.9999).astype(int)+1
    ev["row"] = (nz*5).clip(0,0.9999).astype(int)+1
    ev["is_swing"] = ev.apply(lambda r: _is_swing(r.get("description",""), r.get("type","")), axis=1)
    ev["is_whiff"] = ev["description"].astype(str).apply(_is_whiff)
    ev["is_contact"] = ev["type"].astype(str).eq("X")
    g = ev.groupby(["row","col"], dropna=False)
    out = g.apply(lambda s: pd.Series({
        "swing_pct": round((s["is_swing"].sum()/len(s)),3) if len(s)>0 else 0.0,
        "whiff_swing_pct": round((s["is_whiff"].sum()/max(1,s["is_swing"].sum())),3),
        "contact_pct": round((s["is_contact"].sum()/len(s)),3) if len(s)>0 else 0.0,
        "xwoba": round(s["estimated_woba_using_speedangle"].dropna().mean(),3) if "estimated_woba_using_speedangle" in s else 0.0
    })).reset_index()
    return out
