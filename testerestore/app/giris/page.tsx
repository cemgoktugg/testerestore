'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthShell from '../components/AuthShell';
import { useCustomer } from '../context/CustomerContext';
import { AlertCircle, Loader2, LogIn, Mail, Lock } from 'lucide-react';

export default function GirisPage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/hesabim';
  const { login, isAuthenticated, loading } = useCustomer();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && isAuthenticated) router.replace(next);
  }, [loading, isAuthenticated, router, next]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSubmitting(true);
    try {
      await login({ email, password });
      router.replace(next);
    } catch (e) {
      setErr(
        e instanceof Error && e.message.toLowerCase().includes('unauthorized')
          ? 'E-posta veya şifre hatalı.'
          : 'Giriş başarısız. Lütfen tekrar deneyin.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Hesabınıza Giriş"
      subtitle="Siparişlerinizi takip etmek ve hızlı ödeme için giriş yapın."
      footer={
        <>
          Henüz hesabınız yok mu?{' '}
          <Link href="/kayit" className="font-bold text-accent hover:text-accent/80">
            Hesap oluşturun
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {err && (
          <div className="flex items-start gap-2 p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{err}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
            E-Posta
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="adsoyad@sirket.com"
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-border bg-background text-sm focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Şifre
            </label>
            <Link href="/sifremi-unuttum" className="text-[11px] font-semibold text-accent hover:text-accent/80">
              Şifremi unuttum
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-border bg-background text-sm focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className={`w-full h-11 inline-flex items-center justify-center gap-2 rounded-xl text-sm font-bold text-white transition-all ${
            submitting
              ? 'bg-muted cursor-not-allowed'
              : 'bg-molten-grad glow-orange cursor-pointer'
          }`}
        >
          {submitting ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Giriş yapılıyor...</>
          ) : (
            <><LogIn className="h-4 w-4" /> Giriş Yap</>
          )}
        </button>
      </form>
    </AuthShell>
  );
}
