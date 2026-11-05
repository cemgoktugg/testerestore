import { getCookiePreferences } from "./cookie-consent";

type AnalyticsWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  fbq?: (...args: unknown[]) => void;
  ym?: (...args: unknown[]) => void;
};

/** Email action pages can contain bearer tokens; do not load or dispatch trackers. */
export function isSensitiveAnalyticsPath(pathname: string) {
  return /^\/(bulten|sepeti-kurtar|sifre-sifirla)(\/|$)/.test(pathname);
}

export function analyticsIds() {
  const gtm = process.env.NEXT_PUBLIC_GTM_ID || "";
  const ga4 = process.env.NEXT_PUBLIC_GA_ID || "";
  const meta = process.env.NEXT_PUBLIC_META_PIXEL_ID || "";
  const yandex = process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID || "";
  return {
    gtm: /^GTM-[A-Z0-9]+$/.test(gtm) ? gtm : "",
    ga4: /^G-[A-Z0-9]+$/.test(ga4) ? ga4 : "",
    meta: /^\d+$/.test(meta) ? meta : "",
    yandex: /^\d+$/.test(yandex) ? yandex : "",
  };
}

/** Call only after a successful action. Never include addresses or contact details. */
export function trackEvent(name: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  if (isSensitiveAnalyticsPath(window.location?.pathname || "")) return;
  const consent = getCookiePreferences();
  if (!consent) return;
  const w = window as AnalyticsWindow;
  const ids = analyticsIds();
  // An arbitrary GTM container may contain advertising tags: require both grants.
  const useGtm = !!ids.gtm && consent.analytics && consent.marketing;
  if (useGtm) {
    w.dataLayer ??= [];
    w.dataLayer.push({ event: name, ...params });
  } else if (consent.analytics && ids.ga4) {
    w.dataLayer ??= [];
    // Google's queue protocol uses an Arguments object, not an event array.
    // eslint-disable-next-line prefer-rest-params
    w.gtag ??= function () { w.dataLayer!.push(arguments); };
    w.gtag("event", name, params);
  }
  if (consent.marketing && ids.meta && w.fbq) {
    const map: Record<string, string> = { view_item: "ViewContent", add_to_cart: "AddToCart", search: "Search", sign_up: "CompleteRegistration", generate_lead: "Lead" };
    if (map[name]) w.fbq("track", map[name], params);
  }
  if (consent.analytics && ids.yandex && w.ym) w.ym(Number(ids.yandex), "reachGoal", name, params);
}
