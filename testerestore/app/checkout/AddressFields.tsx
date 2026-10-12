'use client';

import { TR_PROVINCES } from '../../lib/tr-address';

export interface AddressValue {
  fullName: string;
  phone: string;
  city: string; // il
  district: string; // ilçe
  address: string;
  postalCode: string;
}

export const EMPTY_ADDRESS: AddressValue = {
  fullName: '',
  phone: '',
  city: '',
  district: '',
  address: '',
  postalCode: '',
};

const INPUT =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none font-medium';
const LABEL = 'block text-xs font-semibold text-muted-foreground mb-1';

/**
 * Teslimat / fatura adresi alanları. `section` tarayıcının otomatik doldurma
 * bölümünü ayırır (shipping / billing) — iki form birbirine karışmaz.
 */
export default function AddressFields({
  value,
  onChange,
  section,
  phoneError,
}: {
  value: AddressValue;
  onChange: (patch: Partial<AddressValue>) => void;
  section: 'shipping' | 'billing';
  phoneError?: string | null;
}) {
  const id = (f: string) => `${section}-${f}`;
  const ac = (t: string) => `section-${section} ${section} ${t}`;
  // Kayıtlı adreste listede olmayan bir il yazılmışsa seçenek olarak koru.
  const provinces =
    value.city && !TR_PROVINCES.includes(value.city) ? [value.city, ...TR_PROVINCES] : TR_PROVINCES;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={id('name')} className={LABEL}>Ad Soyad *</label>
          <input
            id={id('name')}
            type="text"
            required
            autoComplete={ac('name')}
            value={value.fullName}
            onChange={(e) => onChange({ fullName: e.target.value })}
            className={INPUT}
            placeholder="Adınız ve soyadınız"
          />
        </div>
        <div>
          <label htmlFor={id('tel')} className={LABEL}>Telefon *</label>
          <input
            id={id('tel')}
            type="tel"
            inputMode="tel"
            required
            autoComplete={ac('tel')}
            value={value.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
            aria-invalid={!!phoneError}
            aria-describedby={phoneError ? id('tel-err') : undefined}
            className={`${INPUT} ${phoneError ? 'border-rose-500' : ''}`}
            placeholder="05XX XXX XX XX"
          />
          {phoneError && (
            <p id={id('tel-err')} className="mt-1 text-[11px] font-semibold text-rose-600">{phoneError}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor={id('city')} className={LABEL}>İl *</label>
          <select
            id={id('city')}
            required
            autoComplete={ac('address-level1')}
            value={value.city}
            onChange={(e) => onChange({ city: e.target.value })}
            className={INPUT}
          >
            <option value="">Seçin</option>
            {provinces.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={id('district')} className={LABEL}>İlçe *</label>
          <input
            id={id('district')}
            type="text"
            required
            autoComplete={ac('address-level2')}
            value={value.district}
            onChange={(e) => onChange({ district: e.target.value })}
            className={INPUT}
            placeholder="İlçe"
          />
        </div>
        <div>
          <label htmlFor={id('postal')} className={LABEL}>Posta Kodu</label>
          <input
            id={id('postal')}
            type="text"
            inputMode="numeric"
            maxLength={5}
            autoComplete={ac('postal-code')}
            value={value.postalCode}
            onChange={(e) => onChange({ postalCode: e.target.value.replace(/\D/g, '').slice(0, 5) })}
            className={INPUT}
            placeholder="34000"
          />
        </div>
      </div>

      <div>
        <label htmlFor={id('address')} className={LABEL}>Açık Adres *</label>
        <textarea
          id={id('address')}
          required
          autoComplete={ac('street-address')}
          value={value.address}
          onChange={(e) => onChange({ address: e.target.value })}
          rows={3}
          className={INPUT}
          placeholder="Mahalle, cadde/sokak, bina ve daire no; sanayi sitesi ise blok bilgisi"
        />
      </div>
    </div>
  );
}
