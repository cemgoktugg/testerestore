import Image from 'next/image';

/**
 * TestereStore logosu. Açık temada beyaz zeminli logo (mix-blend-multiply ile beyaz
 * zemin sayfa rengine karışır), koyu temada aynı logonun koyu zeminli sürümü plaka
 * olarak durur. Geçiş globals.css'teki .dark sınıfına bağlı: Tailwind'in dark: varyantı
 * bu projede tema düğmesini değil işletim sistemi ayarını izliyor.
 * Yükseklik className ile verilir (örn. "h-9 sm:h-11").
 */
export default function BrandLogo({
  className = '',
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  const common = {
    alt: 'TestereStore — Kesimin Zirvesi',
    width: 1024,
    height: 265,
    sizes: '(min-width: 640px) 300px, 180px',
    priority,
  };
  return (
    <>
      <Image {...common} src="/brand/logo.webp" className={`brand-logo-light w-auto mix-blend-multiply ${className}`} />
      <Image
        {...common}
        src="/brand/logo-dark.webp"
        className={`brand-logo-dark w-auto rounded-lg shadow-sm ${className}`}
      />
    </>
  );
}
