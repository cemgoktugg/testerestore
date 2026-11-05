# Reference data for a bandsaw-blade assistant: machine → blade dimensions and material grade → cutting properties

Scope note: research done 2026-10-26. "Local DB" means `advisor/data/machines_database.json` in the TestereStore repo (4,516 machines, 109 manufacturers). I inspected it directly. Every web fact below links to its source. Items marked **(snippet)** come from a search-engine summary of the page and were not fetched in full, so treat them as lower confidence. Items marked **UNVERIFIED** need confirmation before going into production data.

---

## Q1. Which manufacturers matter (Turkey and worldwide), where do they publish blade sizes, and which compiled cross-reference charts and tools exist (with terms of use)?

### Takeaway
The local DB is a copy of WIKUS's "Band dimensions per machine" tool (its own `source` field says so). That tool already covers the main Turkish metal-saw makers: KESMAK, KARMETAL, BEKAMAK, UZAY MAKINA and DG METAL. However, WIKUS's site terms forbid copying its content for commercial use or distribution. Two further compiled sources exist: an older LENOX "Machine Blade Sizes" PDF (2005, 39 pages, length and width only, imperial units) and several woodworking and meat-saw length charts. None of these sources has an API, and none of them lists wood or meat bandsaws made in Turkey.

### Cited Findings
**Existing compiled machine→blade sources**
- The local DB header reads `"source": "https://www.wikus.de/en/guidebook/tools/dimensions-per-machine"` and `"__comment": "Band saw machine database - Dimensions: length x width x thickness (mm)"`, version 1.0.0, last_updated 2026-01-10. It has 109 manufacturers and 4,516 machines. Machine classes: M1 hobby (13–20 mm wide, 0.5–0.65 mm thick), M2 workshop (16–41 mm, 0.9–1.3 mm), M3 heavy (41–100 mm, 1.3–1.6 mm). — local file `advisor/data/machines_database.json`
- The WIKUS tool lets you pick a manufacturer from a dropdown and type a machine model, then returns "The band dimensions for this machine type is…". Its dropdown includes the Turkish makers KESMAK, KARMETAL, BEKAMAK, UZAY MAKINA and DG METAL. The page shows no accuracy disclaimer. — [WIKUS dimensions per machine](https://www.wikus.de/en/guidebook/tools/dimensions-per-machine)
- WIKUS imprint: "All rights reserved. The whole content of this website including text, images, graphics are all subject to copyright protection." It also says content cannot be "copied or modified for commercial use or distribution", and adds "Errors and omissions excepted". WIKUS may "change, suspend or discontinue… any website feature, database, or content". — [WIKUS Imprint](https://www.wikus.de/en/imprint)
- WIKUS ParaMaster® (cutting-data program) contains "more than 150,000 materials and 4,500 band saw machines". "Only registered users can use the program." It is free for WIKUS customers. No API or export is mentioned. — [WIKUS ParaMaster](https://www.wikus.de/en/products/band-saw-blades/paramaster)
- LENOX "Machine Blade Sizes" PDF (printed "Thursday, July 28, 2005", 39 pages, LENOX logo, phone 800-642-0010): about 115 rows per page, roughly 4,000+ rows. Columns are Manufacturer, Model, Orientation (H/V), length in feet and inches, and width. Width uses decimal-inch codes (1.080, 1.360, 1.625, 2.125, 2.650, 3.165) or fractions (1/2, 3/4). The PDF gives **no thickness** and no disclaimer text. Brands covered include Amada, Behringer, Cosen, Daito, DoAll, Danobat, Everising (as "Mastercut / Everising"), HEM, Hyd-Mech, Jet, Kalamazoo, Kaltenbach, Kasto, Marvel, Meba, Mega, MEP (Shark 200–330 only), Pehaka, Peerless, Sabi, Startrite, Thomas, WF Wells, Wilton and "UM" (UMSO/UMSY 280–1010). There are no Kesmak, Karmetal or Beka-Mak rows. It even contains a test row, "Fictitios abc", which tells you something about its data quality. — [LENOX Machine Blade Sizes PDF (hosted by BandSawBladesDirect)](https://mcprod.actionis.com/media/wysiwyg/bbd/tech-docs/Machine_Blade_Sizes_07-2005.pdf); listed as "Lenox blade size chart by Manufacturer & Model" on [BandSawBladesDirect technical documents](https://www.bandsawbladesdirect.com/technical-documents)
- Spot checks show LENOX and WIKUS agree:
  - Mega BS-250-A: LENOX 11'6" = 3,505 mm, local DB 3505×27×0.9.
  - MEP Shark 280: LENOX 9'8.25" ≈ 2,953 mm, local DB 2950×27×0.9.
  - Amada CRH-300: LENOX 12'0" ≈ 3,658 mm, local DB CRH-300 S 3660×27×0.9.
  - LENOX "UM UMSO-280" 12'0" × 1.080" matches local DB "UZAY MAKINA UMS-O 280 H" 3660×27×0.9.

  — [LENOX PDF](https://mcprod.actionis.com/media/wysiwyg/bbd/tech-docs/Machine_Blade_Sizes_07-2005.pdf) vs local DB
- Woodworking: the Inca blade finder covers "more than 1,530 machines from 251 makes", including Record Power, Felder, Hammer, Laguna, Minimax, Jet, Startrite and Scheppach. It shows length in mm and inches only, with no width or wheel diameter. Rows not yet confirmed are labelled "Check the length printed on your old blade" because they "are not yet confirmed by the maker's manual or by several blade sellers". — [Inca bandsaw blade finder](https://incamachines.com/pages/bandsaw-blade-finder)
- Woodworking: the PS Wood / Timber Wolf length reference lists 300+ brand/model entries (for example Jet 14" JWBS-140S at 93½", Laguna LT24/LT28 at 201", Rikon 10-340/345/370 at 142"). Disclaimer: "Below is a reference chart only. You still need to verify your length before ordering." — [PS Wood blade length reference](https://pswood.com/blade-lenghts)
- Laguna manuals give minimum and maximum lengths: 14BX 114¾"–116", 18BX 143¾"–145½" **(snippet)**. — [Laguna 14BX manual](https://lagunatools.com/wp-content/uploads/2022/07/14BX_Manual_071822.pdf), [Laguna 18BX manual](https://lagunatools.com/wp-content/uploads/2022/02/18BX_Manual_021122.pdf)
- Meat saws: a chart lists Biro 11 = 78", Biro 22 = 91", Biro 33 = 116", Biro 34 = 118", Biro 44 = 135", Biro 3334 = 124"; Hobart 5700/5701/5800/6801 = 142"; Hollymatic 16 = 126"; all 5/8" wide **(snippet)**. — [ButcherSupply meat saw blade chart](https://butchersupply.net/band-saw-blade-chart/). **Conflict:** Davison's sells a 142" blade for "Biro 44 & Hobart 5700, 5701, 5801, 6801". — [Davison's](https://davisonsbutcher.com/saw-blades/meat-band-saw-blades-bone-in/142-meat-band-saw-blades-biro-44-hobart-5700-5701-5801-6801/)
- Bizerba's Turkish product page for the MBP250 manual meat saw gives cutting height (250 mm), slice width (10–180 mm) and weight, but **no blade length**. It also mentions the MBP320, FK23 and FK32. — [Bizerba MBP250 (TR)](https://www.bizerba.com/tr/tr/products/mbp250)

**Manufacturer spec pages (primary sources)**
- Kesmak publishes a specification table on each model page, including blade length × width × thickness. For example, the KMO 280 page gives "3660 X 27 X 0,9 mm". The menu lists the pivot series (KMY/KMO/KME, DG/2DG/GK variants), column series (KSY/KLE/KLY/KSE/KLO), servo series (KMS/KSS/KLS), vertical models and KDT circular saws. — [Kesmak KMO 280](https://www.kesmak.com.tr/kmo-280.html)
- Beka-Mak publishes per-model pages. The BMSY-270DG page gives "3160x27x0.9 mm". The home page lists about 70 models (BMS, BMSY, BMSO, C = double column, XS high-tech, VT/VG vertical). — [Beka-Mak BMSY-270DG](https://www.bekamak.com/urun/bmsy-270dg/en), [Beka-Mak home](https://www.bekamak.com/index/en)
- Karmetal publishes per-model pages. The KSA 600x800 page gives "6.700 x 54 x 1,6 mm" and 25–90 m/min. — [Karmetal KSA 600x800](https://www.karmetal.com.tr/urun/9/ksa-600x800.html)
- Pilous publishes per-model pages. ARG 330 plus S.A.F. is "3870 x 34 x 1,1", 15–90 m/min, which matches the local DB. — [Pilous ARG 330 plus S.A.F.](https://www.pilous.cz/en/metal/bandsaws/hydraulic-semi-automatic/arg-330-plus-s-a-f)

**Market position (weak evidence)**
- Beka-Mak: founded in 1984, about 50 products, cutting range 170–1,300 mm diameter, first export to Germany in 1991, now in about 78 countries through 60 distributors **(snippet)**. — [MachineTools.com Beka-Mak](https://www.machinetools.com/en/brands/beka-mak/models), [turkish-manufacturers.com Beka-Mak](https://turkish-manufacturers.com/companies/beka-mak-makina-sanve-ticas_6117.html)
- Karmetal is described as "Turkey's leading band saw machine manufacturer" with "more than 45 models" **(snippet, self-description)**. — [Karmetal](https://www.karmetal.com.tr/urun/9/ksa-600x800.html)
- Kesmak has made band saws since 1995 **(snippet)**. — [Kesmak](https://www.kesmak.com.tr/)
- A directory of Turkish "bandsaw" companies lists Beka-Mak, Aymaksan, Birlik Makina, Arıcı Makina (meat machines), Ünver Ağaç İşleme and VMM Varol (woodworking), Fimaksan (carpentry), Wellershaus and MD Testere (blades), and others. — [turkish-manufacturers.com bandsaw](https://www.turkish-manufacturers.com/bandsaw-turkey.html)

### Inferences
- The 4,516-machine DB is effectively a full extraction of WIKUS's tool. WIKUS's own count of "4,500 band saw machines" for ParaMaster matches it almost exactly. Under WIKUS's imprint this carries copyright and database-right risk (EU database rights may protect substantial extraction even where single facts are not copyrightable — legal inference only, not verified; get legal advice). Options: (a) ask WIKUS for written permission or a partnership; (b) re-verify each entry from manufacturer spec sheets and manuals and store your own source URL per row, keeping WIKUS only as an internal cross-check; (c) build from your own sales and return history.
- The LENOX 2005 PDF is useful as an independent second source to confirm lengths and widths of legacy US/Asian machines. It is old, imperial, has no thickness, and its terms are unknown, so treat it as cross-check data, not as something to republish.
- Brand coverage that matters most for Turkey and is missing or thin today: Turkish wood bandsaws (named by wheel size, e.g. "40'lık", "80'lik"), Turkish meat/bone saws (often named by blade length, e.g. "1650"), and smaller Turkish metal-saw makers such as Dispa/Çağlayan (M-Y 270). None of these are in the local DB's 109-brand list (checked: no DISPA, ÇAĞLAYAN, ARI, YILMAZ, or wood/meat brands).
- Origin of the brand "MEGA" in the DB (BS-250…, H-260…, MH-1080 S): background knowledge suggests the Taiwanese Mega Machine Co., not a Turkish "Mega Makine" — **UNVERIFIED**. The Turkish Mega Makina (megamakina.com, founded 2006, Tuzla/Ostim) was not confirmed as a band saw maker. — [Mega Makina](https://megamakina.com/) **(snippet)**

### Gaps
- No reliable market-share data was found for band saw machines in Turkey or worldwide.
- Not found: machine-lookup tools from Starrett, Bahco or Simonds, and their terms. Starrett promotes the "PowerCalc Band Saw Selector" mobile app **(snippet)** but no machine-size lookup page was located. Bahco's catalogue PDF ([allblades.ca copy](https://www.allblades.ca/wp-content/uploads/Catalogues/Bahco%20Bandsaw%20Blade%20Catalogue.pdf)) was not opened.
- Not checked: blade sizes for Kolbe, Hollymatic (beyond the chart), Centauro, Minimax, Felder/Hammer (per model), Record Power, or Turkish wood-saw makers.
- Not researched individually: Özçelik, Imet, Bianco, Femi, Faccin, Thomas, Jet, Optimum and others. Most are already in the local DB through WIKUS: THOMAS 50, IMET 117, BIANCO 43, BOMAR 94, KASTO 213, BEHRINGER 240 entries.

---

## Q2. Turkish machine makers: naming conventions and verified model → blade size pairs

### Takeaway
Turkish metal bandsaw model numbers usually encode the **round cutting capacity in mm** (Kesmak KMY 280 = Ø280; Beka-Mak BMSY-270DG = Ø270) or the **capacity H×W** (Karmetal KSA 600x800; Kesmak KSY 400×600). Prefix letters encode the automation level (Y = yarı otomatik/semi-automatic, O = otomatik, E = elektronik, S = servo) and options (DG = döner göbek/swivel, 2DG = both directions). So a customer saying "Kesmak 250" or "Bimak 270" is naming a **capacity class, not a unique machine**. "Bimak" itself is not a known band saw brand and is almost certainly a mishearing of **Beka-Mak (Bekamak)**, which the DB already contains.

### Cited Findings
**Naming conventions**
- Kesmak page titles pair models with categories: "KMY 280 – Mafsallı Tezgahlar – Yarı Otomatik Kesim"; "KMO 280 – Tam Otomatik Düz Kesim / Elektronik Düz Kesim"; "KME 350 – Elektronik Düz Kesim / Elektronik Açılı Kesim"; "KMM DG 280 – Tek Yön Döner Göbek, Çift Yön Döner Göbek" **(search-result titles)**. — [Kesmak KMY 280](https://www.kesmak.com.tr/kmy-280.html), [Kesmak KME 350](https://www.kesmak.com.tr/kme-350.html), [Kesmak KMM DG 280](https://www.kesmak.com/kmy-dg-280.html)
- Beka-Mak: "BMSO (full auto), BMSY (semi-auto), BMS (manual), with additional designations for cutting type (C, DG, G, VT, CS, etc.)". C models are double-column, XS are high-tech. — [Beka-Mak home](https://www.bekamak.com/index/en)
- Karmetal: model = product line + capacity, e.g. "KSA 600x800" is a semi-automatic, fixed-angle, double-column machine for Ø600 round and 540×800 rectangular stock. — [Karmetal KSA 600x800](https://www.karmetal.com.tr/urun/9/ksa-600x800.html)
- Turkish wood bandsaws are named by wheel diameter: "40'lık şerit testere" means a 400 mm cast-iron wheel ("Kasnak çapı = 400 mm"). The page gives no blade length. — [Turemak 40'lık](https://www.turemak.com.tr/40-lik-serit-testere)
- Turkish meat/bone saws are sold and listed by blade length. Examples: "Yılmaz Et Makineleri Et Kemik Testeresi Frensiz 1650 Trifaze" and "Max Extra MXJG210 İçin Et Kemik Testeresi Bıçağı 1650 mm" **(snippet)**. — [Tekmutfak Yılmaz 1650](https://www.tekmutfak.com/product?product_id=1922), [Testeresepeti Max Extra 1650](https://www.testeresepeti.com.tr/urunler/max-extra-mxjg210-icin-et-kemik-testeresi-bicagi-1650-mm-8682538362620.html). Another Turkish meat-saw model: Arı Makine TES-400. — [Global Mutfak](https://www.globalmutfak.com/ari-makine-et-kemik-kesme-testeresi-tes-400-pmu4628)

**Verified model → blade pairs (official or distributor sources)**

| Brand / model | Blade L×W×T (mm) | Other data | Source | Local DB |
|---|---|---|---|---|
| Kesmak KMO 280 | 3660×27×0.9 | 90°: Ø280, □270, ▭210×340; 1.5 kW | [kesmak.com.tr](https://www.kesmak.com.tr/kmo-280.html) | matches |
| Kesmak KMY 280 | 3660×27×0.9 | 90°: Ø280, **□250×250**, ▭150×340; 45°: Ø160 | [kesmak.com.tr](https://www.kesmak.com.tr/kmy-280.html) | matches |
| Kesmak KME 350 | 4860×34×1.1 | — | [kesmak.com.tr](https://www.kesmak.com.tr/kme-350.html) **(snippet)** | matches |
| Kesmak KME 280 | 3660×27 (×0.9) | blade sold "for Kesmak KME 280" | [testeresepeti.com.tr](https://www.testeresepeti.com.tr/urunler/kesmak-kme-280-icin-bi-metal-m42-hss-serit-testere-bicagi-bim-42-3660-x-27.html) **(snippet)** | matches |
| Beka-Mak BMSY-270DG | 3160×27×0.9 | 0°/45°/60° = Ø270/230/150; 15–120 m/min; 1.5 kW | [bekamak.com](https://www.bekamak.com/urun/bmsy-270dg/en) | matches |
| Beka-Mak BMSO-320 | 3660×27×0.9 | — | [makinaturkiye.com](https://www.makinaturkiye.com/tam-otomatik-serit-testere-makinesi-bmso-320-p-86824) **(snippet)** | matches |
| Karmetal KSA 600x800 | 6700×54×1.6 | 25–90 m/min, 5.5 kW | [karmetal.com.tr](https://www.karmetal.com.tr/urun/9/ksa-600x800.html) | matches |
| Karmetal WOS 600x700 | 6700×54×1.6 | 540×700 | [karmetal.com.tr](https://www.karmetal.com.tr/urun/42/wos-600x700.html) **(snippet)** | matches |
| Karmetal "280 OSA" (2008, used) | **3850**×27×0.9 | 2.2 kW, 25–90 m/min | [kar-tes.com.tr (distributor)](https://www.kar-tes.com.tr/urunlerimiz/endustriyel-makinalar/ikinci-el-testere-makinalari/karmetal-osa-280-testere-makinasi-ikinci-el/) | **CONFLICT**: DB "KMT 280 OSA" = 3360×27×0.9 |
| Dispa / Çağlayan M-Y 270 | 3120×27×0.9 | Ø270 at 90°, 40–80 m/min | [hasmakinahirdavat](https://hasmakinahirdavat.com/m-y-270-yari-otomatik-mafsalli-serit-testere), [makasdunyasi](https://www.makasdunyasi.com.tr/dc-tig/m--270-mafsalli-serit-testere-p240.html) **(snippet)** | brand absent |

- Other Turkish brands already in the local DB (WIKUS-derived, not re-verified in this session):
  - KESMAK: 46 entries (e.g. KMM DG 230 = 2570×27×0.9; KMM 2DG 260 = 3040×27×0.9; KMY 450 = 5780×41×1.3; KDS 250*500*3000 = 5560×41×1.3).
  - KARMETAL: 47 entries (e.g. KMT 220 KDG = 3000×27×0.9; OSA 300x370 = 3850×27×0.9).
  - BEKAMAK: 75 entries (e.g. BMS/BMSY 230DG = 2730×27×0.9; BMS 270DG = 3160×27×0.9).
  - UZAY MAKINA: 22 entries (e.g. UMSY 220 DG = 3000×27×0.9).
  - DG METAL: 27 entries (DG 250 M/S/A = 3600×27×0.9).

  — local DB
- "Bimak": web searches find only Bimak Makina (construction-equipment parts, Istanbul) and Bimak İş Makinaları (Adana repair shop), and no band saw maker. — [bimakmakina.com](http://www.bimakmakina.com/), [Foursquare Bimak Adana](https://tr.foursquare.com/v/bimak-i%C5%9F-makinalar%C4%B1/56c70f4bcd10be26b602a38a). A search for "Bimak" band saws returns Beka-Mak results. — [Beka-Mak](https://www.bekamak.com/index/en)
- Most common blade sizes in the local DB: 3660×27×0.9 (146 machines), 4570×34×1.1 (66), 5800×41×1.3 (59), 5450×41×1.3 (44), 4400×34×1.1 (44), 2710×27×0.9 (35), 4115×34×1.1 (34), 2450×27×0.9 (34), 3505×27×0.9 (32). 2720×27×0.9 appears 21 times (e.g. Cosen MH-812, MHV-180 B). 3505×34×1.1 appears for Cosen NC 250 H / C-250 NC and Everising S-250 HB. — local DB analysis

### Inferences
- **"Bimak 270"** most likely means Beka-Mak BMS-270DG / BMSY-270DG (3160×27×0.9). Dispa/Çağlayan M-Y 270 (3120×27×0.9) is also plausible. The two lengths differ by only 40 mm, so the assistant should offer both candidates and ask for the nameplate or the old blade's printed length. It should never auto-pick.
- **"Kesmak 250"**: the current Kesmak menu has no model named 250. Candidates:
  - KMY 280, whose square capacity is 250×250 (3660×27×0.9)
  - KMM 2DG 260 (3040)
  - KMM DG 230 (2570)
  - KDS 250×500×3000 (5560×41×1.3)
  - possibly an older, discontinued model

  The assistant should ask: pivot or column type? swivel head (DG)? nameplate photo?
- The test failures came from brand-alias and numeric-class matching, not from missing data. Beka-Mak and the 270/280-class Kesmak models are already in the DB. Fuzzy alias tables (Bimak/Bekamak/Beka-Mak/BEKA MAK) and "capacity-class" matching would fix most of them.
- Distributor listings (testeresepeti, kar-tes, makinaturkiye) are useful second sources for Turkish machines. They can also carry errors (see the 280 OSA conflict), so rows should keep a `verification_status`.

### Gaps
- No official model→blade lists were retrieved for Özçelik, Turkish wood-saw makers (Ünver, VMM Varol, Fimaksan, Turemak etc.) or Turkish meat-saw makers (Yılmaz, Arı, Arıcı).
- Not resolved: the meaning of Karmetal prefixes (OSA/WOS/KDG/ODG/VEGA), and whether "280 OSA" and "KMT 280 OSA" are the same machine.
- Not confirmed: whether old Kesmak "250" models (e.g. KMM 250) existed. Second-hand marketplaces (sahibinden, makinaalsat) were not checked systematically, and makinaturkiye returned HTTP 403.

---

## Q3. How to structure the machine dataset, handle ambiguous models and phrasing, and guide customers who must measure an old blade

### Takeaway
Use one row per (brand, model, variant/year, blade option). Keep explicit alias, capacity-class and source/verification fields. Treat "one model → several possible blades" as normal: the evidence shows year-dependent and option-dependent sizes even at large brands. When the model is unknown, fall back to a three-measurement guide: length (weld to weld), width (tooth tip to back) and thickness (caliper), plus the wheel formula L = π·D + 2·C.

### Cited Findings
- Real ambiguity patterns in the local DB:
  - by year: BIANCO "320 CNC 1996/1997" = 4550×34×1.1, "1998/2000" = 4580, "2001/2006" = 4310
  - by blade option: MEP "SHARK 350 NC HS 5.0 (34x1.1)" vs "(41x1.3)"; AMADA "CTB-7040 (41x1.3)" vs "(54x1.3)"; DG METAL "DG 330 M (27x0,9)" vs "(34x1,1)"
  - possible errors: 4 duplicate brand+model keys; KASTO "BBS 1860/1560 (100x2)" stored with thickness 1.6

  — local DB
- LENOX also lists the same model with several widths (e.g. Kasto HBA-360/600-U at 2.125, 1.625 and 1.360; Behringer HBP-800 at 2.650 and 2.125) and several lengths (Cosen AH-360-H at 13'6" and 15'0"). — [LENOX Machine Blade Sizes](https://mcprod.actionis.com/media/wysiwyg/bbd/tech-docs/Machine_Blade_Sizes_07-2005.pdf)
- Measuring an existing blade:
  1. Release tension and remove the blade.
  2. "Mark the weld joint with a paint marker or piece of tape."
  3. "Lay the blade flat and roll or unfold it along a tape measure from weld to weld."
  4. "Measure twice."
  5. Width: measure "from the back edge of the blade… to the tip of the tooth".
  6. Thickness: use calipers "across the body of the blade, away from the teeth and weld".
  7. Without a blade: L = (π × D) + (2 × C). For unequal wheels, use the average D, and "calculate both the minimum and maximum blade lengths".

  — [Scotchman: How to measure a bandsaw blade](https://www.scotchman.com/blog/how-to-measure-bandsaw-blade)
- Set the tension adjuster to mid-travel before measuring the wheel-centre distance **(snippet)**. — [woodworkingadvisor](https://woodworkingadvisor.com/how-to-measure-band-saw-blade/)
- Turkish blade-shop guidance:
  - lengths vary by machine, so send the brand/model or the nameplate label
  - straight cuts need at least 10 mm width; curved cuts can use 6 mm; 3 mm carbon blades for tight curves
  - "blade thickness should be about 1/1000 of the wheel diameter"

  — [Testere Sepeti SSS](https://www.testeresepeti.com.tr/sss.html)
- The Inca finder marks unconfirmed rows and tells users to check the length printed on the old blade. This is a good precedent for showing verification status to customers. — [Inca blade finder](https://incamachines.com/pages/bandsaw-blade-finder)
- LENOX width codes in decimal inches map to standard metric widths: 1.080" ≈ 27 mm, 1.360" ≈ 34 mm, 1.625" ≈ 41 mm, 2.125" ≈ 54 mm, 2.650" ≈ 67 mm, 3.165" ≈ 80 mm. (Arithmetic conversion, confirmed by the paired rows above.) — [LENOX PDF](https://mcprod.actionis.com/media/wysiwyg/bbd/tech-docs/Machine_Blade_Sizes_07-2005.pdf)

### Inferences
- Recommended schema (one row per blade option):
  - `brand_canonical`, `brand_aliases[]` (e.g. BEKAMAK: "Beka-Mak", "Beka Mak", "Bimak"?, "Bekamak"; KESMAK: "Kes-Mak")
  - `model_canonical`, `model_aliases[]` (normalise spaces, hyphens, "*"/"x"/"×")
  - `series`, `machine_type` (metal-pivot / metal-column / vertical / wood / meat / portable)
  - `automation` (manual/semi/auto/CNC), `swivel` (none/DG/2DG)
  - `capacity_round_mm`, `capacity_rect_mm`, `wheel_diameter_mm`
  - `blade_length_mm`, `blade_length_min_mm` / `max_mm` (wood saws), `blade_width_mm`, `blade_thickness_mm`
  - `variant_note` (year range or option), `country`, `discontinued`
  - `source_url`, `source_type` (OEM spec / OEM manual / distributor / blade-maker chart / customer-confirmed)
  - `verification_status` (verified-OEM / verified-2-sources / single-source / conflict / unverified), `last_checked`
- Matching logic:
  1. Normalise the query.
  2. Resolve the brand alias with fuzzy matching (Levenshtein or phonetic).
  3. Parse numbers as possible capacity classes (230/250/260/270/280/300/320/350/…).
  4. Return **all candidates with distinct blade sizes**, grouped by size.
  5. If there is more than one size, ask one discriminating question (nameplate photo, pivot vs column, DG or not, printed length on the old blade).
  6. Never present a nearest match as "found". This is consistent with the repo's earlier fix "makine bulunamayınca en yakın modeli 'bulundu' diye verme".
- Maintenance:
  - Log every unresolved query (the repo already has `unknown_questions.json`).
  - Run a weekly review.
  - When a customer orders after measuring, store the result as a `customer-confirmed` row.
  - Re-check OEM pages yearly, and flag conflicts between sources rather than overwriting them.
- Measuring guide UX for Turkish customers. Ask for:
  - (a) a nameplate photo
  - (b) the printed code on the old blade (often "3660×27×0.9" or "2720 x 27 x 0.9 M42 6/10")
  - (c) a roll-out measurement weld to weld
  - (d) width tooth tip to back
  - (e) thickness by caliper

  Then snap to standard widths (6/10/13/20/27/34/41/54/67/80) and thicknesses (0.65/0.9/1.1/1.3/1.6).

### Gaps
- Not determined: a standard tolerance for weld-to-weld length matching (how many mm of difference the tensioner can absorb). Blade makers generally say to use the machine's specified length; this needs confirming with manufacturers or from Laguna-style min/max data.

---

## Q4. Material grades: cross-reference tables, hardness and machinability, public datasets and their licences

### Takeaway
The Turkish trade still uses old DIN names (St37, St52, Ck45). These map to EN 10025 / EN 10083 grades through widely published tables. Mappings can conflict at sub-grade level (St52-3 → S355JR vs S355J2), so store them as approximate aliases. Free sources (steelnumber, MatWeb) forbid reproduction or mass export. LENOX's bi-metal speed chart already pairs AISI, Werkstoff-Nr and JIS grades with band speeds, so it covers most grades customers mention.

### Cited Findings
**Steel designations**
- 1.0038 RSt 37-2 = S235JR; 1.0570 St 52-3 = S355J2 (1.0577); 1.4301 X5CrNi18-10 ↔ ASTM TP/WP304; 1.4404 X2CrNiMo17-12-2 ↔ 316L; 1.4401 ↔ 316; 1.4571 X6CrNiMoTi17-12-2 ↔ 316Ti; 1.4541 ↔ 321; 1.4462 ↔ UNS S31803 (duplex). — [Global Stahl DIN/EN/ASTM table (PDF)](https://global-stahl.com/wp-content/uploads/2020/12/global_stahl_tabelle_werkstoffvergleich_03.pdf)
- Turkish usage: S235JR = St37-2 = "Fe 37" (old TS) ≈ A36; S355JR = St52-3U = "Fe 52" ≈ A572 Gr.50. The source says St37/St52 names "Almanya kökenli eski DIN standart sınıflandırmasına aittir" (belong to the old German DIN classification) and remain common in Turkish industry. Typical hardness: S235 100–154 HB, S355 150–210 HB (distributor data). — [Uyar Çelik S235 vs S355](https://uyarcelik.com/s235-st37-vs-s355-st52-celik-karsilastirmasi/). **Conflict:** St52-3 is mapped to S355JR here but to S355J2 (1.0577) by [Global Stahl](https://global-stahl.com/wp-content/uploads/2020/12/global_stahl_tabelle_werkstoffvergleich_03.pdf).
- Ck45 = C45E (1.1191) ≈ SAE 1045 **(snippet)**. — [strobel-industry Werkstoffnummern](https://strobel-industry.de/wissen/werkstoffnummern). LENOX lists AISI 1045 ↔ 1.0503 / 1.1191 ↔ JIS S45C. — [LENOX Bi-metal speed chart](https://www.bandsawbladesdirect.com/media/wysiwyg/bbd/tech-docs/Speed-Chart.pdf)
- LENOX cross-references within the speed chart:
  - 4140 ↔ 1.7225 ↔ SCM 440(H); 4340 ↔ 1.6565 ↔ SNCM 439
  - D-2 ↔ 1.2379 ↔ SKD 11; H-13 ↔ 1.2344 ↔ SKD 61; O-1 ↔ 1.2510 ↔ SKS 3; P-20 ↔ 1.2328; M-2 ↔ 1.3343 ↔ SKH 9
  - 304 ↔ 1.4301 ↔ SUS 304; 316 ↔ 1.4401; 410/420 ↔ 1.4006/1.4021; 17-4PH ↔ 1.4542
  - aluminium 2024/5052/6061/7075 ↔ 3.1355/3.3525/3.3211/3.4365
  - CP Ti ↔ 3.7025; Ti-6Al-4V ↔ 3.7615
  - ductile iron A536 60-40-18 ↔ 0.7040 ↔ FCD 40; grey iron A48 Class 20/40 ↔ 0.6010/0.6025 ↔ FC 10/FC 25
  - CDA 360 brass ↔ 2.0375 ↔ C3601

  — [LENOX Bi-metal speed chart](https://www.bandsawbladesdirect.com/media/wysiwyg/bbd/tech-docs/Speed-Chart.pdf)
- 1.2379 = X153CrMoV12 = AISI D2 = JIS SKD11. Note that equivalents "are not entirely equal" (e.g. V 0.90–1.10% in 1.2379 vs 0.20–0.50% in SKD11) **(snippet)**. — [steelnumber 1.2379](http://www.steelnumber.com/en/steel_composition_eu.php?name_id=979), [aobosteel D2 equivalents](https://aobosteel.com/blog/d2-equivalent-material/)

**Hardness data**
- SSAB official Hardox nominal hardness:
  - 400: 370–430 HBW
  - 450: 390–475
  - 500: 450–540
  - 500 Tuf: 475–505
  - 550: 525–575
  - 600: 550–640
  - Extreme: 650–700 HBW (57–63 HRC)
  - HiTuf: 310–370
  - Round bars: 370–540
  - Tubes: 360–530

  — [SSAB Hardox product program](https://www.ssab.com/en/brands-and-products/hardox/product-program)
- Aluminium: 7075-T6 about 150 HB, 6061-T6 about 95 HB **(snippet; aggregator/Wikipedia; verify against Aluminum Association/ASM)**. — [Wikipedia 7075](https://en.wikipedia.org/wiki/7075_aluminium_alloy)

**Datasets and licences**
- steelnumber.com footer: "The contents from this Steel & Alloy Database may not be reproduced. The entire risk as to use of these content is assumed by you the user." — [steelnumber S275J2 page](https://www.steelnumber.com/en/steel_composition_eu.php?name_id=7)
- MatWeb terms: users may not collect or download more than 500 materials or mass-export the database. The licence is "personal, limited, nonexclusive, nontransferable, nonsublicensable" and allows storing subsets of up to 500 materials on one computer **(snippet; terms page returned 403 / connection refused when fetched)**. — [MatWeb terms (asia mirror)](https://asia.matweb.com/reference/terms.asp), [MatWeb terms](https://www.matweb.com/reference/terms.aspx)
- Total Materia (Key to Metals): 450,000+ materials, paid subscription. A RESTful API is available on the Corporate plan, at extra cost on some tiers, and there are 25+ CAE export formats **(snippet)**. — [Total Materia order page](https://www.totalmateria.com/en-us/order-now/), [Total Materia export docs](https://docs.totalmateria.com/material-console/export)

### Inferences
- Recommended material table:
  - `alias` (St37, ST 37, st-37, S235, S235JR, 1.0038, A36, SS400, Q235…)
  - `canonical_grade` (EN name), `werkstoff_nr`, `aisi_sae`, `jis`, `gost`, `gb`
  - `family` (non-alloy structural / carbon / alloy Cr-Mo / tool cold-work / tool hot-work / HSS / stainless austenitic / martensitic / PH / duplex / wear plate / Al wrought / Cu-brass / bronze / cast iron grey / ductile / Ti / Ni superalloy)
  - `condition` (annealed / QT / hardened / T6)
  - `hardness_HB_min/max`, `hardness_HRC_min/max`, `machinability_note`
  - `lenox_speed_mpm` (or your own value), `blade_family_hint`
  - `equivalence_quality` (exact / approximate)
  - `source_url`
- Build the base from facts in standards abstracts plus LENOX/WIKUS-style manufacturer charts, written in your own words and numbers. Do not bulk-copy steelnumber or MatWeb. Keep any MatWeb look-ups under 500 materials and do not redistribute them.
- Hardness drives the blade choice more than the grade name. Hardox 500 and above (450–540 HBW, roughly 47–54 HRC on standard conversion tables — approximate conversion, not verified in this session) sits above the shop's existing rule that bimetal is not recommended over ~45 HRC. The assistant should therefore ask the customer to confirm the grade and hardness for wear plates, tool steels in hardened condition, and induction-hardened shafts.

### Gaps
- Not found: an authoritative open-licence (CC/ODbL) steel cross-reference dataset. Steel designations under EN 10027 and abstracts of EN 10025/EN 10083/EN 10088/ISO 4957 were not fetched.
- GOST equivalents (e.g. St3sp for S235JR) and Machinery's Handbook machinability ratings were not retrieved from primary sources.
- Not verified: brass, copper and cast-iron hardness ranges from a primary source.

---

## Q5. Mapping material group + hardness + section to blade family, band speed and feed: what manufacturers publish and whether any of it is public or API-accessible

### Takeaway
Blade makers keep detailed parameter logic inside registration-gated or proprietary calculators: LENOX SawCalc (free online), WIKUS ParaMaster (registration, free for customers), Starrett PowerCalc (app). None offers a public API. The best public, citable baseline is the **LENOX Bi-Metal Speed Chart** (band speed per grade), combined with Starrett's statement that carbide blades handle case-hardened material up to HRc 65.

### Cited Findings
- SawCalc considers "material composition, size and shape, as well as the machine model" to prescribe "speed, feed, blade and tooth specifications". It is online, free, regularly updated, covers "54 country standards", and comes in EN/FR/DE/ES, imperial or metric. — [Canadian Metalworking on LENOX SawCalc](https://www.canadianmetalworking.com/canadianfabricatingandwelding/product/fabricating/lenox-launches-new-online-software-for-band-saws). The site has a login, "Terms of Use", and "©2023, LENOX, Stanley Black & Decker. All rights reserved". No API is mentioned. — [sawcalc.com](https://www.sawcalc.com/)
- WIKUS ParaMaster: 150,000+ materials and 4,500 machines; registration required; QR codes on WIKUS bimetal bands load band data into the app; no API mentioned. — [WIKUS ParaMaster](https://www.wikus.de/en/products/band-saw-blades/paramaster), [WIKUS news on ParaMaster](https://www.wikus.de/en/company/news-and-dates/news/the-online-cutting-data-program-paramasterr)
- Starrett "PowerCalc Band Saw Selector" is a mobile app that "selects the best band saw blade for the specified cutting application" **(snippet)**. — [Starrett band saw blades catalogue (DirectIndustry)](https://pdf.directindustry.com/pdf/starrett/band-saw-blades/11639-758649.html)
- Starrett Advanz™ CS carbide-tipped: "Ideal for induction hardened chrome shafts, linear bearing shafts and case hardened materials to HRc 65." — [Starrett carbide tipped](https://www.starrett.com/products/band-saw-blades/carbide-tipped). Starrett also has a product category titled "Band Saw Blades for High-Speed Steel" and is cited for blades "for steel above 45 HRC" **(snippet)**. — [Starrett HSS blades](https://www.starrett.com/products/band-saw-blades/band-saw-blades-for-high-speed-steel)
- AMADA AXCELA HMAX carbide is for "induction hardened chrome rod up to 65HRC" **(snippet)**. — [AMADA blades brochure](https://amadamca.com/wp-content/uploads/2021/06/Band-Saw-Blades-Brochure_2020_web-version.pdf)
- LENOX Bi-Metal Speed Chart, selected band speeds in ft/min and m/min:
  - aluminium alloys 275–340 FPM / 84–104 MPM ("for cutting aluminum on metal cutting saws"; production aluminium saws run 3,500–8,500 FPM)
  - A36 structural 250/76; 1018 270/82; 1045 230/70; 1095 185/56
  - 4140 225/68; 4340 195/59; 52100 160/49
  - D-2 90/27; H-13 140/43; O-1 140/43; M-2 105/32; T-15 60/18
  - 304: 115 FPM / "25" MPM; 316: 90/27; 440C: 70/21; 17-4PH: 70/21
  - CDA 360 brass 295/89; naval brass 200/61; aluminium bronze 150/46
  - CP Ti 85/25; Ti-6Al-4V 65/20; Inconel 718 60/18
  - ductile A536 60-40-18 225/68; grey A48 Class 40 115 FPM / "25" MPM

  — [LENOX Bi-metal speed chart (PDF)](https://www.bandsawbladesdirect.com/media/wysiwyg/bbd/tech-docs/Speed-Chart.pdf). **Data error in source:** 115 FPM ≈ 35 m/min, not 25, for both 304 and A48 Class 40. Re-derive m/min from FPM.
- BandSawBladesDirect also hosts LENOX "Selecting your blade", "Tooth selection" and "Selection Chart and Speed Chart Parameters" PDFs (not opened). — [BandSawBladesDirect technical documents](https://www.bandsawbladesdirect.com/technical-documents)

### Inferences
- A defensible first-version rule engine:
  1. Resolve the material alias to family and hardness.
  2. Pick the blade family:
     - bimetal M42 for most steels up to about 45 HRC (the shop's existing rule)
     - carbide-tipped for hardened or case-hardened material, Hardox 500+, high-alloy or abrasive material, and Ni/Ti in production
     - carbide also for >45 HRC up to about 65 HRC (Starrett/AMADA)
     - consider carbon blades or wood/aluminium-specific blades for soft non-ferrous on wood machines
  3. Set the base band speed from the LENOX chart family value.
  4. Adjust for cross-section and for tooth pitch (TPI selection is covered by the existing Starrett-chart advisor logic in the repo — see memory "TPI advisor data source").
  5. Present the result as a starting point, with "adjust by chip formation".

  Feed rates are not published openly in the sources found, so the assistant should avoid quoting numeric feeds or label them as estimates.
- Because the calculators are gated and copyright-protected, do not scrape them. If deeper parameters are needed, seek a distributor or data partnership with a blade maker. WIKUS appears to be the natural partner, given the existing data dependence.

### Gaps
- Not found: public feed-rate (mm/min or cm²/min) tables by material and section. The LENOX "Selection Chart and Speed Chart Parameters" PDF may contain section-size speed adjustments but was not opened.
- Not checked: the terms of use of SawCalc and ParaMaster/GTC in detail (only footer links were seen). Bahco's selector was not located.
