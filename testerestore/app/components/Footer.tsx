'use client';

import Link from 'next/link';
import {
  Hammer, ShieldCheck, Truck, RefreshCw, Mail, Phone, MapPin,
  Award, Sparkles, Zap, Settings, Package, type LucideIcon,
} from 'lucide-react';
import { useFooter } from '../../lib/medusa/hooks/useFooter';
import type {
  FooterFeature, FooterLinkGroup, FooterSettings,
} from '../../lib/medusa/services/footer';
import TrustSignals from './TrustSignals';
import NewsletterSignup from './NewsletterSignup';

/** Map an admin-selectable string to a lucide icon. Falls back to Truck. */
const ICONS: Record<string, LucideIcon> = {
  truck: Truck,
  shield: ShieldCheck,
  refresh: RefreshCw,
  award: Award,
  sparkles: Sparkles,
  zap: Zap,
  settings: Settings,
  package: Package,
  mail: Mail,
  phone: Phone,
  pin: MapPin,
};

const DEFAULT_FEATURES: FooterFeature[] = [
  { id: 'f1', icon: 'truck', title: 'Hızlı Kargo & Teslimat', description: 'Kaynaklı bıçaklar 24 saat içinde kargoya verilir.', sort_order: 0, is_active: true },
  { id: 'f2', icon: 'shield', title: 'Üstün Çelik Kalitesi', description: 'Alman ve İsveç menşeili premium çelik alaşımları.', sort_order: 1, is_active: true },
  { id: 'f3', icon: 'refresh', title: 'Birebir Kaynak Garantisi', description: 'Kaynak yerinden kırılmalarda koşulsuz değişim garantisi.', sort_order: 2, is_active: true },
];

const DEFAULT_LINK_GROUPS: FooterLinkGroup[] = [
  {
    id: 'lg1', sort_order: 0, is_active: true, title: 'Ürünler',
    links: [
      { label: 'Bi-Metal Şerit Testereler', href: '/#products' },
      { label: 'Karbür Şerit Testereler', href: '/#products' },
      { label: 'Ağaç Kesim Şeritleri', href: '/#products' },
      { label: 'Şerit Testere Makineleri', href: '/#products' },
    ],
  },
  {
    id: 'lg2', sort_order: 1, is_active: true, title: 'Hızlı Menü',
    links: [
      { label: 'Ana Sayfa', href: '/' },
      { label: 'Parametrik Hesaplayıcı', href: '/products/bimetal-premium' },
      { label: 'Sepetim', href: '/cart' },
      { label: 'Sipariş Sorgulama', href: '/checkout' },
    ],
  },
];

const DEFAULT_SETTINGS: FooterSettings = {
  id: 's1',
  company_description:
    "Türkiye'nin lider şerit testere ve şerit testere bıçağı satış platformu. Endüstriyel kesim ihtiyaçlarınız için yüksek hassasiyetli, dayanıklı ve özel boy kaynaklı çözümler sunuyoruz.",
  contact_phone: '+90 (212) 555 10 20',
  contact_email: 'destek@testerestore.com',
  contact_address:
    'İkitelli O.S.B. Metal İş Sanayi Sitesi, 14. Blok No: 45, Başakşehir / İstanbul',
  copyright_text: '© {year} Testere Store. Tüm hakları saklıdır.',
  legal_links: [
    { label: 'Kullanım Koşulları' },
    { label: 'Gizlilik Politikası' },
    { label: 'KVKK Aydınlatma Metni' },
  ],
};

export default function Footer() {
  const { data } = useFooter();

  const features = data?.features?.length ? data.features : DEFAULT_FEATURES;
  const linkGroups = data?.link_groups?.length ? data.link_groups : DEFAULT_LINK_GROUPS;
  const settings = data?.settings || DEFAULT_SETTINGS;

  const copyrightText = (settings.copyright_text || DEFAULT_SETTINGS.copyright_text || '')
    .replace('{year}', String(new Date().getFullYear()));

  return (
    <footer className="w-full border-t border-border bg-card text-foreground">
      {/* Trust signals */}
      <div className="border-b border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <TrustSignals variant="row" />
        </div>
      </div>

      {/* Features Bar */}
      <div className="border-b border-border bg-muted/30 py-8">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 sm:grid-cols-3 sm:px-6 lg:px-8 text-center">
          {features.slice(0, 6).map((f) => {
            const Icon = ICONS[f.icon] ?? Truck;
            return (
              <div key={f.id} className="flex flex-col items-center gap-2">
                <div className="rounded-full bg-accent/10 p-3 text-accent animate-pulse">
                  <Icon className="h-6 w-6" />
                </div>
                <h4 className="font-bold text-sm">{f.title}</h4>
                <p className="text-xs text-muted-foreground">{f.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* About */}
        <div className="space-y-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-molten-grad text-white">
              <Hammer className="h-4 w-4" />
            </div>
            <span className="text-lg font-black tracking-tight text-foreground">
              TESTERE<span className="text-accent font-bold">STORE</span>
            </span>
          </Link>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {settings.company_description}
          </p>
          {/* Newsletter (compact) */}
          <div className="pt-4 border-t border-border">
            <NewsletterSignup source="footer-form" compact />
          </div>
        </div>

        {/* Link Groups */}
        {linkGroups.slice(0, 2).map((group) => (
          <div key={group.id}>
            <h3 className="font-bold text-sm uppercase tracking-wider text-foreground mb-4">
              {group.title}
            </h3>
            <ul className="space-y-2 text-xs">
              {(group.links || []).map((l, i) => (
                <li key={i}>
                  <Link href={l.href} className="text-muted-foreground hover:text-primary">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* Contact Info */}
        <div>
          <h3 className="font-bold text-sm uppercase tracking-wider text-foreground mb-4">İletişim</h3>
          <ul className="space-y-3 text-xs text-muted-foreground">
            {settings.contact_phone && (
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-accent shrink-0" />
                <span>{settings.contact_phone}</span>
              </li>
            )}
            {settings.contact_email && (
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-accent shrink-0" />
                <span>{settings.contact_email}</span>
              </li>
            )}
            {settings.contact_address && (
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                <span>{settings.contact_address}</span>
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-border py-6 bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <span>{copyrightText}</span>
          <div className="flex gap-4">
            {(settings.legal_links || []).map((l, i) =>
              l.href ? (
                <Link key={i} href={l.href} className="hover:text-foreground">
                  {l.label}
                </Link>
              ) : (
                <span key={i} className="hover:text-foreground cursor-pointer">
                  {l.label}
                </span>
              )
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
