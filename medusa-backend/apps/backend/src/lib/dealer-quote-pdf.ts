/**
 * Teklif PDF'i: solda TestereStore, sağda bayi logosu, kalemler ve toplamlar.
 * Yazı tipi gömülüdür; PDFKit'in hazır fontlarında ş, ğ, ı, İ yoktur.
 */
import PDFDocument from "pdfkit";
import { KDV_RATE } from "./dealer-quote";
import { TESTERESTORE_LOGO_PNG } from "./assets/testerestore-logo";

const FONT = require.resolve("dejavu-fonts-ttf/ttf/DejaVuSans.ttf");
const FONT_BOLD = require.resolve("dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf");
const ORANGE = "#ea6a12";
const INK = "#1f2329";
const MUTED = "#6b7280";
const LINE = "#d9dce1";
const MARGIN = 45;

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
      info: { Title: `Teklif ${quote.number}`, Author: "TestereStore" },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.registerFont("r", FONT);
    doc.registerFont("b", FONT_BOLD);

    const left = MARGIN;
    const right = doc.page.width - MARGIN;
    const width = right - left;
    const cols = {
      no: left,
      product: left + 26,
      qty: right - 190,
      unit: right - 145,
      total: right - 70,
    };

    doc.image(Buffer.from(TESTERESTORE_LOGO_PNG, "base64"), left, MARGIN, { fit: [48, 48] });
    doc.font("b").fontSize(16).fillColor(INK).text("TESTERE", left + 58, MARGIN + 6, { continued: true });
    doc.fillColor(ORANGE).text("STORE");
    doc.font("r").fontSize(8).fillColor(MUTED).text("testerestore.com", left + 58, MARGIN + 28);

    const dealerLogo = logoBuffer(dealer.logo_data);
    if (dealerLogo) {
      try {
        doc.image(dealerLogo, right - 130, MARGIN, { fit: [130, 54], align: "right" });
      } catch {
        // Bozuk logo teklifi engellemesin; firma adı aşağıda yine yazılı.
      }
    }

    let y = MARGIN + 74;
    doc.moveTo(left, y).lineTo(right, y).strokeColor(ORANGE).lineWidth(1.5).stroke();
    y += 14;

    doc.font("b").fontSize(18).fillColor(INK).text(
      quote.status === "draft" ? "TEKLİF (TASLAK)" : "TEKLİF",
      left,
      y
    );
    doc.font("r").fontSize(9).fillColor(MUTED);
    doc.text(`No: ${quote.number}`, left, y + 2, { width, align: "right" });
    doc.text(`Tarih: ${new Date(quote.date).toLocaleDateString("tr-TR")}`, left, y + 15, {
      width,
      align: "right",
    });
    y += 34;
    doc.font("r").fontSize(10).fillColor(MUTED).text("Sayın", left, y);
    doc.font("b").fontSize(12).fillColor(INK).text(dealer.company_name, left, y + 13, {
      width: width - 150,
    });
    y = doc.y + 16;

    const header = (top: number) => {
      doc.rect(left, top, width, 20).fill("#f3f4f6");
      doc.font("b").fontSize(8).fillColor(INK);
      doc.text("#", cols.no + 6, top + 6);
      doc.text("Ürün", cols.product, top + 6);
      doc.text("Adet", cols.qty, top + 6, { width: 38, align: "right" });
      doc.text("Birim Fiyat", cols.unit, top + 6, { width: 70, align: "right" });
      doc.text("Tutar", cols.total, top + 6, { width: 70 - 4, align: "right" });
      return top + 24;
    };
    y = header(y);

    const bottom = doc.page.height - MARGIN - 40;
    quote.items.forEach((item, i) => {
      const productWidth = cols.qty - cols.product - 8;
      doc.font("b").fontSize(9);
      const titleH = doc.heightOfString(item.title, { width: productWidth });
      doc.font("r").fontSize(8);
      const detailH = item.detail ? doc.heightOfString(item.detail, { width: productWidth }) : 0;
      const rowH = titleH + detailH + 10;
      if (y + rowH > bottom) {
        doc.addPage();
        y = header(MARGIN);
      }
      doc.font("r").fontSize(9).fillColor(MUTED).text(String(i + 1), cols.no + 6, y);
      doc.font("b").fontSize(9).fillColor(INK).text(item.title, cols.product, y, { width: productWidth });
      if (item.detail) {
        doc.font("r").fontSize(8).fillColor(MUTED).text(item.detail, cols.product, y + titleH + 1, {
          width: productWidth,
        });
      }
      doc.font("r").fontSize(9).fillColor(INK);
      doc.text(String(item.quantity), cols.qty, y, { width: 38, align: "right" });
      doc.text(money(item.unit_price), cols.unit, y, { width: 70, align: "right" });
      doc.text(money(item.unit_price * item.quantity), cols.total, y, { width: 66, align: "right" });
      y += rowH;
      doc.moveTo(left, y - 3).lineTo(right, y - 3).strokeColor(LINE).lineWidth(0.5).stroke();
    });

    if (y + 90 > bottom) {
      doc.addPage();
      y = MARGIN;
    }
    y += 8;
    const totalRow = (label: string, value: number, strong = false) => {
      doc.font(strong ? "b" : "r").fontSize(strong ? 11 : 9).fillColor(strong ? ORANGE : INK);
      doc.text(label, right - 260, y, { width: 150, align: "right" });
      doc.text(money(value), right - 105, y, { width: 101, align: "right" });
      y += strong ? 18 : 15;
    };
    totalRow("Ara Toplam (KDV hariç)", quote.subtotal);
    totalRow(`KDV (%${Math.round(KDV_RATE * 100)})`, quote.tax);
    totalRow("Genel Toplam", quote.total, true);

    if (quote.note) {
      y += 8;
      doc.font("b").fontSize(9).fillColor(INK).text("Not", left, y);
      doc.font("r").fontSize(9).fillColor(INK).text(quote.note, left, y + 13, { width });
      y = doc.y;
    }

    doc.font("r").fontSize(8).fillColor(MUTED).text(
      "Birim fiyatlar KDV hariçtir. Bıçak fiyatlarına boy ve kaynak ücreti dahildir. Kargo ücreti teklife dahil değildir.",
      left,
      y + 18,
      { width }
    );
    doc.end();
  });
}
