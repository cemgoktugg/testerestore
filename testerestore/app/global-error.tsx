'use client';

import { useEffect } from 'react';

/**
 * Kök layout'ta (app/layout.tsx) oluşan hataları yakalar. error.tsx bunları
 * yakalayamaz çünkü layout'un kendisi patlamıştır; bu yüzden global-error
 * KENDİ <html>/<body>'sini render etmek zorundadır.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[global-error]', error);
  }, [error]);

  return (
    <html lang="tr">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0b0e13',
          color: '#e4e4e7',
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
          padding: '1rem',
        }}
      >
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>
            Beklenmeyen bir hata oluştu
          </h1>
          <p style={{ fontSize: 14, color: '#a1a1aa', lineHeight: 1.6, marginBottom: 20 }}>
            Sayfayı yüklerken bir sorunla karşılaştık. Lütfen tekrar deneyin.
          </p>
          <button
            onClick={reset}
            style={{
              cursor: 'pointer',
              border: 'none',
              borderRadius: 12,
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 700,
              color: '#fff',
              background: 'linear-gradient(135deg, #f97316, #ea580c)',
            }}
          >
            Tekrar Dene
          </button>
        </div>
      </body>
    </html>
  );
}
