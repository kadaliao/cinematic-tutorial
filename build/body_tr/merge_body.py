#!/usr/bin/env python3
"""把 8 批译文 out/batch*.json 合并成 build/body_zh.json（generate.py 的输入）。

合并时把紧挨汉字的半角 , : ; ? ! 换成全角、紧跟汉字的半角括号换成全角括号（部分批次用了半角标点）；
段落里保留的英文提示词原文不受影响。
"""
import json, pathlib, re
HERE = pathlib.Path(__file__).parent
CJK = r"[一-鿿《》“”（）]"
FULL = {",": "，", ":": "：", ";": "；", "?": "？", "!": "！"}


def norm(v):
    if isinstance(v, str):
        v = re.sub("(" + CJK + r")\(([^()]*)\)", r"\1（\2）", v)
        return re.sub("(" + CJK + r")([,:;?!])\s*", lambda m: m.group(1) + FULL[m.group(2)], v)
    if isinstance(v, list):
        return [norm(x) for x in v]
    if isinstance(v, dict):
        return {k: norm(x) for k, x in v.items()}
    return v


merged = {}
for f in sorted((HERE / "out").glob("batch*.json")):
    merged.update(json.loads(f.read_text()))
(HERE.parent / "body_zh.json").write_text(json.dumps(norm(merged), ensure_ascii=False, indent=0))
print("body_zh.json: %d entries" % len(merged))
