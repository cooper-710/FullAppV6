from pathlib import Path
import re
import pandas as pd
from starlette.routing import Route

def _tokens(s: str) -> set[str]:
    t = re.sub(r'[^a-z0-9]+', ' ', str(s).lower()).strip()
    return set(t.split()) if t else set()

def _pick_columns(df: pd.DataFrame):
    low = {c.lower(): c for c in df.columns}
    id_col = None
    for k in ("batter","bid","mlb_id","player_id","id"):
        if k in low: id_col = low[k]; break
    name_col = None
    for k in ("player_name","name","full_name"):
        if k in low: name_col = low[k]; break
    if not id_col or not name_col:
        # fall back to first two columns if present
        cols = list(df.columns)
        if len(cols) >= 2:
            id_col, name_col = cols[0], cols[1]
    return id_col, name_col

def attach_players_search(app):
    app.router.routes = [r for r in app.router.routes
                         if not (isinstance(r, Route) and getattr(r, "path", "") == "/players/search"
                                 and "GET" in getattr(r, "methods", set()))]

    @app.get("/players/search")
    def players_search(q: str):
        processed = Path("data/processed")
        csv = processed / "hitters_season.csv"
        if not csv.exists():
            return {"q": q, "itemsCount": 0, "items": []}

        try:
            df = pd.read_csv(csv)
        except Exception:
            return {"q": q, "itemsCount": 0, "items": []}

        id_col, name_col = _pick_columns(df)
        if not id_col or not name_col:
            return {"q": q, "itemsCount": 0, "items": []}

        u = df[[id_col, name_col]].dropna().drop_duplicates()
        u = u.rename(columns={id_col: "id", name_col: "name"})

        qtok = _tokens(q)
        def score(row):
            ntok = _tokens(row["name"])
            exact = int(ntok == qtok)
            subset = int(qtok.issubset(ntok))
            starts = int(' '.join(sorted(ntok)).startswith(' '.join(sorted(qtok))) or
                        ' '.join(sorted(qtok)).startswith(' '.join(sorted(ntok))))
            jac = 1.0 - (len(ntok & qtok) / len(ntok | qtok) if (ntok | qtok) else 0.0)
            return (-exact, -subset, -starts, jac, len(ntok))

        u = u.assign(_s=u.apply(score, axis=1)).sort_values("_s").head(10)
        items = []
        for _, r in u.iterrows():
            try:
                rid = int(r["id"])
            except Exception:
                continue
            items.append({"id": rid, "name": str(r["name"])})
        return {"q": q, "itemsCount": len(items), "items": items}
