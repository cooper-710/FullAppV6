from __future__ import annotations
from pathlib import Path
import pandas as pd
from fpdf import FPDF
from .config import PROCESSED_DIR, REPORTS_DIR, ensure_dirs

def generate_hitter_pdf(player_id: int, season: int) -> Path:
    ensure_dirs()
    csv_path = PROCESSED_DIR / "hitters_season.csv"
    if not csv_path.exists():
        raise FileNotFoundError(f"Processed file not found: {csv_path}")

    df = pd.read_csv(csv_path)
    row = df[(df["batter"]==player_id) & (df["season"]==season)]
    pdf_path = REPORTS_DIR / f"hitter_{player_id}_{season}.pdf"

    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", size=18)
    pdf.cell(0, 12, f"Hitter Report - {player_id} ({season})".encode('latin-1','replace').decode('latin-1'), ln=1)
    pdf.set_font("Helvetica", size=12)

    if row.empty:
        pdf.set_text_color(200,0,0)
        pdf.cell(0, 10, "No data found in hitters_season.csv for this player/season.".encode('latin-1','replace').decode('latin-1'), ln=1)
    else:
        r = row.iloc[0].to_dict()
        lines = [
            f"Player: {r.get('player_name','N/A')}  (MLBAM: {int(r['batter'])})",
            f"Season: {int(r['season'])}",
            f"PA: {int(r['PA'])}   AB: {int(r['AB'])}   H: {int(r['H'])}",
            f"AVG: {r['AVG']}   OBP: {r['OBP']}   SLG: {r['SLG']}",
        ]
        for L in lines:
            pdf.cell(0, 9, L.encode('latin-1','replace').decode('latin-1'), ln=1)

    pdf.output(str(pdf_path))
    return pdf_path
