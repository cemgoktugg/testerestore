import { normalizeToothPitch, splitToothPitches } from "../tooth-pitch";

describe("splitToothPitches", () => {
  it.each([
    ["6/10 , 8/12", ["6/10", "8/12"]],
    ["6/10,8/12", ["6/10", "8/12"]],
    ["6/10, 8/12", ["6/10", "8/12"]],
    ["6/10 8/12", ["6/10", "8/12"]],
    ["6/10; 8/12 | 5/8", ["6/10", "8/12", "5/8"]],
    ["4/6 ve 3/4", ["4/6", "3/4"]],
    ["1,4/2", ["1.4/2"]],
    ["1.4/2", ["1.4/2"]],
    ["1,4/2, 2/3", ["1.4/2", "2/3"]],
    ["1,4/2,2/3", ["1.4/2", "2/3"]],
    ["1,4/1,8", ["1.4/1.8"]],
    ["0,75/1,25, 1,4/2", ["0.75/1.25", "1.4/2"]],
    ["0.85/1.15", ["0.85/1.15"]],
    ["1,1/1,6", ["1.1/1.6"]],
    ["14", ["14"]],
    ["14,18", ["14", "18"]],
    ["10/14", ["10/14"]],
    ["10/6", ["6/10"]],
    ["6 / 10", ["6/10"]],
    ["4/6 TPI", ["4/6"]],
    ["6/10, 6/10", ["6/10"]],
  ])("%s → %j", (raw, expected) => {
    const r = splitToothPitches(raw);
    expect(r.pitches).toEqual(expected);
    expect(r.invalid).toEqual([]);
  });

  it("boş giriş", () => {
    expect(splitToothPitches("")).toEqual({ pitches: [], invalid: [] });
    expect(splitToothPitches(null)).toEqual({ pitches: [], invalid: [] });
    expect(splitToothPitches("   ")).toEqual({ pitches: [], invalid: [] });
  });

  it.each(["abc", "6/10x", "3.5", "6-10", "4/6 kaba"])("tanınmayan kısım reddedilir: %s", (raw) => {
    expect(splitToothPitches(raw).invalid.length).toBeGreaterThan(0);
  });
});

describe("normalizeToothPitch", () => {
  it("tek diş", () => {
    expect(normalizeToothPitch("1,4 / 2")).toBe("1.4/2");
    expect(normalizeToothPitch("8")).toBe("8");
  });
  it("birden fazla ya da geçersizse null", () => {
    expect(normalizeToothPitch("6/10, 8/12")).toBeNull();
    expect(normalizeToothPitch("abc")).toBeNull();
  });
});
