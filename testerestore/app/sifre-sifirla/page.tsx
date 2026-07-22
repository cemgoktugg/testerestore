'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthShell from '../components/AuthShell';
import { completePasswordReset } from '../../lib/medusa/services/auth';
import { Lock, Loader2, AlertCircle, CheckCircle2, KeyRound } from 'lucide-react';

export default function SifreSifirlaPage() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) setErr('Geçersiz veya eksik sıfırlama bağlantısı.');
  }, [token]);

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
      await completePasswordReset(token, password);
      setDone(true);
      setTimeout(() => router.replace('/giris'), 2000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(
        msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('expired')
          ? 'Bağlantı geçersiz veya süresi dolmuş. Yeni bir sıfırlama bağlantısı talep edin.'
          : 'Şifre güncellenemedi: ' + msg
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <AuthShell title="Şifreniz Güncellendi" subtitle="Giriş sayfasına yönlendiriliyorsunuz...">
        <div className="text-center py-4 space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <Link href="/giris" className="inline-flex h-10 items-center justify-center rounded-xl bg-molten-grad text-white text-xs font-bold px-6 glow-orange">
            Şimdi Giriş Yap
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Yeni Şifre Belirle"
      subtitle="Yeni şifrenizi girin. Şifreniz en az 8 karakter olmalı."
      footer={
        <Link href="/giris" className="font-bold text-accent hover:text-accent/80">
          Giriş sayfasına dön
        </Link>
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
            Yeni Şifre
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-border bg-background text-sm focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting || !token}
          className={`w-full h-11 inline-flex items-center justify-center gap-2 rounded-xl text-sm font-bold text-white transition-all ${
            submitting || !token
              ? 'bg-muted cursor-not-allowed'
              : 'bg-molten-grad glow-orange cursor-pointer'
          }`}
        >
          {submitting ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Güncelleniyor...</>
          ) : (
            <><KeyRound className="h-4 w-4" /> Şifreyi Güncelle</>
          )}
        </button>
      </form>
    </AuthShell>
  );
}
