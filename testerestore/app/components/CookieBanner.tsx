"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Cookie, X } from "lucide-react";
import { clearTrackingCookies, getCookiePreferences, OPEN_CONSENT_EVENT, saveCookiePreferences } from "../../lib/cookie-consent";

export { getCookiePreferences } from "../../lib/cookie-consent";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!getCookiePreferences()) setVisible(true);
    }, 600);
    const open = () => {
      const previous = getCookiePreferences();
      trigger.current = document.activeElement as HTMLElement | null;
      setAnalytics(previous?.analytics ?? false);
      setMarketing(previous?.marketing ?? false);
      setExpanded(true);
      setVisible(true);
    };
    window.addEventListener(OPEN_CONSENT_EVENT, open);
    return () => { clearTimeout(timer); window.removeEventListener(OPEN_CONSENT_EVENT, open); };
  }, []);

  useEffect(() => {
    if (visible && expanded) panel.current?.focus();
  }, [visible, expanded]);

  const close = () => {
    setVisible(false);
    trigger.current?.focus();
  };

  const persist = (allowAnalytics: boolean, allowMarketing: boolean) => {
    const previous = getCookiePreferences();
    saveCookiePreferences(allowAnalytics, allowMarketing);
    close();
    // A reload also unloads already running vendor scripts after withdrawal.
    if ((previous?.analytics && !allowAnalytics) || (previous?.marketing && !allowMarketing)) {
      clearTrackingCookies();
      window.location.reload();
    }
  };

  if (!visible) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-[130] p-3 sm:p-4">
      <div ref={panel} tabIndex={-1} role="dialog" aria-labelledby="cookie-title" aria-describedby="cookie-description"
        onKeyDown={(event) => { if (event.key === "Escape" && getCookiePreferences()) close(); }}
        className="mx-auto max-w-5xl max-h-[85dvh] overflow-y-auto rounded-2xl border border-border bg-background shadow-2xl p-4 sm:p-5 focus:outline-none">
        <div className="flex items-start gap-3">
          <Cookie className="h-6 w-6 shrink-0 text-accent" aria-hidden="true" />
          <div className="flex-1 space-y-2">
            <h2 id="cookie-title" className="font-bold">Çerez Tercihleri</h2>
            <p id="cookie-description" className="text-xs sm:text-sm text-muted-foreground">
              Zorunlu çerezler sepetiniz ve oturumunuz için kullanılır. Analitik ve pazarlama çerezleri tercihinize bağlıdır.
              Tercihlerinizi sayfanın altındaki “Çerez tercihleri” bağlantısından değiştirebilirsiniz.{" "}
              <Link href="/yasal/cerez-politikasi" className="text-accent underline">Çerez Politikası</Link>
            </p>
          </div>
          {getCookiePreferences() && <button type="button" onClick={close} aria-label="Çerez tercihlerini kapat" className="p-2 rounded-lg hover:bg-muted"><X className="h-5 w-5" /></button>}
        </div>
        {expanded && <div className="my-4 space-y-3 text-sm border-y border-border py-4">
          <label className="flex items-center gap-3"><input type="checkbox" checked disabled /> Zorunlu — her zaman etkin</label>
          <label className="flex items-start gap-3"><input type="checkbox" checked={analytics} onChange={e => setAnalytics(e.target.checked)} className="mt-1 h-4 w-4" /><span>Analitik <span className="block text-xs text-muted-foreground">Site kullanımını ve alışveriş deneyimini anlamamıza yardımcı olur.</span></span></label>
          <label className="flex items-start gap-3"><input type="checkbox" checked={marketing} onChange={e => setMarketing(e.target.checked)} className="mt-1 h-4 w-4" /><span>Pazarlama <span className="block text-xs text-muted-foreground">Reklamların etkisini ölçmek ve kişiselleştirmek için kullanılır.</span></span></label>
        </div>}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => persist(false, false)} className="min-h-11 flex-1 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-muted">Sadece zorunlu</button>
          <button type="button" onClick={() => expanded ? persist(analytics, marketing) : setExpanded(true)} className="min-h-11 flex-1 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-muted">{expanded ? "Seçimlerimi kaydet" : "Tercihleri düzenle"}</button>
          <button type="button" onClick={() => persist(true, true)} className="min-h-11 flex-1 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-muted">Tümünü kabul et</button>
        </div>
      </div>
    </div>
  );
}
