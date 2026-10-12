/**
 * Türkiye adres / fatura yardımcıları (checkout).
 */

/** 81 il — Türkçe alfabetik sıra. */
export const TR_PROVINCES: readonly string[] = [
  'Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Aksaray', 'Amasya', 'Ankara', 'Antalya',
  'Ardahan', 'Artvin', 'Aydın', 'Balıkesir', 'Bartın', 'Batman', 'Bayburt', 'Bilecik',
  'Bingöl', 'Bitlis', 'Bolu', 'Burdur', 'Bursa', 'Çanakkale', 'Çankırı', 'Çorum',
  'Denizli', 'Diyarbakır', 'Düzce', 'Edirne', 'Elazığ', 'Erzincan', 'Erzurum', 'Eskişehir',
  'Gaziantep', 'Giresun', 'Gümüşhane', 'Hakkâri', 'Hatay', 'Iğdır', 'Isparta', 'İstanbul',
  'İzmir', 'Kahramanmaraş', 'Karabük', 'Karaman', 'Kars', 'Kastamonu', 'Kayseri', 'Kilis',
  'Kırıkkale', 'Kırklareli', 'Kırşehir', 'Kocaeli', 'Konya', 'Kütahya', 'Malatya', 'Manisa',
  'Mardin', 'Mersin', 'Muğla', 'Muş', 'Nevşehir', 'Niğde', 'Ordu', 'Osmaniye',
  'Rize', 'Sakarya', 'Samsun', 'Şanlıurfa', 'Siirt', 'Sinop', 'Şırnak', 'Sivas',
  'Tekirdağ', 'Tokat', 'Trabzon', 'Tunceli', 'Uşak', 'Van', 'Yalova', 'Yozgat', 'Zonguldak',
];

/**
 * Telefonu "05XX XXX XX XX" biçimine normalleştirir; geçersizse null.
 * Kabul: 5XXXXXXXXX, 05XXXXXXXXX, 905XXXXXXXXX, +90 5XX… (boşluk/tire/parantez serbest).
 * Sabit hatlar (0212…) da kabul edilir: alan kodu 2–4 ile başlayan 10 hane.
 */
export function normalizePhoneTR(input: string): string | null {
  let d = (input || '').replace(/\D/g, '');
  if (d.startsWith('90') && d.length === 12) d = d.slice(2);
  if (d.startsWith('0') && d.length === 11) d = d.slice(1);
  if (d.length !== 10 || !/^[2-5]/.test(d)) return null;
  return `0${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8)}`;
}

/** T.C. Kimlik No — resmî kontrol hanesi algoritması. */
export function isValidTCKN(input: string): boolean {
  const s = (input || '').trim();
  if (!/^[1-9]\d{10}$/.test(s)) return false;
  const d = s.split('').map(Number);
  const odd = d[0] + d[2] + d[4] + d[6] + d[8];
  const even = d[1] + d[3] + d[5] + d[7];
  const d10 = (((odd * 7 - even) % 10) + 10) % 10;
  const d11 = d.slice(0, 10).reduce((a, b) => a + b, 0) % 10;
  return d[9] === d10 && d[10] === d11;
}

/**
 * Vergi Kimlik No — yalnızca biçim (10 hane). Kontrol hanesi algoritmasının
 * yaygın uygulamaları birbirini tutmadığı için geçerli bir VKN'yi yanlışlıkla
 * reddetmemek adına uygulanmadı; doğrulama e-fatura sırasında yapılır.
 */
export function isValidVKN(input: string): boolean {
  return /^\d{10}$/.test((input || '').trim());
}
