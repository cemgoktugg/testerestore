"use client";

import React from "react";

/**
 * Sağ alt köşede sabit WhatsApp Business butonu. B2B endüstriyel
 * şerit testere satışında müşteri "hangi bıçak benim makineye uygun"
 * sorusunu öncelikle WhatsApp üzerinden sorduğu için kritik bir
 * conversion kanalı.
 *
 * Telefon numarası env'den (`NEXT_PUBLIC_WHATSAPP_NUMBER`) okunur; yoksa
 * fallback olarak hard-coded numara kullanılır. Sadece rakam (uluslararası
 * format, başındaki + olmadan): "905551234567".
 */
const FALLBACK_NUMBER = "902125551020";

export default function WhatsAppButton() {
  const raw =
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || FALLBACK_NUMBER;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  const href = `https://wa.me/${digits}?text=${encodeURIComponent(
    "Merhaba, ürünleriniz hakkında bilgi almak istiyorum."
  )}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp ile iletişime geç"
      className="fixed bottom-5 right-5 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_10px_30px_rgba(37,211,102,0.5)] hover:scale-110 hover:shadow-[0_12px_36px_rgba(37,211,102,0.7)] transition-all duration-300 cursor-pointer"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-7 w-7 fill-current"
        aria-hidden="true"
      >
        <path d="M20.52 3.48A11.86 11.86 0 0012.04 0C5.5 0 .17 5.32.17 11.87a11.83 11.83 0 001.67 6.09L0 24l6.27-1.64a11.88 11.88 0 005.77 1.47h.01c6.55 0 11.88-5.32 11.88-11.88 0-3.17-1.23-6.16-3.41-8.47zM12.05 21.8h-.01a9.9 9.9 0 01-5.04-1.38l-.36-.21-3.72.97 1-3.62-.24-.37a9.86 9.86 0 01-1.51-5.32c0-5.45 4.44-9.88 9.9-9.88a9.83 9.83 0 016.99 2.9 9.81 9.81 0 012.89 6.99c0 5.45-4.44 9.92-9.9 9.92zm5.43-7.42c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.49 0 1.47 1.07 2.89 1.21 3.09.15.2 2.1 3.21 5.09 4.5.71.31 1.27.49 1.7.63.71.23 1.36.2 1.88.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.42-.07-.13-.27-.2-.57-.35z" />
      </svg>
    </a>
  );
}
