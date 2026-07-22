'use client';

/**
 * Parametric blade configurator.
 *
 * Two pricing modes, picked at runtime:
 *
 *   • MATRIX MODE — when a blade_price_matrix row exists for the product's
 *     blade_type. The cascading width → thickness → TPI options and the
 *     final price come entirely from the matrix; length is free-form mm and
 *     the total is computed as price_per_meter × (length/1000) + welding_fee.
 *
 *   • LEGACY MODE — fallback used when the matrix has no rows for this type
 *     (e.g. before the seed runs). Falls back to Medusa variant matrix +
 *     calculatePrice(), preserving the original behaviour.
 *
 * The UI is identical in both modes so the storefront design stays 1:1.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ShoppingCart, Eye, Sparkles, AlertCircle } from 'lucide-react';
import { useCart } from '../context/CartContext';
import {
  buildOptionMatrix,
  findVariant,
  isVariantInStock,
} from '../../lib/medusa/variants';
import {
  calculatePrice,
  clampLength,
  DISCOUNT_TIERS,
  expectsCustomLength,
  getDiscountPercent,
} from '../../lib/medusa/pricing';
import { formatMoney, getProductImage } from '../../lib/medusa/format';
import { MEDUSA_READY } from '../../lib/medusa/config';
import type {
  BladeProductMetadata,
  StoreProduct,
  StoreProductVariant,
} from '../../lib/medusa/types';
import { useBladePriceOptions } from '../../lib/medusa/hooks/useBladePriceOptions';
import {
  calculateBladePrice,
  type BladePriceCalc,
} from '../../lib/medusa/services/blade-price';
import StockIndicator from './StockIndicator';
import ReadyMadeSuggestionPopup from './ReadyMadeSuggestionPopup';
import {
  getReadyMadeSuggestions,
  type ReadyMadeSuggestion,
} from '../../lib/medusa/services/ready-made';

// ---------- Local fallback matrix (legacy mode only) ----------
const LOCAL_WIDTHS = ['6mm', '10mm', '13mm', '20mm', '27mm', '34mm', '41mm'];
const LOCAL_THICKNESS: Record<string, string[]> = {
  '6mm': ['0.65mm', '0.90mm'], '10mm': ['0.65mm', '0.90mm'], '13mm': ['0.65mm', '0.90mm'],
  '20mm': ['0.65mm', '0.90mm', '1.10mm'], '27mm': ['0.90mm', '1.10mm'],
  '34mm': ['1.10mm', '1.30mm'], '41mm': ['1.10mm', '1.30mm'],
};
const LOCAL_TPI: Record<string, string[]> = {
  '6mm': ['10/14 TPI', '14 TPI'], '10mm': ['8/12 TPI', '10/14 TPI', '14 TPI'],
  '13mm': ['6/10 TPI', '8/12 TPI', '10/14 TPI', '14 TPI'],
  '20mm': ['5/8 TPI', '6/10 TPI', '8/12 TPI', '10/14 TPI'],
  '27mm': ['3/4 TPI', '4/6 TPI', '5/8 TPI', '6/10 TPI', '8/12 TPI', '10/14 TPI'],
  '34mm': ['2/3 TPI', '3/4 TPI', '4/6 TPI', '5/8 TPI', '6/10 TPI'],
  '41mm': ['1.4/2 TPI', '2/3 TPI', '3/4 TPI', '4/6 TPI'],
};
const LOCAL_PRICE: Record<string, Record<string, number>> = {
  'bimetal-premium': { '6mm': 110, '10mm': 125, '13mm': 140, '20mm': 175, '27mm': 210, '34mm': 295, '41mm': 390 },
  'carbide-ultimate': { '6mm': 280, '10mm': 310, '13mm': 350, '20mm': 420, '27mm': 540, '34mm': 710, '41mm': 920 },
  'woodcut-classic': { '6mm': 55, '10mm': 65, '13mm': 75, '20mm': 90, '27mm': 110, '34mm': 150, '41mm': 195 },
};
const LOCAL_WELDING: Record<string, number> = {
  'bimetal-premium': 90, 'carbide-ultimate': 190, 'woodcut-classic': 60,
};

/** Maps a product handle / metadata to the blade-price-matrix `blade_type` slug. */
function deriveBladeTypeSlug(
  product: StoreProduct | null | undefined,
  productId: string | undefined
): string {
  const meta = (product?.metadata || {}) as BladeProductMetadata & {
    blade_type_slug?: string;
  };
  if (meta.blade_type_slug) return meta.blade_type_slug;
  const slug = (product?.handle || productId || '').toLowerCase();
  if (/m51|m42|bimetal|bi-metal/.test(slug)) return 'bi-metal';
  if (/carb(i|ü)de|karbur|karb[uü]r/.test(slug)) return 'carbide';
  if (/wood|ah[sş]ap|spezial/.test(slug)) return 'woodcut';
  if (/meat|kemik|hijyenik|et-/.test(slug)) return 'meat-bone';
  if (/textile|s[uü]nger|tekstil/.test(slug)) return 'textile';
  return 'bi-metal';
}

interface BladeConfiguratorProps {
  product?: StoreProduct | null;
  productId?: string;
  initialMaterial?: string;
  onConfigChange?: (config: { width: string; tpi: string; material: string }) => void;
  onOpen3D?: () => void;
}

export default function BladeConfigurator({
  product,
  productId,
  initialMaterial = 'Bi-Metal M42 Premium',
  onConfigChange,
  onOpen3D,
}: BladeConfiguratorProps) {
  const { addToCart, addToMedusaCart } = useCart();
  const hasMedusa = !!product;

  // ---- Matrix mode ----
  const bladeTypeSlug = useMemo(
    () => deriveBladeTypeSlug(product, productId),
    [product, productId]
  );
  const { data: matrixOptions } = useBladePriceOptions(bladeTypeSlug);
  const matrixHasData = !!matrixOptions?.blade_types?.includes(bladeTypeSlug);

  const matrixWidths = useMemo<number[]>(() => {
    if (!matrixHasData) return [];
    return matrixOptions?.widths?.[bladeTypeSlug] ?? [];
  }, [matrixHasData, matrixOptions, bladeTypeSlug]);

  // ---- Legacy variant matrix ----
  const legacyMatrix = useMemo(
    () => (product && !matrixHasData ? buildOptionMatrix(product) : null),
    [product, matrixHasData]
  );
  const legacyWidths = legacyMatrix?.widths.length
    ? legacyMatrix.widths
    : LOCAL_WIDTHS;

  // ---- Selected width ----
  const [widthKey, setWidthKey] = useState<string>(""); // matrix-mode uses number-as-string
  const [legacyWidth, setLegacyWidth] = useState<string>(""); // legacy uses "27mm"

  // Initialize defaults on first matrix load
  useEffect(() => {
    if (matrixHasData) {
      if (!widthKey || !matrixWidths.map(String).includes(widthKey)) {
        const preferred =
          matrixWidths.find((w) => w === 27) ?? matrixWidths[0];
        setWidthKey(preferred !== undefined ? String(preferred) : "");
      }
    } else {
      if (!legacyWidth || !legacyWidths.includes(legacyWidth)) {
        setLegacyWidth(
          legacyWidths.includes('27mm') ? '27mm' : legacyWidths[0] ?? '27mm'
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matrixHasData, matrixWidths.join(","), legacyWidths.join(",")]);

  // ---- Available thicknesses for chosen width ----
  const matrixThicknesses = useMemo<number[]>(() => {
    if (!matrixHasData || !widthKey) return [];
    const table = matrixOptions?.thicknesses_by_width?.[bladeTypeSlug];
    return table?.[widthKey] ?? [];
  }, [matrixHasData, matrixOptions, bladeTypeSlug, widthKey]);

  const legacyThicknessOptions = useMemo<string[]>(() => {
    if (legacyMatrix)
      return legacyMatrix.thicknessByWidth[legacyWidth] ?? legacyMatrix.thicknesses;
    return LOCAL_THICKNESS[legacyWidth] ?? ['0.90mm'];
  }, [legacyMatrix, legacyWidth]);

  const [thicknessKey, setThicknessKey] = useState<string>("");
  const [legacyThicknessRaw, setLegacyThicknessRaw] = useState<string>("");

  useEffect(() => {
    if (matrixHasData) {
      const opts = matrixThicknesses.map(String);
      if (!thicknessKey || !opts.includes(thicknessKey)) {
        setThicknessKey(opts[0] ?? "");
      }
    } else {
      if (
        !legacyThicknessRaw ||
        !legacyThicknessOptions.includes(legacyThicknessRaw)
      ) {
        setLegacyThicknessRaw(legacyThicknessOptions[0] ?? '0.90mm');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    matrixHasData,
    matrixThicknesses.join(","),
    legacyThicknessOptions.join(","),
  ]);

  // ---- Available tooth-pitches for chosen width+thickness ----
  const matrixToothPitches = useMemo<string[]>(() => {
    if (!matrixHasData || !widthKey || !thicknessKey) return [];
    const branch =
      matrixOptions?.tree?.[bladeTypeSlug]?.[widthKey]?.[thicknessKey];
    return branch ?? [];
  }, [matrixHasData, matrixOptions, bladeTypeSlug, widthKey, thicknessKey]);

  /** When the matrix branch contains `null` (entry without TPI), we encode
   *  it as the empty string in the dropdown options. */
  const matrixToothPitchesHasNull = useMemo<boolean>(() => {
    if (!matrixHasData) return false;
    // tree maps tooth_pitch keys; null is stored as the bucket having an
    // entry but no string pushed. We detect "TPI absent" when the array is
    // empty for a width/thickness that DOES exist in the matrix.
    const branchExists =
      !!matrixOptions?.tree?.[bladeTypeSlug]?.[widthKey]?.[thicknessKey];
    return branchExists && matrixToothPitches.length === 0;
  }, [
    matrixHasData,
    matrixOptions,
    bladeTypeSlug,
    widthKey,
    thicknessKey,
    matrixToothPitches.length,
  ]);

  const legacyTpiOptions = useMemo<string[]>(() => {
    if (legacyMatrix) {
      return (
        legacyMatrix.tpiByWidthThickness[`${legacyWidth}|${legacyThicknessRaw}`] ??
        legacyMatrix.tpis
      );
    }
    return LOCAL_TPI[legacyWidth] ?? ['4/6 TPI'];
  }, [legacyMatrix, legacyWidth, legacyThicknessRaw]);

  const [toothPitch, setToothPitch] = useState<string>(""); // "" = "no tooth-pitch"
  const [legacyTpiRaw, setLegacyTpiRaw] = useState<string>("");

  useEffect(() => {
    if (matrixHasData) {
      if (matrixToothPitchesHasNull) {
        setToothPitch("");
      } else if (
        !toothPitch ||
        !matrixToothPitches.includes(toothPitch)
      ) {
        setToothPitch(matrixToothPitches[0] ?? "");
      }
    } else {
      if (!legacyTpiRaw || !legacyTpiOptions.includes(legacyTpiRaw)) {
        setLegacyTpiRaw(legacyTpiOptions[0] ?? '4/6 TPI');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    matrixHasData,
    matrixToothPitches.join(","),
    legacyTpiOptions.join(","),
    matrixToothPitchesHasNull,
  ]);

  // ---- Length & qty ----
  const meta = useMemo<BladeProductMetadata>(
    () => (product?.metadata || {}) as BladeProductMetadata,
    [product]
  );
  const lengthMinMax = useMemo(() => {
    const min =
      typeof meta.min_length_mm === 'number' ? meta.min_length_mm : 1000;
    const max =
      typeof meta.max_length_mm === 'number' ? meta.max_length_mm : 15000;
    return { min, max };
  }, [meta]);

  const defaultLength = Math.max(lengthMinMax.min, 2850);
  const [length, setLength] = useState<number>(defaultLength);
  const [quantity, setQuantity] = useState<number>(1);
  const [addedMessage, setAddedMessage] = useState(false);

  // ---- Hazır ürün önerisi (popup) ----
  const [readyMadeOpen, setReadyMadeOpen] = useState(false);
  const [readyMade, setReadyMade] = useState<ReadyMadeSuggestion[]>([]);
  const [readyMadeRequestedLen, setReadyMadeRequestedLen] = useState(0);
  /** Sadece SON kapatılan uzunlukta suppress. Kullanıcı uzunluğu farklı
   *  bir değere değiştirirse otomatik temizlenir — sonra aynı değere
   *  dönerse pop-up yeniden açılır. Kalıcı dismissal yok. */
  const [lastDismissedLen, setLastDismissedLen] = useState<number | null>(null);
  const readyMadeDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Uzunluk başka bir değere değişirse dismissal'ı temizle.
  useEffect(() => {
    if (lastDismissedLen !== null && length !== lastDismissedLen) {
      setLastDismissedLen(null);
    }
  }, [length, lastDismissedLen]);

  useEffect(() => {
    if (!matrixHasData) return;
    if (!length || length < lengthMinMax.min) return;
    // Sadece kapatıldığı andaki uzunlukla aynıysa atla
    if (lastDismissedLen === length) return;

    const w = widthKey ? Number(widthKey) : undefined;
    const t = thicknessKey ? Number(thicknessKey) : undefined;

    if (readyMadeDebounce.current) clearTimeout(readyMadeDebounce.current);
    readyMadeDebounce.current = setTimeout(async () => {
      const res = await getReadyMadeSuggestions({
        bladeType: bladeTypeSlug,
        lengthMm: length,
        widthMm: w,
        thicknessMm: t,
      });
      if (res.length > 0) {
        setReadyMade(res);
        setReadyMadeRequestedLen(length);
        setReadyMadeOpen(true);
      }
    }, 800);

    return () => {
      if (readyMadeDebounce.current) clearTimeout(readyMadeDebounce.current);
    };
  }, [
    matrixHasData,
    bladeTypeSlug,
    length,
    widthKey,
    thicknessKey,
    lengthMinMax.min,
    lastDismissedLen,
  ]);

  const closeReadyMade = () => {
    setReadyMadeOpen(false);
    // Sadece son kapatılan uzunluğu hatırla — kullanıcı uzunluğu
    // değiştirirse sıfırlanır
    setLastDismissedLen(readyMadeRequestedLen);
  };

  // ---- Legacy Medusa variant resolution ----
  const legacyVariant = useMemo<StoreProductVariant | null>(() => {
    if (!product || matrixHasData) return null;
    return findVariant(product, {
      width: legacyWidth,
      thickness: legacyThicknessRaw,
      tpi: legacyTpiRaw,
    });
  }, [product, matrixHasData, legacyWidth, legacyThicknessRaw, legacyTpiRaw]);

  const inStockLegacy = isVariantInStock(legacyVariant);

  // ---- Matrix-mode live calculation ----
  const [matrixCalc, setMatrixCalc] = useState<BladePriceCalc | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcMissing, setCalcMissing] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!matrixHasData) {
      setMatrixCalc(null);
      setCalcMissing(false);
      return;
    }
    const wNum = Number(widthKey);
    const tNum = Number(thicknessKey);
    if (!wNum || !tNum || !length || length <= 0) {
      setMatrixCalc(null);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setCalcLoading(true);
    debounceRef.current = setTimeout(async () => {
      const res = await calculateBladePrice({
        blade_type: bladeTypeSlug,
        width_mm: wNum,
        thickness_mm: tNum,
        tooth_pitch: matrixToothPitchesHasNull
          ? null
          : toothPitch || null,
        length_mm: length,
        quantity,
      });
      setCalcLoading(false);
      if (!res) {
        setMatrixCalc(null);
        setCalcMissing(true);
      } else {
        setMatrixCalc(res);
        setCalcMissing(false);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [
    matrixHasData,
    bladeTypeSlug,
    widthKey,
    thicknessKey,
    toothPitch,
    matrixToothPitchesHasNull,
    length,
    quantity,
  ]);

  // ---- Legacy price breakdown ----
  const legacyBreakdown = useMemo(() => {
    if (matrixHasData) return null;
    if (product) {
      return calculatePrice({
        product,
        variant: legacyVariant,
        lengthMm: length,
        quantity,
      });
    }
    const slug = productId || 'bimetal-premium';
    const basePrice = LOCAL_PRICE[slug]?.[legacyWidth] ?? 210;
    const welding = LOCAL_WELDING[slug] ?? 90;
    const lengthM = length / 1000;
    const unit = Math.round(lengthM * basePrice + welding);
    const total0 = unit * quantity;
    const pct = getDiscountPercent(quantity);
    const total = Math.round((total0 * (100 - pct)) / 100);
    return {
      basePrice, lengthMm: length, bladePrice: Math.round(lengthM * basePrice),
      weldingCost: welding, unitPrice: unit, totalBeforeDiscount: total0,
      discountPercent: pct, total, currency: 'try', unavailable: false,
    };
  }, [
    matrixHasData,
    product,
    productId,
    legacyVariant,
    legacyWidth,
    length,
    quantity,
  ]);

  // ---- 3D viewer sync ----
  useEffect(() => {
    const widthLabel = matrixHasData
      ? widthKey
        ? `${widthKey}mm`
        : ''
      : legacyWidth;
    const tpiLabel = matrixHasData
      ? toothPitch
        ? `${toothPitch} TPI`
        : ''
      : legacyTpiRaw;
    onConfigChange?.({
      width: widthLabel,
      tpi: tpiLabel,
      material: product?.title || initialMaterial,
    });
  }, [
    matrixHasData,
    widthKey,
    toothPitch,
    legacyWidth,
    legacyTpiRaw,
    product?.title,
    initialMaterial,
    onConfigChange,
  ]);

  const handleLengthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = parseInt(e.target.value);
    if (!Number.isNaN(raw)) setLength(raw);
    else setLength(0);
  };

  const showLengthInput = product ? expectsCustomLength(product) : true;

  // ---- Validation ----
  const validation = useMemo<string | null>(() => {
    if (matrixHasData) {
      if (!widthKey || !thicknessKey) return 'Lütfen genişlik ve kalınlık seçin.';
      if (showLengthInput) {
        if (!length || length < lengthMinMax.min) {
          return `Lütfen en az ${lengthMinMax.min} mm uzunluk girin.`;
        }
        if (length > lengthMinMax.max) {
          return `Maksimum uzunluk: ${lengthMinMax.max} mm.`;
        }
      }
      if (calcMissing) return 'Bu ölçü için fiyat tanımlı değil.';
      return null;
    }
    // Legacy
    if (!legacyVariant && hasMedusa) {
      return 'Bu kombinasyon için ürün bulunamadı.';
    }
    if (showLengthInput) {
      if (!length || length < lengthMinMax.min) {
        return `Lütfen en az ${lengthMinMax.min} mm uzunluk girin.`;
      }
      if (length > lengthMinMax.max) {
        return `Maksimum uzunluk: ${lengthMinMax.max} mm.`;
      }
    }
    if (hasMedusa && !inStockLegacy) return 'Bu varyasyon şu anda stokta yok.';
    if (legacyBreakdown?.unavailable && hasMedusa) {
      return 'Fiyat alınamadı, lütfen yöneticiye bildirin.';
    }
    return null;
  }, [
    matrixHasData,
    widthKey,
    thicknessKey,
    showLengthInput,
    length,
    lengthMinMax,
    calcMissing,
    legacyVariant,
    hasMedusa,
    inStockLegacy,
    legacyBreakdown?.unavailable,
  ]);

  // ---- Add to cart ----
  const handleAddToCart = async () => {
    if (validation) return;

    const productSlug = product?.handle || productId || 'bimetal-premium';
    const legacyImage = product
      ? getProductImage(product)
      : `/images/${
          productSlug === 'carbide-ultimate'
            ? 'carbide_blade.png'
            : productSlug === 'woodcut-classic'
            ? 'woodworking_blade.png'
            : 'bimetal_blade.png'
        }`;
    const legacyName =
      product?.title || `${initialMaterial} Şerit Testere Bıçağı`;

    if (matrixHasData && matrixCalc) {
      // Matrix mode — write the full calc breakdown into metadata
      const widthLabel = `${matrixCalc.width_mm}mm`;
      const thicknessLabel = `${matrixCalc.thickness_mm}mm`;
      const tpiLabel = matrixCalc.tooth_pitch
        ? `${matrixCalc.tooth_pitch} TPI`
        : '—';
      const itemId = `${productSlug}-${matrixCalc.width_mm}-${matrixCalc.thickness_mm}-${matrixCalc.tooth_pitch ?? 'na'}-${matrixCalc.length_mm}`;

      // Welding is a flat per-line fee, but the cart UI shows price × qty.
      // Amortize welding across the quantity so the cart line total matches
      // the configurator's "Toplam" exactly.
      const amortizedUnitPrice = Math.round(
        (matrixCalc.total_price / Math.max(1, quantity)) * 100
      ) / 100;

      const mdMetadata = {
        product_type: 'blade',
        blade_type: bladeTypeSlug,
        // New, matrix-native keys
        width_mm: matrixCalc.width_mm,
        thickness_mm: matrixCalc.thickness_mm,
        tooth_pitch: matrixCalc.tooth_pitch,
        length_mm: matrixCalc.length_mm,
        length_meter: matrixCalc.length_meter,
        price_per_meter: matrixCalc.price_per_meter,
        welding_fee: matrixCalc.welding_fee,
        blade_unit_price: matrixCalc.unit_price, // blade only, no welding
        unit_price: amortizedUnitPrice,           // includes amortized welding
        subtotal: matrixCalc.subtotal,
        total_price: matrixCalc.total_price,
        currency_code: matrixCalc.currency_code,
        // Legacy-display keys so cart/order pages render specs without changes
        width: widthLabel,
        thickness: thicknessLabel,
        tpi: tpiLabel,
        custom_length_mm: matrixCalc.length_mm,
        welding: matrixCalc.welding_fee > 0,
        unit_price_at_add: amortizedUnitPrice,
      };

      const legacyVariantId = product?.variants?.[0]?.id;
      if (legacyVariantId && MEDUSA_READY) {
        await addToMedusaCart({
          variantId: legacyVariantId,
          quantity,
          metadata: mdMetadata,
          bladeMatrix: {
            bladeType: bladeTypeSlug,
            widthMm: matrixCalc.width_mm,
            thicknessMm: matrixCalc.thickness_mm,
            toothPitch: matrixCalc.tooth_pitch,
            lengthMm: matrixCalc.length_mm,
          },
          legacy: {
            id: itemId,
            productId: productSlug,
            name: legacyName,
            image: legacyImage,
            type: 'blade',
            specs: {
              width: widthLabel,
              thickness: thicknessLabel,
              tpi: tpiLabel,
              length: matrixCalc.length_mm,
            },
            price: amortizedUnitPrice,
          },
        });
      } else {
        addToCart(
          {
            id: itemId,
            productId: productSlug,
            name: legacyName,
            image: legacyImage,
            type: 'blade',
            specs: {
              width: widthLabel,
              thickness: thicknessLabel,
              tpi: tpiLabel,
              length: matrixCalc.length_mm,
            },
            price: amortizedUnitPrice,
          },
          quantity
        );
      }
    } else {
      // Legacy mode
      const clamped = product
        ? clampLength(product, length).value
        : Math.max(1000, Math.min(15000, length));
      const itemId = `${productSlug}-${legacyWidth}-${legacyTpiRaw}-${clamped}`;

      if (legacyVariant && MEDUSA_READY) {
        await addToMedusaCart({
          variantId: legacyVariant.id,
          quantity,
          metadata: {
            width: legacyWidth,
            thickness: legacyThicknessRaw,
            tpi: legacyTpiRaw,
            custom_length_mm: clamped,
            welding: true,
            unit_price_at_add: legacyBreakdown?.unitPrice,
            product_type: 'blade',
          },
          legacy: {
            id: itemId,
            productId: productSlug,
            name: legacyName,
            image: legacyImage,
            type: 'blade',
            specs: {
              width: legacyWidth,
              thickness: legacyThicknessRaw,
              tpi: legacyTpiRaw,
              length: clamped,
            },
            price: legacyBreakdown?.unitPrice ?? 0,
          },
        });
      } else {
        addToCart(
          {
            id: itemId,
            productId: productSlug,
            name: legacyName,
            image: legacyImage,
            type: 'blade',
            specs: {
              width: legacyWidth,
              thickness: legacyThicknessRaw,
              tpi: legacyTpiRaw,
              length: clamped,
            },
            price: legacyBreakdown?.unitPrice ?? 0,
          },
          quantity
        );
      }
    }

    setAddedMessage(true);
    setTimeout(() => setAddedMessage(false), 2000);
  };

  const materialLabel = product?.title || initialMaterial;
  const materialBadge = (() => {
    const slug = product?.handle || productId;
    if (slug === 'carbide-ultimate') return 'Karbür Uçlu';
    if (slug === 'woodcut-classic') return 'Karbon Çeliği';
    const bladeType = meta.blade_type;
    if (bladeType) return bladeType;
    return 'Bi-Metal';
  })();

  // ---- Display data for the price summary box ----
  const displayBreakdown = matrixHasData
    ? matrixCalc
      ? (() => {
          const pct = getDiscountPercent(quantity);
          const totalBeforeDiscount = matrixCalc.total_price;
          // 2-decimal rounding aynı backend'de cart-add içinde de kullanılır.
          // Tam sayıya yuvarlama yapma — yoksa sepetle birkaç kuruş farkı çıkar.
          const round2 = (n: number) => Math.round(n * 100) / 100;
          const total = round2((totalBeforeDiscount * (100 - pct)) / 100);
          return {
            unitPrice: matrixCalc.unit_price,
            total,
            totalBeforeDiscount,
            discountPercent: pct,
            currency: matrixCalc.currency_code,
            unavailable: false,
          };
        })()
      : {
          unitPrice: 0,
          total: 0,
          totalBeforeDiscount: 0,
          discountPercent: 0,
          currency: 'try',
          unavailable: calcMissing,
        }
    : legacyBreakdown ?? {
        unitPrice: 0,
        total: 0,
        totalBeforeDiscount: 0,
        discountPercent: 0,
        currency: 'try',
        unavailable: true,
      };

  return (
    <>
    <ReadyMadeSuggestionPopup
      open={readyMadeOpen}
      suggestions={readyMade}
      requestedLengthMm={readyMadeRequestedLen}
      onClose={closeReadyMade}
      onContinueCustom={closeReadyMade}
    />
    <div className="rounded-2xl bg-metallic-card p-6 shadow-sm">
      <div className="space-y-5">
        {/* Material Display */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Şerit Malzemesi
          </label>
          <div className="rounded-lg bg-muted/50 border border-border px-3 py-2 text-sm font-semibold flex justify-between items-center">
            <span className="line-clamp-1">{materialLabel}</span>
            <span className="text-[10px] bg-accent/10 text-accent px-2 py-0.5 rounded font-bold uppercase shrink-0">
              {materialBadge}
            </span>
          </div>
          {/* Stok göstergesi — variant resolve edildiyse onun stock'unu göster, yoksa generic */}
          <div className="mt-2 flex items-center justify-between">
            <StockIndicator
              quantity={
                (() => {
                  // Önce legacyVariant (Medusa variant), yoksa ilk variant
                  const v = legacyVariant || product?.variants?.[0];
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const inv = (v as any)?.inventory_quantity;
                  return typeof inv === 'number' ? inv : null;
                })()
              }
              manageInventory={
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ((legacyVariant || product?.variants?.[0]) as any)?.manage_inventory ?? true
              }
            />
            {/* Hızlı kargo rozeti — aciliyet */}
            <span className="text-[10px] font-bold text-emerald-600 inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Aynı gün kargoda
            </span>
          </div>
        </div>

        {/* Width */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Genişlik (mm)
          </label>
          {matrixHasData ? (
            <select
              value={widthKey}
              onChange={(e) => setWidthKey(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            >
              {matrixWidths.length === 0 && (
                <option value="">— seçenek yok —</option>
              )}
              {matrixWidths.map((w) => (
                <option key={w} value={String(w)}>
                  {w} mm
                </option>
              ))}
            </select>
          ) : (
            <select
              value={legacyWidth}
              onChange={(e) => setLegacyWidth(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            >
              {legacyWidths.map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          )}
        </div>

        {/* Thickness */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Kalınlık (mm)
          </label>
          {matrixHasData ? (
            <select
              value={thicknessKey}
              onChange={(e) => setThicknessKey(e.target.value)}
              disabled={!widthKey || matrixThicknesses.length === 0}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none disabled:opacity-60"
            >
              {matrixThicknesses.length === 0 && (
                <option value="">— önce genişlik —</option>
              )}
              {matrixThicknesses.map((t) => (
                <option key={t} value={String(t)}>
                  {t} mm
                </option>
              ))}
            </select>
          ) : (
            <select
              value={legacyThicknessRaw}
              onChange={(e) => setLegacyThicknessRaw(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            >
              {legacyThicknessOptions.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          )}
        </div>

        {/* Tooth pitch */}
        {(matrixHasData ? !matrixToothPitchesHasNull : true) && (
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Diş Adımı (TPI / Hatve)
            </label>
            {matrixHasData ? (
              <select
                value={toothPitch}
                onChange={(e) => setToothPitch(e.target.value)}
                disabled={!thicknessKey || matrixToothPitches.length === 0}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none disabled:opacity-60"
              >
                {matrixToothPitches.length === 0 && (
                  <option value="">— önce kalınlık —</option>
                )}
                {matrixToothPitches.map((p) => (
                  <option key={p} value={p}>
                    {p} TPI
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={legacyTpiRaw}
                onChange={(e) => setLegacyTpiRaw(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                {legacyTpiOptions.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Length */}
        {showLengthInput && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Şerit Boyu (L - mm)
              </label>
              <span className="text-[10px] text-muted-foreground">
                Limit: {lengthMinMax.min} - {lengthMinMax.max} mm
              </span>
            </div>
            <div className="relative">
              <input
                type="number"
                min={lengthMinMax.min}
                max={lengthMinMax.max}
                value={length || ''}
                onChange={handleLengthChange}
                className="w-full rounded-lg border border-border bg-background pl-4 pr-12 py-2 text-sm font-bold focus:border-primary focus:outline-none"
                placeholder="Örn: 2850"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-xs font-bold text-muted-foreground">
                mm
              </div>
            </div>
          </div>
        )}

        {/* Quantity */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Miktar (Adet)
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-silver-grad text-lg font-bold cursor-pointer"
            >
              -
            </button>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) =>
                setQuantity(Math.max(1, parseInt(e.target.value) || 1))
              }
              className="h-10 w-16 rounded-lg border border-border bg-background text-center text-sm font-bold focus:outline-none"
            />
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-silver-grad text-lg font-bold cursor-pointer"
            >
              +
            </button>
          </div>
        </div>

        {/* Discount tiers — 3/5/10+ adet için %5/%10/%15 indirim. */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Adet İndirimleri
          </label>
          <div className="grid grid-cols-3 gap-2">
            {DISCOUNT_TIERS.map((tier) => {
              const activePct = matrixHasData
                ? getDiscountPercent(quantity)
                : legacyBreakdown?.discountPercent ?? 0;
              const isActive = activePct === tier.percent;
              return (
                <button
                  key={tier.qty}
                  type="button"
                  onClick={() => setQuantity(tier.qty)}
                  aria-pressed={isActive}
                  className={`relative flex flex-col items-center justify-center gap-0.5 rounded-xl py-3 px-2 text-center transition-all duration-300 cursor-pointer border ${
                    isActive
                      ? 'border-accent bg-gradient-to-br from-accent/15 to-accent/5 text-accent shadow-md glow-orange scale-[1.02]'
                      : 'border-border bg-silver-grad text-muted-foreground hover:border-accent/40 hover:text-foreground'
                  }`}
                >
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-accent' : 'text-muted-foreground'}`}>
                    {tier.label}
                  </span>
                  <span className={`text-base font-black leading-none ${isActive ? 'text-orange-grad' : ''}`}>
                    %{tier.percent}
                  </span>
                  <span className={`text-[9px] font-semibold ${isActive ? 'text-accent' : 'text-muted-foreground'}`}>
                    İndirim
                  </span>
                  {isActive && (
                    <span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full bg-molten-grad text-[9px] font-black text-white shadow-md">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Validation */}
        {validation && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{validation}</span>
          </div>
        )}

        {/* Price summary */}
        <div className="rounded-xl bg-muted/40 p-4 border border-border space-y-2">
          {matrixHasData && matrixCalc && (
            <>
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>Uzunluk</span>
                <span className="font-semibold text-foreground">
                  {matrixCalc.length_mm.toLocaleString('tr-TR')} mm
                  <span className="text-muted-foreground"> ({matrixCalc.length_meter.toLocaleString('tr-TR')} m)</span>
                </span>
              </div>
              {quantity > 1 && (
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>Adet</span>
                  <span className="font-semibold text-foreground">
                    × {quantity}
                  </span>
                </div>
              )}
              <div className="border-t border-border mt-1 pt-2" />
            </>
          )}

          {displayBreakdown.discountPercent > 0 && (
            <div className="flex justify-between items-center text-xs">
              <span className="inline-flex items-center gap-1.5 font-bold text-accent">
                <Sparkles className="h-3.5 w-3.5" />
                %{displayBreakdown.discountPercent} indirim uygulandı
              </span>
              <span className="font-semibold text-muted-foreground line-through">
                {formatMoney(
                  displayBreakdown.totalBeforeDiscount,
                  displayBreakdown.currency
                )}
              </span>
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-sm font-bold">Toplam Tutar:</span>
            <span className="text-xl font-black text-orange-grad">
              {displayBreakdown.unavailable
                ? '—'
                : calcLoading && matrixHasData
                ? '...'
                : formatMoney(displayBreakdown.total, displayBreakdown.currency)}
            </span>
          </div>
          <div className="text-[10px] text-muted-foreground text-right italic">
            KDV (%20) hariçtir.
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-5 gap-3 pt-2">
          {onOpen3D && (
            <button
              onClick={onOpen3D}
              type="button"
              className="col-span-1 flex h-11 items-center justify-center rounded-xl bg-silver-grad transition-all duration-200 cursor-pointer shadow-sm"
              title="Diş profili & TPI danışmanını aç"
            >
              <Eye className="h-5 w-5" />
            </button>
          )}
          <button
            onClick={handleAddToCart}
            disabled={!!validation || (matrixHasData && !matrixCalc)}
            className={`col-span-4 flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-bold text-white transition-all duration-300 shadow-md ${
              validation || (matrixHasData && !matrixCalc)
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : addedMessage
                ? 'bg-emerald-600 hover:bg-emerald-500 cursor-pointer'
                : 'bg-molten-grad glow-orange hover:shadow-lg cursor-pointer'
            }`}
          >
            {addedMessage ? (
              <><Sparkles className="h-4 w-4" /> Sepete Eklendi!</>
            ) : (
              <><ShoppingCart className="h-4 w-4" /> Sepete Ekle</>
            )}
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
