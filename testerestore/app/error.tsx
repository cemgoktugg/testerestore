'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';

/**
 * Route-segment hata sınırı. Bu dosya olmadan bir render hatasında kullanıcı
 * ham Next.js hata ekranını (prod'da beyaz sayfa) görür. Burada markalı,
 * kurtarılabilir bir ekran sunuyoruz.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Sunucu hataları instrumentation.onRequestError ile Sentry'e gider;
    // burada client tarafı için konsola düşürüyoruz.
    console.error('[route-error]', error);
  }, [error]);

  return (
    <main className="flex-1 min-h-[70vh] flex items-center justify-center bg-background px-4">
      <div className="max-w-md text-center space-y-5">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 text-rose-500">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Bir şeyler ters gitti
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Beklenmeyen bir hata oluştu. Tekrar deneyebilir ya da ana sayfaya
          dönebilirsiniz. Sorun sürerse bizimle iletişime geçin.
        </p>
        {error.digest && (
          <p className="text-[11px] text-muted-foreground/70 font-mono">
            Hata kodu: {error.digest}
          </p>
        )}
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-xl bg-molten-grad px-5 py-2.5 text-sm font-bold text-white glow-orange cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" /> Tekrar Dene
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-bold text-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Ana Sayfa
          </Link>
        </div>
      </div>
    </main>
  );
}
