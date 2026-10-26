# -*- coding: utf-8 -*-
"""
Altın test setini bir danışman uç noktasına karşı çalıştırır (yalnızca stdlib).

Örnekler:
  # Canlı site (storefront vekili; IP başına dakikada 12 mesaj sınırı → 5,5 sn ara)
  python advisor/evals/run_eval.py --base https://testerestore.com/api/advisor/chat

  # Yerel danışman servisi (doğrudan, beklemesiz)
  python advisor/evals/run_eval.py --base http://127.0.0.1:5055/api/chat --delay 0

  # Yalnızca bazı dilimler, her vaka 3 kez (tutarlılık: hepsi geçmeli)
  python advisor/evals/run_eval.py --base ... --slices price,stock --repeat 3

Çıkış kodu: kesin kural (hard_rules) ihlali veya başarısız vaka varsa 1.
Sonuçlar advisor/evals/results/<zaman>.json dosyasına yazılır (git'e girmez).
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
_TR = str.maketrans("çğıöşüâîûÇĞİÖŞÜÂÎÛ", "cgiosuaiuCGIOSUAIU")


def norm(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").translate(_TR).lower()).strip()


def post(base: str, message: str, session_id: str, timeout: float = 90.0):
    parsed = urllib.parse.urlparse(base)
    req = urllib.request.Request(
        base,
        data=json.dumps({"message": message, "session_id": session_id}).encode("utf-8"),
        method="POST",
        headers={
            "Content-Type": "application/json",
            # Storefront vekili yalnızca aynı siteden gelen isteği kabul eder
            "Origin": f"{parsed.scheme}://{parsed.netloc}",
        },
    )
    started = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = json.loads(resp.read().decode("utf-8"))
            status = resp.status
    except urllib.error.HTTPError as e:
        try:
            body = json.loads(e.read().decode("utf-8"))
        except Exception:
            body = {}
        status = e.code
    except Exception as e:
        return 0, {"error": str(e)}, (time.perf_counter() - started) * 1000
    return status, body, (time.perf_counter() - started) * 1000


def check(case: dict, reply: str, hard: dict) -> tuple[list[str], list[str]]:
    """(başarısız beklentiler, kesin kural ihlalleri)"""
    n = norm(reply)
    fails, hard_fails = [], []
    for s in case.get("contains_all", []):
        if norm(s) not in n:
            fails.append(f"içermeli: {s!r}")
    anys = case.get("contains_any", [])
    if anys and not any(norm(s) in n for s in anys):
        fails.append(f"şunlardan biri olmalı: {anys}")
    for s in case.get("not_contains", []):
        if norm(s) in n:
            fails.append(f"içermemeli: {s!r}")
    for rx in case.get("regex", []):
        if not re.search(rx, n):
            fails.append(f"kalıp yok: {rx}")
    for s in hard.get("not_contains", []):
        if norm(s) in n:
            hard_fails.append(f"KESİN KURAL: {s!r}")
    for rx in hard.get("not_regex", []):
        if re.search(rx, n):
            hard_fails.append(f"KESİN KURAL kalıbı: {rx}")
    if not reply.strip():
        fails.append("boş cevap")
    return fails, hard_fails


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", required=True, help="chat uç noktası (…/api/advisor/chat veya …/api/chat)")
    ap.add_argument("--set", default=os.path.join(HERE, "golden_v1.json"))
    ap.add_argument("--slices", default="", help="virgülle dilim filtresi")
    ap.add_argument("--ids", default="", help="virgülle vaka id filtresi")
    ap.add_argument("--repeat", type=int, default=1)
    ap.add_argument("--delay", type=float, default=5.5, help="istekler arası saniye (vekil hız sınırı)")
    args = ap.parse_args()

    with open(args.set, encoding="utf-8") as f:
        gold = json.load(f)
    hard = gold.get("hard_rules", {})
    cases = gold["cases"]
    if args.slices:
        wanted = set(args.slices.split(","))
        cases = [c for c in cases if c["slice"] in wanted]
    if args.ids:
        wanted_ids = set(args.ids.split(","))
        cases = [c for c in cases if c["id"] in wanted_ids]

    results, by_slice = [], defaultdict(lambda: [0, 0])
    hard_total, latencies = 0, []
    for case in cases:
        runs = []
        for _ in range(args.repeat):
            session = f"eval-{case['id']}-{uuid.uuid4().hex[:8]}"
            reply, status, lat = "", 0, 0.0
            for msg in case["turns"]:
                status, body, lat = post(args.base, msg, session)
                reply = body.get("response") or body.get("error") or ""
                latencies.append(lat)
                if args.delay:
                    time.sleep(args.delay)
            fails, hard_fails = check(case, reply, hard)
            if status != 200:
                fails.insert(0, f"HTTP {status}")
            runs.append({"ok": not fails and not hard_fails, "fails": fails, "hard": hard_fails,
                         "latency_ms": round(lat), "reply": reply[:600]})
        ok = all(r["ok"] for r in runs)
        hard_total += sum(len(r["hard"]) for r in runs)
        by_slice[case["slice"]][0] += 1 if ok else 0
        by_slice[case["slice"]][1] += 1
        results.append({"id": case["id"], "slice": case["slice"], "ok": ok, "runs": runs})
        mark = "GEÇTİ" if ok else "KALDI"
        last = runs[-1]
        print(f"{mark}  {case['id']:<9} {case['slice']:<15} {last['latency_ms']:>6} ms"
              + ("" if ok else "  → " + "; ".join(last["hard"] + last["fails"])))

    passed = sum(1 for r in results if r["ok"])
    print("\n=== Dilim sonuçları ===")
    for sl, (p, t) in sorted(by_slice.items()):
        print(f"{sl:<16} {p}/{t}")
    lat_sorted = sorted(latencies)
    p50 = lat_sorted[len(lat_sorted) // 2] if lat_sorted else 0
    p95 = lat_sorted[min(len(lat_sorted) - 1, int(len(lat_sorted) * 0.95))] if lat_sorted else 0
    print(f"\nToplam: {passed}/{len(results)} vaka geçti · kesin kural ihlali: {hard_total} · "
          f"süre p50 {p50:.0f} ms, p95 {p95:.0f} ms")

    os.makedirs(os.path.join(HERE, "results"), exist_ok=True)
    out = os.path.join(HERE, "results", time.strftime("%Y%m%d-%H%M%S") + ".json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump({"base": args.base, "set": os.path.basename(args.set), "passed": passed,
                   "total": len(results), "hard_violations": hard_total, "results": results},
                  f, ensure_ascii=False, indent=1)
    print(f"Ayrıntı: {out}")
    return 0 if passed == len(results) and hard_total == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
