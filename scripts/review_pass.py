#!/usr/bin/env python3
"""Render a before-and-after page for a rewritten batch.

Reviewing a hundred rewrites by reading JSON is not reviewing. This
lays the live version beside the proposed one, marks what moved, and
puts the word count and difficulty change on every card so the ones
worth arguing about are the ones you stop at.

    python3 scripts/review_pass.py <rewritten.json> [-o review.html]
    open review.html

Sorted worst-first by default: biggest difficulty change, then biggest
word reduction, because those are where a mistake would hide.
"""
import argparse
import html
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from content_pass import (load_served, measure, option_parity,  # noqa: E402
                          clinical_numbers, TARGET_PRE_ANSWER_WORDS)


def esc(s):
    return html.escape(str(s or ""))


def opt_rows(q):
    out = []
    for o in q.get("options", []):
        cls = "opt correct" if o.get("correct") else "opt"
        out.append(f'<li class="{cls}">{esc(o.get("text"))}</li>')
    return "".join(out)


def table(dt):
    if not dt:
        return '<p class="none">no data table</p>'
    rows = "".join(
        f"<tr><th>{esc(k)}</th><td>{esc(v)}</td></tr>"
        for k, v in dt.items() if isinstance(v, str))
    return f"<table class='dt'>{rows}</table>"


def side(q, m):
    return (f'<div class="side">'
            f'<p class="stem">{esc(q.get("stem"))}</p>'
            f'{table(q.get("data_table"))}'
            f'<p class="lead">{esc(q.get("lead_in"))}</p>'
            f'<ol class="opts">{opt_rows(q)}</ol>'
            f'</div>')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("file")
    ap.add_argument("-o", "--out", default="review.html")
    ap.add_argument("--order", choices=("worst", "file"), default="worst")
    args = ap.parse_args()

    served = load_served()
    new = json.loads(Path(args.file).read_text())
    pairs = []
    for q in new:
        qid = q.get("id")
        if qid not in served:
            continue
        old = served[qid][0]
        mo, mn = measure(old), measure(q)
        pairs.append({
            "id": qid, "old": old, "new": q, "mo": mo, "mn": mn,
            "dd": (q.get("difficulty") or 0) - (old.get("difficulty") or 0),
            "cut": mo["pre_answer"] - mn["pre_answer"],
            "lost": sorted(set(clinical_numbers(old) - clinical_numbers(q))),
            "parity": option_parity(q),
        })
    if args.order == "worst":
        pairs.sort(key=lambda p: (-abs(p["dd"]), -p["cut"]))

    n = len(pairs)
    changed = [p for p in pairs if p["cut"]]
    mean_o = sum(p["mo"]["pre_answer"] for p in pairs) // max(1, n)
    mean_n = sum(p["mn"]["pre_answer"] for p in pairs) // max(1, n)
    from collections import Counter
    dn = Counter(p["new"].get("difficulty") for p in pairs)
    do = Counter(p["old"].get("difficulty") for p in pairs)

    cards = []
    for p in pairs:
        flags = []
        if p["lost"]:
            flags.append(f'<span class="flag">dropped {esc(", ".join(p["lost"][:10]))}</span>')
        if p["mn"]["pre_answer"] > TARGET_PRE_ANSWER_WORDS:
            flags.append(f'<span class="flag">still {p["mn"]["pre_answer"]} words</span>')
        if p["parity"] > 1.35:
            flags.append(f'<span class="flag">parity {p["parity"]:.2f}</span>')
        dd = p["dd"]
        dcls = "down" if dd < 0 else ("up" if dd > 0 else "same")
        cards.append(f'''
      <article class="card">
        <header>
          <span class="qid">{esc(p["id"])}</span>
          <span class="metric">{p["mo"]["pre_answer"]} &rarr; <b>{p["mn"]["pre_answer"]}</b> words</span>
          <span class="metric diff {dcls}">{p["old"].get("difficulty")}/5 &rarr; <b>{p["new"].get("difficulty")}/5</b></span>
          {"".join(flags)}
        </header>
        <div class="cols">
          <div class="col"><h3>Live</h3>{side(p["old"], p["mo"])}</div>
          <div class="col"><h3>Proposed</h3>{side(p["new"], p["mn"])}</div>
        </div>
      </article>''')

    dist = " ".join(
        f'<span class="pill">{k}/5 {do[k]}&rarr;{dn[k]}</span>' for k in (1, 2, 3, 4, 5))

    doc = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Rewrite review - {esc(Path(args.file).name)}</title>
<style>
  :root {{ --ink:#14202c; --mute:#61748a; --line:#dfe5ec; --bg:#f7f9fb;
           --good:#1f6d3b; --warn:#9a5a12; --card:#fff; }}
  @media (prefers-color-scheme: dark) {{ :root {{
    --ink:#e7eef7; --mute:#93a6bd; --line:#26364a; --bg:#0d1620;
    --good:#61c489; --warn:#e0a355; --card:#141f2c; }} }}
  * {{ box-sizing:border-box }}
  body {{ margin:0; background:var(--bg); color:var(--ink); font:15px/1.5 -apple-system,
         BlinkMacSystemFont,"Segoe UI",Helvetica,sans-serif; }}
  header.top {{ position:sticky; top:0; background:var(--bg); border-bottom:1px solid var(--line);
                padding:14px 20px; z-index:5; }}
  h1 {{ margin:0 0 4px; font-size:17px; font-weight:600 }}
  .sum {{ color:var(--mute); font-size:13px }}
  .pill {{ display:inline-block; border:1px solid var(--line); border-radius:3px;
           padding:1px 6px; margin-right:5px; font-variant-numeric:tabular-nums; font-size:12px }}
  main {{ padding:16px 20px 60px; max-width:1500px; margin:0 auto }}
  .card {{ background:var(--card); border:1px solid var(--line); border-radius:6px;
           margin-bottom:14px; overflow:hidden }}
  .card > header {{ display:flex; flex-wrap:wrap; gap:8px 14px; align-items:baseline;
                    padding:9px 14px; border-bottom:1px solid var(--line); font-size:12.5px }}
  .qid {{ font-weight:600 }}
  .metric {{ color:var(--mute); font-variant-numeric:tabular-nums }}
  .diff.down b {{ color:var(--good) }} .diff.up b {{ color:var(--warn) }}
  .flag {{ color:var(--warn); border:1px solid currentColor; border-radius:3px; padding:0 5px }}
  .cols {{ display:grid; grid-template-columns:1fr 1fr }}
  @media (max-width:900px) {{ .cols {{ grid-template-columns:1fr }} }}
  .col {{ padding:12px 14px }}
  .col + .col {{ border-left:1px solid var(--line) }}
  @media (max-width:900px) {{ .col + .col {{ border-left:none; border-top:1px solid var(--line) }} }}
  .col h3 {{ margin:0 0 8px; font-size:10.5px; text-transform:uppercase; letter-spacing:.09em;
             color:var(--mute); font-weight:600 }}
  .stem {{ margin:0 0 9px; white-space:pre-line }}
  .lead {{ margin:9px 0 6px; font-weight:600 }}
  .dt {{ border-collapse:collapse; width:100%; font-size:13px; margin:0 0 4px }}
  .dt th {{ text-align:left; vertical-align:top; color:var(--mute); font-weight:400;
            padding:3px 12px 3px 0; white-space:nowrap }}
  .dt td {{ padding:3px 0; font-variant-numeric:tabular-nums }}
  .opts {{ margin:0; padding-left:20px; font-size:14px }}
  .opt {{ padding:2px 0 }}
  .opt.correct {{ font-weight:600; color:var(--good) }}
  .none {{ color:var(--mute); font-size:12.5px; margin:0 0 6px }}
</style></head><body>
<header class="top">
  <h1>Rewrite review &middot; {esc(Path(args.file).name)}</h1>
  <p class="sum">{n} questions, {len(changed)} changed &middot;
     mean {mean_o} &rarr; <b>{mean_n}</b> words before the answer &middot;
     difficulty {dist}</p>
</header>
<main>{"".join(cards)}</main>
</body></html>'''
    Path(args.out).write_text(doc)
    print(f"{n} questions, mean {mean_o} -> {mean_n} words")
    print(f"wrote {args.out}")


if __name__ == "__main__":
    main()
