"""
Sohbet turu olay kaydı — Faz 0 ölçüm altyapısı.

Her turda bir JSON satırı yazılır: cevabın hangi yoldan geldiği (ön masa /
huni / karma), süre, model token'ları, sonuç türü. Bunlar olmadan "asistan
iyileşti mi?" sorusu ölçülemez (bkz. reports/Şerit testere yapay zekâ
danışmanı planı.md — Faz 0).

KVKK:
  - Mesaj metni kayda girmeden önce kişisel veri MASKELENİR (e-posta, telefon,
    TC kimlik no, IBAN, Luhn'u tutan kart numarası) ve 500 karakterde kesilir.
  - Oturum kimliği tek yönlü özetle (hash) saklanır.
  - Dosyalar günlük; ADVISOR_EVENT_RETENTION_DAYS (varsayılan 90) günden eski
    olanlar otomatik silinir.
  - Satın alma formundaki ad/telefon/adres bu servise hiç gelmez (widget →
    storefront → Medusa), dolayısıyla burada kaydedilmez.

Özet rapor (container içinde):  python -m llm.telemetry --days 7
"""
from __future__ import annotations

import argparse
import datetime as _dt
import glob
import hashlib
import json
import os
import re
import statistics
import threading
from collections import Counter, defaultdict
from typing import Any, Dict, Iterable, List, Optional

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EVENTS_DIR = os.environ.get("ADVISOR_EVENTS_DIR") or os.path.join(_ROOT, "data", "events")
RETENTION_DAYS = int(os.environ.get("ADVISOR_EVENT_RETENTION_DAYS", "90"))
MAX_TEXT = 500

# Yaklaşık fiyatlar (USD / 1M token) — yalnızca özet rapordaki tahmini maliyet
# için; sağlayıcı fiyatları değişir, ADVISOR_PRICE_<MODEL> ile ezilebilir.
_PRICES = {
    "gpt-4o": (2.50, 10.00),
    "gpt-4o-mini": (0.15, 0.60),
}

_lock = threading.Lock()
_last_cleanup: Optional[str] = None

# --------------------------------------------------------------------------- #
# Kişisel veri maskeleme
# --------------------------------------------------------------------------- #

_EMAIL = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")
_IBAN = re.compile(r"\bTR\s?\d{2}(?:\s?\d{4}){5}\s?\d{2}\b", re.IGNORECASE)
_PHONE = re.compile(r"(?<!\d)(?:\+?90[\s-]?)?\(?0?5\d{2}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}(?!\d)")
_TCKN = re.compile(r"(?<!\d)[1-9]\d{10}(?!\d)")
_CARD_CANDIDATE = re.compile(r"(?<!\d)(?:\d[ -]?){12,18}\d(?!\d)")


def _luhn_ok(digits: str) -> bool:
    total, alt = 0, False
    for ch in reversed(digits):
        d = int(ch)
        if alt:
            d *= 2
            if d > 9:
                d -= 9
        total += d
        alt = not alt
    return total % 10 == 0


def _mask_cards(text: str) -> str:
    def repl(m: re.Match) -> str:
        digits = re.sub(r"\D", "", m.group(0))
        # Kart: 13–19 hane VE Luhn geçerli. "1638 1440 1500 2000" gibi boy
        # listeleri çoğunlukla Luhn'u tutmaz ve maskelenmez.
        if 13 <= len(digits) <= 19 and _luhn_ok(digits):
            return "[kart]"
        return m.group(0)
    return _CARD_CANDIDATE.sub(repl, text)


def mask_pii(text: Any) -> str:
    s = str(text or "")
    s = _EMAIL.sub("[e-posta]", s)
    s = _IBAN.sub("[iban]", s)
    s = _mask_cards(s)
    s = _PHONE.sub("[telefon]", s)
    s = _TCKN.sub("[tckn]", s)
    return s[:MAX_TEXT]


def session_hash(session_id: Any) -> str:
    return hashlib.sha256(f"ts-advisor:{session_id}".encode("utf-8")).hexdigest()[:16]


# --------------------------------------------------------------------------- #
# Yazma
# --------------------------------------------------------------------------- #

def _cleanup(today: str) -> None:
    global _last_cleanup
    if _last_cleanup == today:
        return
    _last_cleanup = today
    cutoff = _dt.date.today() - _dt.timedelta(days=RETENTION_DAYS)
    for path in glob.glob(os.path.join(EVENTS_DIR, "*.jsonl")):
        try:
            day = _dt.date.fromisoformat(os.path.basename(path)[:10])
        except ValueError:
            continue
        if day < cutoff:
            try:
                os.remove(path)
            except OSError:
                pass


def log_event(event: Dict[str, Any]) -> None:
    """Bir olayı günlük JSONL dosyasına ekler. Hata sohbeti asla bozmaz."""
    try:
        now = _dt.datetime.now(_dt.timezone.utc)
        today = now.date().isoformat()
        record = {"ts": now.isoformat(timespec="seconds"), **event}
        line = json.dumps(record, ensure_ascii=False)
        with _lock:
            os.makedirs(EVENTS_DIR, exist_ok=True)
            _cleanup(today)
            with open(os.path.join(EVENTS_DIR, f"{today}.jsonl"), "a", encoding="utf-8") as f:
                f.write(line + "\n")
    except Exception:
        pass


def turn_event(*, session_id: str, message: str, result: Optional[Dict[str, Any]],
               latency_ms: float, prompt_tokens: int, completion_tokens: int,
               model: Optional[str], error: Optional[str] = None) -> Dict[str, Any]:
    """Bir sohbet turunun kayıt satırını kurar (mesaj maskelenir)."""
    r = result or {}
    reply = str(r.get("message") or "")
    if error:
        outcome = "error"
    elif r.get("recommendation"):
        outcome = "recommendation"
    elif r.get("route") == "front_desk":
        outcome = "answered"
    elif "kesin bir ürün kodu üretemedim" in reply:
        outcome = "no_answer"
    elif r.get("next_question"):
        outcome = "question"
    else:
        outcome = "other"
    nq = r.get("next_question") or {}
    return {
        "type": "turn",
        "session": session_hash(session_id),
        "route": r.get("route") or ("error" if error else "unknown"),
        "kinds": r.get("front_desk") or [],
        "outcome": outcome,
        "next_question": nq.get("id") if isinstance(nq, dict) else None,
        "machine_found": bool(r.get("machine_found")),
        "latency_ms": round(latency_ms),
        "prompt_tokens": prompt_tokens,
        "completion_tokens": completion_tokens,
        "model": model,
        "message": mask_pii(message),
        "reply_chars": len(reply),
        **({"error": str(error)[:200]} if error else {}),
    }


# --------------------------------------------------------------------------- #
# Özet rapor
# --------------------------------------------------------------------------- #

def _read(days: int) -> Iterable[Dict[str, Any]]:
    cutoff = _dt.date.today() - _dt.timedelta(days=days - 1)
    for path in sorted(glob.glob(os.path.join(EVENTS_DIR, "*.jsonl"))):
        try:
            if _dt.date.fromisoformat(os.path.basename(path)[:10]) < cutoff:
                continue
        except ValueError:
            continue
        with open(path, encoding="utf-8") as f:
            for line in f:
                try:
                    yield json.loads(line)
                except ValueError:
                    continue


def _pct(values: List[float], p: float) -> float:
    if not values:
        return 0.0
    values = sorted(values)
    k = max(0, min(len(values) - 1, round(p / 100 * (len(values) - 1))))
    return values[k]


def _cost(model: Optional[str], pin: int, pout: int) -> float:
    price = _PRICES.get((model or "").lower())
    env = os.environ.get(f"ADVISOR_PRICE_{(model or '').upper().replace('-', '_').replace('.', '_')}")
    if env:
        try:
            a, b = env.split(",")
            price = (float(a), float(b))
        except ValueError:
            pass
    if not price:
        return 0.0
    return pin / 1e6 * price[0] + pout / 1e6 * price[1]


def summarize(days: int = 7, samples: int = 15) -> str:
    turns, feedback = [], []
    for e in _read(days):
        (turns if e.get("type") == "turn" else feedback if e.get("type") == "feedback" else []).append(e)
    if not turns and not feedback:
        return f"Son {days} günde kayıt yok ({EVENTS_DIR})."
    out: List[str] = [f"=== Son {days} gün — {len(turns)} tur, {len({t['session'] for t in turns})} oturum ==="]

    by_route: Dict[str, List[float]] = defaultdict(list)
    for t in turns:
        by_route[t.get("route", "?")].append(float(t.get("latency_ms") or 0))
    out.append("\nYol            tur   p50 ms   p95 ms")
    for route, lat in sorted(by_route.items(), key=lambda x: -len(x[1])):
        out.append(f"{route:<14}{len(lat):>4}{_pct(lat, 50):>9.0f}{_pct(lat, 95):>9.0f}")

    outcomes = Counter(t.get("outcome") for t in turns)
    out.append("\nSonuç: " + ", ".join(f"{k}={v}" for k, v in outcomes.most_common()))
    kinds = Counter(k for t in turns for k in (t.get("kinds") or []))
    if kinds:
        out.append("Ön masa konuları: " + ", ".join(f"{k}={v}" for k, v in kinds.most_common()))

    pin = sum(int(t.get("prompt_tokens") or 0) for t in turns)
    pout = sum(int(t.get("completion_tokens") or 0) for t in turns)
    cost = sum(_cost(t.get("model"), int(t.get("prompt_tokens") or 0), int(t.get("completion_tokens") or 0))
               for t in turns)
    out.append(f"Token: {pin} girdi + {pout} çıktı ≈ {cost:.2f} USD (tahmini)")

    up = sum(1 for f in feedback if f.get("rating") == "up")
    down = [f for f in feedback if f.get("rating") == "down"]
    out.append(f"Geri bildirim: 👍 {up}  👎 {len(down)}")
    for f in down[-samples:]:
        out.append(f"  👎 {f.get('ts', '')[:16]}  cevap: {f.get('bot_text', '')[:120]}"
                   + (f"  | yorum: {f.get('comment')}" if f.get("comment") else ""))

    unanswered = [t for t in turns if t.get("outcome") in ("no_answer", "error")]
    if unanswered:
        out.append(f"\nCevaplanamayan / hatalı turlar ({len(unanswered)}), son {samples}:")
        for t in unanswered[-samples:]:
            out.append(f"  [{t.get('outcome')}] {t.get('message')}")
    return "\n".join(out)


def main() -> None:
    ap = argparse.ArgumentParser(description="Danışman olay kaydı özeti")
    ap.add_argument("--days", type=int, default=7)
    ap.add_argument("--samples", type=int, default=15)
    args = ap.parse_args()
    print(summarize(args.days, args.samples))


if __name__ == "__main__":
    main()
