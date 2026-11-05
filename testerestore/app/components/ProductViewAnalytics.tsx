"use client";

import { useEffect, useRef } from "react";
import { trackEvent } from "../../lib/analytics";
import { CONSENT_EVENT, getCookiePreferences } from "../../lib/cookie-consent";

export default function ProductViewAnalytics({ id, name }: { id: string; name: string }) {
  const sent = useRef<string | null>(null);
  useEffect(() => {
    const track = () => {
      const consent = getCookiePreferences();
      if ((!consent?.analytics && !consent?.marketing) || sent.current === id) return;
      trackEvent("view_item", { currency: "TRY", items: [{ item_id: id, item_name: name }] });
      sent.current = id;
    };
    track();
    window.addEventListener(CONSENT_EVENT, track);
    return () => window.removeEventListener(CONSENT_EVENT, track);
  }, [id, name]);
  return null;
}
