#!/usr/bin/env python3
"""Generate the static site from the source data.

Inputs (this directory):
  tutorial.json   - the 12 teaching chapters, 48 lessons, 91 sample rows (中文教学文案)
  library.json    - all 424 Melies technique entries, EN + 中文对照 (scraped + translated)
  zh_titles.json  - slug -> 中文手法名（图鉴、搜索、测验用）
  catnames.json   - origin category slug -> display name
  page.html / app.css / app.js - page shell, styles, app logic (hand-written)

Outputs (repository root):
  index.html        - page shell with app.css / app.js inlined
  data-tutorial.js  - chapters + 424-entry light index + the 91 full entries the lessons need
  data-library.js   - all 424 full entries (loaded on demand: 图鉴搜索全文 / 打开非课程词条)
"""

import hashlib
import json
import pathlib

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent

tutorial = json.loads((HERE / "tutorial.json").read_text())
library = json.loads((HERE / "library.json").read_text())
catnames = json.loads((HERE / "catnames.json").read_text())
zh_titles = json.loads((HERE / "zh_titles.json").read_text())

missing_zh = [s for s in library if not zh_titles.get(s)]
if missing_zh:
    raise SystemExit("zh_titles.json missing: %s" % missing_zh[:20])

SAMPLES = tutorial["SAMPLES"]


def slug_of(url):
    return url.rstrip("/").rsplit("/", 1)[-1]


def lessons_of(value):
    """tutorial.json 的课程卡片是 [标题, 讲解, 练习]，个别分类有嵌套，这里拍平。"""
    out = []

    def walk(v):
        if not isinstance(v, list):
            return
        if len(v) >= 3 and all(isinstance(x, str) for x in v[:3]):
            out.append(v)
            return
        for x in v:
            walk(x)

    walk(value)
    return out


chapters = []
lesson_slugs = []
for name, sub, desc, cards in tutorial["data"]:
    lessons = []
    for card in lessons_of(cards):
        rows = SAMPLES.get(name + "|" + card[0], [])
        slugs = [slug_of(r[4]) for r in rows]
        lesson_slugs += slugs
        lessons.append({"t": card[0], "x": card[1], "p": card[2], "s": slugs})
    chapters.append({"n": name, "sub": sub, "desc": desc, "lessons": lessons})

missing = [s for s in lesson_slugs if s not in library]
if missing:
    raise SystemExit("samples without a library entry: %s" % missing)

for e in library.values():
    for r in e["r"]:
        if slug_of(r[1]) not in library:
            raise SystemExit("related entry outside library: %s" % r[1])

# 缩略图：视频用原站 poster；静帧优先用原站给相关条目用的小图，没有再退回 hero 静帧
thumbs = {}
for e in library.values():
    for r in e["r"]:
        if r[2]:
            thumbs[slug_of(r[1])] = r[2]

CAT_ORDER = list(catnames)
INDEX = []
for slug, e in library.items():
    video = bool(e["m"][0])
    thumb = e["m"][2] if video and e["m"][2] else thumbs.get(slug) or e["m"][1]
    INDEX.append([slug, e["t"], zh_titles[slug], e["c"], 1 if video else 0, thumb,
                  e["m"][1] if video else 0, e["g"] or 0])
INDEX.sort(key=lambda r: (CAT_ORDER.index(r[3]), r[1].lower()))

for slug, e in library.items():
    e["z"] = zh_titles[slug]

TUTORIAL_LIB = {s: library[s] for s in dict.fromkeys(lesson_slugs)}
CATS = {c: {"zh": v["zh"], "en": v["en"]} for c, v in catnames.items()}

tut_js = "window.CT=" + json.dumps({"chapters": chapters, "index": INDEX, "lib": TUTORIAL_LIB,
                                    "cats": CATS, "catorder": CAT_ORDER},
                                   ensure_ascii=False, separators=(",", ":")) + ";\n"
lib_js = "window.CT_LIB=" + json.dumps(library, ensure_ascii=False, separators=(",", ":")) + ";\n"
ver = lambda s: hashlib.sha1(s.encode()).hexdigest()[:10]  # 内容变了 URL 才变，避免浏览器/CDN 用旧数据

page = (HERE / "page.html").read_text()
page = (page.replace("/*__CSS__*/", (HERE / "app.css").read_text().strip())
            .replace("/*__JS__*/", (HERE / "app.js").read_text().strip())
            .replace("__TOTAL__", str(len(library)))
            .replace("__TUTV__", ver(tut_js))
            .replace("__LIBV__", ver(lib_js)))

(ROOT / "index.html").write_text(page)
(ROOT / "data-tutorial.js").write_text(tut_js)
(ROOT / "data-library.js").write_text(lib_js)
print("index.html %d bytes" % len(page))
print("data-tutorial.js %d bytes (%d chapters, %d lessons, %d entries)" % (
    (ROOT / "data-tutorial.js").stat().st_size, len(chapters),
    sum(len(c["lessons"]) for c in chapters), len(TUTORIAL_LIB)))
print("data-library.js %d bytes (%d entries)" % ((ROOT / "data-library.js").stat().st_size, len(library)))
