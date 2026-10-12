'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

/**
 * Sayfanın ilk yüklemesinde gerekmeyen ağır bileşenler (sohbet danışmanı,
 * zorunlu şifre değişikliği uyarısı) tarayıcı boşa çıkınca yüklenir. Eskiden
 * kök layout'a statik import edildikleri için her sayfada ilk JS paketine
 * giriyor, mobilde ana iş parçacığını 300–800 ms bloke ediyordu (TBT).
 */
const AdvisorWidget = dynamic(() => import('./AdvisorWidget'), { ssr: false });
const ForcePasswordChange = dynamic(() => import('./ForcePasswordChange'), { ssr: false });

export default function DeferredWidgets() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => setReady(true), { timeout: 4000 });
      return () => w.cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(() => setReady(true), 2500);
    return () => window.clearTimeout(t);
  }, []);

  if (!ready) return null;
  return (
    <>
      <AdvisorWidget />
      <ForcePasswordChange />
    </>
  );
}
