import { newsletterLink, signNewsletterToken, verifyNewsletterToken } from "../newsletter-token";
const secret = "test-secret-with-at-least-32-characters";
const payload = { sub: "sub_a", nonce: "unique-consent", action: "confirm" as const, exp: 2000 };
describe("newsletter signed links", () => {
  test("places the token in a fragment rather than the server-visible query", () => {
    const previousSecret = process.env.COOKIE_SECRET;
    const previousUrl = process.env.STOREFRONT_URL;
    process.env.COOKIE_SECRET = secret;
    process.env.STOREFRONT_URL = "https://shop.example";
    try {
      const url = new URL(newsletterLink("confirm", "sub_a", "nonce_a"));
      expect(url.searchParams.has("token")).toBe(false);
      expect(new URLSearchParams(url.hash.slice(1)).get("token")).toBeTruthy();
      expect(url.searchParams.get("islem")).toBe("onay");
    } finally {
      if (previousSecret === undefined) delete process.env.COOKIE_SECRET; else process.env.COOKIE_SECRET = previousSecret;
      if (previousUrl === undefined) delete process.env.STOREFRONT_URL; else process.env.STOREFRONT_URL = previousUrl;
    }
  });
  test("accepts only an untampered unexpired token for the requested action", () => {
    const token = signNewsletterToken(payload, secret);
    expect(verifyNewsletterToken(token, "confirm", secret, 1000)?.sub).toBe("sub_a");
    expect(verifyNewsletterToken(token, "unsubscribe", secret, 1000)).toBeNull();
    expect(verifyNewsletterToken(token, "confirm", secret, 2000)).toBeNull();
    expect(verifyNewsletterToken(token, "confirm", "different-signing-secret", 1000)).toBeNull();
  });
  test("rejects token identity manipulation without a matching signature", () => {
    const token = signNewsletterToken(payload, secret);
    const forged = Buffer.from(JSON.stringify({ ...payload, sub: "sub_b" })).toString("base64url") + "." + token.split(".")[1];
    expect(verifyNewsletterToken(forged, "confirm", secret, 1000)).toBeNull();
    expect(verifyNewsletterToken("invalid", "confirm", secret, 1000)).toBeNull();
  });
});
