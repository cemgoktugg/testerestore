import Image from 'next/image';

/**
 * TestereStore logosu. Görselin kendi koyu zemini var (gümüş "Testere" yazısı açık
 * zeminde okunmaz), bu yüzden her iki temada da yuvarlak köşeli plaka olarak durur.
 * Yükseklik className ile verilir (örn. "h-9 sm:h-11"); genişlik orana göre gelir.
 */
export default function BrandLogo({
  className = '',
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/brand/logo.webp"
      alt="TestereStore — Kesimin Zirvesi"
      width={1024}
      height={253}
      sizes="(min-width: 640px) 300px, 180px"
      priority={priority}
      className={`w-auto rounded-lg shadow-sm ${className}`}
    />
  );
}
