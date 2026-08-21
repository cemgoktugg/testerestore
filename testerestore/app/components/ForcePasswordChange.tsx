'use client';

import React, { useEffect, useState } from 'react';
import { KeyRound, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useCustomer } from '../context/CustomerContext';
import { changeMyPassword, mustChangePassword } from '../../lib/medusa/services/auth';

/**
 * Geçici şifreyle açılan hesaplarda ilk girişte çıkan, kapatılamayan ekran.
 *
 * Danışman sohbetinden açılan hesaplara rastgele geçici şifre veriliyor ve
 * `customer.metadata.must_change_password` işaretleniyor
 * (bkz. backend src/api/store/advisor-signup/route.ts). Bu bileşen o bayrağı
 * görünce siteyi kilitler.
 *
 * DÜRÜSTLÜK NOTU: bu bir arayüz kapısı — API'yi doğrudan çağıran biri
 * geçici şifresiyle sipariş verebilir. Asıl koruma şifrenin yalnızca müşterinin
 * e-postasına gitmesi; bu ekran normal kullanıcıyı yönlendirir, saldırganı
 * durdurmaz. Sunucu tarafında engelleme gerekirse ayrıca yapılmalı.
 *
 * Çıkış yap seçeneği bilerek duruyor: kullanıcı ekranda kilitli kalmasın.
 */
export default function ForcePasswordChange() {
  const { customer, refresh, logout, pendingPassword, clearPendingPassword } =
    useCustomer();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const active = mustChangePassword(customer);

  // Girişte kullanılan şifreyi tekrar yazdırmayalım — bellekte tutuluyor,
  // hiçbir yere kaydedilmiyor (bkz. CustomerContext).
  useEffect(() => {
    if (active && pendingPassword) setCurrent(pendingPassword);
  }, [active, pendingPassword]);

  // Ekran açıkken arka plan kaymasın
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);

  if (!active) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (!current) {
      setErr('E-postayla gelen geçici şifrenizi girin.');
      return;
    }
    if (next.length < 8) {
      setErr('Yeni şifre en az 8 karakter olmalı.');
      return;
    }
    if (next !== confirm) {
      setErr('Yeni şifreler eşleşmiyor.');
      return;
    }
    if (next === current) {
      setErr('Yeni şifre geçici şifrenizden farklı olmalı.');
      return;
    }

    setBusy(true);
    const res = await changeMyPassword(current, next);
    setBusy(false);

    if (!res.ok) {
      setErr(res.message);
      return;
    }

    clearPendingPassword();
    setCurrent('');
    setNext('');
    setConfirm('');
    // Bayrak sunucuda silindi; müşteriyi tazeleyince ekran kapanır.
    await refresh();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="force-pw-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-2xl">
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <KeyRound className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 id="force-pw-title" className="text-base font-bold">
              Yeni şifrenizi belirleyin
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Hesabınız danışmanımız üzerinden oluşturuldu ve size geçici bir
              şifre gönderildi. Devam etmek için kendi şifrenizi belirleyin.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label
              htmlFor="force-pw-current"
              className="mb-1 block text-xs font-semibold text-muted-foreground"
            >
              Geçici şifreniz
            </label>
            <input
              id="force-pw-current"
              type={show ? 'text' : 'password'}
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
              disabled={busy}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary disabled:opacity-60"
            />
          </div>

          <div>
            <label
              htmlFor="force-pw-new"
              className="mb-1 block text-xs font-semibold text-muted-foreground"
            >
              Yeni şifre
            </label>
            <div className="relative">
              <input
                id="force-pw-new"
                type={show ? 'text' : 'password'}
                value={next}
                onChange={(e) => setNext(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                disabled={busy}
                placeholder="En az 8 karakter"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 pr-10 text-sm outline-none transition-colors focus:border-primary disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? 'Şifreyi gizle' : 'Şifreyi göster'}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
              >
                {show ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="force-pw-confirm"
              className="mb-1 block text-xs font-semibold text-muted-foreground"
            >
              Yeni şifre (tekrar)
            </label>
            <input
              id="force-pw-confirm"
              type={show ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              disabled={busy}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary disabled:opacity-60"
            />
          </div>

          {err && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{err}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition-opacity disabled:opacity-50 cursor-pointer"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {busy ? 'Güncelleniyor…' : 'Şifreyi Güncelle'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => void logout()}
          className="mt-3 w-full rounded-xl px-4 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
        >
          Şimdi değil, çıkış yap
        </button>
      </div>
    </div>
  );
}
