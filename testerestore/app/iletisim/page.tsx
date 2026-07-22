import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';
import IletisimForm from './IletisimForm';
import { MapPin, Phone, Mail, Clock, MessageCircle, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'İletişim',
  description:
    'TestereStore ile iletişime geçin. Atölye adresimiz, telefon, e-posta ve özel kesim talep formu.',
};

const ACCENT = '#a4b402';

const CONTACT_ITEMS = [
  {
    icon: MapPin,
    title: 'Atölye Adresi',
    primary: 'İkitelli OSB, Başakşehir',
    secondary: 'İstanbul, Türkiye',
  },
  {
    icon: Phone,
    title: 'Telefon',
    primary: '+90 (212) 000 00 00',
    secondary: 'Hafta içi 09:00 – 18:00',
  },
  {
    icon: Mail,
    title: 'E-Posta',
    primary: 'info@testerestore.com',
    secondary: 'Teknik destek ve sipariş',
  },
  {
    icon: Clock,
    title: 'Çalışma Saatleri',
    primary: 'Pazartesi – Cumartesi',
    secondary: '09:00 – 18:00',
  },
];

export default function IletisimPage() {
  return (
    <>
      <Header />

      <main className="flex-1 py-12 md:py-20 bg-background">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          {/* Hero */}
          <div className="flex flex-col items-center text-center mb-14">
            <div className="flex items-center gap-3 mb-6">
              <span className="h-px w-10 sm:w-14" style={{ background: `linear-gradient(90deg, transparent, ${ACCENT}80)` }} />
              <span className="text-[10px] font-semibold tracking-[0.36em] uppercase" style={{ color: ACCENT }}>
                İletişim
              </span>
              <span className="h-px w-10 sm:w-14" style={{ background: `linear-gradient(90deg, ${ACCENT}80, transparent)` }} />
            </div>
            <h1 className="text-4xl md:text-[3.25rem] font-semibold tracking-[-0.035em] leading-[1.05] max-w-3xl mb-5">
              <span className="text-foreground">Bize </span>
              <span className="text-orange-grad">Ulaşın</span>
            </h1>
            <p className="text-[13px] md:text-[15px] text-muted-foreground max-w-2xl leading-relaxed font-light">
              Özel ölçü siparişleri, teklif talebi, teknik danışmanlık veya servis için aşağıdaki bilgilerden ya da forma yazarak bize ulaşabilirsiniz. Genellikle 1 iş günü içinde geri dönüş yapıyoruz.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            {/* Contact info */}
            <div className="lg:col-span-5 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {CONTACT_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className="rounded-2xl border border-border bg-metallic-card p-5 hover:border-accent/30 transition-colors"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent mb-3">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                        {item.title}
                      </h3>
                      <p className="text-sm font-bold text-foreground leading-snug">
                        {item.primary}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 leading-snug">
                        {item.secondary}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-2xl border border-accent/15 bg-gradient-to-b from-accent/5 to-accent/0 p-6 space-y-3 glow-orange">
                <div className="flex items-center gap-2 text-accent">
                  <MessageCircle className="h-4 w-4" />
                  <span className="text-[10px] font-semibold tracking-[0.32em] uppercase">
                    Acil Destek
                  </span>
                </div>
                <h3 className="text-base font-bold text-foreground">Atölyenizde sorun mu var?</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Hattımıza bağlanmadan önce şerit ölçünüzü ve makine modelinizi hazırlamanız servis süresini önemli ölçüde kısaltır.
                </p>
                <Link
                  href="/products/bimetal-premium"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:text-accent/80 transition-colors"
                >
                  <span>Parametrik hesaplayıcı</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* Form */}
            <div className="lg:col-span-7">
              <div className="rounded-3xl bg-metallic-card p-6 md:p-8 border border-border shadow-sm">
                <h2 className="text-xl font-extrabold tracking-tight mb-1">Hızlı Teklif / Mesaj</h2>
                <p className="text-xs text-muted-foreground mb-6">
                  Tüm zorunlu alanları doldurun; mümkün olan en kısa sürede dönüş yapacağız.
                </p>
                <IletisimForm />
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
