"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CONSENT_EVENT, CONSENT_KEY, getCookiePreferences } from "../../lib/cookie-consent";
import { analyticsIds, isSensitiveAnalyticsPath } from "../../lib/analytics";
export { trackEvent } from "../../lib/analytics";

/** Load optional vendors only for the categories selected by the customer. */
export default function Analytics() {
  const pathname = usePathname();
  const [consent, setConsent] = useState<ReturnType<typeof getCookiePreferences>>(null);

  useEffect(() => {
    setConsent(getCookiePreferences());
    const onChange = () => setConsent(getCookiePreferences());
    const onStorage = (e: StorageEvent) => { if (e.key === CONSENT_KEY) window.location.reload(); };
    window.addEventListener(CONSENT_EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => { window.removeEventListener(CONSENT_EVENT, onChange); window.removeEventListener("storage", onStorage); };
  }, []);

  if (!consent || isSensitiveAnalyticsPath(pathname)) return null;

  const { gtm: gtmId, ga4: ga4Id, meta: metaId, yandex: ymId } = analyticsIds();
  const useGtm = !!gtmId && consent.analytics && consent.marketing;

  return (
    <>
      {/* Google Tag Manager — varsa diğer Google scriptlerini buradan yönetin */}
      {useGtm && (
        <Script id="gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${gtmId}');`}
        </Script>
      )}

      {/* Google Analytics 4 (GTM yoksa direkt) */}
      {consent.analytics && ga4Id && !useGtm && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`}
            strategy="afterInteractive"
          />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('consent', 'default', {analytics_storage:'granted',ad_storage:'${consent.marketing ? "granted" : "denied"}',ad_user_data:'${consent.marketing ? "granted" : "denied"}',ad_personalization:'${consent.marketing ? "granted" : "denied"}'});
              gtag('js', new Date());
              gtag('config', '${ga4Id}', { anonymize_ip: true });`}
          </Script>
        </>
      )}

      {/* Meta (Facebook) Pixel */}
      {consent.marketing && metaId && (
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
      {consent.analytics && ymId && (
        <Script id="yandex-metrika" strategy="afterInteractive">
          {`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
            m[i].l=1*new Date();
            for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
            k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
            (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
            ym(${ymId}, "init", {clickmap:true, trackLinks:true, accurateTrackBounce:true, webvisor:false});`}
        </Script>
      )}

      {/* GTM noscript fallback */}
      {useGtm && (
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
