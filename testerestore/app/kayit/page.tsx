'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthShell from '../components/AuthShell';
import { useCustomer } from '../context/CustomerContext';
import { AlertCircle, Loader2, UserPlus, Mail, Lock, User, Phone, Sparkles } from 'lucide-react';

export default function KayitPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillEmail = searchParams?.get('email') || '';
  const nextPath = searchParams?.get('next') || '/hesabim';
  const { register, isAuthenticated, loading } = useCustomer();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState(prefillEmail);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && isAuthenticated) router.replace(nextPath);
  }, [loading, isAuthenticated, router, nextPath]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (password.length < 8) {
      setErr('Şifre en az 8 karakter olmalı.');
      return;
    }
    if (password !== confirm) {
      setErr('Şifreler eşleşmiyor.');
      return;
    }
    setSubmitting(true);
    try {
      await register({
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        phone: phone || undefined,
      });
      router.replace('/hesabim');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(
        msg.toLowerCase().includes('already')
          ? 'Bu e-posta adresi zaten kayıtlı. Giriş yapmayı deneyin.'
          : 'Kayıt başarısız. Lütfen tekrar deneyin.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Hesap Oluştur"
      subtitle="Hızlı ödeme, sipariş takibi ve özel teklifler için ücretsiz hesap."
      footer={
        <>
          Zaten hesabınız var mı?{' '}
          <Link href="/giris" className="font-bold text-accent hover:text-accent/80">
            Giriş yapın
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Checkout sonrası teşvik göster */}
        {prefillEmail && (
          <div className="flex items-start gap-2 p-3 rounded-lg border border-accent/40 bg-gradient-to-br from-accent/10 to-orange-500/5 text-xs">
            <Sparkles className="h-4 w-4 text-accent shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-foreground">
                Üyeliğinizi tamamlayın — sonraki siparişe %10 indirim
              </div>
              <div className="text-muted-foreground mt-0.5">
                Üyelik kodunu kayıt sonrası e-posta ile alacaksınız.
              </div>
            </div>
          </div>
        )}

        {err && (
          <div className="flex items-start gap-2 p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{err}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Ad
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full h-10 pl-9 pr-3 rounded-lg border border-border bg-background text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Soyad
            </label>
            <input
              type="text"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary focus:outline-none"
            />
          </div>
        </div>

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
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
            Telefon (opsiyonel)
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0 (5xx) xxx xx xx"
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-border bg-background text-sm focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
            Şifre
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="En az 8 karakter"
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-border bg-background text-sm focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
            Şifre Tekrar
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
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
            <><Loader2 className="h-4 w-4 animate-spin" /> Hesap oluşturuluyor...</>
          ) : (
            <><UserPlus className="h-4 w-4" /> Hesabı Oluştur</>
          )}
        </button>

        <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
          Hesap oluşturarak Kullanım Koşulları ve Gizlilik Politikası&apos;nı kabul etmiş olursunuz.
        </p>
      </form>
    </AuthShell>
  );
}
