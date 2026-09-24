#!/usr/bin/env python3
"""Scrape every Melies "Cinematic techniques" entry into structured JSON.

Source of truth: https://melies.co/__sitemap__/en-US.xml (424 technique pages, 13 categories).
Output: build/origin_raw.json  - one record per entry, English only.

Field map (all verbatim from the origin page, never paraphrased):
  title/tag/lede          - h1, .cinematic-tag, p#definition
  hero/hero_kind/hero_thumb - the page's own clip (.cinematic-shot__media) or still/{slug}/hero.jpg
  strip                   - "frames over time" filmstrip image
  clip_prompt             - pre.cinematic-prompt__body (the prompt that clip actually used)
  prompt                  - the ordered paragraphs of the "Prompt it" section
  how_prompt              - the "Prompt: …" line embedded in "How it works"
  faq_prompt              - the "How do I prompt X" answer, which carries its own example
  related                 - the "Compared with similar shots" list (url / thumb / title / note)
  narrative|how|when|vs|examples_film|mistakes|faq - the remaining prose, paragraph by paragraph

banner headings are captured per section (h_*) so the site can label sections without guessing.
"""

import concurrent.futures
import html as H
import json
import pathlib
import re
import urllib.request

UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/126 Safari/537.36"}
SITEMAP = "https://melies.co/__sitemap__/en-US.xml"
OUT = pathlib.Path(__file__).resolve().parent / "origin_raw.json"
ORDER = ["narrative", "how", "when", "vs", "examples-film", "prompt", "mistakes", "faq"]


def txt(frag):
    return re.sub(r"\s+", " ", H.unescape(re.sub(r"<[^>]+>", " ", frag))).strip()


def section(raw, sid, next_ids):
    i = raw.find('<section id="%s"' % sid)
    if i == -1:
        return None
    j = len(raw)
    for nid in next_ids:
        k = raw.find('<section id="%s"' % nid, i)
        if k != -1:
            j = min(j, k)
    return raw[i:j]


def paras(seg):
    if not seg:
        return []
    return [t for t in (txt(p) for p in re.findall(r"<p\b[^>]*>(.*?)</p>", seg, re.S)) if t]


def parse(url):
    raw = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40).read().decode("utf-8", "replace")
    slug = url.rsplit("/", 1)[-1]
    d = {"slug": slug, "cat": url.split("/cinematic-techniques/")[1].split("/")[0], "url": url}
    m = re.search(r"<h1[^>]*>(.*?)</h1>", raw, re.S)
    d["title"] = txt(m.group(1)) if m else None
    m = re.search(r'<span class="cinematic-tag"[^>]*>(.*?)</span>', raw, re.S)
    d["tag"] = txt(m.group(1)) if m else None
    m = re.search(r'<p id="definition"[^>]*>(.*?)</p>', raw, re.S)
    d["lede"] = txt(m.group(1)) if m else None

    m = re.search(r'<video\b[^>]*class="cinematic-shot__media[^"]*"[^>]*>', raw)
    if m:
        d["hero"] = re.search(r'src="([^"]+)"', m.group(0)).group(1)
        pm = re.search(r'poster="([^"]+)"', m.group(0))
        d["hero_poster"] = pm.group(1) if pm else None
        d["hero_kind"] = "video"
        base = d["hero"].rsplit("/", 1)[-1].rsplit(".", 1)[0]
        cand = "https://asset.melies.co/cinematic-techniques/thumb/%s-%s.webp" % (slug, base)
        mm = re.search(r"thumb/[a-z0-9\-]*%s[a-z0-9\-]*\.webp" % re.escape(slug), raw)
        d["hero_thumb"] = cand if cand in raw else (("https://asset.melies.co/" + mm.group(0)) if mm else None)
    else:
        m = re.search(r'<img\b[^>]*class="cinematic-shot__still[^"]*"', raw)
        if m:
            d["hero"] = re.search(r'src="([^"]+)"', m.group(0)).group(1)
        else:
            m2 = re.search(r'og:image" content="([^"]+)"', raw)
            d["hero"] = m2.group(1) if m2 else None
        d["hero_poster"] = None
        d["hero_thumb"] = None
        d["hero_kind"] = "still"

    m = re.search(r'<img src="([^"]+)"[^>]*alt="[^"]*frames over time"', raw)
    d["strip"] = m.group(1) if m else None
    m = re.search(r'<pre class="cinematic-prompt__body"[^>]*>(.*?)</pre>', raw, re.S)
    d["clip_prompt"] = txt(m.group(1)) if m else None

    for idx, sid in enumerate(ORDER):
        hm = re.search(r'<section id="%s"[^>]*><h2[^>]*>(.*?)</h2>' % sid, raw, re.S)
        d["h_" + sid.replace("-", "_")] = txt(hm.group(1)) if hm else None
        seg = section(raw, sid, ORDER[idx + 1:])
        if sid == "prompt" and seg:
            cut = seg.find("cinematic-prompt")
            if cut != -1:
                seg = seg[:cut]
        if sid == "vs" and seg:
            rel = []
            for li in re.findall(r"<li[^>]*>(.*?)</li>", seg, re.S):
                a = re.search(r'href="(/cinematic-techniques/[^"]+)"', li)
                im = re.search(r'<img src="([^"]+)"', li)
                ttl = re.search(r"<strong[^>]*>(.*?)</strong>", li, re.S) or re.search(r"<h3[^>]*>(.*?)</h3>", li, re.S)
                desc = re.search(r"</strong>(.*?)</", li, re.S)
                rel.append({"url": ("https://melies.co" + a.group(1)) if a else None,
                            "thumb": im.group(1) if im else None,
                            "title": txt(ttl.group(1)) if ttl else None,
                            "note": txt(desc.group(1)) if desc else None})
            d["related"] = [r for r in rel if r["url"]]
            seg = re.sub(r"<ul.*?</ul>", " ", seg, flags=re.S)
        if sid == "faq" and seg:
            qa = []
            for blk in re.findall(r'<div class="cinematic-sheet__qa"[^>]*>(.*?)</div>', seg, re.S):
                h = re.search(r"<h3[^>]*>(.*?)</h3>", blk, re.S)
                p = re.search(r"<p[^>]*>(.*?)</p>", blk, re.S)
                qa.append({"q": txt(h.group(1)) if h else None, "a": txt(p.group(1)) if p else None})
            d["faq"] = [x for x in qa if x["q"]]
            continue
        d[sid.replace("-", "_")] = paras(seg)

    d["how_prompt"] = None
    for p in d.get("how") or []:
        m = re.search(r"\bPrompt:\s*(.+)$", p)
        if m and "[" in m.group(1):
            d["how_prompt"] = m.group(1).strip()
            break
    d["faq_prompt"] = None
    for x in d.get("faq") or []:
        if x["q"] and "prompt" in x["q"].lower() and x["a"] and "Example:" in x["a"]:
            d["faq_prompt"] = x["a"]
            break
    return d


def main():
    sm = urllib.request.urlopen(urllib.request.Request(SITEMAP, headers=UA), timeout=60).read().decode()
    urls = [u for u in re.findall(r"<loc>(.*?)</loc>", sm) if "/cinematic-techniques/" in u and u.count("/") == 5]
    print("technique pages:", len(urls))

    def run(url):
        try:
            return parse(url)
        except Exception as e:  # one retry, then a re-run of this script fills the gap
            try:
                return parse(url)
            except Exception as e2:
                return {"url": url, "error": repr(e2)}

    with concurrent.futures.ThreadPoolExecutor(12) as ex:
        res = list(ex.map(run, urls))
    errs = [r for r in res if "error" in r]
    OUT.write_text(json.dumps(res, ensure_ascii=False))
    print("written", OUT, "| errors:", len(errs))
    for e in errs:
        print(" ", e)


if __name__ == "__main__":
    main()
