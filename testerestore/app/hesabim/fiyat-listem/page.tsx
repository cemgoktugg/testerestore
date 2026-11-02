"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { useCustomer } from "../../context/CustomerContext";
import { formatMoney } from "../../../lib/medusa/format";
import { getDealerPriceList, type DealerPriceList } from "../../../lib/medusa/services/dealer";
import { ArrowLeft, Loader2, Tags } from "lucide-react";

const BLADE_LABELS: Record<string, string> = {
  "bi-metal": "Bi-Metal",
  carbide: "Karbür Uçlu",
  woodcut: "Ahşap — Uddeholm",
  spezialstahl: "Ahşap — Spezialstahl Alman Çeliği",
  "meat-bone": "Et ve Kemik",
  textile: "Sünger / Tekstil",
};

export default function DealerPriceListPage() {
  const { customer, loading: customerLoading } = useCustomer();
  const [list, setList] = useState<DealerPriceList | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (customerLoading) return;
    let cancelled = false;
    (customer ? getDealerPriceList() : Promise.resolve(null)).then((data) => {
      if (cancelled) return;
      setList(data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [customer, customerLoading]);

  const q = search.trim().toLocaleLowerCase("tr");
  const blades = useMemo(
    () =>
      (list?.blades ?? []).filter((b) =>
        `${BLADE_LABELS[b.blade_type] ?? b.blade_type} ${b.width_mm} ${b.thickness_mm} ${b.tooth_pitch ?? ""}`
          .toLocaleLowerCase("tr")
          .includes(q)
      ),
    [list, q]
  );
  const products = useMemo(
    () => (list?.products ?? []).filter((p) => p.title.toLocaleLowerCase("tr").includes(q)),
    [list, q]
  );
  const empty = !!list && list.blades.length === 0 && list.products.length === 0;

  return (
    <>
      <Header />
      <main className="flex-1 py-8 md:py-16 bg-background">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <Link
            href="/hesabim"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-primary transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" /> Hesabıma Dön
          </Link>
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
            <Tags className="h-6 w-6 text-accent" />
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Fiyat Listem</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {list ? `${list.company_name} için özel fiyatlar. Fiyatlara KDV dahil değildir.` : "Bayilere özel fiyatlar"}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          ) : !list ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Bu sayfa bayi hesaplarına özeldir.
            </p>
          ) : empty ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Hesabınıza henüz özel fiyat tanımlanmadı.
            </p>
          ) : (
            <div className="space-y-8">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ürün veya ölçü ara"
                className="w-full max-w-sm rounded-xl border border-border bg-background px-4 py-2 text-sm"
              />

              {blades.length > 0 && (
                <section>
                  <h2 className="mb-3 text-sm font-bold">Ölçüye Göre Bıçaklar</h2>
                  <div className="overflow-x-auto rounded-2xl border border-border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40 text-xs text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold">Ürün</th>
                          <th className="px-4 py-3 text-left font-semibold">Ölçü</th>
                          <th className="px-4 py-3 text-right font-semibold">Genel Metre</th>
                          <th className="px-4 py-3 text-right font-semibold">Size Özel Metre</th>
                          <th className="px-4 py-3 text-right font-semibold">Kaynak (adet)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {blades.map((b) => (
                          <tr key={b.id}>
                            <td className="px-4 py-3">{BLADE_LABELS[b.blade_type] ?? b.blade_type}</td>
                            <td className="px-4 py-3">
                              {b.width_mm} × {b.thickness_mm} mm
                              {b.tooth_pitch ? ` · ${b.tooth_pitch} TPI` : ""}
                            </td>
                            <td className="px-4 py-3 text-right text-muted-foreground">
                              {formatMoney(b.list_price_per_meter, "try")}
                            </td>
                            <td className="px-4 py-3 text-right font-bold">
                              {formatMoney(b.price_per_meter, "try")}
                            </td>
                            <td className="px-4 py-3 text-right">{formatMoney(b.welding_fee, "try")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {products.length > 0 && (
                <section>
                  <h2 className="mb-3 text-sm font-bold">Hazır Ürünler</h2>
                  <div className="overflow-x-auto rounded-2xl border border-border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40 text-xs text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold">Ürün</th>
                          <th className="px-4 py-3 text-right font-semibold">Genel Fiyat</th>
                          <th className="px-4 py-3 text-right font-semibold">Size Özel Fiyat</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {products.map((p) => (
                          <tr key={p.id}>
                            <td className="px-4 py-3">
                              <Link href={`/products/${p.handle}`} className="hover:text-accent">
                                {p.title}
                              </Link>
                            </td>
                            <td className="px-4 py-3 text-right text-muted-foreground">
                              {p.list_amount === null ? "—" : formatMoney(p.list_amount, "try")}
                            </td>
                            <td className="px-4 py-3 text-right font-bold">
                              {p.amount === null ? "—" : formatMoney(p.amount, "try")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {blades.length === 0 && products.length === 0 && (
                <p className="py-10 text-center text-sm text-muted-foreground">Sonuç bulunamadı.</p>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
