import { ModuleProvider, Modules } from "@medusajs/framework/utils";
import ResendNotificationProviderService from "./service";

/**
 * Medusa v2 notification provider registration. Plugged into
 * Modules.NOTIFICATION via medusa-config.ts.
 */
export default ModuleProvider(Modules.NOTIFICATION, {
  services: [ResendNotificationProviderService],
});
