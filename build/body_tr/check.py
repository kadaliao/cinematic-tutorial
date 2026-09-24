#!/usr/bin/env python3
"""校验某批译文：python3 build/body_tr/check.py N  → 结构与原文逐段对齐、无空段、含中文。"""
import json, re, sys, pathlib
HERE = pathlib.Path(__file__).parent
SEC = ['narrative', 'how', 'when', 'vs', 'examples_film', 'mistakes', 'faq']
n = sys.argv[1]
src = json.loads((HERE / f'in/batch{n}.json').read_text())
out = json.loads((HERE / f'out/batch{n}.json').read_text())
errs = []
for it in src:
    s = it['slug']
    t = out.get(s)
    if t is None:
        errs.append(f'{s}: missing'); continue
    for k in SEC:
        a, b = it[k], t.get(k)
        if not isinstance(b, list) or len(a) != len(b):
            errs.append(f'{s}.{k}: expected {len(a)} items, got {None if b is None else len(b) if isinstance(b, list) else type(b).__name__}'); continue
        for i, (x, y) in enumerate(zip(a, b)):
            if k == 'faq':
                if not (isinstance(y, dict) and y.get('q') and y.get('a')):
                    errs.append(f'{s}.faq[{i}]: need {{q,a}}'); continue
                ys = y['q'] + y['a']
            else:
                if not isinstance(y, str) or not y.strip():
                    errs.append(f'{s}.{k}[{i}]: empty'); continue
                ys = y
            if not re.search(r'[一-鿿]', ys):
                errs.append(f'{s}.{k}[{i}]: no Chinese')
extra = set(out) - {it['slug'] for it in src}
if extra: errs.append(f'extra slugs: {sorted(extra)[:5]}')
print('\n'.join(errs[:60]) if errs else f'batch{n} OK: {len(src)} entries')
sys.exit(1 if errs else 0)
