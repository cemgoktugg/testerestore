# -*- coding: utf-8 -*-
"""
Ön masa (llm/front_desk.py) testleri — ağ yok, sahte mağaza istemcisi.

Kilitlenen davranışlar (2026-10-26 değerlendirmesindeki hatalar):
  - mağaza soruları (kargo, iade, ödeme, fatura, iletişim) anketsiz cevaplanır
  - fiyat sitenin hesaplayıcısından, stok gerçek listeden; eksikse takip sorusu
  - arıza teşhisi, ahşap yönlendirmesi, konu dışı
  - huninin cevapları ("2750", "merhaba", "et kalınlığı 3 mm") ön masaya TAKILMAZ
  - teslim süresi verilmez, kimlik TestereStore
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest

from llm.front_desk import FrontDesk, parse_length, parse_tpi, parse_width_thickness


TREE = {
    "bi-metal": {"13": {"0.6": ["10/14", "8/12", "6/10"]}, "27": {"0.9": ["4/6", "5/8", "3/4"]},
                 "34": {"1.1": ["3/4", "2/3", "4/6"]}},
    "carbide": {"27": {"0.9": ["3/4", "2/3"]}},
    "woodcut": {"13": {"0.6": []}, "20": {"0.7": []}, "25": {"0.8": []}},
    "meat-bone": {"16": {"0.5": []}},
    "textile": {"10": {"0.5": []}},
}
PER_M = {("bi-metal", "4/6"): 380, ("bi-metal", "5/8"): 360, ("bi-metal", "3/4"): 380,
         ("carbide", "3/4"): 500, ("carbide", "2/3"): 980}


class FakeStore:
    enabled = True

    def price_options(self):
        return TREE

    def calculate(self, blade_type, width_mm, thickness_mm, length_mm, tooth_pitch=None):
        per_m = PER_M.get((blade_type, tooth_pitch), 100)
        return {"total_price": round(per_m * length_mm / 1000 + 75, 2)}

    def ready_made(self):
        return [
            {"handle": "bm-13-06-1014-1638", "title": "Bi-Metal M42 Premium Hazır — 13 × 0.6 × 10/14 TPI × 1638 mm",
             "width_mm": 13, "thickness_mm": 0.6, "tooth_pitch": "10/14", "length_mm": 1638, "price": 787.1},
            {"handle": "bm-13-06-610-1440", "title": "Bi-Metal M42 Premium Hazır — 13 × 0.6 × 6/10 TPI × 1440 mm",
             "width_mm": 13, "thickness_mm": 0.6, "tooth_pitch": "6/10", "length_mm": 1440, "price": 698.0},
        ]


class Session:
    pass


@pytest.fixture
def fd():
    return FrontDesk(store=FakeStore())


def ask(fd, msg, session=None):
    return fd.handle(session or Session(), msg)


# --------------------------------------------------------------------------- #
# Ayrıştırma
# --------------------------------------------------------------------------- #

def test_parsers():
    assert parse_width_thickness("27x0,9 bimetal") == (27.0, 0.9)
    assert parse_width_thickness("27 × 0.9") == (27.0, 0.9)
    assert parse_width_thickness("60x60 kutu profil") is None
    assert parse_length("2750 mm boyunda") == 2750
    assert parse_length("2,75 m") == 2750
    assert parse_length("27x0.9 3000") == 3000
    assert parse_tpi("4/6 tpi") == "4/6"
    assert parse_tpi("1,4/2") == "1.4/2"


# --------------------------------------------------------------------------- #
# Mağaza soruları
# --------------------------------------------------------------------------- #

def test_shipping_answered_without_delivery_time(fd):
    r = ask(fd, "Kargo ücreti ne kadar, sipariş verirsem ne zaman gelir?")
    assert r and r.final and r.kinds == ["shipping"]
    assert "2.000 TL" in r.text and "79,90 TL" in r.text
    assert "en kısa sürede" in r.text
    for forbidden in ("aynı gün", "24 saat", "iş günü"):
        assert forbidden not in r.text


def test_returns_and_payment(fd):
    r = ask(fd, "İade yapabilir miyim? Kapıda ödeme var mı?")
    assert r.kinds == ["returns", "payment"]
    assert "14 gün" in r.text and "cayma hakkı bulunmaz" in r.text
    assert "Kapıda ödeme seçeneğimiz bulunmuyor" in r.text


def test_invoice_and_contact(fd):
    assert "kurumsal" in ask(fd, "Kurumsal fatura kesiyor musunuz?").text
    r = ask(fd, "Size nasıl ulaşabilirim?")
    assert r.kinds == ["contact"] and "/iletisim" in r.text


# --------------------------------------------------------------------------- #
# Fiyat
# --------------------------------------------------------------------------- #

def test_price_full(fd):
    r = ask(fd, "27x0.9 bimetal 2750 mm boyunda bir bıçak kaç para?")
    assert r.final and r.kinds == ["price"]
    assert "1.065,00 – 1.120,00 TL + KDV" in r.text   # diş adımına göre aralık
    assert "/products/bimetal-premium" in r.text
    assert "matematik" not in r.text


def test_price_with_tpi_is_single(fd):
    r = ask(fd, "27x0.9 bimetal 4/6 2750 mm fiyat")
    assert "1.120,00 TL + KDV" in r.text and "–" not in r.text.split("Adet")[0]


def test_price_missing_length_then_follow_up(fd):
    s = Session()
    r = fd.handle(s, "bimetal 34x1.1 fiyatı ne kadar")
    assert "boy" in r.text and s.front_desk_pending["kind"] == "price"
    r2 = fd.handle(s, "3000")
    assert r2 and r2.kinds == ["price"] and "34 × 1,1 mm, 3000 mm" in r2.text


def test_price_unknown_dims(fd):
    r = ask(fd, "bimetal 50x2 3000 mm fiyat")
    assert "fiyat listemizde yok" in r.text


# --------------------------------------------------------------------------- #
# Stok
# --------------------------------------------------------------------------- #

def test_stock_exact(fd):
    r = ask(fd, "1638 mm hazır bıçağınız var mı?")
    assert r.kinds == ["stock"] and "Evet" in r.text and "787,10 TL" in r.text


def test_stock_none_suggests_near_and_quotes_bimetal(fd):
    r = ask(fd, "1500 mm hazır var mı 13x0.6")
    assert "hazır stokta yok" in r.text and "1440 mm" in r.text
    assert "Bi-Metal" in r.text and "Ahşap" not in r.text


# --------------------------------------------------------------------------- #
# Arıza, ahşap, konu dışı
# --------------------------------------------------------------------------- #

def test_troubleshooting(fd):
    r = ask(fd, "Bıçağım çok çabuk köreliyor ve eğri kesiyor, neden olabilir?")
    assert r.kinds == ["troubleshoot"]
    assert "Kesimin yana kaçması" in r.text and "Mengene" in r.text
    assert "Dişlerin erken aşınması" in r.text and "enerjisi kesilmişken" in r.text


def test_wood_guidance_and_price_follow_up(fd):
    s = Session()
    r = fd.handle(s, "Marangozum, kereste için 20 mm bıçak ne önerirsin?")
    assert r.kinds == ["non_metal:woodcut"]
    assert "Ahşap Kesim" in r.text and "304" not in r.text and "S235" not in r.text
    assert s.front_desk_pending["dims"] == (20.0, 0.7)
    r2 = fd.handle(s, "2900 mm")
    assert r2 and "20 × 0,7 mm, 2900 mm" in r2.text


def test_off_topic(fd):
    r = ask(fd, "Bana İstanbul hakkında bir şiir yazar mısın?")
    assert r.final and r.kinds == ["off_topic"] and "yapay zekâ asistanıyım" in r.text


# --------------------------------------------------------------------------- #
# Huniye bırakılması gerekenler
# --------------------------------------------------------------------------- #

@pytest.mark.parametrize("msg", [
    "merhaba",
    "2750",
    "Kesmak 250 makinem var, hangi bıçağı almalıyım?",
    "40 mm dolu paslanmaz mil kesiyorum, hangi diş adımını kullanmalıyım?",
    "60x60 kutu profil et kalınlığı 3 mm",      # "et" = cidar, et-kemik DEĞİL
    "Paslanmaz",
    "Evet",
])
def test_funnel_messages_pass_through(fd, msg):
    assert ask(fd, msg) is None


def test_hybrid_selection_plus_shipping(fd):
    r = ask(fd, "40 mm dolu paslanmaz kesiyorum, kargo ne kadar?")
    assert r and not r.final and "shipping" in r.kinds


# --------------------------------------------------------------------------- #
# Huni sonrası
# --------------------------------------------------------------------------- #

def test_post_process_announces_engine_tpi_once(fd):
    s = Session()
    res = {"message": "**Makine markanız ve modeliniz nedir?**", "state": {"tooth_pitch": "4/6"},
           "recommendation": None}
    out = fd.post_process(s, dict(res))
    assert out["message"].startswith("Verdiğiniz bilgilere göre önerilen diş adımı: **4/6 TPI**")
    again = fd.post_process(s, dict(res))
    assert "önerilen diş adımı" not in again["message"]


def test_post_process_wood_category_redirects(fd):
    s = Session()
    res = {"message": "Elimdeki bilgilerle kesin bir ürün kodu üretemedim.",
           "state": {"material_category": "WOOD"}, "recommendation": None,
           "next_question": {"text": "x"}}
    out = fd.post_process(s, res)
    assert "Ahşap Kesim" in out["message"] and out["next_question"] is None
