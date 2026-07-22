'use client';

import { useState } from 'react';
import Link from 'next/link';
import AuthShell from '../components/AuthShell';
import { requestPasswordReset } from '../../lib/medusa/services/auth';
import { Mail, Loader2, Send, CheckCircle2 } from 'lucide-react';

export default function SifremiUnuttumPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Medusa intentionally returns success regardless of whether the email
      // exists, to prevent account enumeration. We mirror that UX.
      await requestPasswordReset(email);
    } catch {
      /* swallow — same UX */
    } finally {
      setSubmitting(false);
      setSent(true);
    }
  }

  if (sent) {
    return (
      <AuthShell
        title="Posta Kutunuzu Kontrol Edin"
        footer={
          <Link href="/giris" className="font-bold text-accent hover:text-accent/80">
            Giriş sayfasına dön
          </Link>
        }
      >
        <div className="text-center space-y-4 py-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Eğer <strong className="text-foreground">{email}</strong> adresine kayıtlı bir hesabınız varsa,
            şifre sıfırlama bağlantısını gönderdik. Bağlantı 1 saat boyunca geçerli olacaktır.
          </p>
          <p className="text-xs text-muted-foreground">
            E-posta gelmediyse spam klasörünüzü kontrol edin.
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Şifremi Unuttum"
      subtitle="E-posta adresinizi girin, size şifre sıfırlama bağlantısı gönderelim."
      footer={
        <>
          Şifreniz aklınıza geldi mi?{' '}
          <Link href="/giris" className="font-bold text-accent hover:text-accent/80">
            Giriş yapın
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
            E-Posta
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="adsoyad@sirket.com"
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
            <><Loader2 className="h-4 w-4 animate-spin" /> Gönderiliyor...</>
          ) : (
            <><Send className="h-4 w-4" /> Sıfırlama Bağlantısı Gönder</>
          )}
        </button>
      </form>
    </AuthShell>
  );
}
