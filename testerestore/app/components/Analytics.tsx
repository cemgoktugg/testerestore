"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { getCookieConsent } from "./CookieBanner";

/**
 * Tüm analitik script'lerini koşullu yükler.
 *
 *   - GTM (varsa) → en kapsayıcı seçenek
 *   - GA4 (NEXT_PUBLIC_GA_ID)
 *   - Meta Pixel (NEXT_PUBLIC_META_PIXEL_ID)
 *   - Yandex Metrika (NEXT_PUBLIC_YANDEX_METRIKA_ID)
 *
 * Çerez tercihi:
 *   - "accepted" → analitik + reklam scriptleri yüklenir
 *   - "necessary" → hiçbiri yüklenmez
 *   - null (henüz seçim yok) → bekle
 *
 * Kullanıcı tercihini değiştirirse `cookie-consent-changed` event'i ile
 * sayfa yenilemeden script'ler aktive olur.
 */
export default function Analytics() {
  const [consent, setConsent] = useState<ReturnType<typeof getCookieConsent>>(null);

  useEffect(() => {
    setConsent(getCookieConsent());
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent).detail as "accepted" | "necessary";
      setConsent(detail);
    };
    window.addEventListener("cookie-consent-changed", onChange);
    return () =>
      window.removeEventListener("cookie-consent-changed", onChange);
  }, []);

  if (consent !== "accepted") return null;

  const gtmId = process.env.NEXT_PUBLIC_GTM_ID;
  const ga4Id = process.env.NEXT_PUBLIC_GA_ID;
  const metaId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const ymId = process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID;

  return (
    <>
      {/* Google Tag Manager — varsa diğer Google scriptlerini buradan yönetin */}
      {gtmId && (
        <Script id="gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${gtmId}');`}
        </Script>
      )}

      {/* Google Analytics 4 (GTM yoksa direkt) */}
      {ga4Id && !gtmId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`}
            strategy="afterInteractive"
          />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${ga4Id}', { anonymize_ip: true });`}
          </Script>
        </>
      )}

      {/* Meta (Facebook) Pixel */}
      {metaId && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
            n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
            document,'script','https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${metaId}');
            fbq('track', 'PageView');`}
        </Script>
      )}

      {/* Yandex Metrika */}
      {ymId && (
        <Script id="yandex-metrika" strategy="afterInteractive">
          {`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
            m[i].l=1*new Date();
            for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
            k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
            (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
            ym(${ymId}, "init", {clickmap:true, trackLinks:true, accurateTrackBounce:true, webvisor:true});`}
        </Script>
      )}

      {/* GTM noscript fallback */}
      {gtmId && (
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
      )}
    </>
  );
}

/**
 * Helper — herhangi bir yerden event göndermek için:
 *   import { trackEvent } from '@/app/components/Analytics';
 *   trackEvent('add_to_cart', { value: 1234, currency: 'TRY' });
 */
type WindowWithAnalytics = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  fbq?: (...args: unknown[]) => void;
  ym?: (...args: unknown[]) => void;
};

export function trackEvent(
  name: string,
  params: Record<string, unknown> = {}
) {
  if (typeof window === "undefined") return;
  const w = window as WindowWithAnalytics;
  // GTM
  if (w.dataLayer) {
    w.dataLayer.push({ event: name, ...params });
  }
  // GA4 direct
  if (w.gtag) {
    w.gtag("event", name, params);
  }
  // Meta Pixel
  if (w.fbq) {
    // GA4 → Meta event mapping (kabaca)
    const map: Record<string, string> = {
      view_item: "ViewContent",
      add_to_cart: "AddToCart",
      begin_checkout: "InitiateCheckout",
      purchase: "Purchase",
      search: "Search",
      sign_up: "CompleteRegistration",
    };
    const mapped = map[name];
    if (mapped) w.fbq("track", mapped, params);
  }
  // Yandex
  const ymId = process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID;
  if (w.ym && ymId) {
    w.ym(Number(ymId), "reachGoal", name, params);
  }
}
