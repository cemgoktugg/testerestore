'use client';

export interface InvoiceValue {
  type: 'bireysel' | 'kurumsal';
  tckn: string;
  companyName: string;
  vkn: string;
  taxOffice: string;
}

export const EMPTY_INVOICE: InvoiceValue = {
  type: 'bireysel',
  tckn: '',
  companyName: '',
  vkn: '',
  taxOffice: '',
};

const INPUT =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none font-medium';
const LABEL = 'block text-xs font-semibold text-muted-foreground mb-1';

/**
 * Fatura bilgileri — e-arşiv (bireysel) / e-fatura (kurumsal) için gereken
 * alanlar. Sipariş metadata'sına yazılır (invoice_type, tckn, company_name,
 * vkn, tax_office).
 */
export default function InvoiceFields({
  value,
  onChange,
  errors,
}: {
  value: InvoiceValue;
  onChange: (patch: Partial<InvoiceValue>) => void;
  errors: Partial<Record<keyof InvoiceValue, string>>;
}) {
  const err = (k: keyof InvoiceValue) =>
    errors[k] ? <p className="mt-1 text-[11px] font-semibold text-rose-600">{errors[k]}</p> : null;

  return (
    <div className="space-y-4">
      <div role="radiogroup" aria-label="Fatura türü" className="grid grid-cols-2 gap-3">
        {(['bireysel', 'kurumsal'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={value.type === t}
            onClick={() => onChange({ type: t })}
            className={`rounded-xl border py-2.5 text-xs font-bold transition-all cursor-pointer ${
              value.type === t ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-background text-muted-foreground'
            }`}
          >
            {t === 'bireysel' ? 'Bireysel' : 'Kurumsal (Firma)'}
          </button>
        ))}
      </div>

      {value.type === 'bireysel' ? (
        <div>
          <label htmlFor="inv-tckn" className={LABEL}>T.C. Kimlik No (isteğe bağlı)</label>
          <input
            id="inv-tckn"
            type="text"
            inputMode="numeric"
            maxLength={11}
            value={value.tckn}
            onChange={(e) => onChange({ tckn: e.target.value.replace(/\D/g, '').slice(0, 11) })}
            className={`${INPUT} ${errors.tckn ? 'border-rose-500' : ''}`}
            placeholder="11 haneli"
          />
          {err('tckn')}
          <p className="mt-1 text-[10px] text-muted-foreground">
            Boş bırakırsanız e-arşiv faturanız adınıza T.C. kimlik numarasız düzenlenir.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label htmlFor="inv-company" className={LABEL}>Firma Unvanı *</label>
            <input
              id="inv-company"
              type="text"
              autoComplete="organization"
              value={value.companyName}
              onChange={(e) => onChange({ companyName: e.target.value })}
              className={`${INPUT} ${errors.companyName ? 'border-rose-500' : ''}`}
              placeholder="Örn: ABC Makina San. Tic. Ltd. Şti."
            />
            {err('companyName')}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="inv-vkn" className={LABEL}>Vergi Numarası *</label>
              <input
                id="inv-vkn"
                type="text"
                inputMode="numeric"
                maxLength={10}
                value={value.vkn}
                onChange={(e) => onChange({ vkn: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                className={`${INPUT} ${errors.vkn ? 'border-rose-500' : ''}`}
                placeholder="10 haneli"
              />
              {err('vkn')}
            </div>
            <div>
              <label htmlFor="inv-office" className={LABEL}>Vergi Dairesi *</label>
              <input
                id="inv-office"
                type="text"
                value={value.taxOffice}
                onChange={(e) => onChange({ taxOffice: e.target.value })}
                className={`${INPUT} ${errors.taxOffice ? 'border-rose-500' : ''}`}
                placeholder="Örn: İkitelli"
              />
              {err('taxOffice')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
