import sys, json
import pandas as pd
from backend.api.server import _ensure_events
from backend.sequence_src.scrape_savant import lookup_batter_id
season = int(sys.argv[1]) if len(sys.argv)>1 else 2025
names = sys.argv[2:] if len(sys.argv)>2 else []
if not names:
    names = ["Pete Alonso","Shohei Ohtani","Mookie Betts","Juan Soto"]
for n in names:
    pid = lookup_batter_id(n)
    if pd.isna(pid):
        continue
    _ensure_events(int(pid), season, "regular")
print("ok")
