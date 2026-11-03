/**
 * Teklif PDF'i: solda TestereStore, sağda bayi logosu; teklif bilgileri, kalemler,
 * toplamlar, koşullar ve en altta teklifin kime hazırlandığı ile geçerlilik süresi.
 * Yazı tipi gömülüdür; PDFKit'in hazır fontlarında ş, ğ, ı, İ yoktur.
 */
import PDFDocument from "pdfkit";
import { KDV_RATE } from "./dealer-quote";
import { TESTERESTORE_LOGO_JPG, TESTERESTORE_LOGO_RATIO } from "./assets/testerestore-logo";

const FONT = require.resolve("dejavu-fonts-ttf/ttf/DejaVuSans.ttf");
const FONT_BOLD = require.resolve("dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf");
const ORANGE = "#ea6a12";
const ORANGE_SOFT = "#fdf1e7";
const INK = "#1f2329";
const MUTED = "#6b7280";
const LINE = "#e5e7eb";
const ZEBRA = "#f8f9fb";
const PANEL = "#f4f5f7";
const MARGIN = 40;
const FOOTER_SPACE = 34;
/** Teklif, gönderildiği günden itibaren bu kadar gün geçerlidir. */
export const QUOTE_VALID_DAYS = 7;

type QuotePdfInput = {
  number: string;
  date: Date | string;
  status: string;
  note?: string | null;
  items: {
    title: string;
    detail?: string | null;
    quantity: number;
    unit_price: number;
  }[];
  subtotal: number;
  tax: number;
  total: number;
};

const money = (n: number) =>
  `${n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;

const day = (d: Date) => d.toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" });

function logoBuffer(dataUrl?: string | null): Buffer | null {
  const match = dataUrl?.match(/^data:image\/(?:png|jpeg);base64,(.+)$/);
  return match ? Buffer.from(match[1], "base64") : null;
}

export function renderQuotePdf(
  quote: QuotePdfInput,
  dealer: { company_name: string; logo_data?: string | null }
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: MARGIN,
      bufferPages: true,
      info: { Title: `Teklif ${quote.number}`, Author: "TestereStore" },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.registerFont("r", FONT);
    doc.registerFont("b", FONT_BOLD);

    const pageW = doc.page.width;
    const pageH = doc.page.height;
    const left = MARGIN;
    const right = pageW - MARGIN;
    const width = right - left;
    const bottom = pageH - MARGIN - FOOTER_SPACE;

    const issued = new Date(quote.date);
    const validUntil = new Date(issued.getTime() + QUOTE_VALID_DAYS * 24 * 60 * 60 * 1000);

    // Sütunlar sağdan sola: tutar, birim fiyat, adet; kalan genişlik ürüne.
    const pad = 8;
    const totalW = 86;
    const unitW = 82;
    const qtyW = 40;
    const cols = {
      no: left + pad,
      product: left + 32,
      total: right - pad - totalW,
      unit: right - pad - totalW - pad - unitW,
      qty: right - pad - totalW - pad - unitW - pad - qtyW,
    };
    const productW = cols.qty - pad - cols.product;

    const topBar = () => doc.rect(0, 0, pageW, 5).fill(ORANGE);

    // ---- Başlık: logolar
    topBar();
    // Logonun kendi koyu zemini var; köşeleri yuvarlatılmış plaka olarak basılır.
    const logoH = 48;
    const logoW = logoH * TESTERESTORE_LOGO_RATIO;
    doc.save();
    doc.roundedRect(left, 26, logoW, logoH, 6).clip();
    doc.image(Buffer.from(TESTERESTORE_LOGO_JPG, "base64"), left, 26, { width: logoW, height: logoH });
    doc.restore();
    doc.font("r").fontSize(8).fillColor(MUTED).text("Şerit testere bıçakları · testerestore.com", left, 26 + logoH + 6);

    const dealerLogo = logoBuffer(dealer.logo_data);
    if (dealerLogo) {
      try {
        doc.image(dealerLogo, right - 150, 26, { fit: [150, logoH], align: "right", valign: "center" });
      } catch {
        // Bozuk logo teklifi engellemesin.
      }
    }

    // ---- Başlık ve teklif bilgileri
    let y = 106;
    doc.font("b").fontSize(22).fillColor(INK).text("FİYAT TEKLİFİ", left, y, { characterSpacing: 0.5 });
    if (quote.status === "draft") {
      const tagX = left + doc.widthOfString("FİYAT TEKLİFİ", { characterSpacing: 0.5 }) + 12;
      doc.roundedRect(tagX, y + 5, 54, 17, 4).lineWidth(1).strokeColor(ORANGE).stroke();
      doc.font("b").fontSize(8).fillColor(ORANGE).text("TASLAK", tagX, y + 10, { width: 54, align: "center" });
    }
    y += 40;

    const meta: [string, string][] = [
      ["TEKLİF NO", quote.number],
      ["TEKLİF TARİHİ", day(issued)],
      ["GEÇERLİLİK TARİHİ", day(validUntil)],
    ];
    const gap = 10;
    const cellW = (width - gap * (meta.length - 1)) / meta.length;
    meta.forEach(([label, value], i) => {
      const x = left + i * (cellW + gap);
      doc.roundedRect(x, y, cellW, 44, 5).fill(i === 2 ? ORANGE_SOFT : PANEL);
      doc.font("b").fontSize(7).fillColor(i === 2 ? ORANGE : MUTED).text(label, x + 12, y + 9, {
        width: cellW - 24,
        characterSpacing: 0.6,
      });
      doc.font("b").fontSize(11.5).fillColor(INK).text(value, x + 12, y + 22, { width: cellW - 24 });
    });
    y += 44 + 22;

    // ---- Kalemler
    const header = (top: number) => {
      doc.roundedRect(left, top, width, 24, 4).fill(INK);
      doc.font("b").fontSize(7.5).fillColor("#ffffff");
      const ty = top + 8.5;
      doc.text("#", cols.no, ty);
      doc.text("ÜRÜN / AÇIKLAMA", cols.product, ty, { characterSpacing: 0.4 });
      doc.text("ADET", cols.qty, ty, { width: qtyW, align: "right", characterSpacing: 0.4 });
      doc.text("BİRİM FİYAT", cols.unit, ty, { width: unitW, align: "right", characterSpacing: 0.4 });
      doc.text("TUTAR", cols.total, ty, { width: totalW, align: "right", characterSpacing: 0.4 });
      return top + 24;
    };
    y = header(y);

    quote.items.forEach((item, i) => {
      doc.font("b").fontSize(9);
      const titleH = doc.heightOfString(item.title, { width: productW });
      doc.font("r").fontSize(8);
      const detailH = item.detail ? doc.heightOfString(item.detail, { width: productW }) + 2 : 0;
      const rowH = Math.max(titleH + detailH, 12) + 16;
      if (y + rowH > bottom) {
        doc.addPage();
        topBar();
        y = header(MARGIN);
      }
      if (i % 2 === 1) doc.rect(left, y, width, rowH).fill(ZEBRA);
      const ty = y + 8;
      doc.font("r").fontSize(8.5).fillColor(MUTED).text(String(i + 1), cols.no, ty);
      doc.font("b").fontSize(9).fillColor(INK).text(item.title, cols.product, ty, { width: productW });
      if (item.detail) {
        doc.font("r").fontSize(8).fillColor(MUTED).text(item.detail, cols.product, ty + titleH + 2, {
          width: productW,
        });
      }
      doc.font("r").fontSize(9).fillColor(INK);
      doc.text(String(item.quantity), cols.qty, ty, { width: qtyW, align: "right" });
      doc.text(money(item.unit_price), cols.unit, ty, { width: unitW, align: "right" });
      doc.font("b").text(money(item.unit_price * item.quantity), cols.total, ty, { width: totalW, align: "right" });
      y += rowH;
      doc.moveTo(left, y).lineTo(right, y).strokeColor(LINE).lineWidth(0.6).stroke();
    });

    // ---- Toplamlar, not, koşullar ve kapanış: sığmazsa yeni sayfa
    const conditions = [
      "Birim fiyatlar KDV hariçtir; KDV toplamda ayrıca gösterilmiştir.",
      "Bıçak fiyatlarına boy ve kaynak ücreti dahildir.",
      "Kargo ücreti teklife dahil değildir.",
      "Teklif, TestereStore hesabınızdaki Tekliflerim sayfasından kabul edilerek siparişe dönüştürülebilir.",
    ];
    doc.font("r").fontSize(8.5);
    const noteH = quote.note ? doc.heightOfString(quote.note, { width: width - 28 }) + 34 : 0;
    const conditionsH = 20 + conditions.reduce((h, c) => h + doc.heightOfString(c, { width: width - 14 }) + 4, 0);
    doc.font("b").fontSize(10);
    const closingH = doc.heightOfString(`Bu teklif ${dealer.company_name} için hazırlanmıştır.`, { width: width - 28 }) + 46;
    const totalsH = 92;
    if (y + 16 + totalsH + noteH + conditionsH + closingH + 16 > bottom) {
      doc.addPage();
      topBar();
      y = MARGIN;
    } else {
      y += 16;
    }

    const boxW = 250;
    const boxX = right - boxW;
    const totalRow = (label: string, value: number) => {
      doc.font("r").fontSize(9).fillColor(MUTED).text(label, boxX + 12, y, { width: 130 });
      doc.font("r").fontSize(9).fillColor(INK).text(money(value), boxX + 12, y, { width: boxW - 24, align: "right" });
      y += 18;
    };
    y += 4;
    totalRow("Ara Toplam (KDV hariç)", quote.subtotal);
    totalRow(`KDV (%${Math.round(KDV_RATE * 100)})`, quote.tax);
    y += 4;
    doc.roundedRect(boxX, y, boxW, 32, 5).fill(ORANGE);
    doc.font("b").fontSize(10).fillColor("#ffffff").text("GENEL TOPLAM", boxX + 12, y + 11, { characterSpacing: 0.5 });
    doc.font("b").fontSize(12.5).fillColor("#ffffff").text(money(quote.total), boxX + 12, y + 9.5, {
      width: boxW - 24,
      align: "right",
    });
    y += 32 + 22;

    if (quote.note) {
      doc.font("r").fontSize(8.5);
      const h = doc.heightOfString(quote.note, { width: width - 28 });
      doc.rect(left, y, width, h + 26).fill(PANEL);
      doc.rect(left, y, 3, h + 26).fill(ORANGE);
      doc.font("b").fontSize(7.5).fillColor(MUTED).text("AÇIKLAMA", left + 14, y + 8, { characterSpacing: 0.6 });
      doc.font("r").fontSize(8.5).fillColor(INK).text(quote.note, left + 14, y + 19, { width: width - 28 });
      y += h + 26 + 16;
    }

    doc.font("b").fontSize(7.5).fillColor(MUTED).text("TEKLİF KOŞULLARI", left, y, { characterSpacing: 0.6 });
    y += 14;
    for (const c of conditions) {
      doc.circle(left + 3, y + 4.5, 1.6).fill(ORANGE);
      doc.font("r").fontSize(8.5).fillColor(INK).text(c, left + 12, y, { width: width - 14 });
      y = doc.y + 4;
    }

    // Kapanış sayfanın en altına yaslanır.
    const closingY = Math.max(y + 16, bottom - closingH + 10);
    doc.roundedRect(left, closingY, width, closingH - 10, 5).fill(ORANGE_SOFT);
    doc.rect(left, closingY, 3, closingH - 10).fill(ORANGE);
    doc.font("r").fontSize(10).fillColor(INK).text("Bu teklif ", left + 16, closingY + 12, {
      width: width - 28,
      continued: true,
    });
    doc.font("b").text(dealer.company_name, { continued: true });
    doc.font("r").text(" için hazırlanmıştır.");
    doc.font("r").fontSize(9).fillColor(MUTED).text(
      `${day(issued)} tarihinden itibaren 1 hafta geçerlidir (son geçerlilik tarihi: ${day(validUntil)}).`,
      left + 16,
      doc.y + 4,
      { width: width - 28 }
    );

    // ---- Her sayfaya alt bilgi
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      const saved = doc.page.margins.bottom;
      doc.page.margins.bottom = 0; // alt boşluğa yazarken otomatik yeni sayfa açılmasın
      const fy = pageH - MARGIN - 8;
      doc.moveTo(left, fy - 8).lineTo(right, fy - 8).strokeColor(LINE).lineWidth(0.6).stroke();
      doc.font("r").fontSize(7.5).fillColor(MUTED);
      doc.text("TestereStore · testerestore.com", left, fy, { width: width / 2, lineBreak: false });
      doc.text(`Teklif ${quote.number} · Sayfa ${i + 1} / ${range.count}`, left + width / 2, fy, {
        width: width / 2,
        align: "right",
        lineBreak: false,
      });
      doc.page.margins.bottom = saved;
    }
    doc.end();
  });
}
