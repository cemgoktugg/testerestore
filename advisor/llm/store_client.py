"""
Medusa mağaza API'si için küçük, bağımlılıksız istemci (fiyat + hazır stok).

Danışmanın ön masası (front_desk.py) "27×0,9 2750 mm kaç para?" ve "1638 mm
hazır var mı?" sorularını UYDURMADAN, sitenin kendi fiyat hesaplayıcısı ve
gerçek ürün listesiyle cevaplar. Fiyat matematiği burada TEKRAR YAZILMAZ —
backend'in /store/blade-price/calculate ucu tek kaynaktır.

Yapılandırma (env):
  ADVISOR_STORE_API_URL   Medusa adresi (Docker iç ağı: http://backend:9000)
  ADVISOR_PUBLISHABLE_KEY Medusa yayın anahtarı (herkese açık değer)
Tanımlı değilse istemci "kapalı" sayılır; ön masa fiyat/stok yerine ürün
sayfasına yönlendirir.
"""
from __future__ import annotations

import json
import logging
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

_TIMEOUT_S = 5
_CACHE_TTL_S = 300


class StoreClient:
    def __init__(self, base_url: Optional[str] = None, publishable_key: Optional[str] = None):
        self.base_url = (base_url or os.environ.get("ADVISOR_STORE_API_URL") or "").rstrip("/")
        self.publishable_key = publishable_key or os.environ.get("ADVISOR_PUBLISHABLE_KEY") or ""
        self._cache: Dict[str, Any] = {}

    @property
    def enabled(self) -> bool:
        return bool(self.base_url and self.publishable_key)

    # ------------------------------------------------------------------ #

    def _request(self, method: str, path: str, body: Optional[Dict[str, Any]] = None) -> Optional[Any]:
        if not self.enabled:
            return None
        data = json.dumps(body).encode("utf-8") if body is not None else None
        req = urllib.request.Request(
            self.base_url + path,
            data=data,
            method=method,
            headers={
                "Content-Type": "application/json",
                "x-publishable-api-key": self.publishable_key,
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=_TIMEOUT_S) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            # 400/404 = bu ölçü için fiyat yok — beklenen bir sonuç, hata değil.
            if e.code not in (400, 404):
                logger.warning("store api %s %s → %s", method, path, e.code)
            return None
        except Exception as e:  # ağ/zaman aşımı: sohbet bloklanmasın
            logger.warning("store api %s %s başarısız: %s", method, path, e)
            return None

    def _cached(self, key: str, loader):
        hit = self._cache.get(key)
        if hit and time.time() - hit[0] < _CACHE_TTL_S:
            return hit[1]
        value = loader()
        if value is not None:
            self._cache[key] = (time.time(), value)
        return value

    # ------------------------------------------------------------------ #

    def price_options(self) -> Optional[Dict[str, Any]]:
        """Fiyat matrisi ağacı: {blade_type: {genişlik: {kalınlık: [diş…]}}}."""
        data = self._cached("options", lambda: self._request("GET", "/store/blade-price/options"))
        return (data or {}).get("tree") if data else None

    def calculate(self, blade_type: str, width_mm: float, thickness_mm: float,
                  length_mm: int, tooth_pitch: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Sitenin fiyat hesaplayıcısı (1 adet, kaynak dahil, KDV hariç)."""
        return self._request("POST", "/store/blade-price/calculate", {
            "blade_type": blade_type,
            "width_mm": width_mm,
            "thickness_mm": thickness_mm,
            "tooth_pitch": tooth_pitch,
            "length_mm": length_mm,
        })

    def _region_id(self) -> Optional[str]:
        def load():
            data = self._request("GET", "/store/regions?fields=id,countries.iso_2")
            regions = (data or {}).get("regions") or []
            for r in regions:
                if any((c or {}).get("iso_2") == "tr" for c in r.get("countries") or []):
                    return r["id"]
            return regions[0]["id"] if regions else None
        return self._cached("region", load)

    def ready_made(self) -> List[Dict[str, Any]]:
        """Yayındaki hazır boy ürünler: başlık, ölçü, fiyat (KDV hariç), handle."""
        def load():
            region = self._region_id()
            q = urllib.parse.urlencode({
                "limit": 200,
                "fields": "handle,title,metadata,variants.calculated_price",
                **({"region_id": region} if region else {}),
            })
            data = self._request("GET", f"/store/products?{q}")
            if data is None:
                return None
            out = []
            for p in data.get("products") or []:
                m = p.get("metadata") or {}
                if not (m.get("is_ready_made") is True or m.get("is_ready_made") == "true"):
                    continue
                prices = [
                    (v.get("calculated_price") or {}).get("calculated_amount")
                    for v in p.get("variants") or []
                ]
                prices = [x for x in prices if isinstance(x, (int, float)) and x > 0]
                out.append({
                    "handle": p.get("handle"),
                    "title": p.get("title"),
                    "width_mm": _num(m.get("width_mm")),
                    "thickness_mm": _num(m.get("thickness_mm")),
                    "tooth_pitch": m.get("tooth_pitch"),
                    "length_mm": _num(m.get("length_mm")),
                    "price": min(prices) if prices else None,
                })
            return out
        return self._cached("ready_made", load) or []


def _num(v: Any) -> Optional[float]:
    try:
        n = float(v)
        return n if n > 0 else None
    except (TypeError, ValueError):
        return None
