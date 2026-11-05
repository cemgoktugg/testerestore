# Technical knowledge map for a world-class bandsaw blade assistant (metal, wood, meat/bone/food, foam/textile), with authoritative sources

Scope note for the report writer: these notes were collected 2026-10-26 for TestereStore (Turkey): bi-metal M42/M51, TCT, carbon C75S wood blades, stainless meat/bone blades, foam/textile knife blades, welded to any length 1,000–15,000 mm. The assistant already has Starrett TPI tables (solid and tube/profile), a 12-symptom troubleshooting table, some WIKUS tension/parameter data and break-in rules. The findings below are meant to fill the stated gaps: speed/feed by material, wood/meat/foam knowledge, a material-grade database, blade-length calculation, tooth form and set, and machine-capacity reasoning.

Primary documents actually read in full (text extracted): LENOX "Guide to Band Sawing" (2008, 33 pp.), RÖNTGEN "Technical Manual – Band Saw Guide", ISO 4875-2:2006 (iTeh public preview, which contains the whole 4-page normative text), Rikon/Olson Saw "How-To's for all Band Saw Blades" (wood), and the WIKUS online guidebook pages. Other sources were used at web-page or snippet level, and their authority is flagged where relevant.

---

## 1. Blade selection fundamentals: blade materials, tooth forms, set patterns, TPI rules, width/thickness vs wheel diameter, contour radius

### Takeaway
The assistant should reason in this order: (1) machine constraints (blade length, max width, wheel diameter, so thickness), (2) material grade and hardness, so blade material and tooth form, (3) contact length / wall thickness / bundle, so TPI, (4) section type (solid, tube, profile, thin wall), so set pattern. All of these are well documented by LENOX, WIKUS and RÖNTGEN, and ISO 4875-2 sets the standard section and pitch series. Sources agree on the principles but differ on numbers: bundle TPI rules, the wheel-diameter vs thickness rule, and contour radii.

### Cited Findings

**Blade materials / construction**
- Carbon "hard back" = one-piece carbon steel with hardened back and tooth edge (takes heavier feed pressure). Carbon "flex back" = one-piece carbon steel with hardened tooth edge and soft back. Bi-metal = high-speed-steel edge electron-beam welded to a fatigue-resistant spring-steel backing, "best combination of cutting performance and fatigue life" — [LENOX Guide to Band Sawing](https://cdn.mscdirect.com/global/media/pdf/search/lenox/lenox-guide-to-band-sawing.pdf)
- Carbide: (a) "carbide ground tooth": carbide bonded to the tooth, then side, face and top ground (unset); (b) "set style carbide tooth": carbide bonded and ground, then the teeth are set for side clearance — [LENOX Guide](https://cdn.mscdirect.com/global/media/pdf/search/lenox/lenox-guide-to-band-sawing.pdf)
- LENOX special-application carbide families, useful as a category map: triple-chip tooth design for aluminium (incl. castings); a carbide-tipped blade for case- and through-hardened materials (IHCP cylinder shafts, "up to 61 HRc"); set-style carbide for difficult metals; carbide grit edge ("MASTER-GRIT") for abrasive and hardened materials, composites, tires — [LENOX Guide](https://cdn.mscdirect.com/global/media/pdf/search/lenox/lenox-guide-to-band-sawing.pdf)
- WIKUS cutting-material classes: HSS (bimetal), carbide, diamond-coated, CBN — [WIKUS Blade selection](https://www.wikus.de/en/guidebook/technical-principles/blade-selection)
- ISO definitions: carbon steel blade = low-alloyed steel with >1 % and <1.5 % C, with Mn+Si+Cr ≥ 0.5 %. Bimetal = teeth of a different material than the body. Friction-cutting blade = fatigue-resistant steel that cuts by friction heat. Composite = cutting edge (generally carbide) of a different material than a low-alloyed body — [ISO 4875-2:2006 preview](https://cdn.standards.iteh.ai/samples/41855/84673929d39a4930b8a602f6b290496a/ISO-4875-2-2006.pdf)
- ISO minimum hardness: carbon blade tooth point ≥ 62 HRC (720 HV10), body ≥ 280 HV10 (27 HRC). Bimetal HSS tooth point ≥ 62 HRC, body ≥ 450 HV10 (45 HRC) after heat treatment. Friction saws usually run above 40 m/s on adequately guarded machines — [ISO 4875-2:2006 preview](https://cdn.standards.iteh.ai/samples/41855/84673929d39a4930b8a602f6b290496a/ISO-4875-2-2006.pdf)
- M42 vs M51 (distributor/vendor-level claims, not standards): M42 is commonly described as 8 % Co, ~10 % Mo, 68–69 HRC. M51 is described as ~10 % Co plus ~10 % W, 69–70 HRC (some say 67–70), with better hot hardness, aimed at stainless, duplex, titanium, Inconel and tool steels. Values vary by maker — [SawBlade.com.au FAQ (Röntgen bi-alfa cobalt M42 vs M51)](https://sawblade.com.au/ufaq/whats-the-difference-between-bi-alfa-cobalt-m42-and-bi-alfa-cobalt-m51/); [Lizensaw blog](https://lizensaw.com/m42-vs-m51-bimetal-band-saw-blades/) (vendor blog, lower authority)
- Grit blades: diamond grit edge for silicon, glass, quartz, abrasive composites, hard graphite, carbide, marble, limestone, brake linings. Carbide grit for complex shapes, thin materials, case-hardened steels, FRP and graphite composites. Common diamond grit sizes are 20/30, 30/40, 40/50, 60/80, 100/120 and 170/200 (coarse = faster, fine = better finish) — [UKAM](https://ukam.com/selecting-the-right-diamond-band-saw-blade-for-your-application/); [DoALL diamond grit 40/50 example](https://www.doallsaws.com/406-942150-000); [Starrett Advanz DG](https://www.starrett.com/products/band-saw-blades/advanz-dg); [Detroit Bandsaw carbide grit](https://www.detroitbandsaw.com/product-category/band-saw-blades/carbide-saw-blades/carbide-grit-edge-blades/)

**Tooth forms**
- LENOX: Variable Positive (variable spacing and gullet, lower noise/vibration, faster rates). Variable (similar, for slower cutting rates). Standard (general purpose). Skip (wide gullet; wood, cork, plastics, composition materials). Hook (high-rake skip-like form; discontinuous-chip materials such as cast iron, and non-metallics) — [LENOX Guide](https://cdn.mscdirect.com/global/media/pdf/search/lenox/lenox-guide-to-band-sawing.pdf)
- WIKUS codes:
  - S Standard: 0° rake, short-chipping materials, tool steel, cast iron.
  - K Hook (DE "Klauenzahn"): positive rake, universal, non-ferrous.
  - P Profile: positive rake, hollow profiles, beams, vibration-prone cuts, bundles.
  - L Skip (DE "Lückenzahn"): 0° rake, soft materials such as aluminium and wood.
  - T Trapezoid: positive rake, high performance and finish.
  - TSN Trapezoid negative: negative rake, case-hardened shafts, steels up to 65 HRC, hard-chromed parts, up to Ø200 mm.

  Sources: [WIKUS Technical principles](https://www.wikus.de/en/guidebook/technical-principles); [WIKUS DE Technische Grundlagen](https://www.wikus.de/de/ratgeber/technische-grundlagen)
- RÖNTGEN rules:
  - Always cut stainless steel with a positive rake.
  - For aluminium, use a positive rake. A 0° rake will most probably cause chip welding, and chip welding is common below 300 m/min.
  - For thin tubes (wall up to 8 mm), a 0° rake toothing is recommended.

  Source: [RÖNTGEN Technical Manual](https://www.roentgen-saw.com/images/pdf/technical_guide.pdf)
- Wood (Laguna): hook teeth = "progressive cutting angle… fast cutting where finish is not important"; rake teeth = flat cutting angle for fine surface finish — [Laguna Bandsaw Blade Education](https://lagunatools.com/education/bandsaw-blade-education/)

**Set patterns**
- LENOX:
  - Raker: 3-tooth L-R-S.
  - Modified raker: 5 or 7 tooth sequence.
  - Vari-Raker: sequence depends on pitch; quiet, smooth, less burr.
  - Alternate: every tooth alternating; fast removal, finish not critical.
  - Wavy: groups of teeth with varying set; used with fine pitches for thin, interrupted cuts, to reduce noise, vibration and burr.
  - Vari-Set: varying set magnitudes and angles; for difficult materials and large sections.
  - Single-level vs dual-level set (variable tooth heights, which gives multiple cutting planes).

  Source: [LENOX Guide](https://cdn.mscdirect.com/global/media/pdf/search/lenox/lenox-guide-to-band-sawing.pdf)
- WIKUS: Standard set ("ab 5 mm" cut thickness), Group set (4–18 tpi, better surface), Wavy set (sheets, tubes, profiles ≤ 5 mm). Materials with high residual stress need extra-wide set — [WIKUS Technical principles](https://www.wikus.de/en/guidebook/technical-principles); [WIKUS Blade selection](https://www.wikus.de/en/guidebook/technical-principles/blade-selection)
- ISO 4875-2: the overall set is left to the manufacturer, but set on each side must be equal within ±0.05 mm. Blade flatness max 2 µm/mm — [ISO 4875-2:2006 preview](https://cdn.standards.iteh.ai/samples/41855/84673929d39a4930b8a602f6b290496a/ISO-4875-2-2006.pdf)
- Triple-chip: LENOX lists a "Triple Chip Tooth Design" carbide blade specifically for aluminium — [LENOX Guide](https://cdn.mscdirect.com/global/media/pdf/search/lenox/lenox-guide-to-band-sawing.pdf)

**ISO standard sections and pitch series (useful as the "catalog grammar")**
- Usual sections (mm):
  - Carbon blades: widths 3 / 5 / 6 / 8 / 10 / 13 at 0.65 thickness; 16 and 20 at 0.8; 25 at 0.9.
  - Friction blades: 16×0.8, 20×0.8, 25×0.9, 32×1.1.
  - Composite (carbide): 20×0.8, 27×0.9, 34×1.1, 41×1.3, 54×1.6, 67×1.6, 80×1.6.

  Source: [ISO 4875-2:2006 preview](https://cdn.standards.iteh.ai/samples/41855/84673929d39a4930b8a602f6b290496a/ISO-4875-2-2006.pdf)
- Bimetal usual sections (mm). The preview layout is garbled, but the width and thickness lists reconcile as: 6×0.9, 10×0.9, 13×0.65 and 13×0.9, 20×0.9, 27×0.9, 34×1.1, 41×1.3, 54×1.3 and 54×1.6, 67×1.6, 80×1.6 — [ISO 4875-2:2006 preview](https://cdn.standards.iteh.ai/samples/41855/84673929d39a4930b8a602f6b290496a/ISO-4875-2-2006.pdf). Pairing reconstructed by me; it matches the RÖNTGEN/WIKUS sections 27×0.9, 34×1.1, 41×1.3, 54×1.3, 54×1.6 — [RÖNTGEN](https://www.roentgen-saw.com/images/pdf/technical_guide.pdf); [WIKUS](https://www.wikus.de/en/guidebook/technical-principles/blade-selection)
- Fixed pitch, mm → teeth per 25.4 mm: 1→24, 1.4→18, 1.8→14, 2.5→10, 3.15→8, 4→6, 6.3→4, 8→3, 12.5→2, 20.3→1.25, 33.9→0.75. Variable pitch series: 0.75–1.25, 1.5–2, 2–3, 3–4, 4–6, 5–8, 6–10, 8–12, 10–14 — [ISO 4875-2:2006 preview](https://cdn.standards.iteh.ai/samples/41855/84673929d39a4930b8a602f6b290496a/ISO-4875-2-2006.pdf)
- ISO designation format: "Bimetal band saw blade ISO 4875-2 – 41 × 1,3 – Skip tooth – 3". Length "shall be clarified when ordering" because it depends on the machine — [ISO 4875-2:2006 preview](https://cdn.standards.iteh.ai/samples/41855/84673929d39a4930b8a602f6b290496a/ISO-4875-2-2006.pdf). LENOX ordering format: Length × Width × Thickness × TPI, e.g. 16' × 1-1/4" × .042" = 4860 mm × 34 mm × 1.07 mm, 3/4 TPI — [LENOX Guide](https://cdn.mscdirect.com/global/media/pdf/search/lenox/lenox-guide-to-band-sawing.pdf)

**TPI selection rules (metal)**
- LENOX bi-metal tooth selection uses three charts: square/rectangular solid by width of cut W, round solid by diameter D, and tubing/pipe/structurals by wall thickness T. The TPI ladder runs 14/18, 10/14, 8/12, 6/10, 6/8, 5/8, 4/6, 3/4, 2/3, 1.5/2.0, 1.4/2.0, 1.0/1.3, 0.7/1.0. Additional rules:
  - "If having difficulty choosing between two pitches, the finer of the two will generally give better performance."
  - "When compromise is necessary, choose the correct TPI first."
  - Bundles: take the single-piece TPI and go one pitch coarser.

  Source: [LENOX Guide](https://cdn.mscdirect.com/global/media/pdf/search/lenox/lenox-guide-to-band-sawing.pdf)
- RÖNTGEN solid-material table.
  - Regular pitch: ≤10 mm 14 tpi; 10–30 mm 10; 30–50 mm 8; 50–80 mm 6; 80–120 mm 4; 120–200 mm 3; 200–400 mm 2; 300–700 mm 1.25; >600 mm 0.75.
  - Combi (variable) pitch: ≤25 mm 10/14; 15–40 mm 8/12; 25–50 mm 6/10; 35–70 mm 5/8; 40–90 mm 5/6; 50–120 mm 4/6; 80–180 mm 3/4; 130–350 mm 2/3; 150–450 mm 1.5/2; 200–600 mm 1.1/1.6; >500 mm 0.75/1.25.
  - It also gives a tube table by wall thickness (2 to >100 mm) × outer diameter (20–500 mm) from 14 down to 1.5/2 tpi. Combi pitch "increases the field of application and reduces vibration".

  Source: [RÖNTGEN Technical Manual](https://www.roentgen-saw.com/images/pdf/technical_guide.pdf)
- RÖNTGEN tips: the largest workpiece diameter determines the pitch. In layers or bundles, add the diameters. For thin-walled tube cut in layers on a light-duty machine, add the wall thicknesses — [RÖNTGEN](https://www.roentgen-saw.com/images/pdf/technical_guide.pdf). The bundle rules disagree: LENOX says one pitch coarser, RÖNTGEN says add diameters — [LENOX](https://cdn.mscdirect.com/global/media/pdf/search/lenox/lenox-guide-to-band-sawing.pdf)
- WIKUS: pitch is chosen by "the contact length of the band saw in the workpiece"; tables are given for constant and variable pitch by contact length in mm and inches — [WIKUS Technical principles](https://www.wikus.de/en/guidebook/technical-principles); [WIKUS Blade selection](https://www.wikus.de/en/guidebook/technical-principles/blade-selection)
- Gullet capacity: if the chip exceeds the gullet's physical limit, the curl distorts and jams and "chokes the machine". The smallest gullet determines the blade's capacity — [LENOX](https://cdn.mscdirect.com/global/media/pdf/search/lenox/lenox-guide-to-band-sawing.pdf); [RÖNTGEN](https://www.roentgen-saw.com/images/pdf/technical_guide.pdf)

**Width/thickness vs wheel diameter; beam strength; machine capacity**
- Wheel diameter → max recommended blade thickness: 4–6" .014"; 6–8" .018"; 8–11" .020"; 11–18" .025"; 18–24" .032"; 24–30" .035"; 30"+ .042/.050/.063" — [Laguna](https://lagunatools.com/education/bandsaw-blade-education/)
- Rule of thumb: "dividing the diameter of the flywheel by 1000" gives an indicative blade thickness — [Metamob (Romanian distributor blog)](https://www.metamob.ro/en-metblog/1231-how-do-we-choose-the-thickness-of-bandsaw-blades). This is more conservative than the Laguna table. For a 24" (610 mm) wheel, D/1000 gives 0.61 mm, while Laguna allows .032–.035" (0.81–0.89 mm).
- "Thickness of blade too heavy for diameter of wheels and speed of machine" is listed as a cause of premature breakage — [Rikon/Olson guide](https://info.highlandwoodworking.com/library/manuals/rikon/bandsaw_blade_selection_guide.pdf)
- Beam strength rule of thumb, blade width → max cross-section: 1" (27 mm) → 6" (150 mm); 1-1/4" (34 mm) → 9" (230 mm); 1-1/2" (41 mm) → 12" (300 mm); 2" (54 mm) → 18" (450 mm); 2-5/8" (67 mm) → 24" (610 mm); 3" (80 mm) → 30" (760 mm) — [LENOX](https://cdn.mscdirect.com/global/media/pdf/search/lenox/lenox-guide-to-band-sawing.pdf)
- Practical capacity: "use no more than 1/2 of the saw machine's stated capacity. For harder materials… closer to 1/3". Seven ways to raise beam strength: real capacity, wider/thicker blade, guides closer, smaller stacks, reposition odd shapes (keep width of cut as uniform as possible), check wear, use SAWCALC — [LENOX](https://cdn.mscdirect.com/global/media/pdf/search/lenox/lenox-guide-to-band-sawing.pdf)
- Twisting distance (minimum wheel-to-guide distance, mm, attributed by RÖNTGEN to the North American Sawing Association), at 90° twist: 6×0.6 325; 6×0.9 455; 10×0.9 455; 13×0.9 455; 20×0.9 455; 27×0.9 455; 34×1.1 545; 41×1.3 650; 54×1.3 650; 54×1.6 815; 67×1.6 815; 80×1.6 815. Values for 45°, 60° and 75° are also given. Not valid for high-speed aluminium cutting above 1,500 m/min — [RÖNTGEN](https://www.roentgen-saw.com/images/pdf/technical_guide.pdf)

**Contour cutting minimum radius**
- LENOX (imperial): 2" → 28" R; 1-1/2" → 21"; 1-1/4" → 12"; 1" → 7-1/2"; 3/4" → 5-7/16"; 5/8" → 3-3/4"; 1/2" → 2-1/2"; 3/8" → 1-7/16"; 1/4" → 5/8"; 3/16" → 5/16"; 1/8" → 1/8"; 1/16" → "square". Always use the widest blade the radius allows — [LENOX](https://cdn.mscdirect.com/global/media/pdf/search/lenox/lenox-guide-to-band-sawing.pdf)
- RÖNTGEN (metric, vertical machines): 3 mm → 4 mm R; 4 → 8; 6 → 16; 8 → 26; 10 → 40; 13 → 65; 16 → 100; 20 → 140; 25 → 180 mm — [RÖNTGEN](https://www.roentgen-saw.com/images/pdf/technical_guide.pdf)
- Olson/Rikon (wood): 1" → 7"; 3/4" → 5-1/2"; 5/8" → 4"; 1/2" → 2-1/2"; 3/8" → 1-1/2"; 1/4" → 5/8"; 3/16" → 5/16"; 1/8" → 3/16" — [Rikon/Olson guide](https://info.highlandwoodworking.com/library/manuals/rikon/bandsaw_blade_selection_guide.pdf)

### Inferences
- LENOX, Olson and RÖNTGEN contour radii agree closely. For example, 1/2" ≈ 13 mm gives about 2-1/2" ≈ 64–65 mm in all three, so one merged metric table is defensible. Some retailer charts give tighter radii and should not be used.
- ISO 4875-2's carbon-blade definition (>1 % C) applies to metal-cutting carbon blades. TestereStore's C75S wood blades (a strip-steel designation) fall outside that ISO definition and should be described using the steel grade, not "ISO 4875".
- The D/1000 rule and the Laguna inch table give different answers. The assistant should present D/1000 as a conservative industrial rule and the Laguna table as the woodworking-machine norm, and prefer the machine maker's specification when one is known.
- Machine-capacity reasoning can be encoded with: practical capacity = 1/2 rated (1/3 for hard materials); beam-strength width-to-cross-section table; minimum twist distance by section; wheel-diameter-to-thickness limit.

### Gaps
- The full WIKUS contact-length pitch tables and band-dimension-by-machine table were not extracted. The WIKUS English catalogue PDF ([WIKUS Catalogue EN](https://www.wikus.de/fileadmin/pdfs/WIKUS-Catalogue-EN.pdf)) was found but not read.
- Bahco, Amada, DoALL, Simonds, M.K. Morse, Eberle, Arntz and Pilana selection tables were not read. Candidate PDFs found: [Bahco Metal Cutting](https://www.proes.si/documents/bacho/Bahco-Metal-Cutting-ingles%20OK.pdf) and [Arntz 2014 catalogue](https://productivity.com/wp-content/uploads/2015/04/Arntz-Bandsaw-Blade-Catalog.pdf).
- No standard-level source for M42/M51 chemistry in band-saw context. AISI M42 is a recognised HSS grade, but "M51" is used inconsistently by blade makers and needs per-supplier datasheets.
- The ISO 4875-1 vocabulary (bilingual EN/FR) was not read; it is paywalled ([SIS](https://www.sis.se/en/produkter/standardization/vocabularies/manufacturing-engineering-vocabularies/ss-iso-4875-12020/)).

---

## 2. Cutting parameters: band speed and feed by material, chip analysis, coolant, break-in, tension, tracking and guides

### Takeaway
Speed tables exist from LENOX (FPM/MPM by AISI grade, plus correction factors), CLE/Greenfield (SFM and in²/min by size class) and RÖNTGEN (m/min and cm²/min by DIN Werkstoffnummer and blade section). RÖNTGEN also gives a chip-load-per-tooth formula that lets the assistant turn speed, TPI and cut time into a feed check. Chip colour and shape is the universal on-machine diagnostic. Break-in and tension values differ notably between US makers (LENOX/Starrett) and German makers (WIKUS/RÖNTGEN).

### Cited Findings

**Speed and feed tables / data sources**
- LENOX bi-metal speed chart parameters: chart speeds assume 4" (100 mm) wide annealed material, a bi-metal blade and flood fluid.
  - Size correction: 1/4" (6 mm) +15 %; 3/4" (19 mm) +12 %; 1-1/4" (32 mm) +10 %; 2-1/2" (64 mm) +5 %; 4" (100 mm) 0; 8" (200 mm) −12 %.
  - Fluid correction: spray lube −15 %; no fluid −30 to −50 %.
  - There is also a correction for heat-treated materials, but that table did not survive text extraction.

  Source: [LENOX Guide](https://cdn.mscdirect.com/global/media/pdf/search/lenox/lenox-guide-to-band-sawing.pdf)
- LENOX carbide speed chart covers material groups by grade: aluminium 2024/5052/6061/7075; copper, bronze and brass alloys; free-machining, low, medium and high carbon steels (1145, 1215, 12L14, A36, 1008–1095); Mn, Cr-Mo, Cr and Ni-Cr-Mo steels (4140, 52100, 4340, 8620…); tool steels (W-1, D-2, A-2, H-13, O-1, M-2, M-42, T-15, P-20, S-7); stainless (304, 316, 410/420, 440C, 17-4PH); Ni and Fe superalloys (Monel, Inconel 600/718/625, Hastelloy B, Waspaloy, A286); Ti alloys; cast irons (A536, A48). Aluminium on carbide runs 3,500–8,500 fpm (1,000–2,600 m/min) where the machine allows, and "for metal cutting saws run between 275 and 350 FPM". The hardened-steel column applies "up to 61 Rc". The numeric grid did not extract cleanly (two-column graphic) — [LENOX Guide](https://cdn.mscdirect.com/global/media/pdf/search/lenox/lenox-guide-to-band-sawing.pdf)
- CLE-LINE/Greenfield Industries "Speeds for Bi-Metal Band Saw Blades": SFM and removal rate (in²/min) for four size classes (<1", 1–3", 3–6", >6"). It covers special-purpose, water-hardening, high-speed, austenitic/ferritic/martensitic stainless, nickel-based alloys (Monel, Inconel, Incoloy, Waspaloy, Hastelloy, Rene 41), titanium 6Al-4V, maraging steel, bronzes, aluminium and cast irons. Example ranges: tool steels and stainless roughly 45–265 SFM, aluminium 500–800 SFM. Labels and values misalign in the PDF text layer, so values must be read from the rendered PDF — [CLE/Greenfield PDF](https://shop.gfii.com/images/CLE_Speed_Feeds_Bi_Metal_Saw_Blades.pdf)
- RÖNTGEN "Table 1: Cutting Parameter for Bi-Metal Band Saw Blades": Vc (m/min) and Vz (cm²/min) by DIN material number and name (1.0070 St 70-2, 1.0503 C45, 1.0570 St 52-3, 1.2379 X155CrVMo12-1, 1.2842, 1.3343 S6-5-2, 1.3505 100Cr6, 1.4301 X5CrNi18-10, 1.4571, 1.7225 42CrMo4, 1.6582 34CrNiMo6…). Columns are by blade section (27×0.9, 34×1.1, 41×1.3, 54×1.3, 54×1.6) and size band (50 mm to 500 mm). Across the table Vc is about 28–73 m/min and Vz about 7–54 cm²/min. The first row (1.0070) reads 68 m/min with 37–41 cm²/min on 27×0.9 — [RÖNTGEN](https://www.roentgen-saw.com/images/pdf/technical_guide.pdf)
- WIKUS points users to its online ParaMaster® tool for cutting parameters, and LENOX to SAWCALC® — [WIKUS Breaking-in](https://www.wikus.de/en/guidebook/practice-tips/breaking-in-information); [LENOX](https://cdn.mscdirect.com/global/media/pdf/search/lenox/lenox-guide-to-band-sawing.pdf)
- Generic metal ranges from a blog/vendor (lower authority): carbon steel 200–300 SFPM, stainless 90–140, tool steel 80–140, nickel alloys 60–120, titanium 70–120. The overall band-saw speed range is 40–5,000 fpm, with friction saws up to 15,000 fpm — [BandSawBlog](https://bandsawblog.com/bandsaw-blade-speed-recommendations/)
- Converting machine RPM: SFM = RPM × wheel diameter (in) × 0.262 — [Rikon/Olson](https://info.highlandwoodworking.com/library/manuals/rikon/bandsaw_blade_selection_guide.pdf)

**Feed / chip load formula**
- RÖNTGEN: Fz = H / (40 × speed × t × TPI), where Fz = chip load per tooth (mm), H = workpiece height, t = cutting time per section, and TPI uses the mean for combi pitches (3/4 → 3.5). Typical Fz, valid up to 500 mm diameter:
  - low-alloy steel 0.005–0.008 mm
  - alloy steel 0.004–0.008
  - tool steel 0.002–0.005
  - stainless 0.002–0.005
  - brass/copper 0.008–0.012
  - aluminium 0.010–0.030

  Source: [RÖNTGEN](https://www.roentgen-saw.com/images/pdf/technical_guide.pdf)
- LENOX: feed = depth of penetration per tooth. Deeper feed lowers the shear-plane angle, giving faster cutting but "blade life will be reduced dramatically". Cutting rate is measured in in²/min; feed rate in in/min of frame travel. On a round bar, feed can be higher at entry and exit and gullet capacity limits the mid-section — [LENOX](https://cdn.mscdirect.com/global/media/pdf/search/lenox/lenox-guide-to-band-sawing.pdf)

**Chip analysis**
- LENOX: target chips are "thin, tightly curled and warm to the touch". Silver turning golden-brown means forcing the cut and too much heat; blue chips mean extreme heat and short life. Burned heavy chips: reduce feed/speed. Thin or powdered chips: increase feed. Curled, silvery and warm: optimum. Coated (AlTiN "ARMOR") blades are an exception because the coating pushes heat into the chip — [LENOX](https://cdn.mscdirect.com/global/media/pdf/search/lenox/lenox-guide-to-band-sawing.pdf)
- RÖNTGEN: optimum = curled, silver chips; feed too low = very thin chips; feed too high = blue, heavy chips; silver to slightly blue = speed probably too high — [RÖNTGEN](https://www.roentgen-saw.com/images/pdf/technical_guide.pdf)

**Coolant / lubrication**
- RÖNTGEN: oil content about 8–12 %. For stainless or tool steels, go to 15 % or higher, or use cutting oil. Never refill with water only. Check with a refractometer and check all outlets — [RÖNTGEN](https://www.roentgen-saw.com/images/pdf/technical_guide.pdf)
- LENOX: never add only water to the sump (too much water gives rapid tooth wear). Use a refractometer. When mixing, start with water and then add concentrate. Aim the delivery at the cut point — [LENOX](https://cdn.mscdirect.com/global/media/pdf/search/lenox/lenox-guide-to-band-sawing.pdf)
- WIKUS: concentration in vol % = refractometer reading × the product's factor. Oil content should be adapted to the material. Minimum-quantity lubrication works for tubes, profiles and solids up to Ø250 mm in construction steel. Chip-brush tip should nearly touch the gullet bottom, preferably mechanically driven — [WIKUS Application conditions](https://www.wikus.de/en/guidebook/practice-tips/blade-life-influences/application-conditions)
- Unverified figures (search-snippet only; the source page was behind a bot wall): mineral emulsion 5–7 % for standard steels; ≥10 % semi-synthetic for hard steels; 10–15 % or oil for very hard/tough steels — [DUDR (unverified)](https://www.dudrsaw.eu/technical-articles-and-advice/cooling-a-band-saw-blade-for-metal). These partly conflict with RÖNTGEN's 8–12 % baseline.

**Break-in (manufacturer comparison)**
- LENOX: run normal band speed; reduce feed to 20–50 % of the normal cutting rate (soft materials need the larger reduction); make sure chips form; increase slightly once fully engaged; ramp up over subsequent cuts — [LENOX Guide](https://cdn.mscdirect.com/global/media/pdf/search/lenox/lenox-guide-to-band-sawing.pdf). Total break-in area 150–300 cm² (60–118 in²) — [LENOX Break-in (Travers)](https://docs.travers.com/assets/pdf/Lenox_BandSaw_Blade_Break-In.pdf); [LENOX Australia](https://lenoxbandsaw.com.au/technical-information/bandsaw-blade-break-in/)
- Starrett: normal SFPM. Soft materials (carbon steel, aluminium): 50 % of normal cutting rate for the first 50–100 in². Hard materials (Inconel, hardened, tool, stainless): 75 % for 25–75 in², then up to 100 % over the next 50 in². Avoid vibration — [Starrett](https://www.starrett.com/news-events/why-and-how-to-break-in-band-saw-blades)
- WIKUS (bimetal and carbide): about 75 % of cutting speed and about 50 % of feed, for about 500 cm² or 15 minutes, at 250–300 N/mm² tension. Another WIKUS page says about 300 cm² for small workpieces. Coated blades are less prone to vibration — [WIKUS Breaking-in](https://www.wikus.de/en/guidebook/practice-tips/breaking-in-information); [WIKUS Application conditions](https://www.wikus.de/en/guidebook/practice-tips/blade-life-influences/application-conditions)
- RÖNTGEN: reduce feed 50 % and speed 30 % for about 500 cm², then increase carefully to 100 %. The troubleshooting section gives "70 % speed / 50 % downfeed". Break in "except using a coated blade" — [RÖNTGEN](https://www.roentgen-saw.com/images/pdf/technical_guide.pdf)
- The disagreement matters: US makers (LENOX/Starrett) keep full band speed and cut only the feed, while German makers (WIKUS/RÖNTGEN) cut speed to 70–75 % as well. Break-in area ranges from about 150 cm² (LENOX low end) to about 500 cm² (WIKUS/RÖNTGEN). LENOX says soft materials need more feed reduction, consistent with Starrett.

**Tension and tension meters**
- WIKUS: 250–300 N/mm². "Band tension is too high" is a breakage cause (reduce to 250–300); "too low" is a cutting-deviation cause (measure, then increase) — [WIKUS Cause of failures](https://www.wikus.de/en/guidebook/practice-tips/cause-of-failures)
- RÖNTGEN: "The recommended band tension is 300 N/mm². Please use band tension gauge" — [RÖNTGEN](https://www.roentgen-saw.com/images/pdf/technical_guide.pdf)
- US practice per blogs and forums (lower authority): bi-metal 25,000–30,000 psi, carbide and bi-metal best at 25–32 kpsi, not above 35 kpsi. Metric equivalents quoted are 170–240 N/mm², while other sources say 250–330 N/mm². Strain-gauge-type tension meters (Starrett, LENOX) clamp to the blade — [SawBlade.com blog](https://sawbladeblog.com/blade-tension-essentials/); [Pilana tension gauge](https://www.pilanametal.shop/en/p/saw-blade-tension-gauge)
- LENOX maintenance: "Blade Tension — Use a tension meter to ensure accuracy" — [LENOX](https://cdn.mscdirect.com/global/media/pdf/search/lenox/lenox-guide-to-band-sawing.pdf)

**Tracking and guides**
- WIKUS: side-guide gap 0.02–0.05 mm; teeth should protrude 1–2 mm from the guides; guides close to the material; check alignment and roller play — [WIKUS Cause of failures](https://www.wikus.de/en/guidebook/practice-tips/cause-of-failures)
- LENOX: guides not chipped, at the right pressure and as close to the workpiece as possible; guide arm close; wheels free of chips; blade tracks true; chip brush engaged — [LENOX](https://cdn.mscdirect.com/global/media/pdf/search/lenox/lenox-guide-to-band-sawing.pdf)
- Back-edge rubbing on the wheel flange builds martensite (a very hard layer), which tends to crack — [RÖNTGEN](https://www.roentgen-saw.com/images/pdf/technical_guide.pdf)
- Wood machines: track the blade in the middle of the rim by tilting the upper wheel. Never track with the motor running and the cover open. Set thrust bearings first, then side guides, using paper as a clearance shim — [Rikon/Olson](https://info.highlandwoodworking.com/library/manuals/rikon/bandsaw_blade_selection_guide.pdf)

### Inferences
- Deriving RÖNTGEN's constant: about 1000/25.4 ≈ 39.4 ≈ 40 teeth pass per metre per TPI. So with H in mm, speed in m/min and t in min, 40 × v × t × TPI is the number of teeth passing during the cut, and Fz is the average chip thickness. The assistant can compute this from a user's reported cut time to judge whether feed is too light (rubbing/work hardening) or too heavy.
- Unit conversions to build in: 1 m/min = 3.281 ft/min; 1 N/mm² = 145.04 psi. RÖNTGEN's 300 N/mm² is about 43,500 psi, far above the US blog figure of 25–30 kpsi. That is a real regional disagreement. The assistant should cite the maker's figure for the blade family and recommend a tension meter, not quote one universal number.
- A minimal "material-grade database" schema can follow RÖNTGEN: DIN Werkstoffnummer + DIN/EN name + AISI/SAE equivalent (LENOX/CLE use AISI) + hardness + speed (m/min) + cutting rate (cm²/min) by section and size + recommended tooth form/rake. Turkish customers mostly use DIN/EN designations (St 37/St 52, C45, 42CrMo4, 1.2379, 304/316), so DIN↔AISI cross-references are essential.

### Gaps
- The LENOX bi-metal and carbide speed grids and the CLE/Greenfield grid need manual transcription from the rendered PDFs because text extraction scrambled row/column alignment. The RÖNTGEN table also needs a check of row-to-material alignment before reuse.
- WIKUS ParaMaster is an online tool; its data could not be harvested.
- No authoritative source was found that quantifies coolant concentration by material across makers (only RÖNTGEN's figures are verified).
- Tension values for carbon and wood blades were not found from a primary maker.

---

## 3. Blade length calculation (two-wheel, three-wheel), welding/joint basics, storage and handling

### Takeaway
Length is simple geometry: for equal wheels it is the wheel circumference plus the axle-polygon perimeter, measured at working tension. Authoritative maker data on butt-welding and annealing is scarce in public sources, and most procedural detail found is from hobby or forum sources. Handling rules are documented by LENOX and RÖNTGEN as failure causes.

### Cited Findings
- Two equal wheels: L = π·D + 2·C (C = centre distance). Unequal wheels: L ≈ π·(D1+D2)/2 + 2·C — [Woodworking Advisor / United Products](https://unitedproducts.co.nz/faq-frequently-asked-questions/how-to-measure-your-bandsaw-blade-length/); [SawBlade.com tech tip](https://sawblade.com/tech-tips/how-do-i-measure-my-bandsaw-for-you-to-make-my-blades-for-me)
- Measurement method: set tension about 1/3 from fully tightened before measuring. For three or more wheels, measure axle-to-axle around the loop and add the wheel-circumference contributions. Worked example: 40.82" (wheels) + 72" (2 × 36" axle distance) = 112.82" — [SawBlade.com](https://sawblade.com/tech-tips/how-do-i-measure-my-bandsaw-for-you-to-make-my-blades-for-me)
- Length depends on the machine and "shall be clarified when ordering" — [ISO 4875-2](https://cdn.standards.iteh.ai/samples/41855/84673929d39a4930b8a602f6b290496a/ISO-4875-2-2006.pdf)
- Butt welds: identify a weld break by grind marks at the fracture. Any cause of body breaks can also break welds — [LENOX](https://cdn.mscdirect.com/global/media/pdf/search/lenox/lenox-guide-to-band-sawing.pdf). "The weld joint is the weakest part of the blade" — [RÖNTGEN](https://www.roentgen-saw.com/images/pdf/technical_guide.pdf). Remedies for a cracked weld: re-weld, and check guides and wheels for hidden machine faults — [WIKUS](https://www.wikus.de/en/guidebook/practice-tips/cause-of-failures)
- Brittle weld remedy: "increase annealing period, decreasing heat gradually". A weld out of alignment causes clicking on the back-up bearing ("reweld blade straight and true") — [Rikon/Olson](https://info.highlandwoodworking.com/library/manuals/rikon/bandsaw_blade_selection_guide.pdf)
- Flash-butt process (secondary or hobby sources, lower authority): ends squared and clamped; current for about 1–3 s until bright orange; ends upset together, expelling flash; grind the bead; anneal. Carbon blades are tempered back to blue (about 600 °F). Bi-metal welders have a dedicated annealing position with wider jaw distance; heat to dull/cherry red (not orange or yellow) and cool slowly — [ScienceInsights](https://scienceinsights.org/how-to-weld-bandsaw-blades-prep-weld-and-anneal/); [WeldingWeb thread](https://www.weldingweb.com/threads/bandsaw-blade-weld-and-annealing.653951/); [HeatSource bi-metal butt welder](https://heatsourceinc.com/product/electroweld-bi-metal-bandsaw-blade-butt-welder-15kva-bbw-640/)
- Handling: tooth damage from "improper opening of folded band"; notches in the back edge from handling damage start back-edge cracks — [LENOX](https://cdn.mscdirect.com/global/media/pdf/search/lenox/lenox-guide-to-band-sawing.pdf). Remove tooth protection only once the blade is on the machine, and avoid the teeth of one blade scratching the back of another — [RÖNTGEN](https://www.roentgen-saw.com/images/pdf/technical_guide.pdf)

### Inferences
- Exact geometry for a loop running on the outside of n equal wheels: the wrap arcs sum to 360°, so L = π·D + (sum of centre-to-centre distances around the polygon). This holds for 2-, 3- or 4-wheel machines. For unequal two-wheel saws, the exact open-belt formula adds (D1−D2)²/(4C), usually negligible. A length helper should also apply the tension-position rule (measure at about 1/3 from full tension, per SawBlade.com) and round to the maker's catalogue length.
- Because TestereStore welds to any length (1,000–15,000 mm), the assistant should ask for the machine brand/model first (a lookup table of known machine lengths is better than calculation), and fall back to the formula only when the model is unknown.

### Gaps
- No primary welder-manufacturer procedure (e.g. IDEAL, Gaspardo, DoALL welder manuals) was read: weld current, upset and anneal parameters for M42/M51 vs carbon vs stainless meat blades remain unverified. TCT blades are generally not field-welded; this needs a source.
- No authoritative storage guidance (humidity, coil-folding method, shelf life of coolant-wetted blades) was found.

---

## 4. Troubleshooting (symptom → cause → remedy), blade life expectations, safety

### Takeaway
LENOX's 20 "Observations" and RÖNTGEN's equivalent 20 defects (with explicit remedies) form the most complete public troubleshooting set, well beyond the assistant's 12 symptoms. WIKUS adds machine-side tolerances, and Olson/Rikon adds 17 machine-side diagnoses for wood. Public, credible blade-life figures do not exist; only marketing ratios do.

### Cited Findings
- **LENOX 20 observations** (each with probable causes):
  1. Heavy even wear on tips/corners — break-in, excessive speed, low feed (rubbing, especially on work-hardening stainless/tool steel), flame-cut edges or abrasives, insufficient fluid.
  2. Wear on both sides of teeth — back-up guides, wrong side guides, backing out of an incomplete cut.
  3. Wear on one side — worn wheel flange or tracking, loose side guides, blade not perpendicular, rubbing on return stroke or on machine parts.
  4. Chipped/broken teeth — break-in, wrong blade, handling, clamping, excessive feed, hard spots or scale.
  5. Body breakage/cracks from back edge — back-up guide preload, feed, tracking, worn guides, tension, notches.
  6. Tooth strippage — break-in, chip brush, feed, vibration, wrong pitch, positioning, fluid, hard spots, speed too slow.
  7. Chips welded to tips — fluid, chip brush, speed, feed.
  8. Gullets loading — pitch too fine, feed, chip brush, fluid.
  9. Discoloured tips — fluid, speed, feed, band installed backwards.
  10. Heavy wear on both sides of band — side guides chipped or too tight, fluid flow.
  11. Uneven wear/scoring on band sides — loose, worn or chip-clogged guides, guide arms at max spread.
  12. Heavy wear/swaging on back edge — feed, preload, tracking, worn back-up guides.
  13. Butt weld breakage — same causes as body breaks.
  14. Heavy wear in smallest gullets only — feed too high, speed too slow, pitch too fine.
  15. Fracture travelling at an angle — twist stress, guide arms spread too wide.
  16. Cracks from gullets — preload, tension, guide spread, beam bar alignment, tight side guides, worn teeth.
  17. Figure-8 twist — excessive tension, long/short tooth edge, tight radius.
  18. "Long" on tooth edge — side guides tight near gullets, preload, worn wheels, feed, guide spread, tracking.
  19. "Short" on tooth edge — side guides tight near back, worn wheels, guide spread, feed.
  20. Twist in length — tension, long/short edge, tight radius.

  Source: [LENOX](https://cdn.mscdirect.com/global/media/pdf/search/lenox/lenox-guide-to-band-sawing.pdf)
- **RÖNTGEN** reproduces the same 20 defects with explicit solutions: break in for about 500 cm² at 70 % speed and 50 % downfeed; check coolant with a refractometer; "cut stainless steels always with positive tooth rake angle"; recommended tension 300 N/mm²; adjust guide arms to the material dimension; remove tooth protection only on the machine. It also includes a machine-inspection checklist form (lubrication mixture, tension, actual speed, damping rolls, side and back-up guides in/out, flange rubbing, untrue wheels, chip brush) — [RÖNTGEN](https://www.roentgen-saw.com/images/pdf/technical_guide.pdf)
- **WIKUS** cause-of-failures table, grouped as heavy wear / cut deviation / cracked weld / band breakage / tooth chipping. Key machine numbers: side-guide gap 0.02–0.05 mm; teeth protrude 1–2 mm from guides; tension 250–300 N/mm². Wheel ("impeller") surface errors, conicity, bearings, non-true wheels and backing touching the wheel collar all cause breakage. Built-up edge and hard inclusions cause tooth chipping (WIKUS suggests metallographic analysis) — [WIKUS Cause of failures](https://www.wikus.de/en/guidebook/practice-tips/cause-of-failures)
- **Olson/Rikon (wood/general)** 17 diagnoses: premature tooth wear; vibration; gullet loading; stalling; premature breakage (including blade too thick for the wheel); belly-shaped cuts; tooth strippage; negative and positive camber; not running true on back-up bearing (burr, weld misalignment); cutting rate too slow; premature loss of set; twist (wrong width for radius); rough finish; scoring; back-edge mushrooming (brittle weld: increase annealing period); blade leading in cut — [Rikon/Olson](https://info.highlandwoodworking.com/library/manuals/rikon/bandsaw_blade_selection_guide.pdf)
- Blade life claims (marketing, conflicting): bi-metal lasts "3–5 times" carbon, other sources say "7–10 times", others "two–three times" — [Detroit Bandsaw FAQ](https://www.detroitbandsaw.com/resource-library-faqs/band-saw-blades/); [The Fabricator survival guide](https://www.thefabricator.com/thefabricator/article/sawing/a-band-saw-blade-survival-guide) (not read in full). LENOX case study: three 3-1/4" squares cut side by side (guides 11-3/4" apart) lost squareness after 40 cuts. Cutting one at a time (guides 5-1/4") allowed higher feed — [LENOX](https://cdn.mscdirect.com/global/media/pdf/search/lenox/lenox-guide-to-band-sawing.pdf)
- RÖNTGEN customer-consulting rule: blade life, surface finish and cutting time cannot all be maximised at once, so ask which the customer prioritises. Document the settings — [RÖNTGEN](https://www.roentgen-saw.com/images/pdf/technical_guide.pdf)
- Safety (wood bandsaws, US): band wheels fully encased with a solid periphery. Front and back may be mesh or perforated metal ≥ 0.037" with openings ≤ 3/8". The blade must be guarded except the working portion between guide and table, with a self-adjusting upper guard — [OSHA 29 CFR 1910.213(i)](https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.213)

### Inferences
- The assistant's 12-symptom table can be expanded to about 25 merged symptoms by uniting LENOX/RÖNTGEN (blade-side evidence), WIKUS (machine tolerances) and Olson (wood/contour issues such as camber, belly cuts and lead). Each should be keyed by what the customer can observe (photo of teeth, fracture origin, chip colour, cut geometry).
- Fracture-origin reading is a high-value diagnostic. A flat area marks the origin. Back-edge origin points to preload, tracking or notches; gullet origin points to tension, guides or worn teeth; angular fracture points to twist or guide spread.
- Blade life should be framed as relative (cost per cut, cm² cut), never as a fixed promise. TestereStore should avoid quoting "X times longer" claims, because sources conflict and they are marketing.

### Gaps
- No public, maker-independent blade-life benchmark (cm² per blade by material) was found.
- Bahco, Amada and M.K. Morse troubleshooting charts were not read, so cross-checking beyond LENOX, RÖNTGEN, WIKUS and Olson is pending.

---

## 5. Wood-specific knowledge: resawing, curve cutting, hook vs skip, TPI by stock thickness, width by radius, sawmill bands

### Takeaway
Small and medium wood bandsaws follow the "3 teeth in the cut" rule (Olson's TPI-to-minimum-thickness chart), hook teeth for speed and rake/regular for finish, the widest blade the radius allows, and the wheel-diameter thickness limit. Sawmill (log) bands are a separate domain: hook angle and back-angle profiles, tooth spacing in inches, thickness tied to horsepower, wide bands, and swaging/sharpening.

### Cited Findings
- TPI vs minimum material thickness (wood/general): 32 TPI → 3/32"; 24 → 1/8"; 18 → 5/32"; 14 → 1/4"; 10 → 5/16"; 8 → 3/8"; 6 → 1/2"; 4 → 3/4"; 3 → 1"; 2 → 1-1/2". "At least three teeth must be in the workpiece." 2–3 TPI for resawing and thick stock up to 8". 18–32 TPI for thin metals and plastics under 1/4". 3/4" wood: 4 TPI cuts fast, 14 TPI cuts slow but smooth — [Rikon/Olson](https://info.highlandwoodworking.com/library/manuals/rikon/bandsaw_blade_selection_guide.pdf)
- Laguna: at least 3 and fewer than about 12 teeth in the workpiece; more TPI = smoother but slower — [Laguna](https://lagunatools.com/education/bandsaw-blade-education/)
- Speed limits: spring-steel wood blades should "never be operated at surface speeds above 3000 SFM". Carbon hard-edge flexible-back blades may run up to 8000 SFM — [Rikon/Olson](https://info.highlandwoodworking.com/library/manuals/rikon/bandsaw_blade_selection_guide.pdf)
- Turkish academic/trade source (as summarised in search, not opened): softwoods (pine, spruce, fir, poplar, lime) about 3000 m/min band speed; oak/beech 2400–2700 m/min; very hard woods 1800–2100 m/min — [DergiPark article](https://dergipark.org.tr/en/download/article-file/175136). These m/min values fit wide log band saws (about 30–50 m/s), not small workshop saws (≤ 3000 ft/min ≈ 914 m/min per Olson). Do not mix the two.
- Carbide resaw: Laguna's "Resaw King" uses C4 carbide teeth and claims re-sharpening 4–5 times (marketing) — [Laguna](https://lagunatools.com/education/bandsaw-blade-education/)
- Tooth forms for wood: skip (wide gullet) for wood, cork, plastics; hook for non-metallics — [LENOX](https://cdn.mscdirect.com/global/media/pdf/search/lenox/lenox-guide-to-band-sawing.pdf). WIKUS L (skip, 0°) for aluminium and wood — [WIKUS](https://www.wikus.de/en/guidebook/technical-principles)
- Sawmill bands (Wood-Mizer):
  - Hook angles: 4° (very hard or frozen wood, back angle 32°); 7° (hardwoods, ≥ 25 HP, back angle 34°); Turbo 7° (extreme hardwoods); 9° (frozen/hard/small logs, ≤ 24 HP, back angle 29°); 10° (all-purpose, back angle 30°); 12° (softwoods and resawing, back angle 28°).
  - Tooth spacing: 1/2–3/4" for low HP/resaw; 7/8" standard; 1–1-1/4" for ≥ 25 HP.
  - Thickness: .035–.042" for ≤ 24 HP and longer flex life; .045–.055" for ≥ 25 HP and faster feed.
  - Width: 1–1-1/2" narrow; 1-1/2–2" standard; 3" industrial.
  - Thin-kerf bands remove under 2.5 mm.

  Sources: [Wood-Mizer blade profile guide](https://woodmizer.ca/en/learning-center/how-to-choose-a-sawmill-blade-profile); [Timberline – choosing a Wood-Mizer blade](https://timberlinemag.com/2020/08/01/how-to-choose-a-wood-mizer-sawmill-blade/)
- "Tooth set is the distance the tooth is bent beyond the body" (sawmill) — [Wood-Mizer US LT15 blades](https://woodmizer.com/us/woodmizer-lt15-sawmill-blades)

### Inferences
- For TestereStore's C75S wood blades, the most useful assistant rules are: (a) TPI from stock thickness (Olson chart, 3-teeth rule); (b) width from the tightest radius (merged radius table); (c) thickness from wheel diameter (Laguna table / D/1000); (d) hook/skip for thick or resaw work, regular/rake for finish; (e) a band-speed ceiling for carbon spring-steel blades.
- Sawmill wide bands (stellited or swaged, ≥ 100 mm, 30–50 m/s) are probably outside TestereStore's current range. The assistant should recognise the request and hand off rather than improvise.

### Gaps
- No primary maker data was found on swaging, stelliting or sharpening procedures for wide bands, or on tension for wood blades. Suffolk/Timber Wolf, Simonds and Wood-Mizer manuals were not read.
- Wood resaw tension and drift (lead) correction from maker sources was not covered.

---

## 6. Meat / bone / food blades: hygiene standards, blade types, TPI, stainless requirements

### Takeaway
Meat and food blades are narrow (mostly 5/8" = 16 mm) and thin (0.014–0.035"), with 2–4 TPI (3 TPI for frozen or bone-heavy, 4 TPI for fresh or appearance-critical) in hook or regular profiles. Many premium "meat" blades are high-carbon, not stainless, and stainless is chosen for corrosion and hygiene. Machine hygiene is governed by EN 12268 (food band saw machines) and EN 1672-2 (general food-machinery hygiene). Blade-level certification exists in the US (USDA, NSF/ANSI/3-A).

### Cited Findings
- Starrett Meatkutter Stainless (MKS): 5/8" × .018", in 3 TPI (regular profile), 4 TPI (hook profile) and 6 TPI (skip tooth profile). USDA approved and rust-proof. Described as NSF/ANSI/3-A certified (hygiene requirements for meat and poultry equipment). Suitable for fish and frozen meat up to −20 °C (−4 °F) — [Starrett Meatkutter Stainless](https://www.starrett.com/products/meat-cutting-and-food-processing/band-saw-blades/meatkutter--stainless)
- Starrett Meatkutter Frozen: polished high-carbon steel with hardened, ground teeth and laser-etched traceability. Sizes: 5/8" × .014/.016/.020"; 3/4" × .022"; 1" × .023/.032"; 1-1/4" × .032"; 2" × .035". 2–4 TPI in hook and low profiles. USDA approved. For fish and frozen meat to −20 °C — [Starrett Meatkutter Frozen](https://www.starrett.com/products/meat-cutting-and-food-processing/band-saw-blades/meatkutter-frozen)
- Starrett also publishes a dedicated food-cutting catalogue (UK) — [Starrett Food Cutting Solutions](https://catalogues.starrett.co.uk/view/451234213)
- TPI practice: 3 TPI for big, frozen or bone-heavy product; 4 TPI for smaller, fresh or appearance-critical cuts. Processors who try 4 TPI on frozen product often return to 3 TPI because of slower cutting and more tooth wear (vendor blog) — [SimCut butcher blades](https://simcut.com/2026/03/simcut-butcher-blades-heavy-duty-meat-cutting/)
- EN 12268:2014, "Food processing machinery – Band saw machines – Safety and hygiene requirements". It covers machines for bones, fresh or frozen meat with or without bone, fresh or frozen fish (whole or fillets), frozen product blocks, fresh or frozen vegetables, pork fat and similar. It excludes domestic machines and machines with automatic loading/unloading (e.g. conveyors), and covers hazards from transport through cleaning, maintenance and scrapping — [iTeh EN 12268:2014](https://standards.iteh.ai/catalog/standards/cen/9dec96d0-4344-4a0f-8b40-8f39a9d4e063/en-12268-2014); [DIN EN 12268](https://www.dinmedia.de/en/standard/din-en-12268/205718344)
- EN 1672-2:2020: common hygiene and cleanability requirements for food-processing machinery, intended to eliminate or minimise risk of contagion, infection, illness or injury — [iTeh EN 1672-2:2020](https://standards.iteh.ai/catalog/standards/cen/1715042d-5c10-42f1-a5d4-085e5be63885/en-1672-2-2020); [BSI](https://knowledge.bsigroup.com/products/food-processing-machinery-basic-concepts-hygiene-and-cleanability-requirements). Secondary summaries add: zoning by degree of food contact; smooth, crevice-free, self-draining surfaces; Ra ≤ 0.8 µm recommended for food-contact surfaces; compliance gives presumption of conformity with Machinery Regulation hygiene requirements — [NHK summary](https://nhkmachineryparts.com/en-1672-2-hygiene-requirements/); [eShield summary](https://eshield.pl/en/knowledge/design-food-processing-machinery-en-1672-2/) (secondary; verify against the standard)
- ANSI B11.10 (US metal sawing) explicitly excludes food-processing sawing machines — [B11 scopes](https://www.b11standards.org/b11scopes); [ANSI B11.10 preview](https://www.assp.org/docs/default-source/standards-documents/preview/e_b11_10_2003_r2020_preview.pdf?sfvrsn=16ac9447_2)

### Inferences
- The EU standards (EN 12268, EN 1672-2) regulate machines, not blades. Blade-level hygiene claims in Europe rest mainly on material (stainless or corrosion-resistant, food-contact suitability) and cleanability. TestereStore's assistant should not claim a blade is "EN 1672-2 certified". It can say the blade is stainless and suitable for hygienic environments, and that machine-level compliance is the machine maker's responsibility.
- Meat-blade selection logic: frozen, bone or large blocks → 3 TPI, hook or regular, thicker gauge (.020–.022"); fresh or boneless, appearance-critical → 4 TPI; fine or delicate (or fish fillets) → finer pitch or skip, e.g. Starrett's 6 TPI skip. The temperature limit (about −20 °C per Starrett) is a useful guardrail for deep-frozen blocks.

### Gaps
- No source gave meat-saw band speeds (machines are usually fixed-speed), cleaning-chemical compatibility for carbon vs stainless blades, or EU food-contact material rules (EC 1935/2004) applied to saw blades.
- Biro and Hollymatic blade documentation was not found or read.
- Turkish regulatory specifics (TSE adoption of EN 12268 as TS EN 12268) were not verified.

---

## 7. Foam / textile / paper / rubber blades: knife-edge, scalloped, wavy and toothed variants

### Takeaway
Soft-material "band knives" cut by slicing, not chip removal. Edge geometry (straight knife, scallop, wavy, and V/C-tooth, razorback) and bevel (single or double) are chosen by material density, rigidity and finish/dust requirements. Public technical data, such as speeds, bevel angles and thickness rules, is thin and mostly vendor-level.

### Cited Findings
- Starrett band knives: high-carbon and stainless steel; straight, scallop or wavy edges; single or double bevel; for foam, rubber, soft plastics, cardboard, paper and cork — [Starrett foam/paper/plastic/rubber](https://www.starrett.com/products/band-saw-blades/band-saw-blades-for-foam-paper-plastic-and-rubber); [Starrett Band Knives](https://www.starrett.com/products/band-saw-blades/carbon/band-knives)
- Edge-type taxonomy (vendor technical blog):
  - Knife edge: pure slicing, no dust, best for flexible foams, needs regular sharpening.
  - V-tooth: most popular for low–medium-density foams; faster, minimal dust.
  - Scallop: slicing plus penetrating tips; all flexible foams; smooth, little dust.
  - C-tooth: dense or rigid foams; can run in either direction.
  - Razorback: V-tooth/scallop hybrid with a larger gullet, for rigid foams.
  - Wavy: smooth crests; flexible PU and fibrous materials.
  - CNC contour variants: knife, Micro-A, razorback, V-tooth.

  Sources: [SimCut – Breaking down foam cutting blades](https://simcut.com/2025/01/breaking-down-foam-cutting-blades/); [SimCut foam blades](https://simcut.com/industrial-bandsaw-blades/foam-cutting-blades/)
- Wavy band knives have sharpened tips that penetrate first so the blade slices without pulling or ripping; suited to low–medium-density foams — [The Bandsaw Shop foam blades](https://thebandsawshop.com/foam-cutting/); [Dakin-Flathers foam blade](https://www.dakin-flathers.com/blog/foam-cutting-blade)
- Splitting band knives (horizontal splitting machines, e.g. leather and foam) are a distinct product family — [Wikipedia: Splitting band knife](https://en.wikipedia.org/wiki/Splitting_band_knife)
- Skip-tooth (toothed) blades remain the choice for cork, plastics and "composition materials" when a toothed blade is used — [LENOX](https://cdn.mscdirect.com/global/media/pdf/search/lenox/lenox-guide-to-band-sawing.pdf); carbide grit or diamond for abrasive composites and FRP — [Detroit Bandsaw carbide grit](https://www.detroitbandsaw.com/product-category/band-saw-blades/carbide-saw-blades/carbide-grit-edge-blades/)

### Inferences
- Assistant decision logic for soft materials:
  - flexible PU or memory foam, best finish, no dust → knife or scallop;
  - general low–medium density → wavy or V-tooth;
  - rigid foams (PS/XPS/PIR) or dense rubber → C-tooth or razorback, or a fine-pitch toothed blade;
  - cork, composites, filled rubber → skip-tooth carbon, or carbide grit if abrasive;
  - textile or fibrous → wavy or scallop (vendor-level).
- Double bevel suits symmetric vertical cuts. Single bevel suits splitting or horizontal machines where one face must stay flat (inferred from typical machine usage; verify with a maker).

### Gaps
- No authoritative data on band-knife speeds, bevel angles, thickness by machine (e.g. Fecken-Kirfel, Baumer, Albrecht machines), or continuous on-machine grinding practice.
- Textile-specific (cloth stack) band-knife data was not found.

---

## 8. Standards: what each specifies, and public availability

### Takeaway
Only ISO 4875 is a blade standard: Part 1 vocabulary, Part 2 dimensions, hardness, pitch, set and designation. All other relevant standards concern machines (safety or hygiene). ISO 4875-2's full normative text is visible in the free iTeh preview. The machine standards have free scope abstracts only.

### Cited Findings
- **ISO 4875-1:2006**, metal-cutting band saw blades, vocabulary. Terms for blade elements, tooth characteristics, tooth shapes and set types. Available as a bilingual edition, e.g. SS-ISO 4875-1:2020 (identical to ISO 4875-1:2006) — [SIS](https://www.sis.se/en/produkter/standardization/vocabularies/manufacturing-engineering-vocabularies/ss-iso-4875-12020/)
- **ISO 4875-2:2006**, characteristics and dimensions (ISO/TC 29 Small tools). Replaces ISO 4875-2:1978 and ISO 4875-3:1978. Contents: definitions; usual sections for carbon, bimetal, friction and composite blades; fixed and variable pitch series; set symmetry ±0.05 mm; flatness ≤ 2 µm/mm; minimum hardness; friction saws > 40 m/s; designation format. 4 normative pages, fully visible in the iTeh preview — [ISO 4875-2 preview](https://cdn.standards.iteh.ai/samples/41855/84673929d39a4930b8a602f6b290496a/ISO-4875-2-2006.pdf); [ISO 4875-2:1978 record](https://www.iso.org/standard/10863.html); [DIN Media ISO 4875-2](https://www.dinmedia.de/en/standard/iso-4875-2/92456345)
- **EN ISO 16093:2017**, machine tools, safety of sawing machines for cold metal. Covers significant hazards, including foreseeable misuse. Treats noise but has no full noise test code, and does not cover fire or explosion hazards. Supersedes EN 13898 — [iTeh EN ISO 16093](https://standards.iteh.ai/catalog/standards/cen/61c1db84-721b-4a91-9a33-6ef10159df3b/en-iso-16093-2017); [ISO 16093 preview PDF](https://cdn.standards.iteh.ai/samples/55668/a2835335aa68489e810d8a55d31fc620/ISO-16093-2017.pdf); [DIN Media](https://www.dinmedia.de/en/standard/din-en-iso-16093/257330296)
- **ANSI B11.10-2003 (R2020; listed as R2026)**, US metal sawing machines. Design, construction, modification, operation and maintenance of stationary saws (circular, band, hack). Excludes woodworking, stone, food-processing, abrasive and portable saws — [ASSP preview](https://www.assp.org/docs/default-source/standards-documents/preview/e_b11_10_2003_r2020_preview.pdf?sfvrsn=16ac9447_2); [B11 Standards](https://www.b11standards.org/storeitems/ansi-b1110-2003-r2026)
- **EN 1807-1:2013**, woodworking table band saws and band re-saws (manual loading; solid wood, chipboard, fibreboard, plywood, including faced panels). Excludes transportable, hand-held and log band saws. Superseded on 27 Nov 2021 by **EN ISO 19085-16:2021**, which is itself under revision (ISO/DIS 19085-16) — [Intertek EN 1807-1](https://www.intertekinform.com/en-us/standards/en-1807-1-2013-338915_saig_cen_cen_777142/); [iTeh EN ISO 19085-16](https://standards.iteh.ai/catalog/standards/cen/808321c8-a977-46c4-8381-33e7404031f5/en-1807-1-2013); [ISO/DIS 19085-16](https://www.iso.org/standard/92398.html)
- **EN 1807-2:2013**, log band sawing machines (manual or automatic loading, solid wood). 64 pages, under Machinery Directive 2006/42/EC — [EN-Standard.eu](https://www.en-standard.eu/din-en-1807-2-safety-of-woodworking-machines-band-sawing-machines-part-2-log-sawing-machines/); [DIN Media](https://www.dinmedia.de/en/standard/din-en-1807-2/180138881); UK list of woodworking ENs: [HSE](https://www.hse.gov.uk/woodworking/standards.htm)
- **EN 12268:2014**, food-processing band saw machines, safety and hygiene (scope in Section 6) — [iTeh](https://standards.iteh.ai/catalog/standards/cen/9dec96d0-4344-4a0f-8b40-8f39a9d4e063/en-12268-2014)
- **EN 1672-2:2020**, food machinery hygiene and cleanability (replaces the 2005 edition) — [iTeh 2020](https://standards.iteh.ai/catalog/standards/cen/1715042d-5c10-42f1-a5d4-085e5be63885/en-1672-2-2020); [iTeh 2005](https://standards.iteh.ai/catalog/standards/cen/4152ca25-42ea-4fe8-a07b-feaa4b0f114c/en-1672-2-2005)
- **OSHA 29 CFR 1910.213(i)**, US legal requirements for woodworking bandsaws and band resaws (wheel enclosure, blade guarding). Free, public-domain US federal regulation text — [OSHA](https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.213)

### Inferences
- For the assistant: ISO 4875-2 gives the vocabulary and designation grammar ("41 × 1,3 – 3/4") and plausibility checks (standard sections, pitch series). Machine standards are only for safety referrals ("your machine should comply with EN ISO 16093 / EN 12268"). They should never be presented as blade specifications.
- Turkish TSE versions (TS EN ISO 16093, TS EN 12268, TS EN 1672-2, TS ISO 4875) very likely exist as adoptions of the CEN/ISO texts. This was not verified here (see Gaps).

### Gaps
- No DIN blade standard was located beyond ISO adoptions, for example a DIN for wood band saw blades or for butt welds.
- TSE catalogue entries were not checked.
- ISO 4875-3:1978 (withdrawn) was found but not read ([preview](https://cdn.standards.iteh.ai/samples/10864/de424eabdaf540c0b9228a4176bd2319/ISO-4875-3-1978.pdf)).

---

## 9. Glossary: Turkish / English / German customer vocabulary

### Takeaway
English terms are best anchored to the LENOX glossary (and ISO 4875-1), and German to WIKUS's German guidebook. Turkish usage can be taken from Turkish distributor guides. Several everyday Turkish shop terms (çapraz, bor yağı) are colloquial and should be confirmed against Turkish catalogues.

### Cited Findings
- English definitions (LENOX):
  - blade back; thickness; width (tooth tip to back);
  - set (bending teeth for clearance); kerf; tooth pitch (tip to tip); TPI (gullet to gullet);
  - gullet; tooth face; rake angle (relative to a line perpendicular to the cutting direction);
  - band speed (fpm/mpm); feed rate (in/min); cutting rate (in²/min); depth of penetration; gullet capacity;
  - width of cut; distance of cut; tooth form (variable, variable positive, standard, skip, hook); tooth set (raker, vari-raker, alternate, wavy);
  - carbon flex back; carbon hard back; bi-metal; carbide tipped.

  Source: [LENOX](https://cdn.mscdirect.com/global/media/pdf/search/lenox/lenox-guide-to-band-sawing.pdf)
- German (WIKUS):
  - Zahnformen: Standardzahn (S, Spanwinkel 0°), Klauenzahn (K, positive), Profilzahn (P), Lückenzahn (L, 0°, Aluminium/Holz), Trapezzahn (T; TSN negative).
  - Zahnteilung in ZpZ ("Zähne pro Zoll", 1 inch = 25.4 mm), constant or variable.
  - Schränkarten: Standardschränkung (from 5 mm), Gruppenschränkung (4–18 ZpZ), Wellenschränkung (≤ 5 mm).
  - Spanwinkel = rake angle.
  - KSS = Kühlschmierstoff (coolant), used in the WIKUS refractometer text.

  Sources: [WIKUS DE Technische Grundlagen](https://www.wikus.de/de/ratgeber/technische-grundlagen); [WIKUS Application conditions](https://www.wikus.de/en/guidebook/practice-tips/blade-life-influences/application-conditions)
- German set names Wechselschränkung (alternate L/R), Gruppenschränkung (groups of 2–3 teeth) and Wellenschränkung (wavy, thin-walled); variable pitch written e.g. "2-3 ZpZ" — [Sägemarkt](https://www.saegemarkt.de/bloggen/bandsaegeblatt-geometrie-zahnteilung-schraenkung.html); [Bandsäge-Tests Schränkung](https://www.bandsaege-tests.de/ratgeber/alles-zur-schraenkung-von-einem-saegeblatt); Arntz glossary: [Arntz Glossar](https://www.arntz.de/glossar/)
- Turkish (distributor usage): TPI = "diş/inç"; diş sayısı; bıçak genişliği (width, sets min. radius); uzunluk; kalınlık; karbon çelik; bi-metal; alaşımlı çelik; yüksek hız çeliği (HSS) — [Kar-Tes](https://www.kar-tes.com.tr/blog/testereler/serit-testere-hakkinda-her-sey/). Other Turkish selection guides: [Testere Sepeti](https://www.testeresepeti.com.tr/blog/serit-testere-bicaklari.html), [Werte](https://werte.com.tr/testereler/serit-testere-bicaklari-nasil-secilir/), [Ser-Mak](https://www.ser-mak.com/blog/serit-testere-secimi-nasil-yapilir/), [Ayka Teknik](https://www.aykateknik.com.tr/serit-testere-rehberi), [Atanaz Çelik bi-metal](http://www.atanazcelik.com/tes1.html), [İstanbul Testere](https://istanbultestere.com/serit-testere-hakkindaki-bilgiler/)

### Inferences
Draft trilingual glossary. Items marked † come from my domain knowledge and were not verified in a source during this pass; they should be confirmed against TestereStore's own catalogue and customer chat logs.

| Turkish | English | German |
|---|---|---|
| şerit testere (bıçağı) | band saw blade | Bandsägeblatt / Sägeband |
| diş adımı / diş sayısı, TPI, "diş/inç" | tooth pitch / TPI | Zahnteilung, ZpZ |
| değişken diş (ör. 3/4) † | variable pitch | variable Zahnteilung |
| sabit diş † | constant pitch | konstante Zahnteilung |
| çapraz / diş çaprazı † | set | Schränkung |
| standart (L-R-S) çapraz † | raker set | Standard-/Wechselschränkung |
| grup çapraz † | group / vari-raker set | Gruppenschränkung |
| dalgalı çapraz † | wavy set | Wellenschränkung |
| diş formu / diş profili † | tooth form | Zahnform |
| kanca diş † | hook | Klauenzahn |
| atlamalı diş † | skip | Lückenzahn |
| talaş açısı † | rake angle | Spanwinkel |
| diş dibi / talaş boşluğu † | gullet | Zahnlücke / Spanraum |
| sırt † | back | Bandrücken |
| genişlik × kalınlık × uzunluk | width × thickness × length | Breite × Dicke × Länge |
| kaynak / kaynak yeri † | weld / butt weld | Schweißstelle / Stumpfschweißung |
| tavlama † | annealing | Anlassen / Glühen |
| gerginlik / gerdirme † | tension | Bandspannung |
| kesme hızı | band speed | Schnittgeschwindigkeit |
| ilerleme † | feed | Vorschub |
| bor yağı / soğutma sıvısı † | coolant (emulsion) | Kühlschmierstoff (KSS) |
| alıştırma / rodaj † | break-in | Einfahren |
| volan / kasnak † | band wheel | Bandrolle / Laufrad |
| kılavuz † | guide | Bandführung |
| talaş fırçası † | chip brush | Späneabstreifbürste |
| karbür uçlu (TCT) † | carbide-tipped | hartmetallbestückt (HM) |
| et-kemik testeresi | meat/bone blade | Fleisch-/Knochensägeband |
| sünger bıçağı (sources: Testere Sepeti) | foam band knife | Bandmesser |

### Gaps
- ISO 4875-1's official bilingual vocabulary (EN/FR) was not accessible free.
- No authoritative Turkish standardised glossary (TSE) was found. The Turkish terms marked † need validation.

---

## 10. Source inventory, data formats and licensing (cross-cutting)

### Takeaway
The highest-value sources are maker technical guides (LENOX, RÖNTGEN, WIKUS, Starrett, Bahco, Arntz) plus the ISO 4875-2 preview. They come as PDFs (often with tables embedded as graphics) and web pages. All are copyrighted. Numeric parameters can be used as facts with attribution and re-expressed in TestereStore's own tables. Verbatim tables, text and figures should not be reproduced, and some guides (e.g. the Rikon/Olson sheet) are themselves "reprinted with permission".

### Cited Findings
- ISO copyright notice: "no part of this publication may be reproduced or utilized in any form… without permission" — [ISO 4875-2 preview](https://cdn.standards.iteh.ai/samples/41855/84673929d39a4930b8a602f6b290496a/ISO-4875-2-2006.pdf)
- The Rikon wood guide states it is "Reprinted with permission from The Olson Saw Company… 2001", so third-party maker charts circulate under licence — [Rikon/Olson](https://info.highlandwoodworking.com/library/manuals/rikon/bandsaw_blade_selection_guide.pdf)
- Format notes from this session:
  - LENOX Guide: a 5.8 MB, 33-page PDF dated 8/2008. Prose and troubleshooting text extract cleanly; speed charts extract scrambled (graphic grids).
  - RÖNTGEN guide: a 3.5 MB PDF with text-extractable parameter tables keyed by DIN material number.
  - CLE/Greenfield: a 1-page PDF whose labels misalign with values.
  - WIKUS: HTML guidebook plus the ParaMaster® online tool (not harvestable).
  - Starrett: HTML product pages.

  Sources: [LENOX](https://cdn.mscdirect.com/global/media/pdf/search/lenox/lenox-guide-to-band-sawing.pdf); [RÖNTGEN](https://www.roentgen-saw.com/images/pdf/technical_guide.pdf); [CLE/Greenfield](https://shop.gfii.com/images/CLE_Speed_Feeds_Bi_Metal_Saw_Blades.pdf); [WIKUS](https://www.wikus.de/en/guidebook/practice-tips/breaking-in-information)
- Further catalogues located but not read: [WIKUS Catalogue EN (status 22.03.2026)](https://www.wikus.de/fileadmin/pdfs/WIKUS-Catalogue-EN.pdf); [WIKUS 2015 catalogue](https://www.rotem.ca/wp-content/uploads/2017/01/wikus-blades-831624.pdf); [WIKUS on DirectIndustry](https://pdf.directindustry.com/pdf/wikus-saegenfabrik-16362.html); [Bahco Metal Cutting](https://www.proes.si/documents/bacho/Bahco-Metal-Cutting-ingles%20OK.pdf); [Arntz 2014](https://productivity.com/wp-content/uploads/2015/04/Arntz-Bandsaw-Blade-Catalog.pdf); [Bahco DE selection help](https://www.bahco-werkzeuge.de/index.php?main_page=bandsaw_selection_help); [Starrett UK food catalogue](https://catalogues.starrett.co.uk/view/451234213)
- Academic: peer-reviewed work on band-saw coolant particles and guide clearances — [Materials 2026 (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC12897882/) (not read). Machinery's Handbook has metal-saw cutting-speed tables (28th ed., p. 1053, per forum reference; not verified) — [WeldingWeb thread](https://weldingweb.com/vbb/threads/31664-cutting-speed-calculation)

### Inferences
- Safe-usage policy for the assistant's knowledge base:
  - Store parameters as normalised facts in TestereStore's own schema and wording, with per-row source attribution (maker, document, year).
  - Merge and cross-check several makers instead of mirroring one maker's table one-to-one.
  - Do not embed maker PDFs, figures or verbatim troubleshooting text in RAG; paraphrase, and link out to the maker documents for detail.
  - Never present another maker's brand names (SAWCALC, ParaMaster, ARMOR, Meatkutter) as TestereStore products.
- Under US law, pure factual data is generally not copyrightable. The EU sui-generis database right can restrict extraction of a substantial part of a database, so wholesale copying of e.g. RÖNTGEN's material table into a commercial assistant should be cleared or avoided. This is my legal inference, not from a cited source; confirm with counsel (the user's to-do list already includes a lawyer).
- Priority for the assistant's "authoritative" tier:
  1. ISO 4875-2 for grammar and plausibility checks.
  2. LENOX and RÖNTGEN guides for parameters and troubleshooting.
  3. WIKUS for German/EU practice (tension, break-in, guide tolerances).
  4. Starrett for meat/food and band knives.
  5. Olson/Laguna for small wood saws.
  6. Wood-Mizer for sawmill bands.

  Vendor blogs (BandSawBlog, Lizensaw, SimCut) are secondary and should be labelled as such.

### Gaps
- Licence terms for individual maker PDFs (LENOX, RÖNTGEN, WIKUS) were not checked; none showed an explicit open licence.
- No openly licensed (CC-BY, etc.) band-saw parameter dataset was found.
