'use client';

import { useState } from 'react';
import { Send, CheckCircle2, RefreshCw, AlertTriangle } from 'lucide-react';
import { MEDUSA_BACKEND_URL, MEDUSA_PUBLISHABLE_KEY } from '../../lib/medusa/config';

export default function IletisimForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [topic, setTopic] = useState<'quote' | 'support' | 'partnership' | 'other'>('quote');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${MEDUSA_BACKEND_URL}/store/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-publishable-api-key': MEDUSA_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ name, email, phone, topic, message }),
      });
      if (!res.ok) throw new Error(`(${res.status})`);
      setSubmitted(true);
    } catch (err) {
      setError(
        'Mesajınız gönderilemedi. Lütfen tekrar deneyin veya doğrudan telefon/WhatsApp ile ulaşın.'
      );
      console.error('[contact] submit failed', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-10 space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h3 className="text-lg font-bold tracking-tight">Mesajınız alındı!</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          En kısa sürede geri dönüş yapacağız. Acil bir konu için doğrudan telefon ile arayabilirsiniz.
        </p>
        <button
          type="button"
          onClick={() => {
            setSubmitted(false);
            setName('');
            setEmail('');
            setPhone('');
            setMessage('');
            setTopic('quote');
          }}
          className="inline-flex items-center gap-2 text-xs font-bold text-accent hover:text-accent/80 transition-colors"
        >
          Yeni mesaj gönder
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
            Ad Soyad *
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none font-medium"
            placeholder="Adınız Soyadınız"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
            Telefon
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none font-medium"
            placeholder="0 (5xx) xxx xx xx"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
          E-Posta *
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none font-medium"
          placeholder="adsoyad@sirket.com"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-2">
          Konu *
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {([
            { id: 'quote', label: 'Fiyat Teklifi' },
            { id: 'support', label: 'Teknik Destek' },
            { id: 'partnership', label: 'İş Birliği' },
            { id: 'other', label: 'Diğer' },
          ] as const).map((opt) => {
            const isActive = topic === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTopic(opt.id)}
                className={`rounded-lg py-2.5 text-xs font-bold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'border-accent bg-accent/10 text-accent shadow-sm'
                    : 'bg-silver-grad'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
          Mesajınız *
        </label>
        <textarea
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none font-medium"
          placeholder="Şerit testere ihtiyacınız, ölçüleriniz, makine modeliniz veya talep ettiğiniz teknik destek hakkında bilgi verin..."
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-xs text-rose-700 dark:text-rose-400">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className={`w-full flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-bold text-white transition-all duration-300 shadow-md ${
          submitting
            ? 'bg-muted text-muted-foreground cursor-not-allowed'
            : 'bg-molten-grad glow-orange hover:shadow-lg cursor-pointer'
        }`}
      >
        {submitting ? (
          <>
            <RefreshCw className="h-4 w-4 animate-spin" /> Gönderiliyor...
          </>
        ) : (
          <>
            <Send className="h-4 w-4" /> Mesajı Gönder
          </>
        )}
      </button>
    </form>
  );
}
