import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { updateRegionsWorkflow } from "@medusajs/medusa/core-flows";

/**
 * Iyzico ödeme sağlayıcısını Türkiye bölgesine bağlar.
 *
 * Çalıştırma:
 *   cd medusa-backend/apps/backend
 *   npx medusa exec ./src/scripts/enable-iyzico-region.ts
 *
 * Seed, TR bölgesini yalnızca "pp_system_default" ile oluşturuyordu; bu yüzden
 * iyzico checkout'ta görünmüyordu. Bu script, payment modülünden gerçek iyzico
 * provider id'sini bulup bölgenin payment_providers listesine ekler.
 *
 * Idempotent: iyzico zaten bağlıysa hiçbir şey yapmaz.
 */
export default async function enableIyzicoRegion({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const paymentModule = container.resolve(Modules.PAYMENT);

  // 1. Payment modülündeki kayıtlı provider'ları listele
  const providers = await paymentModule.listPaymentProviders({});
  logger.info(
    `Kayıtlı payment provider'lar: ${providers.map((p) => p.id).join(", ")}`
  );

  const iyzico = providers.find((p) => p.id.includes("iyzico"));
  if (!iyzico) {
    logger.error(
      "iyzico provider bulunamadı! medusa-config.ts'de payment-iyzico kayıtlı mı ve backend yeniden başlatıldı mı kontrol edin."
    );
    return;
  }
  logger.info(`iyzico provider id: ${iyzico.id}`);

  // 2. TR bölgesini, mevcut payment_provider'larıyla birlikte bul
  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code", "payment_providers.id"],
  });
  const trRegion = regions.find(
    (r) => r.name === "Türkiye" || r.currency_code === "try"
  );
  if (!trRegion) {
    logger.error("Türkiye bölgesi bulunamadı. Önce seed-testere.ts çalıştırın.");
    return;
  }

  const current = (
    (trRegion.payment_providers as Array<{ id: string }> | undefined) ?? []
  ).map((p) => p.id);
  logger.info(`TR bölgesi mevcut provider'lar: ${current.join(", ") || "(yok)"}`);

  if (current.includes(iyzico.id)) {
    logger.info("✅ iyzico zaten TR bölgesine bağlı — değişiklik yok.");
    return;
  }

  // 3. Mevcut listeyi koruyup iyzico'yu ekle
  const next = Array.from(new Set([...current, "pp_system_default", iyzico.id]));
  await updateRegionsWorkflow(container).run({
    input: {
      selector: { id: trRegion.id },
      update: { payment_providers: next },
    },
  });

  logger.info(
    `✅ TR bölgesi payment_providers güncellendi → ${next.join(", ")}`
  );
}
