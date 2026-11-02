/**
 * Medusa'nın standart store uçları için güvenlik ara katmanları.
 *
 * Çekirdek ve uygulama middleware'leri aynı listede sıralandığından bizimki
 * çekirdeğin gövde doğrulamasından önce de sonra da çalışabilir; bu yüzden
 * hem `req.body` hem `req.validatedBody` temizlenir.
 */
import {
  authenticate,
  defineMiddlewares,
  type MedusaNextFunction,
  type MedusaRequest,
  type MedusaResponse,
} from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import {
  isConfigurableBlade,
  isMatrixLineMetadata,
  productForVariant,
} from "../lib/blade-guard";
import { DEALER_LOGIN_REQUIRED, isDealerEmail } from "../lib/dealer-pricing";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyBody = Record<string, any> | undefined;

function bodies(req: MedusaRequest): AnyBody[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return [req.body as AnyBody, (req as any).validatedBody as AnyBody];
}

/**
 * Ödeme oturumu: istemcinin `data` alanı oturuma kaydedilir ve ödeme
 * sağlayıcısına iletilir. Storefront bu alanı hiç göndermez; tamamen atılır
 * (eskiden `data.dryMode` ile ödemesiz sipariş oluşturulabiliyordu).
 */
function stripPaymentSessionData(
  req: MedusaRequest,
  _res: MedusaResponse,
  next: MedusaNextFunction
) {
  for (const b of bodies(req)) if (b && "data" in b) delete b.data;
  next();
}

/**
 * Standart "sepete ekle": ölçüye göre (matris fiyatlı) ürünler yalnızca
 * /store/blade-price/cart-add üzerinden eklenebilir — standart uçta varyantın
 * katalog fiyatı ve istemcinin yazdığı ölçü metadata'sı kullanılırdı.
 */
async function blockConfigurableOnStandardAdd(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  try {
    const variantId =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((req as any).validatedBody?.variant_id as string) ||
      ((req.body as AnyBody)?.variant_id as string);
    if (variantId) {
      const product = await productForVariant(req.scope, variantId);
      if (product && isConfigurableBlade(product)) {
        res.status(400).json({
          type: "invalid_data",
          message: "Bu ürün ölçüye göre satılır; lütfen ürün sayfasından ekleyin.",
        });
        return;
      }
    }
    next();
  } catch (e) {
    next(e);
  }
}

/**
 * Standart "satır güncelle": metadata değiştirilemez (ölçü/fiyat bilgisi
 * taşır). Matris fiyatlı satırın adedi yalnızca fiyatı yeniden hesaplayan
 * /store/blade-price/cart-update ile değişir — standart uç eski birim fiyatı
 * korur, adet indirimi bu yolla kötüye kullanılabiliyordu.
 */
async function guardStandardLineUpdate(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  try {
    for (const b of bodies(req)) if (b && "metadata" in b) delete b.metadata;
    const lineId = req.params?.line_id;
    if (lineId) {
      const cartModule = req.scope.resolve(Modules.CART);
      const line = await cartModule
        .retrieveLineItem(lineId, { select: ["id", "is_custom_price", "metadata"] })
        .catch(() => null);
      if (
        line &&
        (line.is_custom_price ||
          isMatrixLineMetadata(line.metadata as Record<string, unknown>))
      ) {
        res.status(400).json({
          type: "invalid_data",
          message: "Bu satırın adedi yalnızca fiyat yeniden hesaplanarak değiştirilebilir.",
        });
        return;
      }
    }
    next();
  } catch (e) {
    next(e);
  }
}

/**
 * Medusa, oturumsuz açılan sepeti e-postadaki hesaba bağlar; bayi e-postasını
 * bilen biri böylece bayi fiyatı alabilirdi. Oturum varsa sepet zaten oturumun
 * müşterisine açılır, e-posta eşleşmesi devreye girmez.
 */
async function guardDealerEmailOnCartCreate(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anonymous = !(req as any).auth_context?.actor_id;
    if (anonymous && (await isDealerEmail(req.scope, (req.body as AnyBody)?.email))) {
      res.status(403).json({ type: "not_allowed", message: DEALER_LOGIN_REQUIRED });
      return;
    }
    next();
  } catch (e) {
    next(e);
  }
}

/** Giriş yapılmışsa müşteriyi tanır, yapılmamışsa isteği anonim bırakır. */
const optionalCustomer = authenticate("customer", ["session", "bearer"], {
  allowUnauthenticated: true,
});

export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/carts",
      method: ["POST"],
      middlewares: [optionalCustomer, guardDealerEmailOnCartCreate],
    },
    {
      matcher: "/store/blade-price/calculate",
      method: ["POST"],
      middlewares: [optionalCustomer],
    },
    {
      matcher: "/store/dealer/me",
      method: ["GET"],
      middlewares: [optionalCustomer],
    },
    {
      matcher: "/store/dealer/sync-cart",
      method: ["POST"],
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      matcher: "/store/dealer/price-list",
      method: ["GET"],
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      matcher: "/store/dealer/quotes*",
      method: ["GET"],
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
    {
      // Bayi logosu JSON içinde gelir; varsayılan gövde sınırı küçük.
      matcher: "/admin/dealers/:id",
      method: ["POST"],
      bodyParser: { sizeLimit: "2mb" },
    },
    {
      matcher: "/store/payment-collections/:id/payment-sessions",
      method: ["POST"],
      middlewares: [stripPaymentSessionData],
    },
    {
      matcher: "/store/carts/:id/line-items",
      method: ["POST"],
      middlewares: [blockConfigurableOnStandardAdd],
    },
    {
      matcher: "/store/carts/:id/line-items/:line_id",
      method: ["POST"],
      middlewares: [guardStandardLineUpdate],
    },
  ],
});
