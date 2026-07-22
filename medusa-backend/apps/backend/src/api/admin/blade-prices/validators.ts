import { z } from "zod";

const basePayload = {
  blade_type: z.string().min(1),
  width_mm: z.number().positive(),
  thickness_mm: z.number().positive(),
  tooth_pitch: z.string().min(1).nullable().optional(),
  price_per_meter: z.number().nonnegative(),
  welding_fee: z.number().nonnegative().optional().default(0),
  currency_code: z.string().min(1).optional().default("try"),
  is_active: z.boolean().optional().default(true),
};

export const PostBladePriceSchema = z.object(basePayload);

export const PatchBladePriceSchema = z.object({
  blade_type: basePayload.blade_type.optional(),
  width_mm: basePayload.width_mm.optional(),
  thickness_mm: basePayload.thickness_mm.optional(),
  tooth_pitch: basePayload.tooth_pitch,
  price_per_meter: basePayload.price_per_meter.optional(),
  welding_fee: z.number().nonnegative().optional(),
  currency_code: z.string().min(1).optional(),
  is_active: z.boolean().optional(),
});

export type PostBladePriceBody = z.infer<typeof PostBladePriceSchema>;
export type PatchBladePriceBody = z.infer<typeof PatchBladePriceSchema>;
