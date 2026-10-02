#!/usr/bin/env python3
"""从主站的数据生成物抽出游戏用的轻量数据 -> arcade/data.js（只读主站文件，不改动它们）。"""
import json, pathlib
HERE = pathlib.Path(__file__).parent
ROOT = HERE.parent
src = (ROOT / "data-tutorial.js").read_text()
ct, _ = json.JSONDecoder().raw_decode(src[src.index("window.CT=") + len("window.CT="):])
# index 行：[slug, 英文名, 中文名, 分类, 是否视频, 缩略图, mp4|0, tag|0]
lib = json.loads((ROOT / "build" / "library.json").read_text())
def short(slug):
    zh = (lib[slug]["d"][1] or "").replace("\n", " ").strip()
    first = zh.split("。")[0]
    return (first[:58] + "…") if len(first) > 58 else first
items = [[r[0], r[2], r[1], r[3], 1 if r[4] else 0, r[5], r[6] or 0, short(r[0])] for r in ct["index"]]
chapters = []
for c in ct["chapters"]:
    seen = []
    for l in c["lessons"]:
        for s in l["s"]:
            if s not in seen:
                seen.append(s)
    chapters.append({"n": c["n"], "sub": c["sub"], "s": seen})
cats = {k: v["zh"] for k, v in ct["cats"].items()}
out = {"items": items, "chapters": chapters, "cats": cats, "order": ct["catorder"]}
(HERE / "data.js").write_text("window.DATA=" + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";\n")
print(len(items), "items,", len(chapters), "chapters,", [len(c["s"]) for c in chapters])
