import { POST } from "../route";
import { PATCH } from "../[id]/route";

/** Bellekte fiyat matrisi servisi (listBladePrices / create / update / retrieve). */
function fakeService(seed: any[] = []) {
  const rows = seed.map((r, i) => ({ id: r.id ?? `bp_${i}`, ...r }));
  let n = rows.length;
  return {
    rows,
    async listBladePrices(filter: any = {}) {
      return rows.filter((r) => Object.entries(filter).every(([k, v]) => (r as any)[k] === v));
    },
    async retrieveBladePrice(id: string) {
      const r = rows.find((x) => x.id === id);
      if (!r) throw new Error("not found");
      return r;
    },
    async createBladePrices(data: any[]) {
      const made = data.map((d) => ({ id: `bp_${n++}`, ...d }));
      rows.push(...made);
      return made;
    },
    async updateBladePrices(data: any[]) {
      return data.map((d) => {
        const r = rows.find((x) => x.id === d.id)!;
        Object.assign(r, d);
        return r;
      });
    },
  };
}

function call(handler: any, service: any, body: any, params: any = {}) {
  const out: { status: number; body: any } = { status: 200, body: null };
  const res = {
    status(c: number) { out.status = c; return res; },
    json(b: any) { out.body = b; return res; },
  };
  return handler({ body, params, scope: { resolve: () => service } }, res).then(() => out);
}

const base = {
  blade_type: "bi-metal", width_mm: 10, thickness_mm: 0.6,
  price_per_meter: 120, welding_fee: 40, currency_code: "try", is_active: true,
};

describe("POST /admin/blade-prices", () => {
  it("'6/10 , 8/12' iki ayrı satır olur", async () => {
    const s = fakeService();
    const r = await call(POST, s, { ...base, tooth_pitch: "6/10 , 8/12" });
    expect(r.status).toBe(201);
    expect(s.rows.map((x) => x.tooth_pitch)).toEqual(["6/10", "8/12"]);
    expect(s.rows.every((x) => x.price_per_meter === 120 && x.width_mm === 10)).toBe(true);
    expect(r.body.blade_prices).toHaveLength(2);
  });

  it("ondalık virgül tek diştir ve nokta yazımına çevrilir", async () => {
    const s = fakeService();
    await call(POST, s, { ...base, tooth_pitch: "1,4/2" });
    expect(s.rows.map((x) => x.tooth_pitch)).toEqual(["1.4/2"]);
  });

  it("var olan diş atlanır, yalnız yenisi eklenir", async () => {
    const s = fakeService([{ ...base, width_mm: "10", thickness_mm: "0.6", tooth_pitch: "6/10" }]);
    const r = await call(POST, s, { ...base, tooth_pitch: "6/10, 8/12" });
    expect(r.status).toBe(201);
    expect(r.body.skipped).toEqual(["6/10"]);
    expect(s.rows.map((x) => x.tooth_pitch)).toEqual(["6/10", "8/12"]);
  });

  it("hepsi varsa 409", async () => {
    const s = fakeService([{ ...base, tooth_pitch: "6/10" }]);
    const r = await call(POST, s, { ...base, tooth_pitch: "6/10" });
    expect(r.status).toBe(409);
    expect(s.rows).toHaveLength(1);
  });

  it("anlaşılmayan diş girişi 400 ve Türkçe açıklama", async () => {
    const s = fakeService();
    const r = await call(POST, s, { ...base, tooth_pitch: "6-10" });
    expect(r.status).toBe(400);
    expect(r.body.message).toMatch(/virgülle ayırın/);
    expect(s.rows).toHaveLength(0);
  });

  it("dişsiz (boş) satır eskisi gibi", async () => {
    const s = fakeService();
    const r = await call(POST, s, { ...base, blade_type: "woodcut", tooth_pitch: null });
    expect(r.status).toBe(201);
    expect(s.rows[0].tooth_pitch).toBeNull();
  });
});

describe("PATCH /admin/blade-prices/:id", () => {
  it("eski birleşik değer kaydedilince bölünür", async () => {
    const s = fakeService([{ id: "bp_x", ...base, tooth_pitch: "6/10 , 8/12" }]);
    const r = await call(PATCH, s, { tooth_pitch: "6/10 , 8/12" }, { id: "bp_x" });
    expect(r.status).toBe(200);
    expect(s.rows.find((x) => x.id === "bp_x")!.tooth_pitch).toBe("6/10");
    expect(s.rows.map((x) => x.tooth_pitch).sort()).toEqual(["6/10", "8/12"]);
    const added = s.rows.find((x) => x.id !== "bp_x")!;
    expect(added.price_per_meter).toBe(120);
    expect(added.welding_fee).toBe(40);
    expect(r.body.created).toHaveLength(1);
  });

  it("başka satırda olan dişe çekilemez (409)", async () => {
    const s = fakeService([
      { id: "bp_a", ...base, tooth_pitch: "6/10" },
      { id: "bp_b", ...base, tooth_pitch: "8/12" },
    ]);
    const r = await call(PATCH, s, { tooth_pitch: "6/10" }, { id: "bp_b" });
    expect(r.status).toBe(409);
    expect(s.rows.find((x) => x.id === "bp_b")!.tooth_pitch).toBe("8/12");
  });

  it("yalnız fiyat değişince diş korunur", async () => {
    const s = fakeService([{ id: "bp_a", ...base, tooth_pitch: "6/10" }]);
    const r = await call(PATCH, s, { price_per_meter: 150 }, { id: "bp_a" });
    expect(r.status).toBe(200);
    expect(s.rows[0]).toMatchObject({ tooth_pitch: "6/10", price_per_meter: 150 });
  });
});
