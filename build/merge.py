#!/usr/bin/env python3
"""Merge the English scrape with the Chinese translations into the site's data file.

Inputs:
  build/origin_raw.json - output of scrape.py (424 entries, English, verbatim)
  build/zh.json         - LLM translation batches, keyed by slug:
                          {lede, pi, cp, hp, fq} - only the fields the entry actually has
  build/tutorial.json   - the 48 teaching cards; its PROMPTS map holds the hand-checked
                          Chinese for the 91 slugs the cards embed, which wins over zh.json

Output: build/library.json - {slug: {t,c,g,u,d,pi,cp,hp,fq,m,st,r}} consumed by generate.py
  d  = [definition EN, CN]        pi = [Prompt it EN, CN]
  cp = [clip prompt EN, CN]       hp = [how-it-works prompt line EN, CN] or 0
  fq = [FAQ prompt example EN, CN] or 0
  m  = [1 video / 0 still, media url, poster url or 0]
  st = filmstrip url or 0         r  = [[related title, origin url, thumb, note], …]
"""

import json
import pathlib

HERE = pathlib.Path(__file__).resolve().parent
raw = json.loads((HERE / "origin_raw.json").read_text())
zh = json.loads((HERE / "zh.json").read_text())
tutorial = json.loads((HERE / "tutorial.json").read_text())
legacy = {s: v for s, v in tutorial["PROMPTS"].items()}

errors = [r for r in raw if "error" in r]
if errors:
    raise SystemExit("scrape has %d failed pages: %s" % (len(errors), errors[:3]))

LIB = {}
missing = []
for e in raw:
    s = e["slug"]
    c = zh.get(s, {})
    old = legacy.get(s, {})
    pi_cn = old[1] if old else c.get("pi")
    cp_cn = old[3] if old else c.get("cp")
    d_cn = c.get("lede")
    for name, v in (("lede", d_cn), ("pi", pi_cn), ("cp", cp_cn)):
        if not v:
            missing.append("%s.%s" % (s, name))
    if e.get("how_prompt") and not c.get("hp"):
        missing.append(s + ".hp")
    if e.get("faq_prompt") and not c.get("fq"):
        missing.append(s + ".fq")
    LIB[s] = {
        "t": e["title"], "c": e["cat"], "g": e["tag"], "u": e["url"],
        "d": [e["lede"], d_cn],
        "pi": [" ".join(e["prompt"]), pi_cn],
        "cp": [e["clip_prompt"], cp_cn],
        "hp": [e["how_prompt"], c.get("hp")] if e.get("how_prompt") else 0,
        "fq": [e["faq_prompt"], c.get("fq")] if e.get("faq_prompt") else 0,
        "m": [1 if e["hero_kind"] == "video" else 0, e["hero"], e.get("hero_thumb") or 0],
        "st": e.get("strip") or 0,
        "r": [[x["title"], x["url"], x["thumb"], x["note"]] for x in (e.get("related") or [])],
    }

if missing:
    raise SystemExit("missing Chinese fields: %s" % missing[:20])
(HERE / "library.json").write_text(json.dumps(LIB, ensure_ascii=False))
print("library.json: %d entries, %d video, %d still" % (
    len(LIB), sum(1 for v in LIB.values() if v["m"][0]), sum(1 for v in LIB.values() if not v["m"][0])))
