'use client';

/**
 * Product detail page.
 *
 * Data resolution order:
 *   1. Medusa product (by handle, then by ID) when MEDUSA_READY.
 *   2. Static fallback in lib/product-details-fallback.ts (legacy demo data).
 *
 * The premium UI is preserved 1:1; everything that was static is now
 * sourced from the Medusa product or its metadata, with the fallback module
 * filling in only for unmapped fields.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import BladeConfigurator from '../../components/BladeConfigurator';
import BladeSpecVisualizer from '../../components/BladeSpecVisualizer';
import ProductReviews from '../../components/ProductReviews';
import RecentlyViewed from '../../components/RecentlyViewed';
import WishlistButton from '../../components/WishlistButton';
import CrossSell from '../../components/CrossSell';
import RichText from '../../components/RichText';
import { ProductJsonLd, BreadcrumbJsonLd } from '../../components/StructuredData';
import { recordRecentlyViewed } from '../../../lib/recently-viewed';
import { useCart } from '../../context/CartContext';
import {
  ArrowLeft, CheckCircle2, ShieldAlert, FileText, Info, Eye, Image as ImageIcon,
  Sparkles, ShoppingCart, FileDown, BookOpen, TrendingUp, ArrowRight, Star,
  Flame, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useRelatedProducts } from '../../../lib/medusa/hooks/useProducts';
import { formatMoney, getProductImage, resolveBladeImage } from '../../../lib/medusa/format';
import type { BladeProductMetadata, StoreProduct } from '../../../lib/medusa/types';
import { MEDUSA_READY } from '../../../lib/medusa/config';
import {
  PRODUCT_DETAILS_FALLBACK,
  type ProductDetailsFallback,
} from '../../../lib/product-details-fallback';

interface UnifiedProduct {
  id: string;
  handle: string;
  name: string;
  description: string;
  longDescription: string;
  image: string;
  images: string[];
  category: string;
  type: 'blade' | 'machine';
  specs: string[];
  applications: string[];
  features: string[];
  priceTag?: string;
  seoTitle?: string;
  seoDescription?: string;
  documents?: Array<{ name: string; url?: string; size?: string; desc?: string }>;
  /** Original Medusa product, if any — passed to the configurator. */
  medusa?: StoreProduct;
}

function unifyFromMedusa(
  p: StoreProduct,
  fallback?: ProductDetailsFallback
): UnifiedProduct {
  const meta = (p.metadata || {}) as BladeProductMetadata;
  const images = (p.images?.map((i) => i.url).filter(Boolean) as string[]) || [];
  if (p.thumbnail && !images.includes(p.thumbnail)) images.unshift(p.thumbnail);
  if (!images.length && fallback?.images) images.push(...fallback.images);
  if (!images.length) {
    images.push(
      resolveBladeImage({
        title: p.title,
        bladeType: meta.blade_type,
        productType: meta.product_type,
      })
    );
  }

  const type =
    (meta.product_type as 'blade' | 'machine') ||
    fallback?.type ||
    'blade';

  const category =
    p.categories?.[0]?.name ||
    fallback?.category ||
    (meta.blade_type ? `${meta.blade_type}` : 'Şerit Testere');

  const specBadges: string[] = [];
  if (meta.blade_type) specBadges.push(`${meta.blade_type} Kalite`);
  if (Array.isArray(meta.material_usage) && meta.material_usage.length) {
    specBadges.push(...meta.material_usage.slice(0, 2).map(String));
  }
  if (!specBadges.length && fallback?.specs) specBadges.push(...fallback.specs);

  return {
    id: p.id,
    handle: p.handle || p.id,
    name: p.title,
    description: p.subtitle || p.description || fallback?.description || '',
    longDescription:
      meta.long_description ||
      p.description ||
      fallback?.longDescription ||
      '',
    image: getProductImage(p),
    images,
    category,
    type,
    specs: specBadges,
    applications: meta.applications ?? fallback?.applications ?? [],
    features: meta.technical_features ?? fallback?.features ?? [],
    seoTitle: meta.seo_title,
    seoDescription: meta.seo_description,
    documents: meta.documents,
    medusa: p,
  };
}

function unifyFromFallback(f: ProductDetailsFallback): UnifiedProduct {
  return {
    id: f.id,
    handle: f.id,
    name: f.name,
    description: f.description,
    longDescription: f.longDescription,
    image: f.image,
    images: f.images || [f.image],
    category: f.category,
    type: f.type,
    specs: f.specs,
    applications: f.applications,
    features: f.features,
    priceTag: f.priceTag,
  };
}

export default function ProductDetailClient({
  initialProduct,
  slug,
}: {
  initialProduct: StoreProduct | null;
  slug: string;
}) {
  // Ürün sunucuda (SSR/ISR) çekilir ve prop olarak gelir — client fetch yok.
  const medusaProduct = initialProduct;
  const loading = false;
  const { addToMedusaCart, addToCart } = useCart();

  // Build a unified product struct (Medusa-first, fallback for missing fields).
  // IMPORTANT: while the Medusa fetch is still in flight we must NOT render the
  // static fallback — doing so flashes the old/demo images before the real
  // (admin-uploaded) ones load. Only use the fallback once loading has finished
  // and Medusa returned nothing, so the page shows a skeleton meanwhile.
  const fallback = PRODUCT_DETAILS_FALLBACK[slug];
  const product: UnifiedProduct | null = useMemo(() => {
    if (medusaProduct) return unifyFromMedusa(medusaProduct, fallback);
    if (!loading && fallback) return unifyFromFallback(fallback);
    return null;
  }, [medusaProduct, fallback, loading]);

  // Related products — Medusa-first, else fallback siblings
  const { data: medusaRelated } = useRelatedProducts(medusaProduct, 3);
  const relatedItems = useMemo(() => {
    if (medusaRelated?.length) {
      return medusaRelated.map((p) => ({
        id: p.id,
        handle: p.handle || p.id,
        name: p.title,
        description: p.subtitle || p.description || '',
        image: getProductImage(p),
        category: p.categories?.[0]?.name || 'Şerit Testere',
      }));
    }
    return Object.values(PRODUCT_DETAILS_FALLBACK)
      .filter((p) => p.id !== slug)
      .slice(0, 3)
      .map((p) => ({
        id: p.id,
        handle: p.id,
        name: p.name,
        description: p.description,
        image: p.image,
        category: p.category,
      }));
  }, [medusaRelated, slug]);

  // --- UI state hooks (always called — never inside conditionals)
  const [activeTab, setActiveTab] = useState<'image' | '3d'>('image');
  const [imageIdx, setImageIdx] = useState(0);
  const [bladeConfig, setBladeConfig] = useState({
    width: '27mm', tpi: '4/6 TPI', material: product?.name ?? '',
  });

  // Machine-only state
  const [voltage, setVoltage] = useState<'220V' | '380V'>('220V');
  const [stand, setStand] = useState<'none' | 'with-stand'>('none');
  const [machineQty, setMachineQty] = useState(1);
  const [addedMessage, setAddedMessage] = useState(false);

  const [activeBottomTab, setActiveBottomTab] =
    useState<'info' | 'specs' | 'apps' | 'docs'>('info');
  const [downloadingDoc, setDownloadingDoc] = useState<string | null>(null);

  useEffect(() => {
    // Reset image index when the product changes — using a key on the gallery
    // wrapper would also work, but the gallery is deeply embedded in the
    // existing layout so a controlled reset is the pragmatic option here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setImageIdx(0);
    // Son görüntülenenler listesine ekle
    if (product?.handle) recordRecentlyViewed(product.handle);
  }, [product?.id, product?.handle]);

  const handleConfigChange = useCallback(
    (config: { width: string; tpi: string; material: string }) => {
      setBladeConfig(config);
    },
    []
  );

  // --- Loading / not-found
  if (loading && !product) {
    return (
      <>
        <Header />
        <main className="flex-1 py-16 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
            <div className="lg:col-span-7 aspect-square rounded-2xl bg-muted/30 animate-pulse" />
            <div className="lg:col-span-5 h-[600px] rounded-2xl bg-muted/30 animate-pulse" />
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!product) {
    return (
      <>
        <Header />
        <main className="flex-1 py-24 mx-auto max-w-3xl px-4 text-center">
          <h1 className="text-3xl font-bold mb-4">Ürün bulunamadı</h1>
          <p className="text-muted-foreground mb-6">
            &quot;{slug}&quot; isimli ürün şu anda mevcut değil.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-accent font-semibold"
          >
            <ArrowLeft className="h-4 w-4" /> Ana sayfaya dön
          </Link>
        </main>
        <Footer />
      </>
    );
  }

  const galleryImages =
    product.images.length > 0 ? product.images : [product.image];

  const goPrevImage = () =>
    setImageIdx((i) => (i - 1 + galleryImages.length) % galleryImages.length);
  const goNextImage = () =>
    setImageIdx((i) => (i + 1) % galleryImages.length);

  const handleDownload = (docName: string) => {
    setDownloadingDoc(docName);
    setTimeout(() => setDownloadingDoc(null), 1200);
  };

  // ---------- Machine handling (legacy + Medusa) ----------
  const getMachinePrice = () => {
    // If Medusa product has a first variant, use that price as base
    const baseVariant = product.medusa?.variants?.[0];
    const variantPrice = baseVariant?.calculated_price?.calculated_amount;
    let base = typeof variantPrice === 'number' ? variantPrice : 48500;
    if (voltage === '380V') base += 1200;
    if (stand === 'with-stand') base += 3500;
    return base;
  };

  const handleMachineAddToCart = async () => {
    const itemId = `${product.handle}-${voltage}-${stand}`;
    const descStr = `${product.name} (${voltage}, ${
      stand === 'with-stand' ? 'Stantlı' : 'Stantsız'
    })`;

    const baseVariant = product.medusa?.variants?.[0];
    if (baseVariant && MEDUSA_READY) {
      await addToMedusaCart({
        variantId: baseVariant.id,
        quantity: machineQty,
        metadata: {
          voltage,
          stand,
          product_type: 'machine',
          unit_price_at_add: getMachinePrice(),
        },
        legacy: {
          id: itemId,
          productId: product.handle,
          name: descStr,
          image: product.image,
          type: 'machine',
          specs: {
            width: voltage,
            thickness: stand === 'with-stand' ? 'Stantlı' : 'Stantsız',
            tpi: 'Lazer Kılavuz',
            length: 2240,
          },
          price: getMachinePrice(),
        },
      });
    } else {
      addToCart(
        {
          id: itemId,
          productId: product.handle,
          name: descStr,
          image: product.image,
          type: 'machine',
          specs: {
            width: voltage,
            thickness: stand === 'with-stand' ? 'Stantlı' : 'Stantsız',
            tpi: 'Lazer Kılavuz',
            length: 2240,
          },
          price: getMachinePrice(),
        },
        machineQty
      );
    }

    setAddedMessage(true);
    setTimeout(() => setAddedMessage(false), 2000);
  };

  return (
    <>
      <Header />

      <main className="flex-1 py-8 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6 gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Ana Sayfaya Dön</span>
            </Link>
            <WishlistButton
              handle={product.handle}
              variant="inline"
              showLabel
            />
          </div>

          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
            {/* Left: gallery */}
            <div className="lg:col-span-7 space-y-6">
              <div className={`relative rounded-2xl overflow-hidden bg-metallic-card group/gallery ${
                activeTab === 'image'
                  ? 'aspect-video sm:aspect-square md:aspect-[4/3]'
                  : 'min-h-[560px]'
              }`}>
                {activeTab === 'image' ? (
                  <div className="relative w-full h-full">
                    {galleryImages.map((img, i) => (
                      <Image
                        key={img + i}
                        src={img}
                        alt={`${product.name} - Görsel ${i + 1}`}
                        fill
                        className={`object-cover transition-opacity duration-500 ease-out ${
                          i === imageIdx ? 'opacity-100 z-0' : 'opacity-0 -z-10'
                        }`}
                        priority={i === 0}
                        sizes="(max-width: 1024px) 100vw, 60vw"
                      />
                    ))}

                    {galleryImages.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={goPrevImage}
                          aria-label="Önceki görsel"
                          className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/85 backdrop-blur-md text-foreground shadow-lg opacity-0 group-hover/gallery:opacity-100 hover:bg-background hover:scale-105 transition-all cursor-pointer"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={goNextImage}
                          aria-label="Sonraki görsel"
                          className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/85 backdrop-blur-md text-foreground shadow-lg opacity-0 group-hover/gallery:opacity-100 hover:bg-background hover:scale-105 transition-all cursor-pointer"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>

                        <div className="absolute top-3 right-3 z-20 inline-flex items-center rounded-full bg-black/70 backdrop-blur-md border border-white/10 px-2.5 py-1 text-[11px] font-bold text-white tabular-nums">
                          {imageIdx + 1} / {galleryImages.length}
                        </div>

                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-2xl bg-black/55 backdrop-blur-md border border-white/10 p-1.5 max-w-[90%] overflow-x-auto">
                          {galleryImages.map((img, i) => (
                            <button
                              key={img + i}
                              type="button"
                              onClick={() => setImageIdx(i)}
                              aria-label={`${i + 1}. görsele git`}
                              aria-current={i === imageIdx}
                              className={`relative shrink-0 h-12 w-12 rounded-lg overflow-hidden border transition-all duration-300 cursor-pointer ${
                                i === imageIdx
                                  ? 'border-accent ring-2 ring-accent/40 scale-105'
                                  : 'border-white/15 opacity-60 hover:opacity-100'
                              }`}
                            >
                              <Image src={img} alt="" fill className="object-cover" sizes="48px" />
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="absolute inset-0">
                    <BladeSpecVisualizer
                      toothPitch={bladeConfig.tpi}
                      widthMm={bladeConfig.width}
                      bladeType={product.medusa?.metadata?.blade_type as string | undefined}
                      toothForm={
                        product.medusa?.metadata?.tooth_form as
                          | 'regular'
                          | 'hook'
                          | 'skip'
                          | undefined
                      }
                      setType={
                        product.medusa?.metadata?.set_type as
                          | 'raker'
                          | 'wavy'
                          | 'alternate'
                          | undefined
                      }
                      availablePitches={
                        product.medusa?.metadata?.tooth_pitch as string[] | undefined
                      }
                    />
                  </div>
                )}
              </div>

              {/* View Switch Tabs — diş profili/TPI danışmanı yalnızca bıçaklarda */}
              {product.type === 'blade' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab('image')}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold border transition-all duration-200 cursor-pointer ${
                      activeTab === 'image'
                        ? 'border-accent bg-accent/10 text-accent shadow-sm'
                        : 'bg-silver-grad'
                    }`}
                  >
                    <ImageIcon className="h-4 w-4" />
                    <span>Ürün Fotoğrafı</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('3d')}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold border transition-all duration-200 cursor-pointer ${
                      activeTab === '3d'
                        ? 'border-accent bg-accent/10 text-accent shadow-sm'
                        : 'bg-silver-grad'
                    }`}
                  >
                    <Eye className="h-4 w-4" />
                    <span>Diş Profili &amp; TPI Danışmanı</span>
                  </button>
                </div>
              )}

              <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 flex gap-3 text-xs leading-relaxed text-amber-800 dark:text-amber-300">
                <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold mb-0.5">Dikkat Edilmesi Gerekenler</h4>
                  <p>Şerit testere bıçağınızı makinenize takmadan önce dişlerin kesiş yönünün kasnak dönüş yönü ile uyumlu olduğundan emin olun. Kesim esnasında uygun soğutma sıvısı / bor yağı kullanımı diş ömrünü %80 oranında artıracaktır.</p>
                </div>
              </div>
            </div>

            {/* Right: Configurator or Machine Form */}
            <div className="lg:col-span-5">
              {product.type === 'blade' ? (
                <BladeConfigurator
                  product={product.medusa ?? null}
                  productId={product.handle}
                  initialMaterial={product.name}
                  onConfigChange={handleConfigChange}
                  onOpen3D={() => setActiveTab('3d')}
                />
              ) : (
                <div className="rounded-2xl bg-metallic-card p-6 shadow-sm space-y-6">
                  <div className="border-b border-border pb-4">
                    <span className="text-xs font-bold text-accent uppercase tracking-wider block mb-1">
                      {product.category}
                    </span>
                    <h2 className="text-xl font-bold tracking-tight">{product.name}</h2>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                        Elektrik Bağlantısı (Motor Voltajı)
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => setVoltage('220V')}
                          className={`rounded-lg py-2.5 text-center text-xs font-bold transition-all duration-200 cursor-pointer ${
                            voltage === '220V'
                              ? 'border-accent bg-accent/10 text-accent shadow-sm'
                              : 'bg-silver-grad'
                          }`}
                        >
                          220V Monofaze
                        </button>
                        <button
                          onClick={() => setVoltage('380V')}
                          className={`rounded-lg py-2.5 text-center text-xs font-bold transition-all duration-200 cursor-pointer ${
                            voltage === '380V'
                              ? 'border-accent bg-accent/10 text-accent shadow-sm'
                              : 'bg-silver-grad'
                          }`}
                        >
                          380V Trifaze (+1.200 TL)
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                        Alt Sehpa Tercihi
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => setStand('none')}
                          className={`rounded-lg py-2.5 text-center text-xs font-bold transition-all duration-200 cursor-pointer ${
                            stand === 'none'
                              ? 'border-accent bg-accent/10 text-accent shadow-sm'
                              : 'bg-silver-grad'
                          }`}
                        >
                          Sehpasız
                        </button>
                        <button
                          onClick={() => setStand('with-stand')}
                          className={`rounded-lg py-2.5 text-center text-xs font-bold transition-all duration-200 cursor-pointer ${
                            stand === 'with-stand'
                              ? 'border-accent bg-accent/10 text-accent shadow-sm'
                              : 'bg-silver-grad'
                          }`}
                        >
                          Çelik Sehpa Dahil (+3.500 TL)
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                        Adet
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setMachineQty((q) => Math.max(1, q - 1))}
                          className="flex h-10 w-10 items-center justify-center rounded-lg bg-silver-grad text-lg font-bold cursor-pointer"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={1}
                          value={machineQty}
                          onChange={(e) =>
                            setMachineQty(Math.max(1, parseInt(e.target.value) || 1))
                          }
                          className="h-10 w-16 rounded-lg border border-border bg-background text-center text-sm font-bold focus:outline-none"
                        />
                        <button
                          onClick={() => setMachineQty((q) => q + 1)}
                          className="flex h-10 w-10 items-center justify-center rounded-lg bg-silver-grad text-lg font-bold cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="rounded-xl bg-muted/40 p-4 border border-border space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{product.name}:</span>
                        <span className="font-semibold text-foreground">
                          {formatMoney(getMachinePrice() - (voltage === '380V' ? 1200 : 0) - (stand === 'with-stand' ? 3500 : 0))}
                        </span>
                      </div>
                      {voltage === '380V' && (
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>380V Sanayi Motoru Farkı:</span>
                          <span className="font-semibold text-foreground">+1.200 TL</span>
                        </div>
                      )}
                      {stand === 'with-stand' && (
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Ağır Hizmet Alt Sehpa:</span>
                          <span className="font-semibold text-foreground">+3.500 TL</span>
                        </div>
                      )}
                      <div className="border-t border-border pt-2 flex justify-between items-center mt-2">
                        <span className="text-sm font-bold">Toplam Fiyat:</span>
                        <span className="text-xl font-black text-orange-grad">
                          {formatMoney(getMachinePrice() * machineQty)}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={handleMachineAddToCart}
                      className={`w-full flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-bold text-white transition-all duration-300 shadow-md cursor-pointer ${
                        addedMessage
                          ? 'bg-emerald-600 hover:bg-emerald-500'
                          : 'bg-molten-grad glow-orange shadow-md'
                      }`}
                    >
                      {addedMessage ? (
                        <>
                          <Sparkles className="h-4 w-4" /> Sepete Eklendi!
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="h-4 w-4" /> Sepete Ekle
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom tabs */}
          <div className="mt-16 border-t border-border pt-12">
            <div className="rounded-2xl bg-metallic-card overflow-hidden">
              <div className="flex bg-muted/40 border-b border-border overflow-x-auto scrollbar-none">
                <div className="flex w-full min-w-max md:grid md:grid-cols-4 divide-x divide-border/45">
                  {[
                    { id: 'info', name: 'Ürün Bilgileri', icon: Info },
                    { id: 'specs', name: 'Teknik Özellikler', icon: FileText },
                    { id: 'apps', name: 'Kullanım Alanları', icon: BookOpen },
                    { id: 'docs', name: 'Dökümanlar', icon: FileDown },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeBottomTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveBottomTab(tab.id as 'info' | 'specs' | 'apps' | 'docs')}
                        className={`flex items-center justify-center gap-2 px-6 py-4.5 text-xs font-bold transition-all duration-200 cursor-pointer whitespace-nowrap relative flex-1 ${
                          isActive
                            ? 'bg-background text-accent'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/10'
                        }`}
                      >
                        {isActive && (
                          <div className="absolute top-0 left-0 right-0 h-[3px] bg-accent glow-orange" />
                        )}
                        <Icon className={`h-4 w-4 ${isActive ? 'text-accent' : 'text-muted-foreground'}`} />
                        <span>{tab.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-6 md:p-8 min-h-[280px] animate-in fade-in duration-200">
                {activeBottomTab === 'info' && (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                        <span className="h-4 w-1 rounded-full bg-molten-grad" />
                        Genel Açıklama
                      </h3>
                      <RichText body={product.longDescription} />
                    </div>

                    {product.features.length > 0 && (
                      <div className="border-t border-border/80 pt-6">
                        <h3 className="text-sm font-bold text-foreground mb-4">Temel Avantajları</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {product.features.map((feature, i) => (
                            <div key={i} className="flex items-start gap-2.5 text-xs text-muted-foreground leading-relaxed">
                              <CheckCircle2 className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                              <span>{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeBottomTab === 'specs' && (
                  <SpecsTable product={product} />
                )}

                {activeBottomTab === 'apps' && (() => {
                  const cuttingSpeeds =
                    ((product.medusa?.metadata as BladeProductMetadata | undefined)
                      ?.cutting_speeds as Array<{ material: string; speed: string }>) ?? [];
                  const hasApps = product.applications.length > 0;
                  const hasSpeeds = cuttingSpeeds.length > 0;
                  if (!hasApps && !hasSpeeds) {
                    return (
                      <p className="text-xs text-muted-foreground">
                        Bu ürün için kullanım alanı henüz girilmedi.
                      </p>
                    );
                  }
                  return (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {hasApps && (
                          <div className="space-y-4">
                            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                              Tavsiye Edilen Malzemeler
                            </h3>
                            <ul className="space-y-2">
                              {product.applications.map((app, i) => (
                                <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                  <span>{app}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {hasSpeeds && (
                          <div className="space-y-4">
                            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                              Tavsiye Edilen Kesme Hızları
                            </h3>
                            <CuttingSpeedTable speeds={cuttingSpeeds} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {activeBottomTab === 'docs' && (
                  <DocsTab
                    documents={product.documents}
                    downloadingDoc={downloadingDoc}
                    onDownload={handleDownload}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Cross-sell (Sıkça birlikte alınanlar) */}
          <CrossSell
            exclude={[product.handle, product.id]}
            limit={4}
          />

          {/* Customer Reviews */}
          <ProductReviews productId={product.id} productName={product.name} />

          {/* Recently Viewed */}
          <RecentlyViewed excludeHandle={product.handle} />

          {/* Related Products */}
          <section className="relative mt-20 pt-16 border-t border-border">
            <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-72 w-[42rem] max-w-full rounded-full bg-accent/10 blur-3xl pointer-events-none" />

            <div className="relative">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-10">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 text-accent">
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-medium tracking-[0.32em] uppercase">
                      Önerilen Ürünler
                    </span>
                  </div>
                  <h2 className="text-3xl md:text-[2.5rem] font-semibold tracking-[-0.035em] text-foreground leading-[1.05]">
                    İlginizi <span className="text-orange-grad">Çekebilecek</span> Ürünler
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-xl leading-relaxed font-light">
                    Bu ürünü inceleyen müşterilerimizin en çok tercih ettiği şerit testereler.
                  </p>
                </div>

                <Link
                  href="/#products"
                  className="group/all inline-flex items-center gap-2 self-start sm:self-auto rounded-full border border-white/[0.08] bg-premium-card px-5 py-2.5 text-xs font-semibold text-white shadow-[0_8px_30px_rgba(0,0,0,0.35)] hover:border-accent/40 transition-all cursor-pointer"
                >
                  <span>Tüm Kataloğu Gör</span>
                  <ArrowRight className="h-3.5 w-3.5 text-accent transition-transform duration-300 group-hover/all:translate-x-1" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {relatedItems.map((related, i) => {
                  const rating = (4.8 + (i % 2) * 0.1).toFixed(1);
                  const sold = ['5.200', '2.400', '1.800', '320'][i] || '500';
                  const isHot = i === 0;
                  return (
                    <Link
                      key={related.id}
                      href={`/products/${related.handle}`}
                      className="premium-card-highlight group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-premium-card shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition-all duration-500 hover:-translate-y-1.5 hover:border-accent/40 hover:shadow-[0_20px_60px_rgba(0,0,0,0.55),0_0_30px_rgba(255,120,31,0.12)] cursor-pointer"
                    >
                      <div className="relative aspect-[5/4] overflow-hidden bg-premium-image-bg">
                        <Image
                          src={related.image}
                          alt={related.name}
                          fill
                          className="object-cover transition-transform duration-700 group-hover:scale-110"
                          sizes="(max-width: 768px) 100vw, 33vw"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#14171c] via-transparent to-transparent pointer-events-none" />

                        <div className="absolute top-3 left-3 z-10">
                          <span className="inline-flex items-center rounded-full bg-black/55 backdrop-blur-md border border-white/15 px-2.5 py-1 text-[10px] font-semibold text-[#c7c9cc] uppercase tracking-[0.18em]">
                            {related.category}
                          </span>
                        </div>

                        {isHot && (
                          <div className="absolute top-3 right-3 z-10 inline-flex items-center gap-1 rounded-full bg-molten-grad text-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] shadow-lg glow-orange">
                            <Flame className="h-3 w-3" />
                            <span>Çok Satan</span>
                          </div>
                        )}
                      </div>

                      <div className="relative flex flex-1 flex-col p-5 z-10">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex items-center">
                            {[...Array(5)].map((_, idx) => (
                              <Star
                                key={idx}
                                className={`h-3.5 w-3.5 ${
                                  idx < Math.floor(parseFloat(rating))
                                    ? 'fill-accent text-accent'
                                    : 'text-white/20'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-xs font-semibold text-white">{rating}</span>
                          <span className="text-[11px] text-white/50">({sold}+ satış)</span>
                        </div>

                        <h3 className="text-base md:text-[17px] font-semibold tracking-[-0.015em] text-white group-hover:text-accent transition-colors mb-1.5 line-clamp-2">
                          {related.name}
                        </h3>

                        <p className="text-[11px] text-[#a8acb3] line-clamp-2 leading-relaxed mb-4 font-light">
                          {related.description}
                        </p>

                        <div className="mt-auto pt-4 border-t border-white/10">
                          <span className="inline-flex w-full h-10 items-center justify-center gap-2 rounded-xl bg-molten-grad text-white text-xs font-semibold shadow-sm group-hover:glow-orange transition-all duration-300">
                            <span>İncele</span>
                            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />

      {/* Schema.org Product + Breadcrumb — Google Rich Results için */}
      {product.medusa && <ProductJsonLd product={product.medusa} hasReviewsBlock />}
      <BreadcrumbJsonLd
        items={[
          { name: 'Ana Sayfa', url: '/' },
          { name: product.category, url: `/?kategori=${encodeURIComponent(product.category)}#products` },
          { name: product.name, url: `/products/${product.handle}` },
        ]}
      />
    </>
  );
}

// ---------- Specs table ----------
function SpecsTable({ product }: { product: UnifiedProduct }) {
  const meta = (product.medusa?.metadata || {}) as BladeProductMetadata;

  const rows: Array<{ key: string; value: string }> = [];

  // Otomatik satırlar — bilinen yapısal metadata alanlarından.
  if (product.type === 'blade') {
    if (meta.blade_type) rows.push({ key: 'Çelik Sınıfı / Kalitesi', value: String(meta.blade_type) });
    if (meta.width_mm) rows.push({ key: 'Standart Genişlik', value: `${meta.width_mm} mm` });
    if (meta.thickness_mm) rows.push({ key: 'Standart Kalınlık', value: `${meta.thickness_mm} mm` });
    if (meta.tooth_pitch?.length)
      rows.push({ key: 'Mevcut Diş Adımları (TPI)', value: meta.tooth_pitch.join(', ') });
    if (meta.min_length_mm && meta.max_length_mm)
      rows.push({
        key: 'Üretilebilir Boy Aralığı',
        value: `${meta.min_length_mm} – ${meta.max_length_mm} mm`,
      });
  }

  // Admin tarafından girilen serbest teknik özellik satırları (metadata).
  if (Array.isArray(meta.technical_specs)) {
    for (const s of meta.technical_specs) {
      if (s && s.label && s.value) rows.push({ key: String(s.label), value: String(s.value) });
    }
  }

  if (!rows.length) {
    return (
      <p className="text-xs text-muted-foreground">
        Bu ürün için teknik özellik henüz girilmedi.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
        Ürün Spesifikasyonları
      </h3>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="p-3.5 font-bold text-muted-foreground uppercase tracking-wider">
                Parametre
              </th>
              <th className="p-3.5 font-bold text-muted-foreground uppercase tracking-wider">
                Değer
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rows.map((r) => (
              <tr key={r.key} className="hover:bg-muted/10">
                <td className="p-3.5 font-bold text-foreground">{r.key}</td>
                <td className="p-3.5 text-muted-foreground font-medium">{r.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CuttingSpeedTable({
  speeds,
}: {
  speeds: Array<{ material: string; speed: string }>;
}) {
  if (!speeds.length) return null;
  return (
    <div className="space-y-3">
      {speeds.map((item, idx) => (
        <div
          key={idx}
          className="flex justify-between items-center text-xs border-b border-border/60 pb-2"
        >
          <span className="font-medium text-muted-foreground">{item.material}</span>
          <span className="font-bold text-foreground">{item.speed}</span>
        </div>
      ))}
    </div>
  );
}

function DocsTab({
  documents,
  downloadingDoc,
  onDownload,
}: {
  documents?: Array<{ name: string; url?: string; size?: string; desc?: string }>;
  downloadingDoc: string | null;
  onDownload: (name: string) => void;
}) {
  const docs = (documents ?? []).map((d) => ({
    name: d.name,
    desc: d.desc || '',
    size: d.size || 'PDF',
    url: d.url,
  }));

  if (!docs.length) {
    return (
      <p className="text-xs text-muted-foreground">
        Bu ürün için indirilebilir doküman henüz eklenmedi.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
        İndirilebilir Dökümanlar &amp; Belgeler
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {docs.map((doc) => (
          <div
            key={doc.name}
            className="flex items-start justify-between gap-4 p-4 rounded-xl border border-border bg-background/60 hover:bg-muted/20 transition-all duration-200"
          >
            <div className="space-y-1 text-left">
              <h4 className="text-xs font-bold text-foreground leading-snug">{doc.name}</h4>
              {doc.desc && (
                <p className="text-[10px] text-muted-foreground leading-relaxed max-w-xs">
                  {doc.desc}
                </p>
              )}
              <span className="inline-block text-[9px] font-bold text-accent">
                {doc.size} • PDF FORMAT
              </span>
            </div>

            {('url' in doc) && (doc as { url?: string }).url ? (
              <a
                href={(doc as { url?: string }).url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg p-2.5 transition-all duration-300 cursor-pointer shrink-0 border border-border hover:bg-accent/10 hover:border-accent/20 text-muted-foreground hover:text-accent"
              >
                <FileDown className="h-4 w-4" />
              </a>
            ) : (
              <button
                onClick={() => onDownload(doc.name)}
                disabled={downloadingDoc !== null}
                className={`rounded-lg p-2.5 transition-all duration-300 cursor-pointer shrink-0 border border-border ${
                  downloadingDoc === doc.name
                    ? 'bg-emerald-600 border-emerald-600 text-white animate-pulse'
                    : 'hover:bg-accent/10 hover:border-accent/20 text-muted-foreground hover:text-accent'
                }`}
              >
                <FileDown className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {downloadingDoc && (
        <div className="fixed bottom-4 right-4 z-50 rounded-xl bg-emerald-600 text-white font-bold text-xs px-5 py-3 shadow-lg flex items-center gap-2 animate-bounce">
          <Sparkles className="h-4 w-4" />
          <span>{downloadingDoc} indiriliyor...</span>
        </div>
      )}
    </div>
  );
}
