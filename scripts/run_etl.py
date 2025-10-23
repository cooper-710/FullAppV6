#!/usr/bin/env python
from __future__ import annotations
import argparse
from backend import etl
from backend.report_generator import generate_hitter_pdf
def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--mode", default=None, choices=["incremental","full","auto"])
    p.add_argument("--season", type=int)
    p.add_argument("--report_player_id", type=int)
    p.add_argument("--report_season", type=int)
    return p.parse_args()
def main():
    args = parse_args()
    out = etl.run(mode=args.mode, season=args.season) if args.mode else None
    print(f"[ETL] wrote: {out}")
    if args.report_player_id and args.report_season:
        pdf = generate_hitter_pdf(args.report_player_id, args.report_season)
        print(f"[REPORT] wrote: {pdf}")
if __name__ == "__main__":
    main()
