'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useCustomer } from '../context/CustomerContext';
import {
  listMyOrders,
  updateCustomer,
  listAddresses,
  createAddress,
  deleteAddress,
  type StoreCustomerAddress,
  type AddressInput,
} from '../../lib/medusa/services/auth';
import type { HttpTypes } from '@medusajs/types';
import { formatMoney } from '../../lib/medusa/format';
import { getOrderStatus } from '../../lib/order-status';
import {
  Loader2, User, MapPin, Package, LogOut, Plus, Trash2, Save,
  CheckCircle2, AlertCircle, Calendar, ArrowRight, Heart, Award,
} from 'lucide-react';

type Tab = 'profile' | 'addresses' | 'orders';

export default function HesabimPage() {
  const router = useRouter();
  const { customer, loading, isAuthenticated, logout, refresh } = useCustomer();
  const [tab, setTab] = useState<Tab>('profile');

  useEffect(() => {
    if (!loading && !isAuthenticated) router.replace('/giris?next=/hesabim');
  }, [loading, isAuthenticated, router]);

  if (loading || !customer) {
    return (
      <>
        <Header />
        <main className="flex-1 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="flex-1 bg-background py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <header className="mb-8 pb-6 border-b border-border">
            <p className="text-[10px] font-bold tracking-[0.32em] uppercase text-accent mb-2">
              Hesabım
            </p>
            <h1 className="text-3xl font-extrabold tracking-tight">
              Merhaba, {customer.first_name || customer.email}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Bilgilerinizi, adreslerinizi ve sipariş geçmişinizi yönetin.
            </p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Sidebar */}
            <aside className="lg:col-span-3 space-y-2">
              <TabButton current={tab} value="profile" onClick={setTab} icon={User}>
                Profil Bilgilerim
              </TabButton>
              <TabButton current={tab} value="addresses" onClick={setTab} icon={MapPin}>
                Adreslerim
              </TabButton>
              <TabButton current={tab} value="orders" onClick={setTab} icon={Package}>
                Siparişlerim
              </TabButton>
              <Link
                href="/hesabim/favoriler"
                className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Heart className="h-4 w-4" />
                Favorilerim
              </Link>
              <Link
                href="/hesabim/puanlarim"
                className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Award className="h-4 w-4" />
                Puanlarım
              </Link>
              <button
                onClick={async () => {
                  await logout();
                  router.replace('/');
                }}
                className="w-full mt-4 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                Çıkış Yap
              </button>
            </aside>

            {/* Content */}
            <section className="lg:col-span-9">
              {tab === 'profile' && <ProfileTab onSaved={refresh} />}
              {tab === 'addresses' && <AddressesTab />}
              {tab === 'orders' && <OrdersTab />}
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function TabButton({
  current, value, onClick, icon: Icon, children,
}: {
  current: Tab; value: Tab; onClick: (v: Tab) => void;
  icon: React.ComponentType<{ className?: string }>; children: React.ReactNode;
}) {
  const active = current === value;
  return (
    <button
      onClick={() => onClick(value)}
      className={`w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
        active
          ? 'bg-accent/10 text-accent border border-accent/20'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
      }`}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}

// ============== Profile ==============

function ProfileTab({ onSaved }: { onSaved: () => Promise<void> }) {
  const { customer } = useCustomer();
  const [firstName, setFirstName] = useState(customer?.first_name || '');
  const [lastName, setLastName] = useState(customer?.last_name || '');
  const [phone, setPhone] = useState(customer?.phone || '');
  const [company, setCompany] = useState(customer?.company_name || '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      await updateCustomer({
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
        company_name: company || null,
      });
      await onSaved();
      setMsg({ kind: 'ok', text: 'Bilgileriniz güncellendi.' });
    } catch (e) {
      setMsg({ kind: 'err', text: 'Güncelleme başarısız: ' + (e instanceof Error ? e.message : '') });
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 3500);
    }
  }

  return (
    <div className="rounded-3xl bg-metallic-card border border-border p-6 md:p-8">
      <h2 className="text-lg font-extrabold tracking-tight mb-1">Profil Bilgileri</h2>
      <p className="text-sm text-muted-foreground mb-6">
        E-posta adresinizi değiştirmek için lütfen destek ekibimizle iletişime geçin.
      </p>

      {msg && (
        <div
          className={`mb-4 flex items-start gap-2 p-3 rounded-lg text-xs ${
            msg.kind === 'ok'
              ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : 'border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300'
          }`}
        >
          {msg.kind === 'ok' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          {msg.text}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
            E-Posta
          </label>
          <input
            type="email"
            value={customer?.email || ''}
            disabled
            className="w-full h-10 px-3 rounded-lg border border-border bg-muted text-sm cursor-not-allowed"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FieldInput label="Ad" value={firstName} onChange={setFirstName} required />
          <FieldInput label="Soyad" value={lastName} onChange={setLastName} required />
        </div>

        <FieldInput label="Telefon" value={phone} onChange={setPhone} type="tel" />
        <FieldInput label="Şirket (opsiyonel)" value={company} onChange={setCompany} />

        <button
          type="submit"
          disabled={saving}
          className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-bold text-white px-6 ${
            saving ? 'bg-muted cursor-not-allowed' : 'bg-molten-grad glow-orange cursor-pointer'
          }`}
        >
          {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Kaydediliyor...</> : <><Save className="h-4 w-4" /> Bilgileri Kaydet</>}
        </button>
      </form>
    </div>
  );
}

function FieldInput({
  label, value, onChange, required, type = 'text',
}: {
  label: string; value: string; onChange: (v: string) => void;
  required?: boolean; type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
        {label}
      </label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:border-primary focus:outline-none"
      />
    </div>
  );
}

// ============== Addresses ==============

function AddressesTab() {
  const [list, setList] = useState<StoreCustomerAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<AddressInput>({
    first_name: '', last_name: '', address_1: '', city: '',
    country_code: 'tr',
  });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const a = await listAddresses();
      setList(a);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await createAddress(form);
      setAdding(false);
      setForm({ first_name: '', last_name: '', address_1: '', city: '', country_code: 'tr' });
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Adresi silmek istediğinize emin misiniz?')) return;
    await deleteAddress(id);
    await load();
  }

  return (
    <div className="rounded-3xl bg-metallic-card border border-border p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight">Adreslerim</h2>
          <p className="text-sm text-muted-foreground">Kayıtlı teslimat adresleriniz.</p>
        </div>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-molten-grad text-white text-xs font-bold glow-orange cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Yeni Adres
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <>
          {adding && (
            <form onSubmit={handleAdd} className="mb-6 p-4 rounded-2xl border border-border bg-background space-y-3">
              <h3 className="font-bold text-sm">Yeni Adres Ekle</h3>
              <div className="grid grid-cols-2 gap-3">
                <FieldInput label="Ad" value={form.first_name} onChange={(v) => setForm({ ...form, first_name: v })} required />
                <FieldInput label="Soyad" value={form.last_name} onChange={(v) => setForm({ ...form, last_name: v })} required />
              </div>
              <FieldInput label="Telefon" value={form.phone || ''} onChange={(v) => setForm({ ...form, phone: v })} type="tel" />
              <FieldInput label="Adres Satırı" value={form.address_1} onChange={(v) => setForm({ ...form, address_1: v })} required />
              <FieldInput label="Adres Satırı 2 (opsiyonel)" value={form.address_2 || ''} onChange={(v) => setForm({ ...form, address_2: v })} />
              <div className="grid grid-cols-2 gap-3">
                <FieldInput label="İlçe" value={form.province || ''} onChange={(v) => setForm({ ...form, province: v })} />
                <FieldInput label="Şehir" value={form.city} onChange={(v) => setForm({ ...form, city: v })} required />
              </div>
              <FieldInput label="Posta Kodu" value={form.postal_code || ''} onChange={(v) => setForm({ ...form, postal_code: v })} />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setAdding(false)} className="flex-1 h-10 rounded-xl bg-silver-grad text-xs font-bold">İptal</button>
                <button type="submit" disabled={saving} className={`flex-1 h-10 rounded-xl text-white text-xs font-bold ${saving ? 'bg-muted' : 'bg-molten-grad glow-orange'}`}>
                  {saving ? 'Kaydediliyor...' : 'Adres Ekle'}
                </button>
              </div>
            </form>
          )}

          {list.length === 0 && !adding ? (
            <div className="text-center py-10 text-sm text-muted-foreground">
              Henüz kayıtlı adresiniz yok.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {list.map((a) => (
                <div key={a.id} className="rounded-2xl border border-border bg-background p-4 relative">
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="absolute top-3 right-3 p-1.5 rounded-md text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
                    title="Sil"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <div className="font-bold text-sm">
                    {a.first_name} {a.last_name}
                  </div>
                  {a.phone && <div className="text-xs text-muted-foreground">{a.phone}</div>}
                  <div className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    {a.address_1}
                    {a.address_2 && <><br/>{a.address_2}</>}
                    <br/>
                    {a.province && `${a.province}, `}{a.city}
                    {a.postal_code && ` ${a.postal_code}`}
                    <br/>
                    {(a.country_code || '').toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============== Orders ==============

function OrdersTab() {
  const [orders, setOrders] = useState<HttpTypes.StoreOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listMyOrders().then((o) => { setOrders(o); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="rounded-3xl bg-metallic-card border border-border p-10 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-3xl bg-metallic-card border border-border p-10 text-center space-y-3">
        <Package className="h-10 w-10 mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Henüz siparişiniz yok.</p>
        <Link href="/" className="inline-flex h-10 items-center justify-center rounded-xl bg-molten-grad text-white text-xs font-bold px-5 glow-orange">
          Alışverişe Başla
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-metallic-card border border-border p-6 md:p-8">
      <h2 className="text-lg font-extrabold tracking-tight mb-6">Siparişlerim ({orders.length})</h2>
      <div className="space-y-3">
        {orders.map((o) => (
          <div key={o.id} className="rounded-2xl border border-border bg-background p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-accent">
                    #{o.display_id || o.id.slice(0, 8)}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${getOrderStatus(o).className}`}>
                    {getOrderStatus(o).label}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" />
                  {o.created_at ? new Date(o.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-base font-black text-orange-grad">
                  {formatMoney(o.total as number, o.currency_code)}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {o.items?.length || 0} ürün
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end pt-2 border-t border-border">
              <Link
                href={`/hesabim/siparis/${o.id}`}
                className="inline-flex items-center gap-1 text-xs font-bold text-accent hover:text-accent/80"
              >
                Detay <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
