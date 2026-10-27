# -*- coding: utf-8 -*-
"""
Ön masa sağlamlaştırma (2026-10-27) — 700 müşteri mesajlık kapsama ölçümünde (%9 yanlış cevap)
bulunan HER yanlış cevabın regresyon testi; mesajlar soru bankasındaki gerçek ifadelerdir.

Kilitlenen davranışlar:
  - boy ayrıştırma: model no (Kesmak 350, LB1200F), malzeme kodu (AISI 304, 6082, 1.2379), cm,
    "3 metre 66", boy×genişlik×kalınlık etiketi, binlik ayırıcı
  - "et" fiili / profil cidarı et-kemik değil; "yaparken" ahşap değil; "çalıştır" rodaj değil;
    "hazırlanıyor" stok değil; "gönderir misiniz" kargo değil; bakım/montaj "değiştir" iade değil;
    "ne kadar dayanır / hız ne kadar olmalı / kaça karıştırayım" fiyat değil
  - arıza tespiti data/troubleshooting_tr.json kalıplarıyla (45 belirti)
  - aileye göre boy sınırı (ürün metadata min/max_length_mm)
  - son fiyat cevabına takip: "peki 34'lük olsa", "karbür olsa", "4/6 olanı", "2 tane alsam", "KDV dahil"
  - seçim girdileri ("40 mm dolu paslanmaz kesiyorum", "Var", "Kesmak KMY 280") huniye gider
Ağ yok, OpenAI yok.
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest

from llm import front_desk as F
from llm.front_desk import (FrontDesk, ambiguous_dims, ambiguous_metre, detect_family, norm, parse_length,
                            parse_qty, parse_tpi, parse_width_thickness)

DATA = os.path.join(os.path.dirname(__file__), "..", "data", "troubleshooting_tr.json")

# Canlı fiyat ağacının (2026-10-27) özeti
TREE = {
    "bi-metal": {"13": {"0.6": ["10/14", "8/12", "14", "6/10", "18", "14/18"], "0.5": ["10/14", "18", "14"]},
                 "27": {"0.9": ["4/6", "5/8", "3/4", "2/3", "8"]},
                 "34": {"1.1": ["3/4", "2/3", "4/6"], "1.2": ["3/4"]},
                 "41": {"1.3": ["1.4/2", "2/3", "3/4"]}},
    "carbide": {"27": {"0.9": ["3/4", "2/3"]}, "34": {"1.1": ["3/4", "1.4/2", "2/3"]}},
    "meat-bone": {"16": {"0.5": []}, "19": {"0.55": []}, "20": {"0.6": []}},
    "textile": {"8": {"0.45": []}, "10": {"0.5": []}, "13": {"0.6": []}},
    "woodcut": {"13": {"0.6": []}, "20": {"0.7": []}, "25": {"0.8": []}},
}
PER_M = {"bi-metal": 380, "carbide": 900, "woodcut": 120, "meat-bone": 110, "textile": 130}
READY = [(13, 0.6, "10/14", 1638, 787.1), (13, 0.6, "6/10", 1440, 698.0), (27, 0.9, "4/6", 2450, 1120.0),
         (27, 0.9, "5/8", 2750, 1180.0)]


class Store:
    """Fiyat API'si gibi: 1 adet toplamı + birim fiyat + kaynak ücreti (satır başına bir kez)."""
    enabled = True

    def __init__(self):
        self.calls = []

    def price_options(self):
        return TREE

    def calculate(self, blade_type, width_mm, thickness_mm, length_mm, tooth_pitch=None):
        self.calls.append((blade_type, width_mm, thickness_mm, length_mm, tooth_pitch))
        unit = round(PER_M[blade_type] * length_mm / 1000, 2)
        return {"unit_price": unit, "welding_fee": 75.0, "total_price": round(unit + 75, 2)}

    def ready_made(self):
        return [{"handle": f"bm-{w}-{t}-{tp.replace('/', '')}-{l}",
                 "title": f"Bi-Metal M42 Premium Hazır — {w} × {t} × {tp} TPI × {l} mm",
                 "width_mm": w, "thickness_mm": t, "tooth_pitch": tp, "length_mm": l, "price": p}
                for w, t, tp, l, p in READY]


class Session:
    pass


@pytest.fixture
def store():
    return Store()


@pytest.fixture
def fd(store):
    return FrontDesk(store=store)


def run(fd, *turns):
    s = Session()
    r = None
    for t in turns:
        r = fd.handle(s, t)
    return r, s


# --------------------------------------------------------------------------- #
# 1) Boy / ölçü ayrıştırma (yanlış boyla fiyat-stok = en yüksek risk)
# --------------------------------------------------------------------------- #

@pytest.mark.parametrize("msg,length", [
    ("3 metre 66", 3660),
    ("2 metre 45 lik var mı", 2450),
    ("3 metre 66 bıçak lazım stokta var mı", 3660),
    ("M51 34x1.1 410 cm 2/3 fiyatı", 4100),
    ("27x0.9 275 cm fiyat", 2750),
    ("6082 alüminyum kesiyorum 34x1,1 3505 mm fiyat", 3505),
    ("AISI 304 için 27x0.9 bıçak fiyatı 2750 mm", 2750),
    ("1.2379 kesiyorum 34x1.1 3660 fiyat", 3660),
    ("2750x27x0.9 4/6 ne kadar", 2750),
    ("3660x34x1,1 3/4 bimetal fiyat", 3660),
    ("Etikette 3660 x 34 x 1,1 yazıyor", 3660),
    ("27x0,9x2750 fiyat", 2750),
    ("2750lik 27 0.9 bimetal ne kadar", 2750),
    ("2.750 mm 27x0.9", 2750),
    ("Kesmak 350 için 2720 mm bıçak", 2720),
    ("34x1.1 6082 mm", 6082),                 # "mm" yazılınca malzeme kodu değil boy
    ("27x0.9 2750 10 adet alsam ne kadar olur", 2750),
    ("2,75 m", 2750),
])
def test_parse_length_reads_the_intended_length(msg, length):
    assert parse_length(norm(msg)) == length


@pytest.mark.parametrize("msg", [
    "Kesmak 350 için bıçak fiyatı",           # model numarası
    "Makita LB1200F bıçağı var mı",
    "Mega BS 315 için bıçak var mı",
    "Kesmak KMY 280",
    "AISI 304 boru için bıçak var mı",          # malzeme kodu
    "6061 alüminyum için bıçak var mı",
    "AISI 316 ile 304 farkı",
    "Toplam 1900 TL oldu, kargo ücretsiz olur mu?",
    "2024'te aldım",
    "kasnak çapı 350 mm, merkezler arası 1200 mm",
    "Kasnak çapı 30 cm, hangi kalınlık olur?",
    "bant hızı 15 m/dk",
    "3 metre 34 lük",                          # belirsiz: 3.340 mm mi, 3 m + 34 mm genişlik mi
    "40 mm dolu paslanmaz kesiyorum",
])
def test_parse_length_ignores_non_length_numbers(msg):
    assert parse_length(norm(msg)) is None


@pytest.mark.parametrize("msg,dims", [
    ("2720x27x0,9", (27.0, 0.9)), ("Etikette 3660 x 34 x 1,1 yazıyor", (34.0, 1.1)),
    ("bimetal 27/0.9 2750 fiyat", (27.0, 0.9)), ("27 ye 0.9 luk 2750 boy kaça", (27.0, 0.9)),
    ("2750lik 27 0.9 bimetal", (27.0, 0.9)), ("27x0,9x2750", (27.0, 0.9)),
])
def test_parse_width_thickness_label_and_colloquial(msg, dims):
    assert parse_width_thickness(norm(msg)) == dims


@pytest.mark.parametrize("msg", ["4/6 tpi", "60x60x3 kutu profil", "27x09 2750", "10/14 diş"])
def test_parse_width_thickness_rejects_non_blade(msg):
    assert parse_width_thickness(norm(msg)) is None


def test_ambiguous_inputs_are_detected_not_guessed():
    assert ambiguous_dims(norm("27x09 2750 fiyat")) == (27.0, 0.9)
    assert ambiguous_dims(norm("27x0.9 2750 fiyat")) is None
    assert ambiguous_metre(norm("3 metre 34 lük")) == (3, 34)
    assert ambiguous_metre(norm("3 metre 66")) is None


def test_parse_tpi_and_qty():
    assert parse_tpi(norm("bimetal 27/0.9 2750 fiyat")) is None       # genişlik/kalınlık, diş değil
    assert parse_tpi(norm("4/6 olanı")) == "4/6"
    assert parse_tpi(norm("1,4/2")) == "1.4/2"
    assert parse_qty(norm("2 tane alsam")) == 2
    assert parse_qty(norm("Teklif alabilir miyim, 20 adet 34x1.1 4115")) == 20
    assert parse_qty(norm("iki tane")) == 2
    assert parse_qty(norm("27x0.9 2750")) is None


# --------------------------------------------------------------------------- #
# 2) Ürün ailesi tespiti
# --------------------------------------------------------------------------- #

@pytest.mark.parametrize("msg,family", [
    ("bana bi bıçak tavsiye et", None),
    ("yardım et hangi bıçağı alayım", None),
    ("Kontrol et bakalım Kesmak 250 için 27x0,9 doğru mu", None),
    ("Paslanmaz boru 2 mm et 50 çap", None),
    ("Boru dış çapı 60 mm et 3 mm", None),
    ("St52 profil 5 mm et", None),
    ("Kalın et kalınlıklı profil, 10 mm et", None),
    ("60x60 kutu profil et kalınlığı 3 mm", None),
    ("ödeme yaparken hata verdi", None),
    ("Kesim yaparken bıçak çok ses yapıyor", None),
    ("kütük çelik kesiyorum", None),
    ("Deri kesimi için dişsiz bıçaklarınızı kullanabilir miyiz", None),
    ("Balıkesir'e kargo", None),
    ("Kasap için et kemik bıçağı lazım", "meat-bone"),
    ("Hijyenik bıçak gıdaya uygun mu", "meat-bone"),
    ("donuk et kesiyorum", "meat-bone"),
    ("palet söküp kesiyorum", "woodcut"),
    ("Çam kalas kesmek için", "woodcut"),
    ("Hızar bıçağı var mı", "woodcut"),
    ("Bıçkıhane için geniş şerit", "woodcut"),
    ("Resaw için hangi bıçak", "woodcut"),
    ("parke kesiyorum", "woodcut"),
    ("karbit uçlu 34x1.1 3660 fiyat", "carbide"),
    ("vidia uçlu şerit var mı", "carbide"),
    ("bı metal 27*0.9 2720 ne kadar", "bi-metal"),
    ("Sünger için dalgalı bıçak var mı", "textile"),
])
def test_detect_family(msg, family):
    assert detect_family(norm(msg)) == family


# --------------------------------------------------------------------------- #
# 3) Kapsama ölçümündeki yanlış cevaplar → artık doğru blok ya da huni
# --------------------------------------------------------------------------- #

# (önceki turlar, mesaj, beklenen kinds; None = ön masa susar → huni/LLM)
FIXED = [
    ([], "Kontrol et bakalım Kesmak 250 için 27x0,9 doğru mu", None),
    ([], "bana bi bıçak tavsiye et", None),
    ([], "yardım et hangi bıçağı alayım", None),
    ([], "Paslanmaz boru 2 mm et 50 çap", None),
    ([], "Boru dış çapı 60 mm et 3 mm", None),
    ([], "St52 profil 5 mm et", None),
    ([], "Kalın et kalınlıklı profil, 10 mm et", None),
    ([], "AISI 304 boru için bıçak var mı", None),
    ([], "6061 alüminyum için bıçak var mı", None),
    ([], "Makita LB1200F bıçağı var mı", None),
    ([], "Mega BS 315 için bıçak var mı", None),
    ([], "Kaynak yeri tutar mı, çok ince görünüyor", None),
    ([], "Kasnak lastiği değişimi nasıl yapılır", None),
    ([], "Kılavuz rulmanları ne sıklıkla değiştirilir", None),
    ([], "Fiyatlarınız KDV dahil mi", None),
    ([], "Hazır boy ile özel boy farkı ne", None),
    ([], "410 cm ne kadar mm", None),
    ([], "Adresimi yanlış yazdım değiştirebilir miyim", None),
    ([], "bıçağı nasıl değiştiririm makinede", None),
    ([], "Bıçak ne kadar dayanır", None),
    ([], "Bıçağı ne zaman değiştirmeliyim", None),
    ([], "Bıçak değiştirirken eldiven gerekir mi", None),
    ([], "Şerit testere bıçağı ne zaman değiştirilmelidir?", None),
    ([], "kesme hızı ne kadar olmalı", None),
    ([], "devri ne kadar olmalı alüminyumda", None),
    ([], "Devri kaçta çalıştırayım?", None),
    ([], "Makineyi hangi devirde çalıştırmalıyım", None),
    ([], "Faturası kayboldu garanti olur mu", None),
    ([], "Dolandırıcı mısınız ödeme aldınız ürün yok", None),
    ([], "körelen bıçağı bilettirebilir miyim", None),
    ([], "Körelmeyen uzun ömürlü bıçak hangisi", None),
    ([], "Numune gönderir misiniz", None),
    ([], "Seçim yapmama yardım eder misiniz", None),
    ([], "Kasnak çapı 30 cm, hangi kalınlık olur?", None),
    ([], "kasnak çapına göre bıçak kalınlığı", None),
    ([], "Bıçağı kasnaktan çıkarıp ölçtüm 2715 mm çıktı", None),
    ([], "Bor yağı satıyor musunuz?", None),
    ([], "Deri kesimi için dişsiz bıçaklarınızı kullanabilir miyiz", None),
    ([], "Makinemin markasını bilmiyorum fotoğraf atsam", None),
    ([], "ödeme yaparken hata verdi", ["payment"]),
    ([], "peşin fiyatına taksit var mı", ["payment"]),
    ([], "Kesim yaparken bıçak çok ses yapıyor", ["troubleshoot"]),
    ([], "Makineyi çalıştırınca bıçak kasnaktan atıyor", ["troubleshoot"]),
    ([], "Özel ölçü bıçak kaç günde hazır olur", ["shipping"]),
    ([], "Sipariş verdikten sonra ne kadar sürede hazırlanıyor", ["shipping"]),
    ([], "Sipariş hazırlanıyor yazıyor, ne zaman çıkar", ["shipping"]),
    ([], "Hazır boy aldım, kullanmadım, iade süresi ne kadar", ["returns"]),
    ([], "et kemik bıçağının paketini açtım iade edebilir miyim", ["returns"]),
    ([], "cayma hakkım kaç gün", ["returns"]),
    ([], "Yanlış ölçü göndermişsiniz, ben 2720 istedim 2750 geldi", ["returns"]),
    ([], "bor yağını kaça karıştırayım", ["coolant"]),
    ([], "soğutma suyu köpürüyor", ["coolant"]),
    ([], "e-fatura mükellefiyiz, e-fatura gönderiyor musunuz", ["invoice"]),
    ([], "proforma fatura gönderir misiniz", ["invoice"]),
    ([], "Bıçağın fotoğrafını gönderiyorum bakar mısınız", ["contact"]),
    ([], "Hemen gönderilecek bıçak var mı", ["stock"]),
    ([], "Sünger için dalgalı bıçak var mı", ["non_metal:textile"]),
    ([], "Hangi telefonu almalıyım", ["off_topic"]),
    ([], "stok durumu nedir 27x0.9 3505", ["stock"]),
    ([], "2 metre 45 lik var mı", ["stock"]),
    ([], "3 metre 66 bıçak lazım stokta var mı", ["stock"]),
    ([], "M51 34x1.1 410 cm 2/3 fiyatı", ["price"]),
    ([], "6082 alüminyum kesiyorum 34x1,1 3505 mm fiyat", ["price"]),
    ([], "AISI 304 için 27x0.9 bıçak fiyatı 2750 mm", ["price"]),
    ([], "1.2379 kesiyorum 34x1.1 3660 fiyat", ["price"]),
    ([], "Kesmak 350 için bıçak fiyatı", ["price"]),
    (["bimetal 34x1.1 fiyatı ne kadar"], "3 metre 66", ["price"]),
    (["Kesmak 350 için bıçak fiyatı"], "27x0.9 bimetal", ["price"]),
    (["1500 mm hazır var mı 13x0.6"], "en yakını hangisi", ["stock"]),
]


@pytest.mark.parametrize("ctx,msg,kinds", FIXED, ids=[m for _, m, _ in FIXED])
def test_coverage_wrong_answers_fixed(fd, ctx, msg, kinds):
    r, _ = run(fd, *ctx, msg)
    if kinds is None:
        assert r is None, (r.kinds, r.text[:200])
    else:
        assert r is not None and r.kinds == kinds, (r and r.kinds)


def test_hybrid_wall_thickness_message_keeps_funnel(fd):
    r, _ = run(fd, "St37 profil kesiyorum, 2 mm et, bıçak boyunu da bilmiyorum")
    assert r.kinds == ["length_help"] and not r.final           # et-kemik yok, huni devam eder
    assert "Et-Kemik" not in r.text


@pytest.mark.parametrize("ctx,msg,spec", [
    ([], "M51 34x1.1 410 cm 2/3 fiyatı", "34 × 1,1 mm, 4100 mm, 2/3 TPI"),
    ([], "6082 alüminyum kesiyorum 34x1,1 3505 mm fiyat", "34 × 1,1 mm, 3505 mm"),
    ([], "AISI 304 için 27x0.9 bıçak fiyatı 2750 mm", "27 × 0,9 mm, 2750 mm"),
    ([], "1.2379 kesiyorum 34x1.1 3660 fiyat", "34 × 1,1 mm, 3660 mm"),
    ([], "2750x27x0.9 4/6 ne kadar", "27 × 0,9 mm, 2750 mm, 4/6 TPI"),
    ([], "27 ye 0.9 luk 2750 boy kaça", "27 × 0,9 mm, 2750 mm"),
    ([], "Teklif alabilir miyim, 20 adet 34x1.1 4115", "34 × 1,1 mm, 4115 mm"),
    (["bimetal 34x1.1 fiyatı ne kadar"], "3 metre 66", "34 × 1,1 mm, 3660 mm"),
    (["3 metre 66 bıçak lazım stokta var mı"], "27x0.9", "27 × 0,9 mm, 3660 mm"),
])
def test_quote_uses_the_intended_size(fd, ctx, msg, spec):
    r, _ = run(fd, *ctx, msg)
    assert spec in r.text
    for wrong in ("6082 mm", "304 mm", "2379 mm", "410 mm", "350 mm", "3000 mm"):
        assert wrong not in r.text


def test_model_number_is_never_kept_as_pending_length(fd):
    r, s = run(fd, "Kesmak 350 için bıçak fiyatı")
    assert s.front_desk_pending["length"] is None
    r2 = fd.handle(s, "27x0.9 bimetal")
    assert "boy (mm" in r2.text and "350 mm" not in r2.text


def test_label_triple_answers_stock_and_price(fd):
    r, _ = run(fd, "Makine etiketinde 2720x27x0,9 yazıyor, sizde var mı?")
    assert r.kinds == ["stock", "price"]
    assert "2720 mm (27 × 0,9) hazır stokta yok" in r.text and "27 × 0,9 mm, 2720 mm" in r.text


def test_ambiguous_dims_are_confirmed_before_quoting(fd):
    r, s = run(fd, "27x09 2750 fiyat")
    assert "27 × 0,9 mm** olarak mı" in r.text and "TL" not in r.text
    r2 = fd.handle(s, "evet")
    assert "27 × 0,9 mm, 2750 mm" in r2.text


def test_ambiguous_metre_is_asked_back(fd):
    r, s = run(fd, "bimetal 34x1.1 fiyatı ne kadar", "3 metre 34 lük")
    assert "3.340 mm mi" in r.text and "3.000 mm boy" in r.text
    r2 = fd.handle(s, "3340 mm")
    assert "34 × 1,1 mm, 3340 mm" in r2.text


# --------------------------------------------------------------------------- #
# 4) Aileye göre boy sınırları (ürün metadata min/max_length_mm)
# --------------------------------------------------------------------------- #

@pytest.mark.parametrize("msg,limit", [
    ("et kemik 16x0.5 7000 mm fiyat", "1.500–6.000 mm"),
    ("karbür 27x0.9 13000 mm fiyat", "1.500–12.000 mm"),
    ("karbür 27x0.9 1200 mm fiyat", "1.500–12.000 mm"),
    ("ahşap 20x0.7 9000 mm fiyat", "1.000–8.000 mm"),
    ("sünger 10x0.5 8500 mm fiyat", "1.000–8.000 mm"),
    ("M51 27x0.9 1200 mm fiyat", "1.500–15.000 mm"),
])
def test_family_length_limits_refuse_out_of_range(fd, store, msg, limit):
    r, _ = run(fd, msg)
    assert r.kinds == ["price"] and limit in r.text and "bu aralığın dışında" in r.text
    assert "+ KDV" not in r.text and store.calls == []         # sınır dışı boy fiyatlanmaz


def test_global_length_limits(fd, store):
    assert "en fazla 15.000 mm" in run(fd, "bimetal 27x0.9 16000 mm fiyat")[0].text
    assert "en az 1.000 mm" in run(fd, "bimetal 27x0.9 900 mm fiyat")[0].text
    assert store.calls == []


def test_short_bimetal_quotes_only_m42_and_notes_other_limits(fd, store):
    r, _ = run(fd, "27x0.9 1200 mm fiyat")
    assert "27 × 0,9 mm, 1200 mm" in r.text and "/products/bimetal-premium" in r.text
    assert "/products/bimetal-m51" not in r.text and "en az 1.500 mm" in r.text
    assert "Karbür Uçlu ölçüye göre 1.500–12.000 mm" in r.text
    assert {c[0] for c in store.calls} == {"bi-metal"}


def test_in_range_family_still_quoted(fd):
    r, _ = run(fd, "et kemik 16x0.5 3000 mm fiyat")
    assert "16 × 0,5 mm, 3000 mm" in r.text and "+ KDV" in r.text


# --------------------------------------------------------------------------- #
# 5) Son fiyat cevabına takip (oturum bağlamı)
# --------------------------------------------------------------------------- #

BASE = "27x0.9 bimetal 2750 mm kaç para?"


def test_follow_up_width_change(fd):
    r, _ = run(fd, BASE, "peki 34 lük olsa")
    assert r.kinds == ["price"] and "34 × 1,1 mm, 2750 mm" in r.text
    assert "1,1, 1,2 mm kalınlık var" in r.text


def test_follow_up_family_change(fd):
    r, _ = run(fd, BASE, "karbür olsa")
    assert "**Karbür Uçlu (TCT)** — 27 × 0,9 mm, 2750 mm" in r.text and "Bi-Metal (M42" not in r.text


def test_follow_up_tpi(fd):
    r, _ = run(fd, BASE, "4/6 olanı")
    assert "27 × 0,9 mm, 2750 mm, 4/6 TPI" in r.text


def test_follow_up_thickness_not_x_but_y(fd):
    r, _ = run(fd, "bimetal 34x1.1 fiyatı ne kadar", "3000", "ya 0.9 değil 1.1 olsa")
    assert r.kinds == ["price"] and "34 × 1,1 mm, 3000 mm" in r.text


def test_follow_up_quantity_uses_backend_formula(fd):
    # (birim × adet + kaynak bir kez) × (100 − indirim) / 100 — lib/blade-line.ts
    r, _ = run(fd, BASE, "3 tane alsam")
    unit = 380 * 2.75
    assert "3 adet toplam: **" + F.tl(round((unit * 3 + 75) * 0.95, 2)) + " + KDV**" in r.text
    assert "%5 adet indirimi dahil" in r.text
    r2, _ = run(fd, BASE, "tamam 2 adet")
    assert "2 adet toplam: **" + F.tl(unit * 2 + 75) + " + KDV**" in r2.text


def test_follow_up_quantity_without_unit_price_defers_to_cart():
    from tests.test_front_desk import FakeStore          # yalnız total_price döndürür
    fd = FrontDesk(store=FakeStore())
    r, _ = run(fd, BASE, "5 tane alsam")
    assert "5 adet için toplam tutar sepette hesaplanır; 5 adette %10" in r.text


def test_follow_up_kdv_included(fd):
    r, _ = run(fd, BASE, "kdv dahil ne kadar oluyor")
    assert "KDV dahil" in r.text and F.tl(round((380 * 2.75 + 75) * 1.2, 2)) in r.text
    assert "genişlik × kalınlık" not in r.text


@pytest.mark.parametrize("msg", ["40 mm dolu paslanmaz kesiyorum", "Var", "Kesmak KMY 280", "Evet"])
def test_follow_up_does_not_hijack_selection_inputs(fd, msg):
    r, _ = run(fd, BASE, msg)
    assert r is None


def test_follow_up_other_topic_is_not_requoted(fd):
    r, _ = run(fd, BASE, "kargo dahil mi")
    assert r.kinds == ["shipping"]
    r2, _ = run(fd, BASE, "34 lük olanı hazırda var mı")
    assert r2.kinds == ["stock"]


def test_follow_up_only_right_after_the_quote(fd):
    # Arada huniye cevap verildiyse ("Var"), "41 lik olan" çap cevabıdır → fiyat takibi değil
    r, _ = run(fd, BASE, "Var", "41 lik olan")
    assert r is None
    r2, _ = run(fd, BASE, "3 tane alsam", "kdv dahil ne kadar oluyor")
    assert "3 adet toplam" in r2.text and "KDV dahil" in r2.text


def test_stock_nearest_follow_up(fd):
    r, _ = run(fd, "1500 mm hazır var mı 13x0.6", "en yakını hangisi")
    assert r.kinds == ["stock"] and "1440 mm" in r.text


# --------------------------------------------------------------------------- #
# 6) Arıza tablosu (data/troubleshooting_tr.json)
# --------------------------------------------------------------------------- #

def _troubleshooting():
    with open(DATA, encoding="utf-8") as f:
        return json.load(f)


def test_troubleshooting_json_superset_and_clean():
    d = _troubleshooting()
    ids = [t["id"] for t in d["troubleshooting"]]
    original = {"blade_break", "tooth_breakage", "tooth_back_breakout", "cut_deviation", "wandering_or_wavy_cut",
                "premature_tooth_wear", "one_sided_tooth_wear", "inaccurate_cut", "chips_in_gullet",
                "blade_back_wear", "blade_surface_damage", "twisted_blade", "rough_cut_surface", "blade_off_wheel",
                "chip_welding", "overheating", "stalling", "back_edge_cracks"}
    assert len(ids) == len(set(ids)) == 45 and original <= set(ids)
    raw = json.dumps(d, ensure_ascii=False)
    assert not re.search(r"(?i)b\.?\s?y\.?\s?cut|bycut|cuttech|\bbyc\b", raw)   # tedarikçi adı yok
    for t in d["troubleshooting"]:
        assert t["patterns"] and t["causes_and_actions"]


def test_front_desk_uses_json_patterns(fd):
    assert len(fd.symptom_table) == 45
    d = _troubleshooting()
    for t in d["troubleshooting"]:
        for ex in t["examples"]:
            assert t["id"] in fd._symptoms(norm(ex)), ex           # ilk 2 eşleşme içinde
    for neg in d["negative_examples"]:
        assert fd._symptoms(norm(neg)) == [], neg


def test_symptom_table_falls_back_to_builtin_without_patterns():
    d = _troubleshooting()
    legacy = {t["id"]: {k: v for k, v in t.items() if k not in ("patterns", "priority")}
              for t in d["troubleshooting"]}
    table = F._symptom_table(legacy)
    assert [sid for sid, _ in table] == [sid for sid, _ in F._SYMPTOMS]


@pytest.mark.parametrize("msg,title", [
    ("Şerit testerem neden dişlerini sıyırıyor?", "Dişler sıra halinde sıyrılıyor"),
    ("kaynaktan kopuyor hep", "Bıçak kaynak yerinden kopuyor"),
    ("kesim düz gitmiyor", "Kesimin yana kaçması"),
    ("Kesimde gıcırtı var", "Titreşim, ötme, gıcırtı"),
    ("Kesim sonunda parçanın altında çapak kalıyor", "Kesilen parçada çapak kalıyor"),
    ("Talaş toz gibi çıkıyor", "Talaşın şekli veya rengi"),
    ("kesim sırasında bıçak burkuluyor", "Bıçağın burulması"),
    ("Makineyi çalıştırınca bıçak kasnaktan atıyor", "Bıçak kasnaktan çıkıyor"),
])
def test_new_symptom_phrasings(fd, msg, title):
    r, _ = run(fd, msg)
    assert r.kinds == ["troubleshoot"] and title in r.text and "rodaj (alıştırma)" not in r.text.split("\n")[0]


# --------------------------------------------------------------------------- #
# 7) Kaçan sorular (MISS) artık yakalanıyor
# --------------------------------------------------------------------------- #

@pytest.mark.parametrize("msg,kind", [
    ("Bugün sipariş versem yarın elimde olur mu?", "shipping"),
    ("Kapıya kadar teslim ediliyor mu", "shipping"),
    ("shipping free mi", "shipping"),
    ("gönderiler hangi gün çıkıyor", "shipping"),
    ("Kart bilgilerim güvende mi", "payment"),
    ("3D secure şifresi gelmiyor", "payment"),
    ("Troy kart geçiyor mu", "payment"),
    ("Hangi şehirdesiniz", "contact"),
    ("çalışma saatleriniz", "contact"),
    ("instagram hesabınız var mı", "contact"),
    ("Bir insana bağlanmak istiyorum", "identity"),
    ("Galatasaray maçı kaç kaç bitti", "off_topic"),
    ("bugün dolar kaç", "off_topic"),
    ("Ödevime yardım eder misin", "off_topic"),
    ("kuru kesebilir miyim paslanmazı", "coolant"),
    ("Alüminyum keserken yağ lazım mı", "coolant"),
    ("Refraktometre ile nasıl ölçülür bor yağı", "coolant"),
    ("iş bitince bıçağı gevşetmek gerekir mi", "tension"),
    ("ilk kesimlerde nelere dikkat etmeliyim yeni bıçak", "run_in"),
    ("Yeni bir şerit testere bıçağı nasıl kullanılmaya başlanmalıdır?", "run_in"),
    ("Şerit boyu ölçme", "length_help"),
    ("palet söküp kesiyorum", "non_metal:woodcut"),
    ("Hijyenik bıçak gıdaya uygun mu", "non_metal:meat-bone"),
    ("inox nedir", "grade"),
    ("AISI 316 ile 304 farkı", "grade"),
])
def test_former_misses_now_answered(fd, msg, kind):
    r, _ = run(fd, msg)
    assert r is not None and kind in r.kinds, (r and r.kinds)


def test_two_grades_in_one_question(fd):
    r, _ = run(fd, "st 37 ile st 52 arasındaki fark")
    assert r.kinds == ["grade"] and "S235JR" in r.text and "S355" in r.text


def test_payment_card_safety_wording(fd):
    r, _ = run(fd, "Kart bilgilerim güvende mi")
    assert "Kart bilgileriniz sitemize iletilmez ve saklanmaz." in r.text


# --------------------------------------------------------------------------- #
# 8) Kesin kurallar
# --------------------------------------------------------------------------- #

@pytest.mark.parametrize("ctx,msg", [(c, m) for c, m, k in FIXED if k] + [
    ([], "27x0.9 1200 mm fiyat"), ([], "et kemik 16x0.5 7000 mm fiyat"),
    ([], "Bugün sipariş versem yarın elimde olur mu?"), ([BASE], "3 tane alsam")])
def test_hard_rules_hold(fd, ctx, msg):
    r, _ = run(fd, *ctx, msg)
    n = norm(r.text)
    for bad in ("garanti", "en iyi", "ayni gun", "24 saat", "is gunu", "bycuttech", "yarin elinizde"):
        assert bad not in n
    assert not re.search(r"\b\d+\s*(?:is\s*)?gun(?:de|u)?\s*(?:icinde\s*)?(?:teslim|kargo)", n)
