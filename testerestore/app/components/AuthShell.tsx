import Link from 'next/link';
import BrandLogo from './BrandLogo';

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/**
 * Centered card layout for /giris, /kayit, /sifremi-unuttum, /sifre-sifirla.
 * Reuses the storefront premium look without the full Header/Footer.
 */
export default function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <main className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Link href="/" className="flex justify-center mb-8" aria-label="TestereStore ana sayfa">
            <BrandLogo priority className="h-14 sm:h-16" />
          </Link>

          <div className="rounded-3xl bg-metallic-card border border-border p-8 shadow-xl">
            <div className="mb-6 text-center space-y-2">
              <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
              {subtitle && (
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>

            {children}
          </div>

          {footer && (
            <div className="mt-6 text-center text-sm text-muted-foreground">
              {footer}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
